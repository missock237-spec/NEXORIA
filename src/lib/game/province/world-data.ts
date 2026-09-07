// NEXORIA — VERTICAL SLICE « PROVINCE DE SOLMÈRE »
// Source UNIQUE de vérité partagée entre le serveur de simulation
// (mini-services/world-sim) et le client 3D. Auto-contenu : AUCUN import.
// Tous les états critiques restent autorités côté serveur ; ce module
// ne décrit que la géographie et les définitions initiales.

export const PROVINCE_SIZE = 480 // mètres (de -240 à +240)
export const WORLD_ID = 'solmere'
export const DAY_LENGTH_S = 86400 // 1 jour = 86400 s de jeu (24 min réelles à TIME_SCALE=60)
export const TIME_SCALE = 60 // 1 s réelle = 60 s en jeu

// ── Zones géographiques ──
export const VILLAGE = { name: 'Solmère', x: 0, z: 40, radius: 58, flatH: 2.4 }
export const FOREST = { name: 'Forêt de Sylvarune', x: -140, z: -110, radius: 95 }
export const CITY = { name: 'Pierrefont', x: 150, z: 130, radius: 52, flatH: 3.2 }
export const DUNGEON = {
  id: 'ombrecime',
  name: "Ruines d'Ombrecime",
  x: 185, z: -40,
  entranceX: 168, entranceZ: -18,
  doorX: 171, doorZ: -22,
  rooms: [
    { id: 'r1', x: 172, z: -40, r: 9, label: 'Salle du mécanisme' },
    { id: 'r2', x: 185, z: -52, r: 8, label: 'Chambre du coffre' },
    { id: 'boss', x: 202, z: -44, r: 12, label: 'Arène du Colosse' },
  ],
  switchPos: { x: 172, z: -42 },
  chestPos: { x: 187, z: -54 },
  loreStones: [
    { x: 174, z: -34, text: "Ici reposait la garde d'Ombrecime. Que nul n'éveille la pierre." },
    { x: 196, z: -36, text: 'Le Colosse veille depuis mille hivers. Ne brisez pas le silence.' },
  ],
}

// ── Mouvement / combat (règles serveur-autoritaires) ──
export const MOVE = { walk: 6.0, sprint: 9.6 }
export const COMBAT = {
  attackRange: 3.2,
  attackCooldownMs: 900,
  skillRange: 6.0,
  skillCooldownMs: 6000,
  skillMpCost: 12,
  skillDamageMult: 1.8,
  monsterAttackRange: 2.6,
  monsterAttackCooldownMs: 1400,
  interactRadius: 3.2,
}

// ── Hauteur du terrain — FONCTION PARTAGÉE (identique client/serveur) ──
function smoothstep(a: number, b: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}
function flatBlend(x: number, z: number, cx: number, cz: number, r: number, h: number, base: number) {
  const d = Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz))
  const t = smoothstep(r * 0.55, r, d)
  return base + (h - base) * t
}
export function heightAt(x: number, z: number): number {
  let h =
    3.0 * Math.sin(x * 0.02) * Math.cos(z * 0.023) +
    1.6 * Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.041) +
    0.8 * Math.sin((x + z) * 0.09)
  const dd = Math.sqrt((x - DUNGEON.x) ** 2 + (z - DUNGEON.z) ** 2)
  if (dd < 46) h -= (1 - smoothstep(12, 46, dd)) * 4.2
  h = flatBlend(x, z, VILLAGE.x, VILLAGE.z, VILLAGE.radius, VILLAGE.flatH, h)
  h = flatBlend(x, z, CITY.x, CITY.z, CITY.radius, CITY.flatH, h)
  return h
}

// ── Points d'apparition sûrs du village (≥ 6, validés) ──
export const SPAWN_POINTS = [
  { id: 'spawn_1', x: -6, z: 40 },
  { id: 'spawn_2', x: 6, z: 44 },
  { id: 'spawn_3', x: 0, z: 34 },
  { id: 'spawn_4', x: 12, z: 36 },
  { id: 'spawn_5', x: -12, z: 46 },
  { id: 'spawn_6', x: 4, z: 52 },
]

