// NEXORIA — Les 5 Arènes de Combat
// Données officielles issues de l'affiche « Les 5 Arènes de Combat ».
// 5 lieux. 5 ambiances. 1 seul objectif : prouver ta valeur.
// Le serveur est autoritaire : formats, niveaux et récompenses validés côté API.

export type ArenaId =
  | 'sommets_celestes'
  | 'volcan'
  | 'foret_eternelle'
  | 'ruines_anciennes'
  | 'glaces_eternelles'

export type DuelFormat = '1v1' | '2v2' | '3v3'

export type HazardKind =
  | 'moving_platforms' // plateformes mobiles
  | 'wind_gusts' // vents puissants
  | 'unstable_ground' // sol instable
  | 'lava_geysers' // geysers de lave
  | 'extreme_heat' // chaleur extrême
  | 'camouflage_zones' // zones de camouflage
  | 'natural_traps' // pièges naturels
  | 'moving_obstacles' // obstacles mobiles
  | 'traps' // pièges
  | 'illusions' // illusions
  | 'slippery_floor' // sol glissant
  | 'snowstorms' // tempêtes de neige

export interface ArenaDef {
  id: ArenaId
  index: number
  name: string
  tagline: string
  motto: string
  type: DuelFormat[]
  environment: string
  theme: string
  recommendedLevel: number
  features: string[]
  hazards: HazardKind[]
  // Identité visuelle 3D (déterministe, basée sur l'affiche)
  visuals: {
    skyTop: string
    skyBottom: string
    fogColor: string
    groundColor: string
    ringColor: string
    accentColor: string // couleur d'accent de l'arène (bannières, liserés)
    emblem: 'wing' | 'flame' | 'leaf' | 'eye' | 'snowflake'
    ambient: number // intensité lumière ambiante
  }
  // Équilibrage serveur (l'IA adverse et les récompenses en découlent)
  balance: {
    baseRating: number // rating moyen des gladiateurs de cette arène
    rewardGold: number // or de base par victoire
    ratingStake: number // points d'Elo mis en jeu
  }
}

export const ARENAS: Record<ArenaId, ArenaDef> = {
  sommets_celestes: {
    id: 'sommets_celestes',
    index: 1,
    name: 'Arène des Sommets Célestes',
    tagline: 'Un duel au sommet, entre ciel et nuages.',
    motto: 'Là-haut, seul l’horizon juge.',
    type: ['1v1'],
    environment: 'Îles flottantes',
    theme: 'Ciel / Lumière',
    recommendedLevel: 50,
    features: ['Plateformes mobiles', 'Vents puissants'],
    hazards: ['moving_platforms', 'wind_gusts'],
    visuals: {
      skyTop: '#7ab8f0',
      skyBottom: '#e8f4ff',
      fogColor: '#cfe8ff',
      groundColor: '#d8e0e8',
      ringColor: '#e8e0c8',
      accentColor: '#4a90d8',
      emblem: 'wing',
      ambient: 1.15,
    },
    balance: { baseRating: 1020, rewardGold: 45, ratingStake: 28 },
  },
  volcan: {
    id: 'volcan',
    index: 2,
    name: 'Arène du Volcan',
    tagline: 'Le feu purifie les faibles.',
    motto: 'La lave n’attend personne.',
    type: ['1v1', '2v2'],
    environment: 'Volcan actif',
    theme: 'Feu / Lave',
    recommendedLevel: 60,
    features: ['Sol instable', 'Geysers de lave', 'Chaleur extrême'],
    hazards: ['unstable_ground', 'lava_geysers', 'extreme_heat'],
    visuals: {
      skyTop: '#3a1208',
      skyBottom: '#c84818',
      fogColor: '#68200c',
      groundColor: '#4a3428',
      ringColor: '#5c4030',
      accentColor: '#f06018',
      emblem: 'flame',
      ambient: 0.9,
    },
    balance: { baseRating: 1120, rewardGold: 70, ratingStake: 34 },
  },
  foret_eternelle: {
    id: 'foret_eternelle',
    index: 3,
    name: 'Arène de la Forêt Éternelle',
    tagline: 'La nature observe, mais ne pardonne pas.',
    motto: 'Chaque racine cache une embuscade.',
    type: ['1v1', '3v3'],
    environment: 'Forêt magique',
    theme: 'Nature / Vie',
    recommendedLevel: 40,
    features: ['Zones de camouflage', 'Pièges naturels'],
    hazards: ['camouflage_zones', 'natural_traps'],
    visuals: {
      skyTop: '#8cc878',
      skyBottom: '#e8f8d8',
      fogColor: '#a8d890',
      groundColor: '#5c7a48',
      ringColor: '#8ca860',
      accentColor: '#58b848',
      emblem: 'leaf',
      ambient: 1.05,
    },
    balance: { baseRating: 960, rewardGold: 32, ratingStake: 24 },
  },
  ruines_anciennes: {
    id: 'ruines_anciennes',
    index: 4,
    name: 'Arène des Ruines Anciennes',
    tagline: 'Les anciens regardent, les plus forts survivent.',
    motto: 'La poussière se souvient de chaque duel.',
    type: ['1v1', '2v2'],
    environment: 'Ruines antiques',
    theme: 'Mystère / Terrain',
    recommendedLevel: 55,
    features: ['Obstacles mobiles', 'Pièges', 'Illusions'],
    hazards: ['moving_obstacles', 'traps', 'illusions'],
    visuals: {
      skyTop: '#2c2448',
      skyBottom: '#8878b8',
      fogColor: '#544878',
      groundColor: '#6b6458',
      ringColor: '#8c8474',
      accentColor: '#a858d8',
      emblem: 'eye',
      ambient: 0.95,
    },
    balance: { baseRating: 1070, rewardGold: 55, ratingStake: 30 },
  },
  glaces_eternelles: {
    id: 'glaces_eternelles',
    index: 5,
    name: 'Arène des Glaces Éternelles',
    tagline: 'Le froid révèle les vrais guerriers.',
    motto: 'Ici, une glisse coûte plus qu’une blessure.',
    type: ['1v1', '3v3'],
    environment: 'Montagnes glacées',
    theme: 'Glace / Froid',
    recommendedLevel: 50,
    features: ['Sol glissant', 'Tempêtes de neige'],
    hazards: ['slippery_floor', 'snowstorms'],
    visuals: {
      skyTop: '#284878',
      skyBottom: '#b8e8f8',
      fogColor: '#a8d0e8',
      groundColor: '#d8ecf8',
      ringColor: '#b8d8ec',
      accentColor: '#58c8e8',
      emblem: 'snowflake',
      ambient: 1.1,
    },
    balance: { baseRating: 1020, rewardGold: 45, ratingStake: 28 },
  },
}

