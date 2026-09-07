'use client'

// NEXORIA — Province de Solmère : couche réseau client (socket.io)
// Le client envoie des INTENTIONS ; toute la vérité vient du serveur.
// Interpolation des entités distantes + prédiction locale du joueur.

import { io, Socket } from 'socket.io-client'

export interface NetEntity {
  id: string
  name: string
  x: number // position affichée (interpolée)
  z: number
  tx: number // position cible (serveur)
  tz: number
  hp: number
  mhp: number
  lv: number
  race: string
  class: string
  dead: boolean
  moving: boolean
  extra?: Record<string, unknown>
}

export interface NetBuilding { id: string; st: string; hp: number; mhp: number }
export interface NetProject { id: string; progress: number; deposited: Record<string, number>; required: Record<string, number> }
export interface NetChat { from: string; text: string; at: number }
export interface NetToast { msg: string; kind: string; at: number }
export interface NetEvent { id: string; type: string; title: string; description: string; zone: string; status: string; startedAt: number; endedAt: number | null; consequences: string[]; participants: string[] }
export interface NetSelf {
  characterId: string
  name: string
  race: string
  class: string
  level: number
  xp: number
  xpNext?: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  gold: number
  inventory: Record<string, number>
  quests: { id: string; targetName: string; need: number; have: number; rewardGold: number; rewardXp: number; done: boolean }[]
  dead: boolean
}

export type NetStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'kicked'

const INTERP_SPEED = 9 // lissage des entités distantes

class ProvinceNetwork {
  private socket: Socket | null = null
  status: NetStatus = 'idle'
  kickReason: string | null = null

  self: NetSelf | null = null
  world = { timeOfDay: 28800, dayCount: 1, prosperity: 100, weather: 'clair' }
  dungeon = { doorState: 'INTACT', doorHp: 120, bossAlive: true, switches: [] as string[], chests: [] as string[] }
  players = new Map<string, NetEntity>()
  npcs = new Map<string, NetEntity & { profession: string | null; state: string; lifeState: string; isGuard: boolean; inside: boolean }>()
  monsters = new Map<string, NetEntity & { typeId: string; raider: boolean }>()
  deadNpcs: { id: string; name: string; x: number; z: number }[] = []
  buildings = new Map<string, NetBuilding>()
  projects = new Map<string, NetProject>()
  events: NetEvent[] = []
  chat: NetChat[] = []
  toasts: NetToast[] = []
  dialogue: { npcId: string; name: string; lines: string[] } | null = null
  lootBanner: { gold: number; drops: string[]; from: string; at: number } | null = null
  levelUp: { level: number; at: number } | null = null
  deathAt = 0
  respawnIn = 0
  selfX = 0
  selfZ = 0

  private listeners = new Set<() => void>()
  private moveSeq = 1
  private welcomeResolve: (() => void) | null = null
  private currentConnect: Promise<void> | null = null
  private pendingCharacterId: string | null = null

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private notify() {
    for (const fn of this.listeners) fn()
  }