// ── Bâtiments destructibles/reconstructibles ──
export interface BuildingDef {
  id: string
  type: 'forge' | 'maison' | 'auberge' | 'marche' | 'garde' | 'tour' | 'comptoir' | 'entrepot' | 'caserne'
  label: string
  x: number
  z: number
  rotY: number
  maxHp: number
  economicFunction: string
}
export const BUILDINGS: BuildingDef[] = [
  { id: 'forge_solmere', type: 'forge', label: 'Forge de Solmère', x: -12, z: 30, rotY: 0.3, maxHp: 500, economicFunction: 'forge' },
  { id: 'maison_bruno', type: 'maison', label: 'Maison de Bruno', x: 18, z: 28, rotY: -0.2, maxHp: 320, economicFunction: 'logement' },
  { id: 'maison_helene', type: 'maison', label: "Maison d'Hélène", x: -30, z: 52, rotY: 0.5, maxHp: 320, economicFunction: 'logement' },
  { id: 'auberge_solmere', type: 'auberge', label: 'Auberge du Roi-Pêcheur', x: 8, z: 58, rotY: 0, maxHp: 460, economicFunction: 'auberge' },
  { id: 'marche_solmere', type: 'marche', label: 'Marché de Solmère', x: -4, z: 16, rotY: 0, maxHp: 260, economicFunction: 'marche' },
  { id: 'poste_garde', type: 'garde', label: 'Poste de garde', x: 28, z: 48, rotY: -0.4, maxHp: 400, economicFunction: 'garde' },
  { id: 'maison_eldwin', type: 'maison', label: "Ferme d'Eldwin", x: -24, z: 20, rotY: 0.9, maxHp: 320, economicFunction: 'ferme' },
  { id: 'tour_guet', type: 'tour', label: 'Tour de guet', x: -2, z: 74, rotY: 0, maxHp: 560, economicFunction: 'garde' },
  { id: 'comptoir_pierrefont', type: 'comptoir', label: 'Comptoir de Pierrefont', x: 150, z: 128, rotY: 0.2, maxHp: 480, economicFunction: 'marche' },
  { id: 'caserne_pierrefont', type: 'caserne', label: 'Caserne de Pierrefont', x: 162, z: 142, rotY: -0.3, maxHp: 520, economicFunction: 'garde' },
  { id: 'entrepot_pierrefont', type: 'entrepot', label: 'Entrepôt du port', x: 140, z: 145, rotY: 0, maxHp: 440, economicFunction: 'entrepot' },
]

// Enceinte de Pierrefont (segments déterministes, brèche sud = porte)
export const CITY_WALLS = (() => {
  const segs: { id: string; x: number; z: number; rotY: number; maxHp: number }[] = []
  const n = 14
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    if (a > 1.35 && a < 1.8) continue // brèche de la porte
    const x = CITY.x + Math.cos(a) * CITY.radius
    const z = CITY.z + Math.sin(a) * CITY.radius
    segs.push({ id: `mur_${i}`, x, z, rotY: -a + Math.PI / 2, maxHp: 300 })
  }
  return segs
})()
export const CITY_GATE = { id: 'porte_pierrefont', x: CITY.x - CITY.radius * 0.97, z: CITY.z + CITY.radius * 0.12, maxHp: 420 }

