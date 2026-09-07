// NEXORIA — world-sim : NpcService
// Routines quotidiennes des PNJ (travail/maison/sommeil), gardes (patrouille/combat),
// fuite des civils, deuil des familles — et MORT DÉFINITIVE :
// un PNJ mort ne respawn JAMAIS. Ses conséquences persistent dans le monde.

import { DAY_LENGTH_S, VILLAGE } from '../../../src/lib/game/province/world-data'
import { prisma } from '../persistence'
import type { MonsterEnt, NpcEnt } from '../protocol'
import type { GameServer } from '../GameServer'

const WALK_CIV = 3.2
const WALK_GUARD = 4.6
const WALK_FLEE = 5.4

export class NpcService {
  constructor(private gs: GameServer) {}

  tick(dt: number, now: number) {
    const t = this.gs.world.timeOfDay
    for (const n of this.gs.npcs.values()) {
      if (n.lifeState === 'DEAD') continue

      // Blessé grave : rester au sol, se soigner lentement (état INJURED persistant)
      if (n.lifeState === 'INJURED') {
        n.hp = Math.min(n.maxHp, n.hp + 1.2 * dt)
        if (n.hp >= n.maxHp * 0.55) {
          n.lifeState = 'ALIVE'
          n.dirty = true
          this.gs.broadcast('toast', { msg: `${n.name} se remet de ses blessures.`, kind: 'info' })
        }
        continue
      }

      // Menace la plus proche
      const threat = this.nearestThreat(n, n.isGuard ? 20 : 11)

      if (n.isGuard) {
        this.tickGuard(n, dt, now, threat)
      } else {
        this.tickCivilian(n, dt, now, t, threat)
      }
    }
  }

  private tickCivilian(n: NpcEnt, dt: number, now: number, t: number, threat: MonsterEnt | null) {
    // Deuil : la famille d'un PNJ mort reste au domicile pendant 2 jours en jeu
    if (n.griefUntil > 0) {
      if (now < n.griefUntil) {
        n.state = 'grief'
        this.moveTo(n, n.homeX, n.homeZ, WALK_CIV, dt)
        return
      }
      n.griefUntil = 0
      n.dirty = true
    }

    if (threat && n.state !== 'flee') {
      n.state = 'flee'
      n.timer = 8
      n.memory.push(`jour ${this.gs.world.dayCount} : attaque près de ${Math.round(n.x)},${Math.round(n.z)}`)
      n.dirty = true
      return
    }
    if (n.state === 'flee') {
      this.moveTo(n, n.homeX, n.homeZ, WALK_FLEE, dt)
      n.timer -= dt
      if (n.timer <= 0 && !threat) n.state = 'idle'
      return
    }

    // Routine par heure du jour (0..24)
    const hour = (t / 3600) % 24
    const workPos = { x: n.workX, z: n.workZ }
    const homePos = { x: n.homeX, z: n.homeZ }
    if (hour >= 7 && hour < 12) {
      if (n.state === 'sleep' || n.state === 'goHome') n.inside = false
      n.state = 'goWork'
      this.moveTo(n, workPos.x, workPos.z, WALK_CIV, dt)
      if (Math.hypot(n.x - workPos.x, n.z - workPos.z) < 2.5) {
        n.state = 'work'
        this.wander(n, workPos.x, workPos.z, 6, dt, now)
      }
    } else if (hour >= 12 && hour < 13.5) {
      // pause déjeuner près du marché/auberge
      n.inside = false
      this.moveTo(n, homePos.x + 4, homePos.z, WALK_CIV, dt)
      n.state = 'idle'
    } else if (hour >= 13.5 && hour < 19) {
      n.inside = false
      this.moveTo(n, workPos.x, workPos.z, WALK_CIV, dt)
      if (Math.hypot(n.x - workPos.x, n.z - workPos.z) < 2.5) {
        n.state = 'work'
        this.wander(n, workPos.x, workPos.z, 6, dt, now)
      }
    } else if (hour >= 19 && hour < 22) {
      n.inside = false
      this.moveTo(n, homePos.x, homePos.z, WALK_CIV, dt)
      n.state = 'goHome'
    } else {
      // nuit : à l'intérieur
      n.inside = true
      n.state = 'sleep'
      n.x = homePos.x
      n.z = homePos.z
      n.dirty = true
    }
  }

  private tickGuard(n: NpcEnt, dt: number, now: number, threat: MonsterEnt | null) {
    const post = { x: n.workX, z: n.workZ }
    if (threat && n.state !== 'fight') {
      n.state = 'fight'
      n.targetId = threat.id
      return
    }
    if (n.state === 'fight') {
      const m = threat ?? (n.targetId ? this.gs.monsters.get(n.targetId) : null)
      if (!m || m.dead) {
        n.state = 'idle'
        n.targetId = null
        return
      }
      const d = Math.hypot(n.x - m.x, n.z - m.z)
      if (d > 2.4) {
        const sp = WALK_GUARD * dt
        n.x += ((m.x - n.x) / d) * sp
        n.z += ((m.z - n.z) / d) * sp
        n.dirty = true
      } else if (now - n.lastAttackAt >= 1200) {
        n.lastAttackAt = now
        const dmg = Math.max(2, Math.round(14 + Math.random() * 6))
        m.hp -= dmg
        this.gs.broadcast('combat', { by: n.id, byName: n.name, target: m.id, targetName: m.name, dmg, kind: 'guard', killed: m.hp <= 0 })
        if (m.hp <= 0) this.gs.combat.killMonster(m, `npc:${n.id}`)
        else if (m.state === 'idle') {
          m.state = 'chase'
          m.targetKind = 'npc'
          m.targetId = n.id
        }
      }
      return
    }
    // Patrouille autour du poste
    n.inside = false
    this.wander(n, post.x, post.z, 10, dt, now)
    n.state = 'wander'
  }

