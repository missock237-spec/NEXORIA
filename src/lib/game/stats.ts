// NEXORIA — Moteur de statistiques
// Les stats sont TOUJOURS calculées côté serveur à partir des définitions race + classe.
// Le client n'a jamais le droit de proposer ses propres stats.

import type { Appearance, ClassId, DerivedStats, RaceId, Stats } from './types'
import { getClass } from './classes'
import { getRace } from './races'

const BASE: Stats = { force: 8, agilite: 8, intelligence: 8, vitalite: 8, esprit: 8, chance: 8 }

export function computeStats(raceId: string, classId: string): Stats & DerivedStats {
  const race = getRace(raceId)
  const cls = getClass(classId)
  if (!race || !cls) throw new Error(`Race ou classe inconnue: ${raceId}/${classId}`)

  const stats: Stats = { ...BASE }
  for (const [k, v] of Object.entries(race.statModifiers)) {
    stats[k as keyof Stats] += v ?? 0
  }
  for (const [k, v] of Object.entries(cls.statModifiers)) {
    stats[k as keyof Stats] += v ?? 0
  }

  const derived: DerivedStats = {
    maxHp: 60 + stats.vitalite * 7,
    maxMp: 20 + stats.esprit * 6,
    attaquePhysique: 4 + stats.force * 2,
    attaqueMagique: 2 + stats.intelligence * 2,
    defense: 2 + Math.floor(stats.vitalite * 0.8) + Math.floor(stats.force * 0.3),
    esquive: 2 + Math.floor(stats.agilite * 0.6),
    vitesse: 5 + Math.floor(stats.agilite * 0.4),
  }

  return { ...stats, ...derived }
}

// XP nécessaire pour passer au niveau suivant (courbe de progression)
export function xpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

// Valeurs par défaut d'apparence pour une race donnée (utilisées à l'initialisation du créateur)
export function defaultAppearance(raceId: string): Appearance {
  const race = getRace(raceId)
  if (!race) throw new Error(`Race inconnue: ${raceId}`)
  const m = race.morphology
  const racial: Record<string, string> = {}
  for (const opt of race.racialOptions) racial[opt.key] = opt.default
  return {
    skin: m.skinTones[Math.floor(m.skinTones.length / 2)],
    face: {
      faceWidth: 0.5, faceHeight: 0.5, jawWidth: 0.5, chinLength: 0.5,
      noseSize: 0.5, eyeSize: 0.5, eyeDistance: 0.5, browThickness: 0.5,
      mouthWidth: 0.5, earSize: 0.5,
    },
    eyeColor: m.eyeColors[0],
    hair: {
      style: m.hairStyles[0],
      color: m.hairColors[0],
      secondaryColor: m.hairColors[m.hairColors.length - 1],
    },
    body: { height: 0.5, bulk: 0.5, shoulders: 0.5 },
    marks: { type: 'aucune', color: race.marks.colors[0] ?? '#8c1d1d' },
    racial,
  }
}