// ── PNJ initiaux (16) — semés en base au premier démarrage ──
export interface NpcDef {
  id: string
  name: string
  race: string
  age: number
  profession: string | null
  buildingId: string | null
  homeId: string | null
  family: string[]
  personality: { brave?: boolean; bavard?: boolean; prudent?: boolean }
  x: number
  z: number
  hp: number
  isGuard: boolean
  faction: string
}
export const NPCS: NpcDef[] = [
  { id: 'npc_bruno', name: 'Bruno Forgemarteau', race: 'humain', age: 47, profession: 'forgeron', buildingId: 'forge_solmere', homeId: 'maison_bruno', family: ['npc_mira', 'npc_luka'], personality: { brave: true }, x: -12, z: 32, hp: 90, isGuard: false, faction: 'village' },
  { id: 'npc_mira', name: 'Mira Forgemarteau', race: 'humaine', age: 44, profession: 'cuisiniere', buildingId: 'auberge_solmere', homeId: 'maison_bruno', family: ['npc_bruno', 'npc_luka'], personality: { bavard: true }, x: 8, z: 56, hp: 70, isGuard: false, faction: 'village' },
  { id: 'npc_luka', name: 'Luka Ferblanc', race: 'humain', age: 17, profession: 'apprenti', buildingId: 'forge_solmere', homeId: 'maison_bruno', family: ['npc_bruno', 'npc_mira'], personality: { prudent: true }, x: -10, z: 33, hp: 55, isGuard: false, faction: 'village' },
  { id: 'npc_helene', name: 'Hélène Saugevert', race: 'elfe', age: 132, profession: 'apothicaire', buildingId: 'maison_helene', homeId: 'maison_helene', family: [], personality: { prudent: true }, x: -30, z: 54, hp: 65, isGuard: false, faction: 'village' },
  { id: 'npc_eldwin', name: 'Eldwin Champtordu', race: 'humain', age: 52, profession: 'fermier', buildingId: 'maison_eldwin', homeId: 'maison_eldwin', family: ['npc_theo'], personality: {}, x: -24, z: 22, hp: 75, isGuard: false, faction: 'village' },
  { id: 'npc_theo', name: 'Théo Champtordu', race: 'humain', age: 9, profession: 'enfant', buildingId: null, homeId: 'maison_eldwin', family: ['npc_eldwin'], personality: { bavard: true }, x: -20, z: 24, hp: 30, isGuard: false, faction: 'village' },
  { id: 'npc_roderic', name: 'Capitaine Roderic', race: 'humain', age: 58, profession: 'garde', buildingId: 'poste_garde', homeId: 'auberge_solmere', family: [], personality: { brave: true }, x: 28, z: 46, hp: 140, isGuard: true, faction: 'village' },
  { id: 'npc_tomas', name: 'Garde Tomas', race: 'humain', age: 31, profession: 'garde', buildingId: 'poste_garde', homeId: 'auberge_solmere', family: [], personality: {}, x: 26, z: 50, hp: 110, isGuard: true, faction: 'village' },
  { id: 'npc_yvon', name: 'Garde Yvon', race: 'humain', age: 27, profession: 'garde', buildingId: 'tour_guet', homeId: 'auberge_solmere', family: [], personality: {}, x: -2, z: 72, hp: 110, isGuard: true, faction: 'village' },
  { id: 'npc_anna', name: 'Anna Beaupuits', race: 'humaine', age: 38, profession: 'aubergiste', buildingId: 'auberge_solmere', homeId: 'auberge_solmere', family: [], personality: { bavard: true }, x: 9, z: 59, hp: 70, isGuard: false, faction: 'village' },
  { id: 'npc_osric', name: 'Maire Osric', race: 'humain', age: 63, profession: 'elder', buildingId: 'auberge_solmere', homeId: 'auberge_solmere', family: [], personality: { prudent: true }, x: 7, z: 57, hp: 60, isGuard: false, faction: 'village' },
  { id: 'npc_sylvin', name: 'Marchand Sylvin', race: 'humain', age: 41, profession: 'marchand', buildingId: 'marche_solmere', homeId: 'maison_bruno', family: [], personality: { bavard: true }, x: -4, z: 18, hp: 60, isGuard: false, faction: 'village' },
  { id: 'npc_pierrette', name: 'Pierrette Filontoi', race: 'humaine', age: 55, profession: 'tisserande', buildingId: 'maison_helene', homeId: 'maison_helene', family: [], personality: {}, x: -28, z: 50, hp: 60, isGuard: false, faction: 'village' },
  { id: 'npc_kael', name: 'Gardien Kael', race: 'humain', age: 36, profession: 'garde', buildingId: 'caserne_pierrefont', homeId: 'caserne_pierrefont', family: [], personality: { brave: true }, x: 162, z: 140, hp: 130, isGuard: true, faction: 'pierrefont' },
  { id: 'npc_davin', name: 'Commerçant Davin', race: 'humain', age: 48, profession: 'marchand', buildingId: 'comptoir_pierrefont', homeId: 'caserne_pierrefont', family: [], personality: { bavard: true }, x: 150, z: 130, hp: 65, isGuard: false, faction: 'pierrefont' },
  { id: 'npc_balthus', name: 'Ermite Balthus', race: 'humain', age: 71, profession: 'ermite', buildingId: null, homeId: null, family: [], personality: { prudent: true }, x: 158, z: -6, hp: 55, isGuard: false, faction: 'solitaire' },
]