  connect(characterId: string): Promise<void> {
    // Idempotent : une connexion en cours vers le même personnage retourne la même promesse
    if (this.status === 'connecting' && this.socket && this.pendingCharacterId === characterId) return this.currentConnect ?? Promise.resolve()
    this.pendingCharacterId = characterId
    if (this.socket) this.disconnect()
    this.status = 'connecting'
    this.kickReason = null
    this.notify()
    const promise = new Promise<void>((resolve) => {
      // Préproduction : passerelle relative (Caddy → XTransformPort).
      // Dev local (:3000 direct) : socket directe sur :3003.
      const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '3000'
      const url = isLocalDev ? 'http://localhost:3003' : '/?XTransformPort=3003'
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1500,
        timeout: 8000,
      })
      this.socket = socket
      const done = () => {
        if (this.welcomeResolve) {
          this.welcomeResolve()
          this.welcomeResolve = null
        }
        this.notify()
      }
      this.welcomeResolve = done

      socket.on('connect', () => {
        console.log('[province-net] connecté — envoi de hello')
        socket.emit('hello', { characterId })
      })
      socket.on('connect_error', (e) => {
        console.log('[province-net] connect_error:', String(e.message))
        this.status = this.status === 'connecting' ? 'offline' : this.status
        this.kickReason = String(e.message)
        done()
      })
      socket.on('disconnect', () => {
        this.status = 'offline'
        this.notify()
      })
      socket.on('kick', (k: { reason: string }) => {
        this.status = 'kicked'
        this.kickReason = k?.reason ?? 'Exclu.'
        this.disconnect()
        done()
      })

      socket.on('welcome', (w) => {
        console.log('[province-net] welcome reçu —', w?.npcs?.length ?? '?', 'PNJ')
        this.status = 'online'
        this.pendingCharacterId = null
        this.self = w.self
        this.selfX = w.self.x
        this.selfZ = w.self.z
        this.world = w.world
        this.dungeon = w.dungeon
        this.events = w.events ?? []
        this.players.clear()
        this.npcs.clear()
        this.monsters.clear()
        this.buildings.clear()
        this.projects.clear()
        for (const n of w.npcs ?? []) this.npcs.set(n.id, { ...blankEntity(n.id, n.n, n.x, n.z, n.hp, n.mhp), profession: n.p, state: n.st, lifeState: n.ls, isGuard: n.guard, inside: n.ins })
        this.deadNpcs = (w.npcs ?? []).filter((n: { ls: string }) => n.ls === 'DEAD').map((n: { id: string; n: string; x: number; z: number }) => ({ id: n.id, name: n.n, x: n.x, z: n.z }))
        for (const b of w.buildings ?? []) this.buildings.set(b.id, b)
        for (const p of w.projects ?? []) this.projects.set(p.id, p)
        done()
      })

      socket.on('snapshot', (s) => this.applySnapshot(s))
      socket.on('chat', (c: NetChat) => {
        this.chat.push(c)
        if (this.chat.length > 60) this.chat.shift()
      })
      socket.on('toast', (t: NetToast) => {
        this.toasts.push({ ...t, at: Date.now() })
        if (this.toasts.length > 12) this.toasts.shift()
      })
      socket.on('dialogue', (d) => {
        this.dialogue = d
      })
      socket.on('loot', (l) => {
        this.lootBanner = { ...l, at: Date.now() }
        if (this.self) this.self.gold += 0 // la vraie valeur arrive par snapshot
      })
      socket.on('levelup', (l) => {
        this.levelUp = { level: l.level, at: Date.now() }
      })
      socket.on('death', () => {
        this.deathAt = Date.now()
      })
      socket.on('respawn', (r) => {
        this.deathAt = 0
        this.selfX = r.x
        this.selfZ = r.z
      })
      socket.on('event_start', (ev: NetEvent) => {
        this.events = [ev, ...this.events.filter((e) => e.id !== ev.id)]
      })
      socket.on('event_end', (ev: NetEvent) => {
        this.events = this.events.map((e) => (e.id === ev.id ? ev : e))
      })
      socket.on('monster_died', (m: { id: string }) => {
        this.monsters.delete(m.id)
      })
      socket.on('npc_died', (n: { id: string }) => {
        const npc = this.npcs.get(n.id)
        if (npc) npc.lifeState = 'DEAD'
      })
      socket.on('project_update', (p: NetProject & { state?: string }) => {
        this.projects.set(p.id, { id: p.id, progress: p.progress, deposited: p.deposited, required: p.required })
      })
      socket.on('self_hurt', (h: { hp: number }) => {
        if (this.self) this.self.hp = h.hp
      })
    })
    this.currentConnect = promise
    return promise
  }

  private applySnapshot(s: {
    t: number
    timeOfDay: number
    dayCount: number
    prosperity: number
    players: { id: string; n: string; x: number; z: number; hp: number; mhp: number; lv: number; rc: string; cl: string; dead: boolean }[]
    npcs: { id: string; n: string; x: number; z: number; hp: number; mhp: number; p: string | null; st: string; ls: string; guard: boolean; ins: boolean }[]
    monsters: { id: string; t: string; n: string; x: number; z: number; hp: number; mhp: number; lv: number; raider: boolean }[]
    self: { x: number; z: number; hp: number; mhp: number; mp: number; mmp: number; xp: number; gold: number; inv: Record<string, number>; dead: boolean; respawnIn: number }
    buildings?: NetBuilding[]
    projects?: NetProject[]
  }) {
    this.world.timeOfDay = s.timeOfDay
    this.world.dayCount = s.dayCount
    this.world.prosperity = s.prosperity

    if (this.self) {
      this.self.hp = s.self.hp
      this.self.maxHp = s.self.mhp
      this.self.mp = s.self.mp
      this.self.maxMp = s.self.mmp
      this.self.xp = s.self.xp
      this.self.gold = s.self.gold
      this.self.inventory = s.self.inv
      this.self.dead = s.self.dead
      this.respawnIn = s.self.respawnIn
      if (s.self.dead) this.deathAt = this.deathAt || Date.now()
      else this.deathAt = 0
      // Réconciliation douce de la prédiction locale
      const d = Math.hypot(s.self.x - this.selfX, s.self.z - this.selfZ)
      if (d > 2.5) {
        this.selfX = s.self.x
        this.selfZ = s.self.z
      } else if (d > 0.05) {
        this.selfX += (s.self.x - this.selfX) * 0.08
        this.selfZ += (s.self.z - this.selfZ) * 0.08
      }
    }

    // Joueurs distants
    const seenP = new Set<string>()
    for (const p of s.players) {
      if (p.id === this.self?.characterId) continue
      seenP.add(p.id)
      const cur = this.players.get(p.id)
      if (cur) {
        cur.tx = p.x
        cur.tz = p.z
        cur.hp = p.hp
        cur.mhp = p.mhp
        cur.dead = p.dead
      } else {
        this.players.set(p.id, { ...blankEntity(p.id, p.n, p.x, p.z, p.hp, p.mhp, p.lv, p.rc, p.cl) })
      }
    }
    for (const id of [...this.players.keys()]) if (!seenP.has(id)) this.players.delete(id)

    // PNJ
    const seenN = new Set<string>()
    for (const n of s.npcs) {
      seenN.add(n.id)
      const cur = this.npcs.get(n.id)
      if (cur) {
        cur.tx = n.x
        cur.tz = n.z
        cur.hp = n.hp
        cur.mhp = n.mhp
        cur.state = n.st
        cur.inside = n.ins
        cur.lifeState = n.ls
      } else {
        this.npcs.set(n.id, { ...blankEntity(n.id, n.n, n.x, n.z, n.hp, n.mhp), profession: n.p, state: n.st, lifeState: n.ls, isGuard: n.guard, inside: n.ins })
      }
    }
    for (const id of [...this.npcs.keys()]) if (!seenN.has(id)) this.npcs.delete(id)

    // Monstres
    const seenM = new Set<string>()
    for (const m of s.monsters) {
      seenM.add(m.id)
      const cur = this.monsters.get(m.id)
      if (cur) {
        cur.tx = m.x
        cur.tz = m.z
        cur.hp = m.hp
        cur.mhp = m.mhp
      } else {
        this.monsters.set(m.id, { ...blankEntity(m.id, m.n, m.x, m.z, m.hp, m.mhp, m.lv), typeId: m.t, raider: m.raider })
      }
    }
    for (const id of [...this.monsters.keys()]) if (!seenM.has(id)) this.monsters.delete(id)

    // Bâtiments + chantiers dans le rayon d'intérêt
    for (const b of s.buildings ?? []) this.buildings.set(b.id, b)
    for (const p of s.projects ?? []) this.projects.set(p.id, p)
  }

  // Interpolation des entités distantes (appelée chaque frame)
  interpolate(dt: number) {
    const step = Math.min(1, INTERP_SPEED * dt)
    const move = (e: { x: number; z: number; tx: number; tz: number }) => {
      e.x += (e.tx - e.x) * step
      e.z += (e.tz - e.z) * step
      e.moving = Math.hypot(e.tx - e.x, e.tz - e.z) > 0.25
    }
    for (const p of this.players.values()) move(p)
    for (const n of this.npcs.values()) if (!n.inside) move(n)
    for (const m of this.monsters.values()) move(m)
  }

  // ── Émissions (intentions) ──
  private get ready() {
    return this.socket?.connected && this.status === 'online'
  }
  sendMove(dx: number, dz: number, dt: number, sprint: boolean) {
    if (!this.ready) return
    this.socket!.emit('move', { seq: this.moveSeq++, dx, dz, dt, sprint })
  }
  sendAttack(targetId: string, skill = false) {
    if (!this.ready) return
    this.socket!.emit('attack', { targetId, skill })
  }
  sendInteract(kind: string, id: string) {
    if (!this.ready) return
    this.socket!.emit('interact', { kind, id })
  }
  sendDeposit(buildingId: string, material: string, amount: number) {
    if (!this.ready) return
    this.socket!.emit('deposit', { buildingId, material, amount })
  }
  sendWork(buildingId: string) {
    if (!this.ready) return
    this.socket!.emit('work', { buildingId })
  }
  sendChat(text: string) {
    if (!this.ready) return
    this.socket!.emit('chat', { text })
  }
  disconnect() {
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = null
    this.status = 'idle'
    this.players.clear()
    this.npcs.clear()
    this.monsters.clear()
    this.notify()
  }
}

function blankEntity(id: string, name: string, x: number, z: number, hp: number, mhp: number, lv = 1, race = '', cls = ''): NetEntity {
  return { id, name, x, z, tx: x, tz: z, hp, mhp, lv, race, class: cls, dead: false, moving: false }
}

export const provinceNet = new ProvinceNetwork()
