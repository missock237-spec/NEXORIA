// NEXORIA — world-sim : GameServer (autorité centrale)
// Boucle de simulation 15 Hz. Le client n'envoie que des INTENTIONS.
// Toute position, tout dégât, tout loint, toute mort est calculé ICI.

import { Server, Socket } from 'socket.io'
import {
  COMBAT, DAY_LENGTH_S, DUNGEON, MINI_BOSS, MONSTER, MONSTER_SPAWNS,
  MOVE, SPAWN_POINTS, TIME_SCALE, WORLD_ID, heightAt,
} from '../../src/lib/game/province/world-data'
import { computeStats, xpForNextLevel } from '../../src/lib/game/stats'
import type {
  AdminIntent, AttackIntent, ChatIntent, DepositIntent, InteractIntent,
  MonsterEnt, MoveIntent, PlayerEnt, ProjectEnt, Snapshot, WorkIntent,
  BuildingEnt, DungeonEnt, NpcEnt, WorldEventEnt, WorldStateEnt,
} from './protocol'
import { flushDirty, loadOrSeedWorld, prisma } from './persistence'
import { CombatService } from './services/CombatService'
import { NpcService } from './services/NpcService'
import { BuildingService } from './services/BuildingService'
import { EventService } from './services/EventService'
import { DungeonService } from './services/DungeonService'
import { Gen3iaService } from './services/Gen3ia'

const TICK_MS = 66 // ~15 Hz
const SNAP_EVERY = 3 // snapshot toutes les 3 ticks (5 Hz)
const FLUSH_EVERY = 150 // ~10 s
const INTEREST_RADIUS = 130
const GRACE_MS = 45_000 // délai de reconnexion

function dist(ax: number, az: number, bx: number, bz: number) {
  return Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v))
}

export class GameServer {
  io: Server
  world!: WorldStateEnt
  npcs = new Map<string, NpcEnt>()
  buildings = new Map<string, BuildingEnt>()
  projects = new Map<string, ProjectEnt>()
  dungeon!: DungeonEnt
  events: WorldEventEnt[] = []
  players = new Map<string, PlayerEnt>()
  monsters = new Map<string, MonsterEnt>()

  npc!: NpcService
  combat!: CombatService
  building!: BuildingService
  event!: EventService
  dungeonSrv!: DungeonService
  gen3ia!: Gen3iaService

  private tickCount = 0
  private lastTickAt = Date.now()
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(io: Server) {
    this.io = io
  }

  // ── INIT ──
  async init() {
    const loaded = await loadOrSeedWorld()
    this.world = loaded.world
    this.npcs = loaded.npcs
    this.buildings = loaded.buildings
    this.projects = loaded.projects
    this.dungeon = loaded.dungeon
    this.events = loaded.events

    // Monstres sauvages (respawn autorisé pour les monstres, JAMAIS pour les PNJ)
    for (const sp of MONSTER_SPAWNS) {
      const id = `mon_${sp.id}`
      this.monsters.set(id, {
        id, spawnId: sp.id, typeId: MONSTER.typeId, name: MONSTER.name,
        level: MONSTER.level, hp: MONSTER.hp, maxHp: MONSTER.hp,
        damage: MONSTER.damage, speed: MONSTER.speed,
        x: sp.x, z: sp.z, homeX: sp.x, homeZ: sp.z,
        state: 'idle', targetKind: null, targetId: null, lastAttackAt: 0,
        dead: false, respawnAt: 0, raider: false, eventId: null, dirty: false,
      })
    }
    // Mini-boss (état persistant : mort tant que respawnAt n'est pas atteint)
    if (this.dungeon.bossAlive || this.dungeon.bossRespawnAt <= Date.now()) {
      this.monsters.set(`mon_${MINI_BOSS.id}`, {
        id: `mon_${MINI_BOSS.id}`, spawnId: null, typeId: MINI_BOSS.typeId, name: MINI_BOSS.name,
        level: MINI_BOSS.level, hp: MINI_BOSS.hp, maxHp: MINI_BOSS.hp,
        damage: MINI_BOSS.damage, speed: MINI_BOSS.speed,
        x: MINI_BOSS.homeX, z: MINI_BOSS.homeZ, homeX: MINI_BOSS.homeX, homeZ: MINI_BOSS.homeZ,
        state: 'idle', targetKind: null, targetId: null, lastAttackAt: 0,
        dead: !this.dungeon.bossAlive, respawnAt: this.dungeon.bossRespawnAt,
        raider: false, eventId: null, dirty: false,
      })
      this.dungeon.bossAlive = !this.monsters.get(`mon_${MINI_BOSS.id}`)!.dead
    }

    this.npc = new NpcService(this)
    this.combat = new CombatService(this)
    this.building = new BuildingService(this)
    this.event = new EventService(this)
    this.dungeonSrv = new DungeonService(this)
    this.gen3ia = new Gen3iaService(this)

    console.log(`[sim] Monde chargé : ${this.npcs.size} PNJ, ${this.buildings.size} bâtiments, ${this.monsters.size} monstres, jour ${this.world.dayCount}`)
  }