  private wander(n: NpcEnt, cx: number, cz: number, r: number, dt: number, now: number) {
    n.timer -= dt
    if (n.timer <= 0) {
      n.timer = 5 + Math.random() * 6
      const a = Math.random() * Math.PI * 2
      const rr = Math.random() * r
      n.x = cx + Math.cos(a) * rr * 0.15 + n.x * 0
      n.z = cz + Math.sin(a) * rr * 0.15
      // dérive douce vers la zone
      n.x += (cx - n.x) * 0.08
      n.z += (cz - n.z) * 0.08
      n.dirty = true
    }
  }

  private moveTo(n: NpcEnt, tx: number, tz: number, speed: number, dt: number) {
    const d = Math.hypot(tx - n.x, tz - n.z)
    if (d < 0.4) return
    const sp = Math.min(speed * dt, d)
    n.x += ((tx - n.x) / d) * sp
    n.z += ((tz - n.z) / d) * sp
    n.dirty = true
  }

  private nearestThreat(n: NpcEnt, radius: number): MonsterEnt | null {
    let best: MonsterEnt | null = null
    let bd = radius
    for (const m of this.gs.monsters.values()) {
      if (m.dead) continue
      const d = Math.hypot(m.x - n.x, m.z - n.z)
      if (d < bd) {
        bd = d
        best = m
      }
    }
    return best
  }

  // ── DÉGÂTS AUX PNJ (serveur uniquement) ──
  hurtNpc(n: NpcEnt, dmg: number, by: MonsterEnt, now: number) {
    if (n.lifeState !== 'ALIVE') return
    n.hp -= dmg
    n.dirty = true
    if (n.hp <= 0) {
      this.killNpc(n, `monster:${by.id}`, `tué par ${by.name}`)
    } else if (n.hp < n.maxHp * 0.45 && n.lifeState === 'ALIVE') {
      n.lifeState = 'INJURED'
      this.gs.broadcast('toast', { msg: `${n.name} est grièvement blessé !`, kind: 'warning' })
    } else if (!n.isGuard) {
      // déclenche la fuite immédiate
      n.state = 'flee'
      n.timer = 10
    }
  }

  // ── MORT DÉFINITIVE — jamais de respawn, conséquences persistantes ──
  killNpc(n: NpcEnt, killer: string, cause: string) {
    n.hp = 0
    n.lifeState = 'DEAD'
    n.state = 'idle'
    n.inside = false
    n.dirty = true
    const day = this.gs.world.dayCount
    const tod = this.gs.world.timeOfDay

    // 1) enregistrement irréversible en base
    void prisma.npcDeath.create({
      data: { npcId: n.id, npcName: n.name, killer, cause, dayCount: day, timeOfDay: tod },
    })
    void prisma.npc.update({
      where: { id: n.id },
      data: { lifeState: 'DEAD', hp: 0, x: n.x, z: n.z, memoryJson: JSON.stringify(n.memory.slice(-40)) },
    })

    // 2) la famille réagit (deuil 2 jours en jeu)
    for (const fid of n.family) {
      const f = this.gs.npcs.get(fid)
      if (f && f.lifeState !== 'DEAD') {
        f.griefUntil = Date.now() + (DAY_LENGTH_S / 60) * 1000 * 2 // 2 jours en jeu
        f.memory.push(`jour ${day} : ${n.name} (${f.family.includes(n.id) ? 'famille' : 'proche'}) est mort — ${cause}`)
        f.dirty = true
      }
    }

    // 3) le métier devient vacant : impact économique immédiat
    if (n.profession && n.buildingId) {
      const b = this.gs.buildings.get(n.buildingId)
      if (b && b.economicFunction !== 'none' && b.economicFunction !== 'garde') {
        this.gs.world.prosperity = Math.max(0, this.gs.world.prosperity - 6)
        this.gs.world.dirty = true
        this.gs.broadcast('toast', { msg: `Le métier de ${n.profession} est vacant — Solmère s'affaiblit.`, kind: 'warning' })
      }
    }

    // 4) conséquence événement si invasion active
    this.gs.event.onNpcDeathDuringEvent(n, killer)

    // 5) les agents Gen3ia concernés reçoivent l'information
    this.gs.gen3ia.notifyDeath(n, killer, cause)

    // 6) le monde conserve cette conséquence
    this.gs.broadcast('npc_died', { id: n.id, name: n.name, cause, day, tod })
    this.gs.broadcast('chat', { from: 'Système', text: `☠ ${n.name} est mort (${cause}). Il ne reviendra jamais.`, at: Date.now() })
    this.gs.broadcast('toast', { msg: `${n.name} est mort — mort définitive.`, kind: 'death' })
    console.log(`[permadeath] ${n.id} ${n.name} — ${cause} (jour ${day})`)
  }

  // Les PNJ ne quittent jamais la province : garde-fou anti-dérive Gen3ia
  validatePosition(n: NpcEnt): boolean {
    return Math.hypot(n.x - VILLAGE.x, n.z - VILLAGE.z) < 400
  }
}
