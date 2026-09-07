// NEXORIA — Validation serveur d'apparence
// Chaque paramètre est vérifié contre la définition de la race.
// Aucun caractère, couleur ou valeur hors palette n'est accepté.

import type { Appearance, RaceDef } from './types'
import { OUTFIT_TINTS } from './types'

const OUTFIT_TINT_IDS = OUTFIT_TINTS.map((t) => t.id)

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function isHex(v: unknown): v is string {
  return typeof v === 'string' && HEX_RE.test(v)
}

function clamp01(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  if (Number.isNaN(n) || n < 0 || n > 1) return null
  return Math.round(n * 1000) / 1000
}

const FACE_KEYS = ['faceWidth', 'faceHeight', 'jawWidth', 'chinLength', 'noseSize', 'eyeSize', 'eyeDistance', 'browThickness', 'mouthWidth', 'earSize'] as const
const BODY_KEYS = ['height', 'bulk', 'shoulders'] as const

export interface ValidationResult {
  ok: boolean
  errors: string[]
  cleaned?: Appearance
}

export function validateAppearance(raw: unknown, race: RaceDef): ValidationResult {
  const errors: string[] = []
  if (!raw || typeof raw !== 'object') {
    return { ok: false, errors: ['Apparence manquante ou invalide'] }
  }
  const a = raw as Partial<Appearance>

  // 1. Teint de peau — doit être dans la palette de la race
  if (!isHex(a.skin) || !race.morphology.skinTones.includes(a.skin)) {
    errors.push('Teint de peau invalide pour cette race')
  }

  // 2. Paramètres du visage
  const face: Record<string, number> = {}
  if (a.face && typeof a.face === 'object') {
    for (const key of FACE_KEYS) {
      const v = clamp01((a.face as Record<string, unknown>)[key])
      if (v === null) {
        errors.push(`Paramètre de visage invalide: ${key}`)
      } else {
        face[key] = v
      }
    }
  } else {
    errors.push('Paramètres de visage manquants')
  }

  // 3. Couleur des yeux — palette de la race
  if (!isHex(a.eyeColor) || !race.morphology.eyeColors.includes(a.eyeColor)) {
    errors.push('Couleur d’yeux invalide pour cette race')
  }

  // 4. Cheveux — style + couleurs autorisés par la race
  const hair = a.hair && typeof a.hair === 'object' ? (a.hair as Partial<Appearance['hair']>) : {}
  if (!hair.style || !race.morphology.hairStyles.includes(hair.style)) {
    errors.push('Coiffure invalide pour cette race')
  }
  if (!isHex(hair.color) || !race.morphology.hairColors.includes(hair.color)) {
    errors.push('Couleur de cheveux invalide pour cette race')
  }
  // Couleur secondaire : palette libre hexadécimale (méchés, reflets)
  if (!isHex(hair.secondaryColor)) {
    errors.push('Couleur secondaire de cheveux invalide')
  }

  // 5. Corps — dans les limites morphologiques de la race
  const body: Record<string, number> = {}
  if (a.body && typeof a.body === 'object') {
    for (const key of BODY_KEYS) {
      const v = clamp01((a.body as Record<string, unknown>)[key])
      if (v === null) {
        errors.push(`Paramètre de corps invalide: ${key}`)
      } else {
        body[key] = v
      }
    }
  } else {
    errors.push('Paramètres de corps manquants')
  }

  // 6. Marques
  const marks = a.marks && typeof a.marks === 'object' ? (a.marks as Partial<Appearance['marks']>) : {}
  if (!marks.type || !race.marks.types.includes(marks.type)) {
    errors.push('Type de marque invalide pour cette race')
  }
  if (!isHex(marks.color) || !race.marks.colors.includes(marks.color)) {
    errors.push('Couleur de marque invalide pour cette race')
  }

  // 7. Teinte de tenue (optionnelle)
  let outfitTint = 'naturel'
  if (a.outfitTint !== undefined) {
    if (typeof a.outfitTint !== 'string' || !OUTFIT_TINT_IDS.includes(a.outfitTint)) {
      errors.push('Teinte de tenue invalide')
    } else {
      outfitTint = a.outfitTint
    }
  }

  // 8. Options raciales — clé par clé contre racialOptions
  const racial: Record<string, string> = {}
  const rawRacial = a.racial && typeof a.racial === 'object' ? (a.racial as Record<string, unknown>) : {}
  for (const opt of race.racialOptions) {
    const v = rawRacial[opt.key]
    if (typeof v !== 'string' || !opt.values.includes(v)) {
      errors.push(`Option raciale invalide: ${opt.key}`)
    } else {
      racial[opt.key] = v
    }
  }
  // Rejeter toute clé raciale inconnue
  for (const key of Object.keys(rawRacial)) {
    if (!race.racialOptions.some((o) => o.key === key)) {
      errors.push(`Option raciale inconnue: ${key}`)
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    cleaned: {
      skin: a.skin as string,
      face: face as unknown as Appearance['face'],
      eyeColor: a.eyeColor as string,
      hair: {
        style: hair.style as string,
        color: hair.color as string,
        secondaryColor: hair.secondaryColor as string,
      },
      body: body as unknown as Appearance['body'],
      marks: { type: marks.type as string, color: marks.color as string },
      outfitTint,
      racial,
    },
  }
}