  start() {
    this.lastTickAt = Date.now()
    this.timer = setInterval(() => this.tick(), TICK_MS)
    console.log('[sim] Boucle de simulation démarrée (15 Hz)')
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Sauvegarde complète (arrêt gracieux) — aucune perte d'état critique. */
  async flushAll() {
    const n = await flushDirty(this.world, this.npcs, this.buildings, this.projects, this.dungeon, this.players, this.events)
    console.log(`[sim] Sauvegarde gracieuse : ${n} écritures.`)
    return n
  }

  // ── BOUCLE PRINCIPALE ──
  private tick() {
    const now = Date.now()
    const dt = Math.min(0.5, (now - this.lastTickAt) / 1000)
    this.lastTickAt = now
    this.tickCount++

    // Horloge du monde (le monde vit même sans joueur)
    this.world.timeOfDay += TIME_SCALE * dt
    if (this.world.timeOfDay >= DAY_LENGTH_S) {
      this.world.timeOfDay -= DAY_LENGTH_S
      this.world.dayCount++
      this.world.dirty = true
      this.broadcast('toast', { msg: `Jour ${this.world.dayCount} — l'aube se lève sur Solmère.`, kind: 'info' })
    }
    this.world.simTicks++

    // Récupération du budget de mouvement (anti-triche) + régénérations
    for (const p of this.players.values()) {
      p.budget = Math.min(0.3, p.budget + dt)
      if (!p.dead) {
        p.mp = Math.min(p.maxMp, p.mp + 2 * dt)
        if (now - p.lastHurtAt > 6000) p.hp = Math.min(p.maxHp, p.hp + 1.5 * dt)
        p.dirty = true
      } else if (now >= p.respawnAt) {
        this.respawnPlayer(p)
      }
    }

    this.npc.tick(dt, now)
    this.combat.tick(dt, now)
    this.building.tick(dt, now)
    this.event.tick(dt, now)
    this.gen3ia.tick(dt, now)
    this.dungeonSrv.tick(now)

    // Purge des sessions déconnectées au-delà du délai de grâce
    for (const [cid, p] of this.players) {
      if (!p.connected && now > p.graceUntil) {
        p.dirty = true
        this.players.delete(cid)
        this.broadcast('chat', { from: 'Système', text: `${p.name} a quitté la province.`, at: now })
      }
    }

    if (this.tickCount % SNAP_EVERY === 0) this.broadcastSnapshots(now)
    if (this.tickCount % FLUSH_EVERY === 0) {
      this.world.dirty = true // l'horloge du monde est persistée à chaque cycle
      void flushDirty(this.world, this.npcs, this.buildings, this.projects, this.dungeon, this.players, this.events)
    }
  }

  // ── SESSIONS ──
  async handleHello(socket: Socket, characterId: string) {
    const char = await prisma.character.findUnique({ where: { id: characterId } })
    if (!char || char.accountId !== socket.data.accountId) {
      socket.emit('kick', { reason: 'Personnage invalide ou non autorisé.' })
      return
    }
    const stats = computeStats(char.race, char.class)
    const existing = this.players.get(characterId)
    if (existing && existing.connected) {
      socket.emit('kick', { reason: 'Ce personnage est déjà connecté à la province.' })
      return
    }

    let p: PlayerEnt
    if (existing) {
      p = existing // reconnexion dans le délai de grâce
    } else {
      const saved = await prisma.provinceState.findUnique({ where: { characterId } })
      const spawn = pick(SPAWN_POINTS)
      p = {
        characterId, accountId: socket.data.accountId, name: char.name, race: char.race, class: char.class,
        level: saved?.level ?? char.level, xp: saved?.xp ?? 0,
        hp: saved?.hp ?? stats.maxHp, maxHp: stats.maxHp + (saved ? (saved.level - 1) * 14 : 0),
        mp: saved?.mp ?? stats.maxMp, maxMp: stats.maxMp,
        atk: stats.attaquePhysique, atkMag: stats.attaqueMagique, def: stats.defense, speed: stats.vitesse,
        x: saved?.x ?? spawn.x, z: saved?.z ?? spawn.z,
        gold: saved?.gold ?? 0,
        inventory: saved ? (JSON.parse(saved.inventoryJson) as Record<string, number>) : {},
        quests: saved ? (JSON.parse(saved.questsJson) as PlayerEnt['quests']) : [],
        discoveries: saved ? (JSON.parse(saved.discoveriesJson) as string[]) : [],
        deaths: saved?.deaths ?? 0, kills: saved?.kills ?? 0,
        dead: false, respawnAt: 0, lastSeq: 0, lastAttackAt: 0, lastSkillAt: 0,
        budget: 0.15, lastHurtAt: 0,
        socketId: socket.id, connected: true, graceUntil: 0, dirty: true,
      }
      // Clamp maxHp calculé
      p.maxHp = stats.maxHp + (p.level - 1) * 14
      p.hp = Math.min(p.hp, p.maxHp)
      this.players.set(characterId, p)
      this.broadcast('chat', { from: 'Système', text: `${p.name} entre dans la province de Solmère.`, at: Date.now() })
    }
    p.socketId = socket.id
    p.connected = true

    socket.data.characterId = characterId
    socket.join('province')

    // Welcome : état complet autoritaire
    socket.emit('welcome', {
      self: {
        characterId: p.characterId, name: p.name, race: p.race, class: p.class,
        level: p.level, xp: p.xp, xpNext: xpForNextLevel(p.level),
        hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp,
        gold: p.gold, inventory: p.inventory, quests: p.quests,
        x: p.x, z: p.z, dead: p.dead,
      },
      world: {
        id: WORLD_ID, timeOfDay: this.world.timeOfDay, dayCount: this.world.dayCount,
        prosperity: this.world.prosperity, weather: this.world.weather,
      },
      spawn: { x: p.x, z: p.z, y: heightAt(p.x, p.z) },
      npcs: [...this.npcs.values()].map((n) => ({
        id: n.id, n: n.name, x: n.x, z: n.z, hp: n.hp, mhp: n.maxHp, p: n.profession,
        st: n.state, ls: n.lifeState, guard: n.isGuard, ins: n.inside,
      })),
      buildings: [...this.buildings.values()].map((b) => ({ id: b.id, st: b.state, hp: b.hp, mhp: b.maxHp })),
      projects: [...this.projects.values()].map((pr) => ({ id: pr.buildingId, progress: pr.progress, deposited: pr.deposited, required: pr.required })),
      dungeon: { doorState: this.dungeon.doorState, doorHp: this.dungeon.doorHp, bossAlive: this.dungeon.bossAlive, switches: this.dungeon.switches, chests: Object.keys(this.dungeon.chests) },
      events: this.events.filter((e) => e.status === 'ACTIVE'),
    })
  }

  handleDisconnect(socket: Socket) {
    const cid = socket.data.characterId as string | undefined
    if (!cid) return
    const p = this.players.get(cid)
    if (!p || p.socketId !== socket.id) return
    p.connected = false
    p.socketId = null
    p.graceUntil = Date.now() + GRACE_MS
    p.dirty = true
    void flushDirty(this.world, this.npcs, this.buildings, this.projects, this.dungeon, this.players, this.events)
  }

  // ── MOUVEMENT AUTORITAIRE (anti-triche) ──
  handleMove(socket: Socket, m: MoveIntent) {
    const p = this.players.get(socket.data.characterId)
    if (!p || p.dead || !p.connected) return
    if (!Number.isFinite(m.dx) || !Number.isFinite(m.dz) || !Number.isFinite(m.dt)) return
    const now = Date.now()
    if (m.seq <= p.lastSeq) return // anti-rejeu
    p.lastSeq = m.seq

    const used = Math.min(m.dt, 0.15, p.budget)
    if (used <= 0) return // budget épuisé : le serveur ignore (speed-hack détecté)
    p.budget -= used

    const mag = Math.min(1, Math.hypot(m.dx, m.dz))
    if (mag < 0.01) return
    const nx = m.dx / Math.hypot(m.dx, m.dz)
    const nz = m.dz / Math.hypot(m.dx, m.dz)
    const speed = m.sprint ? MOVE.sprint : MOVE.walk
    p.x = clamp(p.x + nx * mag * speed * used, -PROVINCE_LIMIT, PROVINCE_LIMIT)
    p.z = clamp(p.z + nz * mag * speed * used, -PROVINCE_LIMIT, PROVINCE_LIMIT)
    p.dirty = true
  }

  // ── COMBAT (intention validée serveur) ──
  handleAttack(socket: Socket, a: AttackIntent) {
    const p = this.players.get(socket.data.characterId)
    if (!p || p.dead) return
    this.combat.playerAttack(p, a, Date.now())
  }

  // ── INTERACTIONS (PNJ, coffres, mécanismes, pierres) ──
  handleInteract(socket: Socket, i: InteractIntent) {
    const p = this.players.get(socket.data.characterId)
    if (!p || p.dead) return
    if (i.kind === 'npc') this.gen3ia.dialogueWith(p, i.id)
    else if (i.kind === 'chest') this.dungeonSrv.openChest(p, i.id)
    else if (i.kind === 'switch') this.dungeonSrv.activateSwitch(p, i.id)
    else if (i.kind === 'lore' || i.kind === 'door_lore') this.dungeonSrv.readLore(p, i.id)
  }

  // ── RECONSTRUCTION ──
  handleDeposit(socket: Socket, d: DepositIntent) {
    const p = this.players.get(socket.data.characterId)
    if (!p || p.dead) return
    this.building.deposit(p, d)
  }
  handleWork(socket: Socket, w: WorkIntent) {
    const p = this.players.get(socket.data.characterId)
    if (!p || p.dead) return
    this.building.work(p, w, Date.now())
  }

  // ── CHAT ──
  private lastChatAt = new Map<string, number>()
  handleChat(socket: Socket, c: ChatIntent) {
    const p = this.players.get(socket.data.characterId)
    if (!p) return
    const now = Date.now()
    if (now - (this.lastChatAt.get(p.characterId) ?? 0) < 1500) return
    this.lastChatAt.set(p.characterId, now)
    const text = String(c.text ?? '').slice(0, 140).replace(/[\u0000-\u001f<>]/g, '')
    if (!text.trim()) return
    this.io.to('province').emit('chat', { from: p.name, text, at: now })
  }

  // ── ADMIN (réservé aux tests — clé requise, jamais en production) ──
  handleAdmin(socket: Socket, a: AdminIntent) {
    const GM_KEY = process.env.NEXORIA_GM_KEY || 'dev-gm-key'
    if (a.key !== GM_KEY) {
      socket.emit('toast', { msg: 'Commande refusée (clé invalide).', kind: 'error' })
      return
    }
    const args = (a.args ?? {}) as Record<string, number>
    switch (a.action) {
      case 'status':
        socket.emit('admin_result', {
          action: 'status',
          data: {
            players: this.players.size, npcsAlive: [...this.npcs.values()].filter((n) => n.lifeState !== 'DEAD').length,
            npcsDead: [...this.npcs.values()].filter((n) => n.lifeState === 'DEAD').length,
            monstersAlive: [...this.monsters.values()].filter((m) => !m.dead).length,
            buildingsDestroyed: [...this.buildings.values()].filter((b) => b.state === 'DESTROYED' || b.state === 'RUINS').length,
            activeEvents: this.events.filter((e) => e.status === 'ACTIVE').length,
            prosperity: this.world.prosperity, day: this.world.dayCount, ticks: this.world.simTicks,
          },
        })
        break
      case 'kill_npc': {
        const n = this.npcs.get(String(args.id))
        if (n && n.lifeState !== 'DEAD') {
          this.npc.killNpc(n, 'monster:gm_test', 'test de mort définitive')
          socket.emit('admin_result', { action: 'kill_npc', data: { id: args.id, lifeState: n.lifeState } })
        } else socket.emit('admin_result', { action: 'kill_npc', data: { error: 'introuvable ou déjà mort' } })
        break
      }
      case 'damage_building': {
        const b = this.buildings.get(String(args.id))
        if (b) {
          this.building.damageBuilding(b, Number(args.amount ?? 100), 'gm_test')
          socket.emit('admin_result', { action: 'damage_building', data: { id: args.id, hp: b.hp, state: b.state } })
        } else socket.emit('admin_result', { action: 'damage_building', data: { error: 'introuvable' } })
        break
      }
      case 'restore_building': {
        // Isolation de test : remet un bâtiment en état INTACT plein PV
        const b = this.buildings.get(String(args.id))
        if (b) {
          b.hp = b.maxHp
          b.state = 'INTACT'
          b.ruinsAt = null
          b.dirty = true
          this.projects.delete(b.id)
          socket.emit('admin_result', { action: 'restore_building', data: { id: args.id, state: b.state } })
        } else socket.emit('admin_result', { action: 'restore_building', data: { error: 'introuvable' } })
        break
      }
      case 'reset_dungeon': {
        // Isolation de test : porte intacte, mécanisme désarmé, coffres pleins, boss vivant
        const d = this.dungeon
        d.doorHp = 120
        d.doorState = 'INTACT'
        d.bossAlive = true
        d.bossRespawnAt = 0
        d.switches = []
        d.chests = {}
        d.dirty = true
        const boss = this.monsters.get(`mon_${MINI_BOSS.id}`)
        if (boss) {
          boss.dead = false
          boss.hp = boss.maxHp
          boss.x = MINI_BOSS.homeX
          boss.z = MINI_BOSS.homeZ
          boss.state = 'idle'
          boss.respawnAt = 0
        }
        socket.emit('admin_result', { action: 'reset_dungeon', data: { ok: true } })
        break
      }
      case 'force_invasion':
        this.event.forceInvasion('gm_test')
        socket.emit('admin_result', { action: 'force_invasion', data: { ok: true } })
        break
      case 'give_materials': {
        const p = this.players.get(socket.data.characterId)
        if (p) {
          p.inventory.bois = (p.inventory.bois ?? 0) + Number(args.bois ?? 30)
          p.inventory.pierre = (p.inventory.pierre ?? 0) + Number(args.pierre ?? 30)
          p.inventory.fer = (p.inventory.fer ?? 0) + Number(args.fer ?? 30)
          p.dirty = true
          socket.emit('admin_result', { action: 'give_materials', data: { inv: p.inventory } })
        }
        break
      }
      case 'heal': {
        // Isolation de test : remet le joueur d'aplomb (PV/mana pleins)
        const p = this.players.get(socket.data.characterId)
        if (p) {
          p.dead = false
          p.hp = p.maxHp
          p.mp = p.maxMp
          p.dirty = true
          socket.emit('admin_result', { action: 'heal', data: { hp: p.hp, maxHp: p.maxHp } })
        }
        break
      }
      case 'teleport': {
        const p = this.players.get(socket.data.characterId)
        if (p) {
          p.x = Number(args.x); p.z = Number(args.z); p.dirty = true
          socket.emit('admin_result', { action: 'teleport', data: { x: p.x, z: p.z } })
        }
        break
      }
      default:
        socket.emit('admin_result', { action: a.action, data: { error: 'action inconnue' } })
    }
  }

  // ── MORT / RÉAPPARITION JOUEUR ──
  hurtPlayer(p: PlayerEnt, dmg: number, byName: string, now: number) {
    if (p.dead) return
    p.hp -= dmg
    p.lastHurtAt = now
    p.dirty = true
    this.sendToPlayer(p, 'self_hurt', { hp: p.hp, by: byName })
    if (p.hp <= 0) {
      p.hp = 0
      p.dead = true
      p.deaths++
      p.respawnAt = now + 5000
      p.dirty = true
      this.io.to('province').emit('chat', { from: 'Système', text: `${p.name} est tombé au combat.`, at: now })
      this.sendToPlayer(p, 'death', { respawnIn: 5 })
    }
  }

  private respawnPlayer(p: PlayerEnt) {
    const spawn = pick(SPAWN_POINTS)
    p.dead = false
    p.hp = p.maxHp
    p.mp = p.maxMp
    p.x = spawn.x
    p.z = spawn.z
    p.dirty = true
    this.sendToPlayer(p, 'respawn', { x: p.x, z: p.z })
  }

  // ── OUTILS DE DIFFUSION ──
  sendToPlayer(p: PlayerEnt, event: string, payload: unknown) {
    if (p.socketId) this.io.to(p.socketId).emit(event, payload)
  }
  broadcast(event: string, payload: unknown) {
    this.io.to('province').emit(event, payload)
  }
  addXp(p: PlayerEnt, xp: number) {
    p.xp += xp
    while (p.xp >= xpForNextLevel(p.level)) {
      p.xp -= xpForNextLevel(p.level)
      p.level++
      p.maxHp += 14
      p.atk += 2
      p.def += 1
      p.hp = p.maxHp
      p.dirty = true
      this.broadcast('toast', { msg: `${p.name} atteint le niveau ${p.level} !`, kind: 'level' })
      this.sendToPlayer(p, 'levelup', { level: p.level, hp: p.hp, maxHp: p.maxHp })
    }
    p.dirty = true
  }

  private broadcastSnapshots(now: number) {
    const playersArr = [...this.players.values()]
    for (const p of playersArr) {
      if (!p.connected) continue
      const near = (x: number, z: number) => dist(p.x, p.z, x, z) <= INTEREST_RADIUS
      const snap: Snapshot = {
        t: now,
        timeOfDay: this.world.timeOfDay,
        dayCount: this.world.dayCount,
        prosperity: this.world.prosperity,
        players: playersArr
          .filter((o) => o.connected && near(o.x, o.z))
          .map((o) => ({ id: o.characterId, n: o.name, x: o.x, z: o.z, hp: o.hp, mhp: o.maxHp, lv: o.level, rc: o.race, cl: o.class, dead: o.dead, mv: false })),
        npcs: [...this.npcs.values()]
          .filter((n) => n.lifeState !== 'DEAD' && !n.inside && near(n.x, n.z))
          .map((n) => ({ id: n.id, n: n.name, x: n.x, z: n.z, hp: n.hp, mhp: n.maxHp, p: n.profession, st: n.state, ls: n.lifeState, guard: n.isGuard, ins: n.inside })),
        monsters: [...this.monsters.values()]
          .filter((m) => !m.dead && near(m.x, m.z))
          .map((m) => ({ id: m.id, t: m.typeId, n: m.name, x: m.x, z: m.z, hp: m.hp, mhp: m.maxHp, lv: m.level, raider: m.raider })),
        self: {
          x: p.x, z: p.z, hp: Math.round(p.hp), mhp: p.maxHp, mp: Math.round(p.mp), mmp: p.maxMp,
          xp: p.xp, gold: p.gold, inv: p.inventory, dead: p.dead,
          respawnIn: p.dead ? Math.max(0, (p.respawnAt - now) / 1000) : 0,
        },
      }
      // Bâtiments + projets dans le rayon d'intérêt (états = vérité serveur)
      const bl = [...this.buildings.values()].filter((b) => near(b.x, b.z))
      if (bl.length) (snap as Snapshot & { buildings?: unknown }).buildings = bl.map((b) => ({ id: b.id, st: b.state, hp: Math.round(b.hp), mhp: b.maxHp }))
      const pr = [...this.projects.values()].filter((prj) => near((this.buildings.get(prj.buildingId))?.x ?? 9999, (this.buildings.get(prj.buildingId))?.z ?? 9999))
      if (pr.length) (snap as Snapshot & { projects?: unknown }).projects = pr.map((x) => ({ id: x.buildingId, progress: x.progress, deposited: x.deposited, required: x.required }))
      const sock = this.io.sockets.sockets.get(p.socketId!)
      if (sock) sock.emit('snapshot', snap)
    }
  }
}

const PROVINCE_LIMIT = 238
