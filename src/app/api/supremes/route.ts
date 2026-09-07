// GET /api/supremes?characterId= — Progression du personnage face aux Suprêmes

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { SUPREME_LIST } from '@/lib/game/supremes'

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

  const progress = await db.supremeProgress.findMany({ where: { characterId } })

  return NextResponse.json({
    supremes: SUPREME_LIST.map((s) => {
      const p = progress.find((x) => x.supremeId === s.id)
      return {
        id: s.id,
        defeated: p?.defeated ?? false,
        attempts: p?.attempts ?? 0,
        rewards: p ? (JSON.parse(p.rewardsJson) as string[]) : [],
      }
    }),
    titles: JSON.parse(character.titlesJson) as string[],
    gold: character.gold,
  })
}
