// POST /api/arenas/resolve — Résolution serveur d'un duel d'arène
// Validation autoritaire :
//   - session + propriété du personnage
//   - le duel existe, est "pending", appartient au personnage
//   - durée plausible (ni instantanée, ni interminable)
//   - pas de double résolution
// Puis : Elo (K=32), séries de victoires, or, paliers de récompenses, titres.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getArena, arenaRankTitle, ARENA_MILESTONES } from '@/lib/game/arenas'
import { MATCH_MIN_DURATION, MATCH_MAX_DURATION } from '../match/route'

function eloDelta(playerRating: number, opponentRating: number, won: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const score = won ? 1 : 0
  return Math.round(32 * (score - expected))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 })
  }

  let body: { characterId?: string; matchId?: string; result?: string; durationSec?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { characterId, matchId, result, durationSec } = body
  if (!characterId || !matchId || (result !== 'win' && result !== 'loss')) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }
  if (
    typeof durationSec !== 'number' ||
    !Number.isFinite(durationSec) ||
    durationSec < MATCH_MIN_DURATION ||
    durationSec > MATCH_MAX_DURATION
  ) {
    return NextResponse.json(
      { error: `Durée de duel invalide (${MATCH_MIN_DURATION}–${MATCH_MAX_DURATION}s)` },
      { status: 400 }
    )
  }

  const character = await db.character.findUnique({ where: { id: characterId } })
  if (!character || character.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Personnage introuvable ou non autorisé' }, { status: 403 })
  }

  const match = await db.arenaMatch.findUnique({ where: { id: matchId } })
  if (!match || match.characterId !== characterId) {
    return NextResponse.json({ error: 'Duel introuvable' }, { status: 404 })
  }
  if (match.status !== 'pending') {
    return NextResponse.json({ error: 'Ce duel est déjà clôturé' }, { status: 409 })
  }
  const elapsed = Date.now() - match.createdAt.getTime()
  // Tolérance de 2 min : le chrono du duel démarre après le chargement de la
  // scène (matchmaking + montage), toujours postérieur à createdAt. La garde
  // anti-triche effective = durée minimale + résolution unique (statut pending).
  if (durationSec * 1000 > elapsed + 120_000) {
    return NextResponse.json({ error: 'Durée incohérente avec l’horloge serveur' }, { status: 400 })
  }

  const arena = getArena(match.arenaId)
  if (!arena) {
    return NextResponse.json({ error: 'Arène inconnue' }, { status: 500 })
  }

  const profile =
    (await db.arenaProfile.findUnique({ where: { characterId } })) ??
    (await db.arenaProfile.create({ data: { characterId } }))

  const won = result === 'win'
  let delta = eloDelta(profile.rating, match.opponentRating, won)
  if (match.training) delta = Math.max(-8, Math.round(delta / 2)) // entraînement : enjeu réduit

  const newRating = Math.max(400, profile.rating + delta)
  const streak = won ? Math.max(1, profile.streak + 1) : 0
  const bestStreak = Math.max(profile.bestStreak, streak)

  // Récompense d'or (victoire uniquement, réduite en entraînement)
  const goldReward = won ? Math.round(arena.balance.rewardGold * (match.training ? 0.4 : 1)) : 0

  // Paliers de récompenses exclusives franchis
  const already: string[] = JSON.parse(profile.milestonesJson)
  const newMilestones = ARENA_MILESTONES.filter(
    (m) => newRating >= m.rating && !already.includes(m.reward)
  )
  const bonusGold = newMilestones.filter((m) => m.kind === 'objet').length * 100

  // Titres : rang atteint + titres de paliers
  const rankTitle = arenaRankTitle(newRating)
  const titles: string[] = JSON.parse(character.titlesJson)
  let titlesChanged = false
  if (newRating >= 1200 && !titles.includes('Maître Dueliste')) {
    titles.push('Maître Dueliste')
    titlesChanged = true
  }
  if (newRating >= 1450 && !titles.includes('Légende des Arènes')) {
    titles.push('Légende des Arènes')
    titlesChanged = true
  }
  for (const m of newMilestones) {
    if (m.kind === 'titre' && !titles.includes(m.reward.replace('Titre : ', ''))) {
      titles.push(m.reward.replace('Titre : ', ''))
      titlesChanged = true
    }
  }

  await db.$transaction([
    db.arenaMatch.update({
      where: { id: match.id },
      data: {
        status: 'resolved',
        resolved: result,
        ratingDelta: delta,
        durationSec: Math.round(durationSec),
        resolvedAt: new Date(),
      },
    }),
    db.arenaProfile.update({
      where: { characterId },
      data: {
        rating: newRating,
        wins: profile.wins + (won ? 1 : 0),
        losses: profile.losses + (won ? 0 : 1),
        streak,
        bestStreak,
        milestonesJson: JSON.stringify([...already, ...newMilestones.map((m) => m.reward)]),
      },
    }),
    db.character.update({
      where: { id: characterId },
      data: {
        gold: character.gold + goldReward + bonusGold,
        ...(titlesChanged ? { titlesJson: JSON.stringify(titles) } : {}),
      },
    }),
  ])

  return NextResponse.json({
    result,
    ratingDelta: delta,
    rating: newRating,
    rankTitle,
    streak,
    bestStreak,
    goldEarned: goldReward + bonusGold,
    newMilestones: newMilestones.map((m) => m.reward),
    training: match.training,
  })
}
