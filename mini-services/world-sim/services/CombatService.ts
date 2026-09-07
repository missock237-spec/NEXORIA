// NEXORIA — world-sim : CombatService
// TOUT le calcul de dégâts est ici (serveur). Le client ne fait que jouer l'animation.
// Inclut l'IA des monstres (aggro, poursuite, laisse/leash, retour) et des raiders.

import { COMBAT, INVASION, MINI_BOSS, MONSTER, VILLAGE } from '../../../src/lib/game/province/world-data'
import type { AttackIntent, MonsterEnt, PlayerEnt } from '../protocol'
import type { GameServer } from '../GameServer'

export class CombatService {
  constructor(private gs: GameServer) {}

  playerAttack(p: PlayerEnt, a: AttackIntent, now: number) {
    const skill = !!a.skill
    const target = this.gs.monsters.get(a.targetId)
    const isDoor = a.targetId === 'dungeon_door'
    if (!target && !isDoor) return
    if (target && target.dead) return

    // Validation de portée + cooldown (anti-triche)
    const range = skill ? COMBAT.skillRange : COMBAT.attackRange
    const cooldown = skill ? COMBAT.skillCooldownMs : COMBAT.attackCooldownMs
    if (isDoor) {
      const door = { x: 171, z: -22 }
      if (Math.hypot(p.x - door.x, p.z - door.z) > range + 1.5) {
        this.gs.sendToPlayer(p, 'toast', { msg: 'Trop loin pour frapper la porte.', kind: 'error' })
        return
      }
      if (now - p.lastAttackAt < cooldown) return
      p.lastAttackAt = now
      this.gs.dungeonSrv.damageDoor(p, skill ? p.atkMag * COMBAT.skillDamageMult : p.atk)
      return
    }
    if (!target) return
    if (Math.hypot(p.x - target.x, p.z - target.z) > range + 0.6) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Cible hors de portée.', kind: 'error' })
      return
    }
    if (skill) {
      if (p.mp < COMBAT.skillMpCost) {
        this.gs.sendToPlayer(p, 'toast', { msg: 'Pas assez de mana.', kind: 'error' })
        return
      }
      if (now - p.lastSkillAt < COMBAT.skillCooldownMs) return
      p.lastSkillAt = now
      p.mp -= COMBAT.skillMpCost
    } else {
      if (now - p.lastAttackAt < COMBAT.attackCooldownMs) return
      p.lastAttackAt = now
    }

