// NEXORIA — world-sim : Gen3ia (couche d'agents IA)
// Chaque agent possède : contexte, mémoire, objectifs, connaissances, outils, état, permissions.
// RÈGLE FONDAMENTALE : un agent PROPOSE, le GameServer DISPOSE (validateProposal).
// Aucun agent n'écrit jamais directement en base ni ne téléporte qui que ce soit.

import { VILLAGE } from '../../../src/lib/game/province/world-data'
import type { NpcEnt, PlayerEnt, QuestState } from '../protocol'
import type { GameServer } from '../GameServer'

type Proposal =
  | { kind: 'call_for_help'; npc: NpcEnt; threatName: string }
  | { kind: 'share_news'; npc: NpcEnt; line: string }
  | { kind: 'mourn'; npc: NpcEnt }
  | { kind: 'none' }

export class Gen3iaService {
  worldMemory: string[] = [] // WORLD_AGENT — journal des faits marquants
  private npcTimer = 0
  private worldTimer = 0

  constructor(private gs: GameServer) {}

  tick(dt: number, now: number) {
    // NPC_AGENT : cycle observe → propose → validation → exécution → mémoire
    this.npcTimer += dt
    if (this.npcTimer >= 4) {
      this.npcTimer = 0
      for (const n of this.gs.npcs.values()) {
        if (n.lifeState !== 'ALIVE' || n.inside) continue
        const prop = this.npcAgentObserve(n)
        if (this.validateProposal(prop)) this.npcAgentExecute(prop)
      }
    }
    // WORLD_AGENT : synthèse périodique du monde (mémoire + conseil au maire)
    this.worldTimer += dt
    if (this.worldTimer >= 60) {
      this.worldTimer = 0
      const dead = [...this.gs.npcs.values()].filter((n) => n.lifeState === 'DEAD').length
      const destroyed = [...this.gs.buildings.values()].filter((b) => b.state === 'DESTROYED' || b.state === 'RUINS').length
      this.worldMemory.push(
        `jour ${this.gs.world.dayCount} — prospérité ${Math.round(this.gs.world.prosperity)}, ${dead} habitants morts, ${destroyed} bâtiments en ruine`,
      )
      if (this.worldMemory.length > 100) this.worldMemory.shift()
    }
  }

  // ── NPC_AGENT ──
  private npcAgentObserve(n: NpcEnt): Proposal {
    // Observe : menace à proximité ?
    for (const m of this.gs.monsters.values()) {
      if (m.dead) continue
      const d = Math.hypot(m.x - n.x, m.z - n.z)
      if (d < 14) return { kind: 'call_for_help', npc: n, threatName: m.name }
    }
    // Observe : corps d'un proche récemment mort (deuil verbal)
    if (n.memory.length && n.memory[n.memory.length - 1].includes('est mort') && n.personality.bavard) {
      n.memory.push('a pleuré ses morts') // évite les répétitions
      return { kind: 'mourn', npc: n }
    }
    // Observe : un joueur proche + bavard → partage une nouvelle (mémoire→dialogue)
    if (n.personality.bavard && n.memory.length) {
      for (const p of this.gs.players.values()) {
        if (!p.connected || p.dead) continue
        if (Math.hypot(p.x - n.x, p.z - n.z) < 8) {
          return { kind: 'share_news', npc: n, line: this.npcLine(n, p) }
        }
      }
    }
    return { kind: 'none' }
  }

  /** GameServer-style validation : permissions strictes des agents. */
  private validateProposal(p: Proposal): boolean {
    switch (p.kind) {
      case 'call_for_help':
        return p.npc.lifeState === 'ALIVE' // un agent ne peut pas tuer, déplacer, ni récompenser
      case 'share_news':
        return p.npc.lifeState === 'ALIVE' && p.line.length > 0
      case 'mourn':
        return p.npc.lifeState === 'ALIVE'
      default:
        return false
    }
  }

  private npcAgentExecute(p: Proposal) {
    switch (p.kind) {
      case 'call_for_help':
        this.gs.broadcast('chat', { from: p.npc.name, text: `Au secours ! Un ${p.threatName} !`, at: Date.now() })
        p.npc.memory.push(`a crié à l'aide face à un ${p.threatName}`)
        break
      case 'share_news':
        this.gs.broadcast('chat', { from: p.npc.name, text: p.line, at: Date.now() })
        break
      case 'mourn':
        this.gs.broadcast('chat', { from: p.npc.name, text: 'Pardonne-moi… je n’ai pas la tête à causer aujourd’hui.', at: Date.now() })
        break
    }
  }