// ── Monstres : le Rôdeur des Brousses (respawn autorisé — seuls les PNJ meurent à jamais) ──
export const MONSTER = {
  typeId: 'rodeur',
  name: 'Rôdeur des Brousses',
  hp: 55, level: 2, damage: 9, speed: 4.4,
  aggroRadius: 12,
  attackRange: COMBAT.monsterAttackRange,
  attackCooldownMs: COMBAT.monsterAttackCooldownMs,
  xpReward: 22, goldMin: 3, goldMax: 9,
  dropBois: 0.5, dropPierre: 0.35, dropFer: 0.18,
  respawnMs: 45000,
}
export const MONSTER_SPAWNS = [
  { id: 'ms_1', x: -120, z: -90 },
  { id: 'ms_2', x: -150, z: -120 },
  { id: 'ms_3', x: -100, z: -130 },
  { id: 'ms_4', x: -170, z: -80 },
  { id: 'ms_5', x: 60, z: -60 },
  { id: 'ms_6', x: 120, z: 20 },
  { id: 'ms_7', x: 60, z: 100 },
  { id: 'ms_8', x: -60, z: -30 },
]

// ── Mini-boss du donjon ──
export const MINI_BOSS = {
  id: 'boss_colosse',
  name: 'Colosse de Pierre',
  typeId: 'colosse',
  hp: 420, level: 8, damage: 26, speed: 3.2,
  aggroRadius: 14, attackRange: 3.4, attackCooldownMs: 2000,
  xpReward: 220, goldMin: 40, goldMax: 90,
  dropFer: 3, dropPierre: 5,
  respawnMs: 480000,
  homeX: DUNGEON.rooms[2].x, homeZ: DUNGEON.rooms[2].z,
}

// ── Coffres (états persistants — ouverts pour toujours une fois vidés) ──
export const CHESTS = [
  { id: 'chest_r2', x: DUNGEON.chestPos.x, z: DUNGEON.chestPos.z, gold: 60, fer: 2, potion: 1, lore: 'Coffre scellé des gardes d’Ombrecime.' },
  { id: 'chest_foret', x: -175, z: -140, gold: 25, bois: 3, potion: 1, lore: 'Cache d’un bûcheron disparu.' },
]

// ── Mécanisme du donjon (état persistant : activé = pour toujours) ──
export const DUNGEON_SWITCH = {
  id: 'switch_r1',
  x: DUNGEON.switchPos.x, z: DUNGEON.switchPos.z,
  unlockLore: 'Le mécanisme s’enfonce. Un grondement parcourt les ruines — la salle du Colosse est ouverte.',
}

// ── Coûts de reconstruction par type de bâtiment ──
export const RECONSTRUCTION_COSTS: Record<string, { bois: number; pierre: number; fer: number }> = {
  forge: { bois: 40, pierre: 25, fer: 10 },
  maison: { bois: 30, pierre: 15, fer: 4 },
  auberge: { bois: 45, pierre: 25, fer: 6 },
  marche: { bois: 25, pierre: 10, fer: 2 },
  garde: { bois: 20, pierre: 30, fer: 8 },
  tour: { bois: 15, pierre: 50, fer: 10 },
  comptoir: { bois: 40, pierre: 30, fer: 8 },
  caserne: { bois: 25, pierre: 40, fer: 12 },
  entrepot: { bois: 50, pierre: 20, fer: 6 },
  mur: { bois: 5, pierre: 35, fer: 2 },
}

// ── Événement mondial : invasion ──
export const INVASION = {
  waveSize: 5,
  spawnPoint: { x: -60, z: -20 },
  target: { x: VILLAGE.x, z: VILLAGE.z },
  marchSpeed: 3.4,
  buildingDps: 14,
  npcDps: 7,
  prosperityLossPerBuilding: 8,
  prosperityLossPerCivilian: 12,
  intervalMs: 8 * 60 * 1000,
}
