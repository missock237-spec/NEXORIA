// POST /api/characters/[id]/enter — Entrée dans le monde
// Vérifie : session valide + propriété du personnage + village/spawn valides.
// Retourne TOUTES les données de jeu nécessaires à l'apparition.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { getVillage } from '@/lib/game/villages'
import { isSafePosition } from '@/lib/game/assignment'
import type { Appearance, CharacterEquipment } from '@/lib/game/types'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const character = await db.character.findUnique({ where: { id } })
    if (!character) {
      return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
    }
    // Le personnage doit appartenir au compte connecté
    if (character.accountId !== session.accountId) {
      return NextResponse.json({ error: 'Ce personnage ne vous appartient pas' }, { status: 403 })
    }

    const village = getVillage(character.startingVillage)
    if (!village) {
      return NextResponse.json({ error: 'Village de départ introuvable' }, { status: 500 })
    }

    // Validation de sécurité de la position enregistrée
    let position: { x: number; z: number }
    try {
      position = JSON.parse(character.positionJson)
    } catch {
      position = village.spawnPoints[0]
    }
    if (!isSafePosition(village, position.x, position.z)) {
      // Fallback sûr : premier spawn du village
      const sp = village.spawnPoints[0]
      position = { x: sp.x, z: sp.z }
    }

    const spawnDef =
      village.spawnPoints.find((s) => s.id === character.spawnPoint) ?? village.spawnPoints[0]

    return NextResponse.json({
      character: {
        id: character.id,
        name: character.name,
        race: character.race,
        class: character.class,
        appearance: JSON.parse(character.appearanceJson) as Appearance,
        equipment: JSON.parse(character.equipmentJson) as CharacterEquipment,
        level: character.level,
        xp: character.xp,
        gold: character.gold,
        stats: JSON.parse(character.statsJson),
        quests: JSON.parse(character.questsJson),
      },
      village,
      spawn: { id: spawnDef.id, x: position.x, z: position.z },
      intro: {
        title: 'CRÉATION TERMINÉE',
        lines: [
          'Bienvenue dans NEXORIA.',
          'Votre histoire commence ici.',
          `Village : ${village.name}`,
        ],
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Session requise')) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    console.error('[enter-world]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
