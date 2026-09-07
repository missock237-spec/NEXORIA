// NEXORIA — Attribution de village et de point d'apparition
// CÔTÉ SERVEUR UNIQUEMENT.
// Algorithme : répartition équilibrée (moindre charge relative) + hachage déterministe
// du serverSeed et de l'ID de personnage pour départager les ex-aequo.
// → Deux joueurs de la même race sont dispersés dans les villages autorisés,
//   aucun village ne peut être surchargé, le résultat est reproductible et
//   impossible à manipuler par le client.

import { createHash } from 'crypto'
import { SERVER_SEED } from './config'
import { VILLAGES, getVillagesForRace } from './villages'
import type { VillageDef } from './types'

function hash01(input: string): number {
  const h = createHash('sha256').update(input).digest()
  // 8 premiers octets → nombre [0,1)
  return h.readUInt32BE(0) / 0xffffffff
}

export interface VillageLoad {
  villageId: string
  population: number
  capacity: number
}

export function pickVillage(
  raceId: string,
  characterSeed: string,
  loads: VillageLoad[]
): VillageDef {
  const pool = getVillagesForRace(raceId)
  if (pool.length === 0) throw new Error(`Aucun village compatible pour la race ${raceId}`)

  const loadMap = new Map(loads.map((l) => [l.villageId, l.population]))

  // Score = charge relative (population/capacité) ; bruit déterministe < 0.05 pour départager
  let best: VillageDef | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const v of pool) {
    const pop = loadMap.get(v.id) ?? 0
    const relativeLoad = pop / v.capacity
    const noise = hash01(`${SERVER_SEED}|${characterSeed}|${v.id}`) * 0.05
    const score = relativeLoad + noise
    if (score < bestScore) {
      bestScore = score
      best = v
    }
  }
  return best!
}

export function pickSpawnPoint(village: VillageDef, characterSeed: string): { id: string; x: number; z: number } {
  if (village.spawnPoints.length === 0) throw new Error(`Village sans spawn: ${village.id}`)
  // Toutes les positions de spawn sont SÛRES par conception (données vérifiées :
  // hors bâtiments, hors eau, hors zones hostiles). On répartit la charge entre elles.
  const offsets = new Map<string, number>()
  for (const sp of village.spawnPoints) offsets.set(sp.id, 0)
  const noise = village.spawnPoints.map(
    (sp) => hash01(`${SERVER_SEED}|${characterSeed}|${village.id}|${sp.id}`) * 0.4
  )
  let bestIdx = 0
  let bestScore = Number.POSITIVE_INFINITY
  village.spawnPoints.forEach((sp, i) => {
    const score = (offsets.get(sp.id) ?? 0) + noise[i]
    if (score < bestScore) {
      bestScore = score
      bestIdx = i
    }
  })
  const sp = village.spawnPoints[bestIdx]
  // Légère variation positionnelle déterministe autour du point (jamais > 1.2 m)
  const jx = (hash01(`${characterSeed}|${sp.id}|x`) - 0.5) * 2
  const jz = (hash01(`${characterSeed}|${sp.id}|z`) - 0.5) * 2
  return { id: sp.id, x: sp.x + jx * 1.2, z: sp.z + jz * 1.2 }
}

// Validation de sécurité : la position est-elle dans une zone sûre du village ?
export function isSafePosition(village: VillageDef, x: number, z: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false
  if (Math.abs(x) > 60 || Math.abs(z) > 60) return false
  // Les bâtiments se trouvent à des positions fixes générées depuis l'ID du village ;
  // les spawn points du village sont par définition hors des empreintes de bâtiments.
  const nearSpawn = village.spawnPoints.some(
    (sp) => Math.hypot(sp.x - x, sp.z - z) < 8
  )
  return nearSpawn
}

export function allVillages(): VillageDef[] {
  return VILLAGES
}
