// NEXORIA — world-sim : DungeonService
// Donjon PERSISTANT : une porte détruite reste détruite, un mécanisme activé
// reste activé, un coffre vidé reste vidé. Le monde enregistre tout.

import { CHESTS, COMBAT, DUNGEON, DUNGEON_SWITCH, MINI_BOSS } from '../../../src/lib/game/province/world-data'
import type { PlayerEnt } from '../protocol'
import type { GameServer } from '../GameServer'

export class DungeonService {
  constructor(private gs: GameServer) {}

  tick(now: number) {
    // Respawn du mini-boss (contrôlé, 8 min, événement consigné par killCount)
    if (!this.gs.dungeon.bossAlive && this.gs.dungeon.bossRespawnAt > 0 && now >= this.gs.dungeon.bossRespawnAt) {
      this.gs.dungeon.bossAlive = true
      this.gs.dungeon.dirty = true
      const boss = this.gs.monsters.get(`mon_${MINI_BOSS.id}`)
      if (boss) {
        boss.dead = false
        boss.hp = boss.maxHp
        boss.x = MINI_BOSS.homeX
        boss.z = MINI_BOSS.homeZ
        boss.state = 'idle'
        boss.respawnAt = 0
      }
      this.gs.broadcast('toast', { msg: 'Un grondement ancien : le Colosse de Pierre veille à nouveau.', kind: 'warning' })
    }
  }

  // ── Porte destructible (attaque validée par CombatService) ──
  damageDoor(p: PlayerEnt, dmg: number) {
    if (this.gs.dungeon.doorState === 'DESTROYED') {
      this.gs.sendToPlayer(p, 'toast', { msg: 'La porte est déjà détruite.', kind: 'info' })
      return
    }
    this.gs.dungeon.doorHp -= Math.round(dmg * 0.5)
    this.gs.dungeon.dirty = true
    if (this.gs.dungeon.doorHp <= 0) {
      this.gs.dungeon.doorHp = 0
      this.gs.dungeon.doorState = 'DESTROYED'
      this.gs.broadcast('toast', { msg: 'La porte des Ruines d’Ombrecime est DÉTRUITE — pour toujours.', kind: 'death' })
      this.gs.broadcast('chat', { from: 'Système', text: `${p.name} a détruit la porte du donjon. Les ruines sont désormais ouvertes à tous.`, at: Date.now() })
      this.gs.gen3ia.logWorld('La porte du donjon d’Ombrecime a été détruite (état permanent).')
    } else if (this.gs.dungeon.doorHp < 60 && this.gs.dungeon.doorState !== 'DAMAGED') {
      this.gs.dungeon.doorState = 'DAMAGED'
      this.gs.broadcast('toast', { msg: 'La porte du donjon se fissure…', kind: 'warning' })
    } else {
      this.gs.sendToPlayer(p, 'toast', { msg: `Porte : ${Math.max(0, Math.round(this.gs.dungeon.doorHp))} PV.`, kind: 'info' })
    }
  }

  // ── Mécanisme (persistant : une fois activé, pour toujours) ──
  activateSwitch(p: PlayerEnt, id: string) {
    if (id !== DUNGEON_SWITCH.id) return
    if (Math.hypot(p.x - DUNGEON_SWITCH.x, p.z - DUNGEON_SWITCH.z) > COMBAT.interactRadius + 1) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Trop loin du mécanisme.', kind: 'error' })
      return
    }
    if (this.gs.dungeon.switches.includes(id)) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Le mécanisme est déjà enfoncé.', kind: 'info' })
      return
    }
    this.gs.dungeon.switches.push(id)
    this.gs.dungeon.dirty = true
    this.gs.broadcast('toast', { msg: DUNGEON_SWITCH.unlockLore, kind: 'level' })
    this.gs.broadcast('chat', { from: 'Système', text: `${p.name} a activé le mécanisme des ruines. La salle du Colosse est ouverte (permanence).`, at: Date.now() })
    this.gs.gen3ia.logWorld(`Mécanisme d'Ombrecime activé par ${p.name} (état permanent).`)
  }

  // ── Coffres (état persistant : vidés une seule fois) ──
  openChest(p: PlayerEnt, id: string) {
    const chest = CHESTS.find((c) => c.id === id)
    if (!chest) return
    if (Math.hypot(p.x - chest.x, p.z - chest.z) > COMBAT.interactRadius + 1) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Trop loin du coffre.', kind: 'error' })
      return
    }
    if (this.gs.dungeon.chests[id]) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Ce coffre a déjà été vidé.', kind: 'info' })
      return
    }
    this.gs.dungeon.chests[id] = { openedBy: p.name, at: Date.now() }
    this.gs.dungeon.dirty = true
    p.gold += chest.gold
    if (chest.fer) p.inventory.fer = (p.inventory.fer ?? 0) + chest.fer
    if (chest.bois) p.inventory.bois = (p.inventory.bois ?? 0) + chest.bois
    if (chest.potion) p.inventory.potion = (p.inventory.potion ?? 0) + chest.potion
    p.dirty = true
    p.discoveries.push(`coffre:${id}`)
    this.gs.sendToPlayer(p, 'loot', { gold: chest.gold, drops: [`${chest.fer ?? 0} fer`, `${chest.bois ?? 0} bois`, `${chest.potion ?? 0} potion`], from: chest.lore })
    this.gs.gen3ia.logWorld(`${p.name} a ouvert le coffre ${id}.`)
  }

  // ── Pierres gravées (lore) ──
  readLore(p: PlayerEnt, id: string) {
    const idx = Number(String(id).replace('lore_', '')) - 1
    const stone = DUNGEON.loreStones[idx]
    if (!stone) return
    if (Math.hypot(p.x - stone.x, p.z - stone.z) > COMBAT.interactRadius + 1.5) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Approchez-vous de la pierre gravée.', kind: 'error' })
      return
    }
    this.gs.sendToPlayer(p, 'dialogue', { npcId: 'lore', name: 'Pierre gravée', lines: [stone.text] })
    const key = `lore_${id}`
    if (!p.discoveries.includes(key)) {
      p.discoveries.push(key)
      p.xp += 10
      p.dirty = true
      this.gs.sendToPlayer(p, 'toast', { msg: 'Découvrir consigné (+10 XP).', kind: 'info' })
    }
  }

  // ── Mort du mini-boss (consignée dans l'état persistant du donjon) ──
  onBossKilled(byName: string) {
    const d = this.gs.dungeon
    d.bossAlive = false
    d.bossRespawnAt = Date.now() + MINI_BOSS.respawnMs
    d.bossKillCount++
    d.dirty = true
    this.gs.broadcast('toast', { msg: `Le Colosse de Pierre s'effondre ! (victoire n°${d.bossKillCount}, par ${byName})`, kind: 'level' })
    this.gs.broadcast('chat', { from: 'Héraut', text: `${byName} a terrassé le Colosse de Pierre ! Il renaîtra dans 8 minutes — la pierre, elle, se souviendra.`, at: Date.now() })
    this.gs.gen3ia.logWorld(`Colosse vaincu par ${byName} — killCount=${d.bossKillCount}.`)
  }

  isBossRoomOpen(): boolean {
    return this.gs.dungeon.switches.includes(DUNGEON_SWITCH.id)
  }
}
