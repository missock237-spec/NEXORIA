// GET /api/arenas/leaderboard — Classement en temps réel des Arènes
// Fusionne : vrais personnages (DB) + gladiateurs officiels (roster serveur).
// Tri par rating décroissant. « Monte ton rang et ta puissance. »

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { arenaRankTitle } from '@/lib/game/arenas'
import { GLADIATORS } from '@/lib/game/gladiators'

export async function GET() {
  const label = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const profiles = await db.arenaProfile.findMany({
    orderBy: { rating: 'desc' },
    take: 50,
    include: { character: { select: { name: true, race: true, class: true, level: true } } },
  })

  const players = profiles.map((p) => ({
    name: p.character.name,
    race: label(p.character.race),
    class: label(p.character.class),
    level: p.character.level,
    rating: p.rating,
    wins: p.wins,
    losses: p.losses,
    rankTitle: arenaRankTitle(p.rating),
    isPlayer: true,
  }))

  const roster = GLADIATORS.map((g) => ({
    name: g.name,
    race: label(g.race),
    class: label(g.class),
    level: Math.max(40, Math.round(g.rating / 20)),
    rating: g.rating,
    wins: g.wins,
    losses: g.losses,
    rankTitle: g.rankTitle,
    isPlayer: false,
  }))

  const full = [...players, ...roster].sort((a, b) => b.rating - a.rating)

  return NextResponse.json({
    leaderboard: full.slice(0, 40).map((entry, i) => ({ rank: i + 1, ...entry })),
    updatedAt: new Date().toISOString(),
  })
}
