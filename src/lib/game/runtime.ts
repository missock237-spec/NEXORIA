// NEXORIA — État d'exécution partagé entre la scène 3D et l'interface du village
// (objet mutable hors React pour éviter les re-renders à 60 fps)
// + Mise à jour « Arènes & Suprêmes » : état de duel, boss, portail.

export const playerInput = { x: 0, z: 0, sprint: false }

export const playerState = {
  x: 0,
  z: 0,
  moving: false,
  near: null as null | {
    type: 'npc' | 'dummy' | 'arena_portal'
    id: string
    name: string
    role?: string
  },
}

// ── Combat d'arène (duel) — état mutable lu par le HUD à 10 Hz ──
export interface ArenaCombatState {
  running: boolean
  over: boolean
  result: 'win' | 'loss' | null
  playerHp: number
  playerMaxHp: number
  oppHp: number
  oppMaxHp: number
  elapsed: number // secondes
  playerHitFlash: number // timestamp du dernier coup reçu
  oppHitFlash: number
  oppTelegraph: number // 0..1 : anticipation d'attaque adverse (0 = rien)
  hazardAlert: string | null // message de danger d'arène
  comboHits: number
}

export const arenaCombat: ArenaCombatState = {
  running: false,
  over: false,
  result: null,
  playerHp: 100,
  playerMaxHp: 100,
  oppHp: 100,
  oppMaxHp: 100,
  elapsed: 0,
  playerHitFlash: 0,
  oppHitFlash: 0,
  oppTelegraph: 0,
  hazardAlert: null,
  comboHits: 0,
}

export function resetArenaCombat() {
  arenaCombat.running = false
  arenaCombat.over = false
  arenaCombat.result = null
  arenaCombat.elapsed = 0
  arenaCombat.playerHitFlash = 0
  arenaCombat.oppHitFlash = 0
  arenaCombat.oppTelegraph = 0
  arenaCombat.hazardAlert = null
  arenaCombat.comboHits = 0
}

// ── Combat de boss (Suprême) ──
export interface BossCombatState {
  running: boolean
  over: boolean
  result: 'victory' | 'defeat' | null
  bossHp: number
  bossMaxHp: number
  playerHp: number
  playerMaxHp: number
  elapsed: number
  phase: number // 1..3
  phaseStart: number // temps (s) au début de la phase courante
  phaseTimes: number[] // cumul des durées par phase (s)
  window: boolean // fenêtre de tir : le boss est vulnérable
  telegraph: { x: number; z: number; t: number; r: number } | null // zone d'impact annoncée
  shockwave: number // rayon courant de l'onde de choc (0 = inactive)
  gravityPull: number // 0..1 intensité d'aspiration
  hitFlash: number
  bossHitFlash: number
}

export const bossCombat: BossCombatState = {
  running: false,
  over: false,
  result: null,
  bossHp: 100,
  bossMaxHp: 100,
  playerHp: 100,
  playerMaxHp: 100,
  elapsed: 0,
  phase: 1,
  phaseStart: 0,
  phaseTimes: [],
  window: false,
  telegraph: null,
  shockwave: 0,
  gravityPull: 0,
  hitFlash: 0,
  bossHitFlash: 0,
}

export function resetBossCombat() {
  bossCombat.running = false
  bossCombat.over = false
  bossCombat.result = null
  bossCombat.elapsed = 0
  bossCombat.phase = 1
  bossCombat.phaseStart = 0
  bossCombat.phaseTimes = []
  bossCombat.window = false
  bossCombat.telegraph = null
  bossCombat.shockwave = 0
  bossCombat.gravityPull = 0
  bossCombat.hitFlash = 0
  bossCombat.bossHitFlash = 0
}

// Attaque du joueur (déclenchée par touche/bouton, consommée par la scène 3D)
export const combatActions = { playerAttack: 0 }

export function requestAttack() {
  combatActions.playerAttack++
}

export function resetInput() {
  playerInput.x = 0
  playerInput.z = 0
  playerInput.sprint = false
  playerState.near = null
  playerState.moving = false
  combatActions.playerAttack = 0
}

// Hook de debug/test (inspectable via window.__nx)
if (typeof window !== 'undefined') {
  ;(window as unknown as { __nx: unknown }).__nx = {
    playerState,
    playerInput,
    arenaCombat,
    bossCombat,
  }
}
