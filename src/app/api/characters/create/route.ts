// POST /api/characters/create — CRÉATION DÉFINITIVE DU PERSONNAGE (serveur autoritaire)
// Séquence complète : session → nom → race → classe → apparence → équipement →
// stats → village → spawn → sauvegarde → réponse.
// Le client ne définit JAMAIS : stats, niveau, objets, compétences, argent, village, position.

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'
import { getRace } from '@/lib/game/races'
import { getClass, EQUIPMENT_CATALOG } from '@/lib/game/classes'
import { validateAppearance } from '@/lib/game/appearance-validation'
import { computeStats } from '@/lib/game/stats'
import { pickVillage, pickSpawnPoint, type VillageLoad } from '@/lib/game/assignment'
import { MAX_CHARACTERS_PER_ACCOUNT } from '@/lib/game/config'
import { VILLAGES } from '@/lib/game/villages'

export async function POST(req: NextRequest) {
  try {
    // ── 1. Vérification de l'identité du joueur ──────────────────────────
    const session = await requireSession()
    const accountId = session.accountId

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const count = await db.character.count({ where: { accountId } })
    if (count >= MAX_CHARACTERS_PER_ACCOUNT) {
      return NextResponse.json(
        { error: `Limite de ${MAX_CHARACTERS_PER_ACCOUNT} personnages par compte atteinte` },
        { status: 409 }
      )
    }

    // ── 2. Vérification du nom ────────────────────────────────────────────
    const rawName = typeof body.name === 'string' ? body.name : ''
    const name = rawName.trim().replace(/\s+/g, ' ')
    if (name.length < 3 || name.length > 16) {
      return NextResponse.json({ error: 'Nom invalide (longueur)' }, { status: 400 })
    }

    // ── 3. Vérification de la race ────────────────────────────────────────
    const race = getRace(typeof body.race === 'string' ? body.race : '')
    if (!race) {
      return NextResponse.json({ error: 'Race inexistante' }, { status: 400 })
    }

    // ── 4. Vérification de la classe ──────────────────────────────────────
    const cls = getClass(typeof body.class === 'string' ? body.class : '')
    if (!cls) {
      return NextResponse.json({ error: 'Classe inexistante' }, { status: 400 })
    }

    // ── 5. Vérification des paramètres d'apparence ────────────────────────
    const appearanceResult = validateAppearance(body.appearance, race)
    if (!appearanceResult.ok || !appearanceResult.cleaned) {
      return NextResponse.json(
        { error: 'Paramètres d’apparence invalides', details: appearanceResult.errors },
        { status: 400 }
      )
    }
    const appearance = appearanceResult.cleaned

    // ── 6. Vérification de l'équipement — généré PAR LE SERVEUR ───────────
    const expectedEquipment: Record<string, string> = {}
    for (const itemId of cls.startingEquipment) {
      const item = EQUIPMENT_CATALOG[itemId]
      if (!item) return NextResponse.json({ error: 'Équipement de départ invalide' }, { status: 500 })
      expectedEquipment[item.slot] = itemId
    }
    // Le client peut au mieux renvoyer ce que le serveur attend ; tout écart est refusé.
    const clientEquipment = body.equipment && typeof body.equipment === 'object' ? body.equipment : {}
    for (const [slot, itemId] of Object.entries(clientEquipment)) {
      if (expectedEquipment[slot] !== itemId) {
        return NextResponse.json(
          { error: `Équipement non autorisé détecté sur le slot ${slot}` },
          { status: 403 }
        )
      }
    }

    // ── 7. Génération des statistiques (serveur) ──────────────────────────
    const stats = computeStats(race.id, cls.id)

    // ── 8-10. Village de départ + point d'apparition (serveur, équilibré, déterministe) ──
    const characterSeed = randomBytes(16).toString('hex') // graine propre à CE personnage
    const grouped = await db.character.groupBy({
      by: ['startingVillage'],
      _count: { startingVillage: true },
    })
    const capacityMap = new Map(VILLAGES.map((v) => [v.id, v.capacity]))
    const villageLoads: VillageLoad[] = grouped.map((r) => ({
      villageId: r.startingVillage,
      population: r._count.startingVillage,
      capacity: capacityMap.get(r.startingVillage) ?? 100,
    }))

    const village = pickVillage(race.id, characterSeed, villageLoads)
    const spawn = pickSpawnPoint(village, characterSeed)

    // ── 11. Sauvegarde du personnage (unicité du nom garantie par la BD) ──
    let character
    try {
      character = await db.character.create({
        data: {
          accountId,
          name,
          race: race.id,
          class: cls.id,
          appearanceJson: JSON.stringify(appearance),
          equipmentJson: JSON.stringify(expectedEquipment),
          statsJson: JSON.stringify(stats),
          skillsJson: JSON.stringify(cls.skills),
          startingVillage: village.id,
          spawnPoint: spawn.id,
          positionJson: JSON.stringify({ x: spawn.x, z: spawn.z }),
          level: 1,
          xp: 0,
          gold: 25, // modeste bourse de départ, définie par le serveur
          questsJson: JSON.stringify({
            bienvenue: { stage: 0, objectif: 'Parlez à l’ancien du village', complete: false },
          }),
        },
      })
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'P2002') {
        return NextResponse.json(
          { error: 'Ce nom vient d’être pris par un autre joueur. Choisissez-en un autre.' },
          { status: 409 }
        )
      }
      throw e
    }

    // ── 12. Réponse au client ─────────────────────────────────────────────
    return NextResponse.json({
      character: {
        id: character.id,
        name: character.name,
        race: character.race,
        class: character.class,
        level: character.level,
        startingVillage: {
          id: village.id,
          name: village.name,
          region: village.region,
          description: village.description,
        },
        spawn: { id: spawn.id },
        stats,
        skills: cls.skills,
        equipment: expectedEquipment,
      },
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
    console.error('[create-character]', e)
    return NextResponse.json({ error: 'Erreur serveur lors de la création du personnage' }, { status: 500 })
  }
}
