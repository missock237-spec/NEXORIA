// NEXORIA — Gladiateurs des Arènes (roster d'adversaires IA)
// Le matchmaking associe le joueur à un gladiateur dont le rating est proche.
// Roster DÉTERMINISTE côté serveur : le client reçoit seulement l'adversaire
// tiré par l'API (jamais la liste complète ni les règles de tirage).

import type { ClassId, RaceId } from './types'
import { ARENA_LIST, type ArenaId } from './arenas'

export interface Gladiator {
  id: string
  name: string
  race: RaceId
  class: ClassId
  rating: number
  wins: number
  losses: number
  rankTitle: string
  homeArena: ArenaId
}

// Rang Elo → titre (cohérent avec arenaRankTitle)
function rankTitle(rating: number): string {
  if (rating >= 1400) return 'Légende des Arènes'
  if (rating >= 1300) return 'Champion Supérieur'
  if (rating >= 1200) return 'Maître Dueliste'
  if (rating >= 1100) return 'Duelliste Confirmé'
  if (rating >= 1000) return 'Gladiateur'
  return 'Recrue des Arènes'
}

// ── Roster officiel des gladiateurs (30 champions des 5 arènes) ──
interface GladiatorSeed {
  name: string
  race: RaceId
  class: ClassId
  rating: number
  homeArena: ArenaId
}

const ROSTER_SEEDS: GladiatorSeed[] = [
  // Sommets Célestes (base 1020) — spécialistes du duel aérien
  { name: 'Althéa Ventécume', race: 'sylphide', class: 'epeiste', rating: 1015, homeArena: 'sommets_celestes' },
  { name: 'Sir Kaelen d’Aurê', race: 'humain', class: 'combattant', rating: 1042, homeArena: 'sommets_celestes' },
  { name: 'Lyria Passe-ciel', race: 'elfe', class: 'mage', rating: 1008, homeArena: 'sommets_celestes' },
  { name: 'Orion Marchenuage', race: 'astreen', class: 'epeiste', rating: 1061, homeArena: 'sommets_celestes' },
  { name: 'Brann Marteau-d’Or', race: 'nain', class: 'combattant', rating: 996, homeArena: 'sommets_celestes' },
  { name: 'Céleste Épervier', race: 'humain', class: 'ninja', rating: 1033, homeArena: 'sommets_celestes' },

  // Volcan (base 1120) — élite de feu
  { name: 'Pyrrhas Cendres-vives', race: 'drakeen', class: 'combattant', rating: 1148, homeArena: 'volcan' },
  { name: 'Magmar Poingdeforge', race: 'nain', class: 'combattant', rating: 1122, homeArena: 'volcan' },
  { name: 'Ignis Sanglave', race: 'drakeen', class: 'mage', rating: 1165, homeArena: 'volcan' },
  { name: 'Vesuvia Braise-d’Âme', race: 'abyssien', class: 'epeiste', rating: 1110, homeArena: 'volcan' },
  { name: 'Kaël Cendrelame', race: 'humain', class: 'epeiste', rating: 1136, homeArena: 'volcan' },
  { name: 'Sila Fournaise', race: 'sylphide', class: 'mage', rating: 1098, homeArena: 'volcan' },

  // Forêt Éternelle (base 960) — terrestres agiles
  { name: 'Sylve Ombrefeuille', race: 'elfe', class: 'ninja', rating: 958, homeArena: 'foret_eternelle' },
  { name: 'Thalos Racineferme', race: 'elfe', class: 'combattant', rating: 972, homeArena: 'foret_eternelle' },
  { name: 'Maëlle Rosée-d’Aube', race: 'elfe', class: 'mage', rating: 945, homeArena: 'foret_eternelle' },
  { name: 'Grimm Croc-de-Mousse', race: 'lycan', class: 'ninja', rating: 984, homeArena: 'foret_eternelle' },
  { name: 'Ivy Lianecœur', race: 'sylphide', class: 'epeiste', rating: 931, homeArena: 'foret_eternelle' },
  { name: 'Fenn Sauvagecourse', race: 'lycan', class: 'epeiste', rating: 966, homeArena: 'foret_eternelle' },

  // Ruines Anciennes (base 1070) — tacticiens
  { name: 'Cassius Voûtebriisée', race: 'humain', class: 'epeiste', rating: 1088, homeArena: 'ruines_anciennes' },
  { name: 'Nyx Voile-noir', race: 'elfe_noir', class: 'ninja', rating: 1105, homeArena: 'ruines_anciennes' },
  { name: 'Abaddon Soupir-d’Outre', race: 'abyssien', class: 'mage', rating: 1062, homeArena: 'ruines_anciennes' },
  { name: 'Mira Œil-de-Pierre', race: 'nain', class: 'combattant', rating: 1049, homeArena: 'ruines_anciennes' },
  { name: 'Erevan Murmuregris', race: 'elfe_noir', class: 'epeiste', rating: 1076, homeArena: 'ruines_anciennes' },
  { name: 'Sophia Lenstime', race: 'astreen', class: 'mage', rating: 1093, homeArena: 'ruines_anciennes' },

  // Glaces Éternelles (base 1020) — résistants du froid
  { name: 'Boréal Lancedegivre', race: 'humain', class: 'epeiste', rating: 1027, homeArena: 'glaces_eternelles' },
  { name: 'Ylva Neigehurlante', race: 'lycan', class: 'combattant', rating: 1041, homeArena: 'glaces_eternelles' },
  { name: 'Frost Aiguilleclaire', race: 'elfe', class: 'mage', rating: 1010, homeArena: 'glaces_eternelles' },
  { name: 'Draka Écaille-de-Givre', race: 'drakeen', class: 'epeiste', rating: 1035, homeArena: 'glaces_eternelles' },
  { name: 'Selene Perle-d’Hiver', race: 'astreen', class: 'mage', rating: 999, homeArena: 'glaces_eternelles' },
  { name: 'Torval Brise-Charogne', race: 'nain', class: 'combattant', rating: 1018, homeArena: 'glaces_eternelles' },
]

export const GLADIATORS: Gladiator[] = ROSTER_SEEDS.map((g, i) => ({
  id: `gladiator_${String(i + 1).padStart(2, '0')}`,
  name: g.name,
  race: g.race,
  class: g.class,
  rating: g.rating,
  wins: 40 + ((g.rating * 7 + i * 13) % 260),
  losses: 20 + ((g.rating * 3 + i * 29) % 180),
  rankTitle: rankTitle(g.rating),
  homeArena: g.homeArena,
}))

// ── MATCHMAKING ──
// Choisit le gladiateur le plus proche du rating du joueur dans l'arène ciblée,
// avec rotation déterministe pour éviter de toujours retomber sur le même.
export function matchmake(arenaId: ArenaId, playerRating: number, encounterCount: number): Gladiator {
  const pool = GLADIATORS.filter((g) => g.homeArena === arenaId)
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.rating - playerRating) - Math.abs(b.rating - playerRating)
  )
  // Les 3 plus proches, rotation par compteur de rencontres du joueur
  const shortlist = sorted.slice(0, 3)
  return shortlist[encounterCount % shortlist.length]
}