    // Dégâts calculés serveur (atk - défense + variance déterministe côté serveur)
    const tDef = target.typeId === 'colosse' ? 10 : 2 + target.level
    const base = skill ? p.atkMag * COMBAT.skillDamageMult : p.atk
    const dmg = Math.max(1, Math.round(base * (0.9 + Math.random() * 0.25) - tDef * 0.6))
    target.hp -= dmg
    this.gs.broadcast('combat', { by: p.characterId, byName: p.name, target: target.id, targetName: target.name, dmg, kind: skill ? 'skill' : 'melee', killed: target.hp <= 0 })
    if (target.hp <= 0) this.killMonster(target, `player:${p.characterId}`, p)
    else if (target.state === 'idle' || target.state === 'return') {
      target.state = 'chase'
      target.targetKind = 'player'
      target.targetId = p.characterId
    }
  }

  killMonster(m: MonsterEnt, killer: string, byPlayer?: PlayerEnt) {
    m.hp = 0
    m.dead = true
    m.state = 'idle'
    m.targetKind = null
    m.targetId = null
    if (m.typeId === MINI_BOSS.typeId || m.id === `mon_${MINI_BOSS.id}`) {
      // Mini-boss : respawn contrôlé par l'état persistant du donjon
      this.gs.dungeonSrv.onBossKilled(byPlayer ? byPlayer.name : killer)
    } else {
      m.respawnAt = Date.now() + MONSTER.respawnMs
    }
    // Butin serveur-autoritaire
    if (byPlayer) {
      const gold = m.typeId === MINI_BOSS.typeId
        ? MINI_BOSS.goldMin + Math.floor(Math.random() * (MINI_BOSS.goldMax - MINI_BOSS.goldMin))
        : MONSTER.goldMin + Math.floor(Math.random() * (MONSTER.goldMax - MONSTER.goldMin))
      byPlayer.gold += gold
      byPlayer.kills++
      this.gs.addXp(byPlayer, m.typeId === MINI_BOSS.typeId ? MINI_BOSS.xpReward : MONSTER.xpReward)
      const drops: string[] = [`${gold} or`]
      const inv = byPlayer.inventory
      if (m.typeId === MINI_BOSS.typeId) {
        inv.fer = (inv.fer ?? 0) + MINI_BOSS.dropFer
        inv.pierre = (inv.pierre ?? 0) + MINI_BOSS.dropPierre
        drops.push(`${MINI_BOSS.dropFer} fer`, `${MINI_BOSS.dropPierre} pierre`)
      } else {
        if (Math.random() < MONSTER.dropBois) { inv.bois = (inv.bois ?? 0) + 1; drops.push('1 bois') }
        if (Math.random() < MONSTER.dropPierre) { inv.pierre = (inv.pierre ?? 0) + 1; drops.push('1 pierre') }
        if (Math.random() < MONSTER.dropFer) { inv.fer = (inv.fer ?? 0) + 1; drops.push('1 fer') }
      }
      this.gs.gen3ia.onQuestProgress(byPlayer, m.typeId)
      this.gs.sendToPlayer(byPlayer, 'loot', { gold, drops, from: m.name })
      byPlayer.dirty = true
    }
    this.gs.broadcast('monster_died', { id: m.id, by: killer })
    // Un raider abattu fait avancer la résolution de l'invasion
    if (m.raider) {
      this.gs.event.onRaiderRemoved(m)
      this.gs.monsters.delete(m.id)
    }
  }

  // ── IA DES MONSTRES ──
  tick(dt: number, now: number) {
    for (const m of this.gs.monsters.values()) {
      if (m.dead) {
        if (m.respawnAt > 0 && now >= m.respawnAt && m.typeId !== MINI_BOSS.typeId) {
          // Respawn d'un monstre commun à son point d'apparition
          m.dead = false
          m.hp = m.maxHp
          m.x = m.homeX
          m.z = m.homeZ
          m.state = 'idle'
          m.respawnAt = 0
        }
        continue
      }

      // Raiders : marche vers le village puis siège
      if (m.raider) {
        this.tickRaider(m, dt, now)
        continue
      }

      const homeD = Math.hypot(m.x - m.homeX, m.z - m.homeZ)
      if (m.state === 'idle') {
        // Aggro : joueur le plus proche dans le rayon, ou garde
        const target = this.findAggroTarget(m)
        if (target) {
          m.state = 'chase'
          m.targetKind = target.kind
          m.targetId = target.id
        }
      } else if (m.state === 'chase' || m.state === 'attack') {
        if (homeD > 60) {
          m.state = 'return'
          m.targetKind = null
          m.targetId = null
          continue
        }
        const t = this.resolveTarget(m)
        if (!t) {
          m.state = 'return'
          m.targetKind = null
          m.targetId = null
          continue
        }
        const d = Math.hypot(m.x - t.x, m.z - t.z)
        if (d > COMBAT.monsterAttackRange) {
          m.state = 'chase'
          const sp = m.speed * dt
          m.x += ((t.x - m.x) / d) * sp
          m.z += ((t.z - m.z) / d) * sp
        } else {
          m.state = 'attack'
          if (now - m.lastAttackAt >= MONSTER.attackCooldownMs) {
            m.lastAttackAt = now
            if (t.kind === 'player') {
              const p = t.player!
              const dmg = Math.max(1, Math.round(m.damage * (0.9 + Math.random() * 0.2) - p.def * 0.5))
              this.gs.broadcast('combat', { by: m.id, byName: m.name, target: p.characterId, targetName: p.name, dmg, kind: 'monster', killed: p.hp - dmg <= 0 })
              this.gs.hurtPlayer(p, dmg, m.name, now)
            } else if (t.kind === 'npc') {
              const n = t.npc!
              const dmg = Math.max(1, Math.round(m.damage * (0.9 + Math.random() * 0.2)))
              this.gs.npc.hurtNpc(n, dmg, m, now)
            }
          }
        }
      } else if (m.state === 'return') {
        const d = Math.hypot(m.homeX - m.x, m.homeZ - m.z)
        if (d < 1.5) {
          m.state = 'idle'
          m.hp = Math.min(m.maxHp, m.hp + 5 * dt)
        } else {
          const sp = m.speed * 1.2 * dt
          m.x += ((m.homeX - m.x) / d) * sp
          m.z += ((m.homeZ - m.z) / d) * sp
        }
      }
    }
  }

  private tickRaider(m: MonsterEnt, dt: number, now: number) {
    // Objectif : bâtiment vivant le plus proche du village ; sinon maraude vers le centre
    const bs = [...this.gs.buildings.values()].filter((b) => b.state === 'INTACT' || b.state === 'DAMAGED' || b.state === 'HEAVILY_DAMAGED' || b.state === 'RESTORED')
    let bx = INVASION.target.x
    let bz = INVASION.target.z
    let best = Infinity
    for (const b of bs) {
      const d = Math.hypot(m.x - b.x, m.z - b.z)
      if (d < best) {
        best = d
        bx = b.x
        bz = b.z
      }
    }
    // Cible prioritaire : garde/joueur au contact
    const contact = this.findAggroTarget(m, 6)
    if (contact) {
      const t = contact.kind === 'player' ? { x: contact.player!.x, z: contact.player!.z } : { x: contact.npc!.x, z: contact.npc!.z }
      const d = Math.hypot(m.x - t.x, m.z - t.z)
      if (d > COMBAT.monsterAttackRange) {
        const sp = m.speed * dt
        m.x += ((t.x - m.x) / d) * sp
        m.z += ((t.z - m.z) / d) * sp
      } else if (now - m.lastAttackAt >= MONSTER.attackCooldownMs) {
        m.lastAttackAt = now
        if (contact.kind === 'player') {
          const p = contact.player!
          const dmg = Math.max(1, Math.round(m.damage * (0.9 + Math.random() * 0.2) - p.def * 0.5))
          this.gs.broadcast('combat', { by: m.id, byName: m.name, target: p.characterId, targetName: p.name, dmg, kind: 'monster', killed: p.hp - dmg <= 0 })
          this.gs.hurtPlayer(p, dmg, m.name, now)
        } else {
          this.gs.npc.hurtNpc(contact.npc!, Math.max(1, Math.round(m.damage * (0.9 + Math.random() * 0.2))), m, now)
        }
      }
      return
    }
    const d = Math.hypot(m.x - bx, m.z - bz)
    if (best <= 3.4 && bs.length) {
      // Siège : attaquer le bâtiment le plus proche
      const target = bs.reduce((acc, b) => (Math.hypot(m.x - b.x, m.z - b.z) < Math.hypot(m.x - acc.x, m.z - acc.z) ? b : acc))
      if (now - m.lastAttackAt >= 1000) {
        m.lastAttackAt = now
        this.gs.building.damageBuilding(target, INVASION.buildingDps, `monster:${m.id}`)
      }
      return
    }
    if (d > 0.1) {
      const sp = INVASION.marchSpeed * dt
      m.x += ((bx - m.x) / d) * sp
      m.z += ((bz - m.z) / d) * sp
    }
  }

  private findAggroTarget(m: MonsterEnt, radiusOverride?: number): { kind: 'player' | 'npc'; id: string; player?: PlayerEnt; npc?: import('../protocol').NpcEnt } | null {
    const r = radiusOverride ?? MONSTER.aggroRadius
    let best: { kind: 'player' | 'npc'; id: string; player?: PlayerEnt; npc?: import('../protocol').NpcEnt; d: number } | null = null
    for (const p of this.gs.players.values()) {
      if (p.dead || !p.connected) continue
      const d = Math.hypot(m.x - p.x, m.z - p.z)
      if (d <= r && (!best || d < best.d)) best = { kind: 'player', id: p.characterId, player: p, d }
    }
    for (const n of this.gs.npcs.values()) {
      if (n.lifeState !== 'ALIVE' || n.inside) continue
      if (!n.isGuard && radiusOverride === undefined) continue // les monstres n'aggro les civils qu'au contact (raiders)
      const d = Math.hypot(m.x - n.x, m.z - n.z)
      if (d <= r * (n.isGuard ? 0.8 : 1) && (!best || d < best.d)) best = { kind: 'npc', id: n.id, npc: n, d }
    }
    return best
  }

  private resolveTarget(m: MonsterEnt): { x: number; z: number; kind: 'player' | 'npc'; player?: PlayerEnt; npc?: import('../protocol').NpcEnt } | null {
    if (m.targetKind === 'player') {
      const p = this.gs.players.get(m.targetId ?? '')
      if (p && !p.dead && p.connected) return { x: p.x, z: p.z, kind: 'player', player: p }
      return null
    }
    if (m.targetKind === 'npc') {
      const n = this.gs.npcs.get(m.targetId ?? '')
      if (n && n.lifeState === 'ALIVE' && !n.inside) return { x: n.x, z: n.z, kind: 'npc', npc: n }
      return null
    }
    return null
  }
}