export const ARENA_LIST: ArenaDef[] = [
  ARENAS.sommets_celestes,
  ARENAS.volcan,
  ARENAS.foret_eternelle,
  ARENAS.ruines_anciennes,
  ARENAS.glaces_eternelles,
]

export function getArena(id: string): ArenaDef | undefined {
  return ARENAS[id as ArenaId]
}

// ── Systèmes officiels de l'affiche ──
export const ARENA_SYSTEMS = [
  {
    id: 'matchmaking',
    name: 'Système de matchmaking',
    subtitle: 'Trouve un adversaire en quelques secondes',
  },
  {
    id: 'classement',
    name: 'Classements en temps réel',
    subtitle: 'Monte ton rang et ta puissance',
  },
  {
    id: 'recompenses',
    name: 'Récompenses exclusives',
    subtitle: 'Objets, titres, skins',
  },
] as const

// Titres de gladiateur attribués par le serveur selon le rating
export function arenaRankTitle(rating: number): string {
  if (rating >= 1400) return 'Légende des Arènes'
  if (rating >= 1300) return 'Champion Supérieur'
  if (rating >= 1200) return 'Maître Dueliste'
  if (rating >= 1100) return 'Duelliste Confirmé'
  if (rating >= 1000) return 'Gladiateur'
  return 'Recrue des Arènes'
}

// Paliers de récompenses exclusives (objets / titres / skins)
export interface ArenaMilestone {
  rating: number
  kind: 'titre' | 'skin' | 'objet'
  reward: string
}

export const ARENA_MILESTONES: ArenaMilestone[] = [
  { rating: 1050, kind: 'objet', reward: 'Réserve d’or du tournoi (+100 or)' },
  { rating: 1150, kind: 'skin', reward: 'Skin de cape : Ombre des Arènes' },
  { rating: 1250, kind: 'titre', reward: 'Titre : Maître Dueliste' },
  { rating: 1350, kind: 'skin', reward: 'Skin d’arme : Lame des Champions' },
  { rating: 1450, kind: 'titre', reward: 'Titre : Légende des Arènes' },
]
