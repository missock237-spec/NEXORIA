// POST /api/supremes/challenge — Défier un Suprême (Boss Mondial)
// Seul AETHERION est jouable actuellement (fiche complète de l'affiche #01).
// Le serveur calcule les PV du boss, crée la tentative et la graine du combat.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getSupreme, AETHERION_SPEC } from '@/lib/game/supremes'

export const BOSS_MIN_DURATION = 15
export const BOSS_MAX_DURATION = 1800
export const PHASE_MIN_SECONDS = 8

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 })
  }

  let body: { characterId?: string; supremeId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }
  const { characterId, supremeId } = body
  if (!characterId || !supremeId) {
    return NextResponse.json({ error: 'characterId et supremeId requis' }, { status: 400 })
  }

  const supreme = getSupreme(supremeId)
  if (!supreme) {
    return NextResponse.json({ error: 'Suprême inconnu' }, { status: 400 })
  }
  if (!supreme.implementable) {
    return NextResponse.json(
      { error: `${supreme.name} n’est pas encore affrontable — ce Suprême arrivera dans une prochaine mise à jour.` },
      { status: 409 }
    )
  }

  const character = await db.character.findUnique({ where: { id: characterId } })
  if (!character || character.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Personnage introuvable ou non autorisé' }, { status: 403 })
  }

  // Une seule tentative active
  const active = await db.supremeEncounter.findFirst({
    where: { characterId, status: 'pending' },
  })
  if (active) {
    if (Date.now() - active.createdAt.getTime() > 45 * 60 * 1000) {
      await db.supremeEncounter.update({
        where: { id: active.id },
        data: { status: 'expired' },
      })
    } else {
      return NextResponse.json({ error: 'Une tentative est déjà en cours' }, { status: 409 })
    }
  }

  // PV du boss : calculés CÔTÉ SERVEUR selon le niveau du challenger
  const bossHp = AETHERION_SPEC.balance.bossHpByPlayerLevel(character.level)

  // Contraindre à 31 bits pour rester dans le range INT de SQLite
  const seed =
    parseInt(
      createHash('sha256')
        .update(`boss|${characterId}|${supremeId}|${Date.now()}`)
        .digest('hex')
        .slice(0, 8),
      16
    ) & 0x7fffffff

  const encounter = await db.supremeEncounter.create({
    data: { characterId, supremeId, bossHp, seed },
  })

  const progress =
    (await db.supremeProgress.findUnique({
      where: { characterId_supremeId: { characterId, supremeId } },
    })) ??
    (await db.supremeProgress.create({ data: { characterId, supremeId } }))

  await db.supremeProgress.update({
    where: { id: progress.id },
    data: { attempts: progress.attempts + 1 },
  })

  return NextResponse.json({
    encounter: {
      id: encounter.id,
      supremeId,
      bossHp,
      seed,
      phases: AETHERION_SPEC.phases.map((p) => ({
        index: p.index,
        name: p.name,
        hpThreshold: p.hpThreshold,
        mechanic: p.mechanic,
        attacks: p.attacks,
      })),
    },
    boss: {
      name: AETHERION_SPEC.name,
      title: AETHERION_SPEC.title,
      element: AETHERION_SPEC.element,
      recommendedLevel: AETHERION_SPEC.balance.recommendedLevelNumber,
    },
    playerLevel: character.level,
    attempts: progress.attempts + 1,
    defeatedBefore: progress.defeated,
  })
}
