// NEXORIA — world-sim : EventService
// Événements mondiaux persistants. Une invasion non contenue a des
// conséquences DURABLES : bâtiments détruits, PNJ morts, prospérité en chute.

import { INVASION, MONSTER, VILLAGE } from '../../../src/lib/game/province/world-data'
import { prisma } from '../persistence'
import type { BuildingEnt, MonsterEnt, NpcEnt, WorldEventEnt } from '../protocol'
import type { GameServer } from '../GameServer'

export class EventService {
  private lastInvasionAt: number
  private activeInvasion: WorldEventEnt | null = null

  constructor(private gs: GameServer) {
    // Le WORLD_AGENT ne propose une invasion qu'après le délai initial :
    // pas d'invasion surprise juste après un redémarrage.
    this.lastInvasionAt = Date.now()
    // Un événement persistant ACTIVE trouvé au boot ne peut plus être
    // combattu (ses raiders vivaient en mémoire) : il est clos honnêtement.
    const active = this.gs.events.find((e) => e.status === 'ACTIVE' && e.type === 'INVASION')
    if (active) {
      active.status = 'CONCLUDED'
      active.endedAt = Date.now()
      active.consequences.push('interrompue par un redémarrage du serveur')
      void prisma.worldEvent.update({
        where: { id: active.id },
        data: { status: 'CONCLUDED', endedAt: new Date(active.endedAt), consequencesJson: JSON.stringify(active.consequences) },
      }).catch(() => {})
      console.log('[events] Invasion persistante clôturée au boot (raiders non recréés):', active.id)
    }
  }

  tick(_dt: number, now: number) {
    // WORLD_AGENT : propose une invasion périodique (validée par le GameServer)
    if (
      !this.activeInvasion &&
      now - this.lastInvasionAt > INVASION.intervalMs &&
      this.gs.world.prosperity >= 40 &&
      [...this.gs.players.values()].some((p) => p.connected) // au moins un témoin
    ) {
      this.startInvasion('WORLD_AGENT')
    }
  }

  startInvasion(by: string) {
    if (this.activeInvasion) return
    const now = Date.now()
    const ev: WorldEventEnt = {
      id: `evt_invasion_${now}`,
      type: 'INVASION',
      title: 'Invasion de Rôdeurs !',
      description: `Une meute de ${INVASION.waveSize} Rôdeurs des Brousses marche sur Solmère. Défendez le village !`,
      zone: 'Solmère',
      status: 'ACTIVE',
      startedAt: now,
      endedAt: null,
      consequences: [],
      participants: [],
    }
    this.activeInvasion = ev
    this.gs.events.unshift(ev)
    this.lastInvasionAt = Date.now() // le WORLD_AGENT recompte à partir de cette invasion
    void prisma.worldEvent.create({
      data: {
        id: ev.id, type: ev.type, title: ev.title, description: ev.description, zone: ev.zone,
        status: 'ACTIVE', consequencesJson: '[]', participantsJson: '[]',
      },
    })
    // Vague de raiders
    for (let i = 0; i < INVASION.waveSize; i++) {
      const id = `mon_raider_${now}_${i}`
      const jitter = () => (Math.random() - 0.5) * 10
      const m: MonsterEnt = {
        id, spawnId: null, typeId: MONSTER.typeId, name: 'Rôdeur des Brousses',
        level: MONSTER.level + 1, hp: MONSTER.hp + 15, maxHp: MONSTER.hp + 15,
        damage: MONSTER.damage + 3, speed: INVASION.marchSpeed,
        x: INVASION.spawnPoint.x + jitter(), z: INVASION.spawnPoint.z + jitter(),
        homeX: INVASION.spawnPoint.x, homeZ: INVASION.spawnPoint.z,
        state: 'march', targetKind: null, targetId: null, lastAttackAt: 0,
        dead: false, respawnAt: 0, raider: true, eventId: ev.id, dirty: false,
      }
      this.gs.monsters.set(id, m)
    }
    this.gs.broadcast('event_start', ev)
    this.gs.broadcast('toast', { msg: ev.description, kind: 'death' })
    this.gs.broadcast('chat', { from: 'Héraut', text: `${ev.description} (provoquée par ${by})`, at: now })
    this.gs.gen3ia.logWorld(`Invasion lancée (${by}) — ${INVASION.waveSize} raiders en marche vers Solmère.`)
    console.log('[events] INVASION démarrée par', by)
  }

  forceInvasion(by: string) {
    this.startInvasion(by)
  }

  private endInvasion(reason: 'repoussée' | 'conclue') {
    const ev = this.activeInvasion
    if (!ev) return
    ev.status = reason === 'repoussée' ? 'RESOLVED' : 'CONCLUDED'
    ev.endedAt = Date.now()
    void prisma.worldEvent.update({
      where: { id: ev.id },
      data: {
        status: ev.status, endedAt: new Date(ev.endedAt),
        consequencesJson: JSON.stringify(ev.consequences),
        participantsJson: JSON.stringify(ev.participants),
      },
    }).catch(() => {})
    this.gs.broadcast('event_end', ev)
    this.gs.broadcast('chat', { from: 'Héraut', text: `L'invasion est ${reason}. ${ev.consequences.length} conséquences persistantes.`, at: Date.now() })
    this.activeInvasion = null
    this.gs.gen3ia.logWorld(`Invasion ${reason} — conséquences : ${ev.consequences.join(' ; ') || 'aucune'}`)
  }

  onRaiderRemoved(m: MonsterEnt) {
    const ev = this.activeInvasion
    if (!ev || !m.raider) return
    ev.participants.push(`tué:${m.id}`)
    const raidersLeft = [...this.gs.monsters.values()].filter((x) => x.raider && x.eventId === ev.id && !x.dead)
    if (raidersLeft.length === 0) {
      ev.consequences.push('village défendu : prospérité +6')
      this.gs.world.prosperity = Math.min(200, this.gs.world.prosperity + 6)
      this.gs.world.dirty = true
      this.endInvasion('repoussée')
    }
  }

  onBuildingDestroyed(b: BuildingEnt, by: string) {
    const ev = this.activeInvasion
    if (!ev) return
    ev.consequences.push(`${b.label} détruit (${by})`)
    ev.participants.push(`bâtiment:${b.id}`)
  }

  onNpcDeathDuringEvent(n: NpcEnt, killer: string) {
    const ev = this.activeInvasion
    if (!ev) return
    ev.consequences.push(`${n.name} tué (${killer})`)
    ev.participants.push(`pnj:${n.id}`)
    // perte de prospérité durable si un civil meurt pendant l'invasion
    this.gs.world.prosperity = Math.max(0, this.gs.world.prosperity - INVASION.prosperityLossPerCivilian)
    this.gs.world.dirty = true
  }

  // les raiders morts hors invasion (nettoyage)
  cleanupDeadRaiders() {
    for (const m of [...this.gs.monsters.values()]) {
      if (m.raider && m.dead) {
        this.onRaiderRemoved(m)
        this.gs.monsters.delete(m.id)
      }
    }
  }

  /** Test interne : vérifie qu'une invasion est active. */
  hasActiveInvasion(): boolean {
    return this.activeInvasion !== null
  }
}
