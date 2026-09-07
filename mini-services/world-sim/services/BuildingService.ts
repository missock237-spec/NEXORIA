// NEXORIA — world-sim : BuildingService
// Destruction réelle (HP → états visibles) + reconstruction (matériaux,
// progression visible 3D en 5 paliers). Aucun état n'est simulé côté client.

import { INVASION, RECONSTRUCTION_COSTS } from '../../../src/lib/game/province/world-data'
import { prisma } from '../persistence'
import type { BuildingEnt, DepositIntent, PlayerEnt, ProjectEnt, WorkIntent } from '../protocol'
import type { GameServer } from '../GameServer'

const WORK_BONUS_PCT = 0.9 // % de progression par coup de main joueur (cooldown 1 s)
const NPC_BUILDER_PCT = 0.22 // %/s si un bâtisseur vivant travaille (forgeron/apprenti)

export class BuildingService {
  private lastWorkAt = new Map<string, number>()

  constructor(private gs: GameServer) {}

  // ── Dégâts (monstres, raiders, GM) ──
  damageBuilding(b: BuildingEnt, dmg: number, by: string) {
    if (b.state === 'DESTROYED' || b.state === 'RUINS' || b.state === 'RECONSTRUCTION') return
    b.hp -= dmg
    b.dirty = true
    const ratio = b.hp / b.maxHp
    if (b.hp <= 0) {
      b.hp = 0
      b.state = 'DESTROYED'
      b.ruinsAt = Date.now() + 120_000
      this.onDestroyed(b, by)
    } else if (ratio <= 0.33 && b.state !== 'HEAVILY_DAMAGED') {
      b.state = 'HEAVILY_DAMAGED'
      this.gs.broadcast('toast', { msg: `${b.label} est gravement endommagé !`, kind: 'warning' })
    } else if (ratio <= 0.66 && b.state === 'INTACT') {
      b.state = 'DAMAGED'
    }
  }

  private onDestroyed(b: BuildingEnt, by: string) {
    // La destruction a un coût économique durable
    if (b.economicFunction !== 'none' && b.economicFunction !== 'garde') {
      this.gs.world.prosperity = Math.max(0, this.gs.world.prosperity - INVASION.prosperityLossPerBuilding)
      this.gs.world.dirty = true
    }
    this.gs.broadcast('toast', { msg: `${b.label} a été DÉTRUIT !`, kind: 'death' })
    this.gs.broadcast('chat', { from: 'Système', text: `${b.label} est détruit (${by}). Il faudra le reconstruire.`, at: Date.now() })
    this.gs.event.onBuildingDestroyed(b, by)
  }

  tick(dt: number, _now: number) {
    for (const b of this.gs.buildings.values()) {
      if (b.state === 'DESTROYED' && b.ruinsAt && Date.now() > b.ruinsAt) {
        b.state = 'RUINS'
        b.dirty = true
        this.gs.broadcast('toast', { msg: `${b.label} tombe en ruines.`, kind: 'info' })
      }
      // Bâtisseurs PNJ : progression continue si un forgeron/apprenti vit
      const pr = this.gs.projects.get(b.id)
      if (pr && pr.active && b.state === 'RECONSTRUCTION') {
        const builderAlive = [...this.gs.npcs.values()].some(
          (n) => n.lifeState === 'ALIVE' && (n.profession === 'forgeron' || n.profession === 'apprenti'),
        )
        if (builderAlive) {
          pr.progress = Math.min(100, pr.progress + NPC_BUILDER_PCT * dt)
          pr.dirty = true
          if (pr.progress >= 100) this.completeReconstruction(b, pr)
        }
      }
    }
  }

