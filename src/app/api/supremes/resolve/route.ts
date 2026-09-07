// POST /api/supremes/resolve — Résolution serveur d'un combat de Suprême
// Validation autoritaire :
//   - session + propriété + tentative pending
//   - les 3 phases d'Aetherion validées DANS L'ORDRE, avec durées minimales
//   - durée totale plausible vs horloge serveur
// Puis : victoire → récompenses officielles (Cœur d'Aetherion, skin légendaire,
// matériaux, titre « Celui qui a défié le Roi du Ciel ») + or.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getSupreme, AETHERION_SPEC } from '@/lib/game/supremes'
import { BOSS_MIN_DURATION, BOSS_MAX_DURATION, PHASE_MIN_SECONDS } from '../challenge/route'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 })
  }

  let body: {
    characterId?: string
    encounterId?: string
    result?: string
    durationSec?: number
    phases?: number[] // durées cumulées par phase validée (croissantes)
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { characterId, encounterId, result, durationSec, phases } = body
  if (!characterId || !encounterId || (result !== 'victory' && result !== 'defeat')) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (
    typeof durationSec !== 'number' ||
    durationSec < BOSS_MIN_DURATION ||
    durationSec > BOSS_MAX_DURATION
  ) {
    return NextResponse.json(
      { error: `Durée de combat invalide (${BOSS_MIN_DURATION}–${BOSS_MAX_DURATION}s)` },
      { status: 400 }
    )
  }

  const character = await db.character.findUnique({ where: { id: characterId } })
  if (!character || character.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Personnage introuvable ou non autorisé' }, { status: 403 })
  }

  const encounter = await db.supremeEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter || encounter.characterId !== characterId) {
    return NextResponse.json({ error: 'Tentative introuvable' }, { status: 404 })
  }
  if (encounter.status !== 'pending') {
    return NextResponse.json({ error: 'Tentative déjà clôturée' }, { status: 409 })
  }
  const elapsed = Date.now() - encounter.createdAt.getTime()
  // Tolérance de 2 min pour le chargement de la forteresse (voir arenas/resolve)
  if (durationSec * 1000 > elapsed + 120_000) {
    return NextResponse.json({ error: 'Durée incohérente avec l’horloge serveur' }, { status: 400 })
  }

  const supreme = getSupreme(encounter.supremeId)
  if (!supreme) {
    return NextResponse.json({ error: 'Suprême inconnu' }, { status: 500 })
  }

  const victory = result === 'victory'
  const phaseCount = AETHERION_SPEC.phases.length

  // ── Validation des phases (victoire uniquement) ──
  let phasesPassed = encounter.phasesPassed
  if (victory) {
    if (
      !Array.isArray(phases) ||
      phases.length < 1 ||
      phases.length > phaseCount
    ) {
      return NextResponse.json(
        { error: `Chronologie de phases invalide (${phaseCount} phases attendues au maximum)` },
        { status: 400 }
      )
    }
    for (let i = 0; i < phases.length; i++) {
      const t = phases[i]
      if (typeof t !== 'number' || t <= 0 || t > durationSec) {
        return NextResponse.json({ error: 'Chronologie de phases invalide' }, { status: 400 })
      }
      const phaseDuration = i === 0 ? t : t - phases[i - 1]
      if (phaseDuration < PHASE_MIN_SECONDS) {
        return NextResponse.json(
          { error: `Phase ${i + 1} trop courte — le Roi du Ciel ne tombe pas si vite` },
          { status: 400 }
        )
      }
      if (i > 0 && t <= phases[i - 1]) {
        return NextResponse.json({ error: 'Phases non croissantes' }, { status: 400 })
      }
    }
    phasesPassed = phases.length
  }

  // ── Récompenses officielles de l'affiche ──
  let rewardsGiven: string[] = []
  let goldEarned = 0
  let firstDefeat = false

  if (victory) {
    const progress =
      (await db.supremeProgress.findUnique({
        where: { characterId_supremeId: { characterId, supremeId: encounter.supremeId } },
      })) ??
      (await db.supremeProgress.create({ data: { characterId, supremeId: encounter.supremeId } }))

    firstDefeat = !progress.defeated
    const already: string[] = JSON.parse(progress.rewardsJson)

    if (firstDefeat) {
      rewardsGiven = AETHERION_SPEC.rewards.map((r) => r.name)
      goldEarned = AETHERION_SPEC.balance.goldReward
    } else {
      // Vainqueur répété : matériaux + or réduits, pas de titre/skin en double
      rewardsGiven = ['Matériaux de craft rares']
      goldEarned = 60
    }

    const titles: string[] = JSON.parse(character.titlesJson)
    const BOSS_TITLE = 'Celui qui a défié le Roi du Ciel'
    if (!titles.includes(BOSS_TITLE)) titles.push(BOSS_TITLE)

    await db.$transaction([
      db.supremeEncounter.update({
        where: { id: encounter.id },
        data: {
          status: 'victory',
          phasesPassed,
          resolvedAt: new Date(),
        },
      }),
      db.supremeProgress.update({
        where: { id: progress.id },
        data: {
          defeated: true,
          firstDefeatAt: progress.firstDefeatAt ?? new Date(),
          rewardsJson: JSON.stringify([...already, ...rewardsGiven]),
        },
      }),
      db.character.update({
        where: { id: characterId },
        data: {
          gold: character.gold + goldEarned,
          titlesJson: JSON.stringify(titles),
        },
      }),
    ])
  } else {
    await db.supremeEncounter.update({
      where: { id: encounter.id },
      data: { status: 'defeat', resolvedAt: new Date() },
    })
  }

  return NextResponse.json({
    result: victory ? 'victory' : 'defeat',
    phasesPassed,
    firstDefeat,
    rewards: rewardsGiven,
    goldEarned,
    boss: { name: supreme.name, title: supreme.title },
    quote: victory ? AETHERION_SPEC.quotes[0] : null,
  })
}
