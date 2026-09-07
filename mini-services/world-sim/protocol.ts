// NEXORIA — world-sim : protocole réseau + entités runtime
// LE SERVEUR EST AUTORITAIRE. Le client envoie des intentions,
// jamais des états. Tout ce qui est critique est calculé ici.

import type {
  BuildingDef, NpcDef,
} from '../../../src/lib/game/province/world-data'

// ── ENTITÉS RUNTIME ──

export interface PlayerEnt {
  characterId: string
  accountId: string
  name: string
  race: string
  class: string
  level: number
  xp: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  atk: number
  atkMag: number
  def: number
  speed: number
  x: number
  z: number
  gold: number
  inventory: Record<string, number>
  quests: QuestState[]
  discoveries: string[]
  deaths: number
  kills: number
  dead: boolean
  respawnAt: number
  lastSeq: number
  lastAttackAt: number
  lastSkillAt: number
  budget: number // budget de déplacement (anti speed-hack), en secondes
  lastHurtAt: number
  socketId: string | null
  connected: boolean
  graceUntil: number
  dirty: boolean
}

export interface QuestState {
  id: string
  kind: 'hunt'
  target: string
  targetName: string
  need: number
  have: number
  rewardGold: number
  rewardXp: number
  done: boolean
  createdAt: number
}

export type NpcAiState = 'idle' | 'wander' | 'goWork' | 'work' | 'goHome' | 'sleep' | 'flee' | 'fight' | 'grief'

export interface NpcEnt {
  id: string
  name: string
  race: string
  age: number
  profession: string | null
  buildingId: string | null
  homeId: string | null
  family: string[]
  personality: Record<string, boolean>
  x: number
  z: number
  homeX: number
  homeZ: number
  workX: number
  workZ: number
  hp: number
  maxHp: number
  level: number
  faction: string
  lifeState: 'ALIVE' | 'INJURED' | 'DEAD'
  memory: string[]
  isGuard: boolean
  state: NpcAiState
  timer: number
  targetId: string | null // monstre ciblé si fight
  lastAttackAt: number
  inside: boolean
  griefUntil: number
  dirty: boolean
  deadAt: number
}

export type MonsterState = 'idle' | 'chase' | 'attack' | 'return' | 'march'

export interface MonsterEnt {
  id: string
  spawnId: string | null
  typeId: string
  name: string
  level: number
  hp: number
  maxHp: number
  damage: number
  speed: number
  x: number
  z: number
  homeX: number
  homeZ: number
  state: MonsterState
  targetKind: 'player' | 'npc' | 'building' | null
  targetId: string | null
  lastAttackAt: number
  dead: boolean
  respawnAt: number
  raider: boolean
  eventId: string | null
  dirty: boolean
}

export interface BuildingEnt {
  id: string
  type: BuildingDef['type']
  label: string
  x: number
  z: number
  rotY: number
  ownerId: string | null
  hp: number
  maxHp: number
  state: 'INTACT' | 'DAMAGED' | 'HEAVILY_DAMAGED' | 'DESTROYED' | 'RUINS' | 'RECONSTRUCTION' | 'RESTORED'
  economicFunction: string
  ruinsAt: number | null
  dirty: boolean
}

export interface ProjectEnt {
  buildingId: string
  required: { bois: number; pierre: number; fer: number }
  deposited: { bois: number; pierre: number; fer: number }
  progress: number // 0..100
  active: boolean
  dirty: boolean
}

export interface WorldStateEnt {
  timeOfDay: number
  dayCount: number
  prosperity: number
  weather: string
  simTicks: number
  dirty: boolean
}

export interface DungeonEnt {
  doorHp: number
  doorState: 'INTACT' | 'DAMAGED' | 'DESTROYED'
  bossAlive: boolean
  bossRespawnAt: number
  bossKillCount: number
  switches: string[] // ids activés (persistants)
  chests: Record<string, { openedBy: string; at: number }>
  dirty: boolean
}

export interface WorldEventEnt {
  id: string
  type: string
  title: string
  description: string
  zone: string
  status: 'ACTIVE' | 'RESOLVED' | 'CONCLUDED'
  startedAt: number
  endedAt: number | null
  consequences: string[]
  participants: string[]
}

// ── MESSAGES CLIENT → SERVEUR (intentions uniquement) ──
export interface MoveIntent { seq: number; dx: number; dz: number; dt: number; sprint: boolean }
export interface AttackIntent { targetId: string; skill?: boolean }
export interface InteractIntent { kind: 'npc' | 'chest' | 'switch' | 'door_lore' | 'lore'; id: string }
export interface DepositIntent { buildingId: string; material: 'bois' | 'pierre' | 'fer'; amount: number }
export interface WorkIntent { buildingId: string }
export interface ChatIntent { text: string }
export interface AdminIntent { key: string; action: string; args?: Record<string, unknown> }

// ── MESSAGES SERVEUR → CLIENT ──
export interface SnapPlayer { id: string; n: string; x: number; z: number; hp: number; mhp: number; lv: number; rc: string; cl: string; dead: boolean; mv: boolean }
export interface SnapNpc { id: string; n: string; x: number; z: number; hp: number; mhp: number; p: string | null; st: NpcAiState; ls: string; guard: boolean; ins: boolean }
export interface SnapMonster { id: string; t: string; n: string; x: number; z: number; hp: number; mhp: number; lv: number; raider: boolean }
export interface SnapBuilding { id: string; st: string; hp: number; mhp: number }
export interface Snapshot {
  t: number
  timeOfDay: number
  dayCount: number
  prosperity: number
  players: SnapPlayer[]
  npcs: SnapNpc[]
  monsters: SnapMonster[]
  self: { x: number; z: number; hp: number; mhp: number; mp: number; mmp: number; xp: number; gold: number; inv: Record<string, number>; dead: boolean; respawnIn: number }
}
export interface CombatFeedItem { by: string; byName: string; target: string; targetName: string; dmg: number; kind: string; killed: boolean }
