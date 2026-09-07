// GET /api/characters — Liste des personnages du compte connecté
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getVillage } from '@/lib/game/villages'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Session requise' }, { status: 401 })
    }
    const characters = await db.character.findMany({
      where: { accountId: session.accountId },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({
      characters: characters.map((c) => {
        const village = getVillage(c.startingVillage)
        return {
          id: c.id,
          name: c.name,
          race: c.race,
          class: c.class,
          level: c.level,
          xp: c.xp,
          gold: c.gold,
          startingVillage: village ? { id: village.id, name: village.name, region: village.region } : null,
          createdAt: c.createdAt,
        }
      }),
    })
  } catch (e) {
    console.error('[characters-list]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
