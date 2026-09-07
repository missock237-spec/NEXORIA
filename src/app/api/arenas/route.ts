// GET /api/arenas — Arènes officielles + profil de classement du personnage
// Requiert une session + characterId. Le client ne propose jamais de données.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { ARENA_LIST, ARENA_SYSTEMS, ARENA_MILESTONES } from '@/lib/game/arenas'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 })
  }

  const characterId = req.nextUrl.searchParams.get('characterId')
  if (!characterId) {
    return NextResponse.json({ error: 'characterId requis' }, { status: 400 })
  }

  const character = await db.character.findUnique({ where: { id: characterId } })
  if (!character || character.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Personnage introuvable ou non autorisé' }, { status: 403 })
  }

  let profile = await db.arenaProfile.findUnique({ where: { characterId } })
  if (!profile) {
    profile = await db.arenaProfile.create({ data: { characterId } })
  }

  const recentMatches = await db.arenaMatch.findMany({
    where: { characterId, status: 'resolved' },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  return NextResponse.json({
    arenas: ARENA_LIST,
    systems: ARENA_SYSTEMS,
    milestones: ARENA_MILESTONES,
    profile: {
      rating: profile.rating,
      wins: profile.wins,
      losses: profile.losses,
      streak: profile.streak,
      bestStreak: profile.bestStreak,
      milestones: JSON.parse(profile.milestonesJson) as string[],
    },
    recentMatches: recentMatches.map((m) => ({
      id: m.id,
      arenaId: m.arenaId,
      opponentName: m.opponentName,
      opponentRating: m.opponentRating,
      result: m.resolved,
      ratingDelta: m.ratingDelta,
      training: m.training,
      createdAt: m.createdAt,
    })),
    character: { id: character.id, name: character.name, level: character.level },
  })
}