  // ── Dépôt de matériaux (serveur-autoritaire, jamais le client) ──
  async deposit(p: PlayerEnt, d: DepositIntent) {
    const b = this.gs.buildings.get(d.buildingId)
    if (!b) return
    if (!['bois', 'pierre', 'fer'].includes(d.material)) return
    const amount = Math.floor(Number(d.amount))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 50) return
    const have = p.inventory[d.material] ?? 0
    if (have <= 0) {
      this.gs.sendToPlayer(p, 'toast', { msg: `Vous n'avez pas de ${d.material}.`, kind: 'error' })
      return
    }
    if (Math.hypot(p.x - b.x, p.z - b.z) > 7) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Approchez-vous du chantier pour déposer.', kind: 'error' })
      return
    }
    if (b.hp >= b.maxHp && b.state !== 'RUINS') {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Ce bâtiment est en bon état.', kind: 'info' })
      return
    }

    // Coût total requis pour ce type
    const cost = RECONSTRUCTION_COSTS[b.type] ?? { bois: 30, pierre: 20, fer: 5 }
    let pr = this.gs.projects.get(b.id)
    if (!pr) {
      pr = { buildingId: b.id, required: cost, deposited: { bois: 0, pierre: 0, fer: 0 }, progress: 0, active: true, dirty: true }
      this.gs.projects.set(b.id, pr)
      await prisma.constructionProject.upsert({
        where: { buildingId: b.id },
        create: {
          buildingId: b.id, requiredBois: cost.bois, requiredPierre: cost.pierre, requiredFer: cost.fer,
          depositedBois: 0, depositedPierre: 0, depositedFer: 0, progress: 0, active: true,
        },
        update: {
          requiredBois: cost.bois, requiredPierre: cost.pierre, requiredFer: cost.fer,
          depositedBois: 0, depositedPierre: 0, depositedFer: 0, progress: 0, active: true,
        },
      })
      pr.dirty = false
    }

    const need = cost[d.material] - pr.deposited[d.material]
    const give = Math.min(need, have, amount)
    if (give <= 0) {
      this.gs.sendToPlayer(p, 'toast', { msg: `Assez de ${d.material} déposé déjà.`, kind: 'info' })
      return
    }
    pr.deposited[d.material] += give
    p.inventory[d.material] = have - give
    p.dirty = true
    pr.dirty = true

    // Progression = ratio total déposé / total requis
    const totReq = cost.bois + cost.pierre + cost.fer
    const totDep = pr.deposited.bois + pr.deposited.pierre + pr.deposited.fer
    pr.progress = Math.min(99, (totDep / totReq) * 100)

    if (b.state === 'DESTROYED' || b.state === 'RUINS') b.state = 'RECONSTRUCTION'
    b.dirty = true

    this.gs.broadcast('project_update', { id: b.id, progress: pr.progress, deposited: pr.deposited, required: pr.required, state: b.state })
    this.gs.sendToPlayer(p, 'toast', { msg: `Déposé : ${give} ${d.material} (${Math.round(pr.progress)} %).`, kind: 'info' })
    this.gs.gen3ia.logWorld(`Des matériaux arrivent au chantier de ${b.label}.`)
  }

  // ── Coup de main joueur au chantier ──
  work(p: PlayerEnt, w: WorkIntent, now: number) {
    const b = this.gs.buildings.get(w.buildingId)
    if (!b || b.state !== 'RECONSTRUCTION') {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Aucun chantier actif ici.', kind: 'info' })
      return
    }
    if (Math.hypot(p.x - b.x, p.z - b.z) > 7) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Approchez-vous du chantier.', kind: 'error' })
      return
    }
    const last = this.lastWorkAt.get(p.characterId) ?? 0
    if (now - last < 1000) return
    this.lastWorkAt.set(p.characterId, now)
    const pr = this.gs.projects.get(b.id)
    if (!pr) return
    // On ne travaille efficacement que si les matériaux nécessaires sont là (au prorata)
    const totReq = pr.required.bois + pr.required.pierre + pr.required.fer
    const totDep = pr.deposited.bois + pr.deposited.pierre + pr.deposited.fer
    const cap = Math.max(4, (totDep / totReq) * 100)
    pr.progress = Math.min(cap, pr.progress + WORK_BONUS_PCT)
    pr.dirty = true
    if (pr.progress >= 100) this.completeReconstruction(b, pr)
    else this.gs.broadcast('project_update', { id: b.id, progress: pr.progress, deposited: pr.deposited, required: pr.required, state: b.state })
  }

  private completeReconstruction(b: BuildingEnt, pr: ProjectEnt) {
    pr.progress = 100
    pr.active = false
    pr.dirty = true
    b.state = 'RESTORED'
    b.hp = b.maxHp
    b.dirty = true
    void prisma.constructionProject.update({ where: { buildingId: b.id }, data: { progress: 100, active: false } })
    this.gs.world.prosperity = Math.min(200, this.gs.world.prosperity + 4)
    this.gs.world.dirty = true
    this.gs.broadcast('toast', { msg: `${b.label} est RECONSTRUIT !`, kind: 'level' })
    this.gs.broadcast('chat', { from: 'Système', text: `${b.label} renaît de ses cendres. La prospérité remonte.`, at: Date.now() })
    this.gs.broadcast('project_update', { id: b.id, progress: 100, deposited: pr.deposited, required: pr.required, state: b.state })
    this.gs.gen3ia.logWorld(`${b.label} a été reconstruite par les habitants et les aventuriers.`)
  }
}