  private npcLine(n: NpcEnt, _p: PlayerEnt): string {
    const prosperity = Math.round(this.gs.world.prosperity)
    if (this.gs.event.hasActiveInvasion()) return 'Cachez-vous ! Ils arrivent !'
    if (prosperity < 60) return `${VILLAGE.name} peine depuis les attaques… chaque bras compte.`
    const last = n.memory[n.memory.length - 1]
    if (last && last.includes('est mort')) return `${last.split(' : ')[1] ?? 'Nous avons perdu quelqu’un'}. Repose en paix.`
    switch (n.profession) {
      case 'forgeron': return 'La forge chante ! Apportez-moi du fer et je vous ferai une lame digne des légendes.'
      case 'apprenti': return 'Maître Bruno dit que je progresse. Le fer, c’est toute ma vie !'
      case 'cuisiniere': return 'Un ragoût mijote à l’auberge. Ventre affamé n’a point d’oreilles !'
      case 'apothicaire': return 'Des herbes de Sylvarune, et vos blessures ne seront qu’un mauvais souvenir.'
      case 'fermier': return 'La terre donne si on la respecte. Même en ces temps sombres.'
      case 'aubergiste': return 'Chambre chaude et chope fraîche à l’Auberge du Roi-Pêcheur !'
      case 'marchand': return 'Belles marchandises, beaux prix ! Le bois et la pierre se vendent bien, en ce moment…'
      case 'elder': return 'Solmère a traversé mille épreuves. Nous traverserons celles-ci.'
      case 'garde': return 'Rien à signaler… pour l’instant. Restez prudents au-delà des murs.'
      case 'ermite': return 'Les ruines d’Ombrecime murmurent. La pierre garde toutes les mémoires…'
      default: return 'Bonne journée, voyageur. Que les Sentinelles veillent sur vous.'
    }
  }

  // ── Dialogues à la demande (interaction E sur un PNJ) ──
  dialogueWith(p: PlayerEnt, npcId: string) {
    const n = this.gs.npcs.get(npcId)
    if (!n) return
    if (n.lifeState === 'DEAD') {
      this.gs.sendToPlayer(p, 'dialogue', { npcId: n.id, name: n.name, lines: ['…'] })
      return
    }
    if (Math.hypot(p.x - n.x, p.z - n.z) > 4.5) {
      this.gs.sendToPlayer(p, 'toast', { msg: 'Approchez-vous pour parler.', kind: 'error' })
      return
    }
    const lines: string[] = [this.npcLine(n, p)]
    // QUEST_AGENT : le maire propose une quête de chasse
    if (n.profession === 'elder') {
      const q = this.offerQuest(p)
      if (q) lines.push(q)
    }
    if (n.personality.bavard && n.memory.length) {
      const last = n.memory[n.memory.length - 1]
      if (last.includes('jour')) lines.push(`Vous savez… ${last.split(' : ')[1] ?? last}.`)
    }
    if (n.profession === 'apothicaire' && (p.inventory.potion ?? 0) < 1) {
      lines.push('Vous semblez blessé. Prenez cette potion, offerte.')
      p.inventory.potion = (p.inventory.potion ?? 0) + 1
      p.dirty = true
    }
    this.gs.sendToPlayer(p, 'dialogue', { npcId: n.id, name: n.name, lines })
  }

  // ── QUEST_AGENT — génération dynamique de quêtes de chasse ──
  private offerQuest(p: PlayerEnt): string | null {
    const active = p.quests.find((q) => !q.done)
    if (active) return `Votre quête vous attend : ${active.have}/${active.need} ${active.targetName} éliminés.`
    if (p.quests.filter((q) => q.done).length >= 5) return null
    const need = 3
    const q: QuestState = {
      id: `q_hunt_${Date.now()}`,
      kind: 'hunt',
      target: 'rodeur',
      targetName: 'Rôdeurs des Brousses',
      need,
      have: 0,
      rewardGold: 30,
      rewardXp: 80,
      done: false,
      createdAt: Date.now(),
    }
    p.quests.push(q)
    p.dirty = true
    return `Les Rôdeurs des Brousses rôdent dans Sylvarune. Abattez-en ${need} et je vous récompenserai (${q.rewardGold} or, ${q.rewardXp} XP).`
  }

  onQuestProgress(p: PlayerEnt, monsterType: string) {
    for (const q of p.quests) {
      if (q.done || q.target !== monsterType) continue
      q.have++
      if (q.have >= q.need) {
        q.done = true
        p.gold += q.rewardGold
        this.gs.addXp(p, q.rewardXp)
        this.gs.sendToPlayer(p, 'toast', { msg: `Quête accomplie : +${q.rewardGold} or, +${q.rewardXp} XP.`, kind: 'level' })
        this.gs.broadcast('chat', { from: 'Héraut', text: `${p.name} a accompli une quête de chasse.`, at: Date.now() })
      } else {
        this.gs.sendToPlayer(p, 'toast', { msg: `Quête : ${q.have}/${q.need} ${q.targetName}.`, kind: 'info' })
      }
      p.dirty = true
    }
  }

  // ── Mémoire du monde + notifications de mort ──
  logWorld(fact: string) {
    this.worldMemory.push(`jour ${this.gs.world.dayCount} — ${fact}`)
    if (this.worldMemory.length > 100) this.worldMemory.shift()
  }

  notifyDeath(n: NpcEnt, killer: string, cause: string) {
    this.logWorld(`${n.name} (${n.profession ?? 'sans métier'}) est mort : ${cause} (${killer})`)
    // les agents des proches intègrent l'événement (déjà géré par grief) ; mémoire du monde à jour
  }
}
