// POST /api/arenas/match — Matchmaking des Arènes
// « Trouve un adversaire en quelques secondes » : le serveur choisit un
// gladiateur au rating proche, crée le duel (statut pending) et retourne
// uniquement les données nécessaires au combat.jamais la logique de tirage.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getArena } from '@/lib/game/arenas'
import { matchmake } from '@/lib/game/gladiators'
import { computeStats } from '@/lib/game/stats'

// Durées plausibles d'un duel (s) — utilisées par la validation de résolution
export const MATCH_MIN_DURATION = 4
export const MATCH_MAX_DURATION = 900

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 })
  }

  let body: { characterId?: string; arenaId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { characterId, arenaId } = body
  if (!characterId || !arenaId) {
    return NextResponse.json({ error: 'characterId et arenaId requis' }, { status: 400 })
  }

  const arena = getArena(arenaId)
  if (!arena) {
    return NextResponse.json({ error: 'Arène inconnue' }, { status: 400 })
  }

  const character = await db.character.findUnique({ where: { id: characterId } })
  if (!character || character.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Personnage introuvable ou non autorisé' }, { status: 403 })
  }

  // Un seul duel actif à la fois
  const activeMatch = await db.arenaMatch.findFirst({
    where: { characterId, status: 'pending' },
  })
  if (activeMatch) {
    // Expirer les vieux duels abandonnés (> 3 min)
    if (Date.now() - activeMatch.createdAt.getTime() > 3 * 60 * 1000) {
      await db.arenaMatch.update({
        where: { id: activeMatch.id },
        data: { status: 'expired' },
      })
    } else {
      return NextResponse.json({ error: 'Un duel est déjà en cours' }, { status: 409 })
    }
  }

  const profile =
    (await db.arenaProfile.findUnique({ where: { characterId } })) ??
    (await db.arenaProfile.create({ data: { characterId } }))

  const priorEncounters = await db.arenaMatch.count({ where: { characterId, arenaId } })
  const gladiator = matchmake(arena.id, profile.rating, priorEncounters)

  // Duel « entraînement » si sous le niveau recommandé de l'arène :
  // l'affiche reste fidèle (niveau officiel affiché), les gains sont réduits.
  const training = character.level < arena.recommendedLevel

  // Graine déterministe unique pour ce duel (effets visuels/variante IA côté client)
  // Contraindre à 31 bits pour rester dans le range INT de SQLite
  const seed =
    parseInt(
      createHash('sha256')
        .update(`${characterId}|${arenaId}|${Date.now()}|${priorEncounters}`)
        .digest('hex')
        .slice(0, 8),
      16
    ) & 0x7fffffff

  const match = await db.arenaMatch.create({
    data: {
      characterId,
      arenaId: arena.id,
      opponentName: gladiator.name,
      opponentRace: gladiator.race,
      opponentClass: gladiator.class,
      opponentRating: gladiator.rating,
      format: arena.type[0],
      training,
      seed,
    },
  })

  // Stats serveur du gladiateur : scalées sur le rating + équilibrage d'arène.
  // Le client n'a PAS le droit de recalculer ces valeurs.
  const gladiatorStats = computeStats(gladiator.race, gladiator.class)
  const difficulty = 0.55 + Math.min(1.35, gladiator.rating / 1000) + (training ? -0.15 : 0)
  const bossStats = {
    maxHp: Math.round(gladiatorStats.maxHp * difficulty),
    attaque: Math.round(gladiatorStats.attaquePhysique * difficulty),
    defense: Math.round(gladiatorStats.defense * difficulty),
    vitesse: gladiatorStats.vitesse,
  }

  return NextResponse.json({
    match: {
      id: match.id,
      arenaId: arena.id,
      format: match.format,
      training,
      seed,
    },
    opponent: {
      name: gladiator.name,
      race: gladiator.race,
      class: gladiator.class,
      rating: gladiator.rating,
      rankTitle: gladiator.rankTitle,
      stats: bossStats,
    },
    arena: {
      id: arena.id,
      name: arena.name,
      tagline: arena.tagline,
      recommendedLevel: arena.recommendedLevel,
      hazards: arena.hazards,
      visuals: arena.visuals,
    },
  })
}
