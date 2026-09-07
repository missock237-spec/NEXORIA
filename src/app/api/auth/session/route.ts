// GET /api/auth/session — État de session courant
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ authenticated: false })
    }
    const characters = await db.character.findMany({
      where: { accountId: session.accountId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, race: true, class: true, level: true,
        startingVillage: true, createdAt: true,
      },
    })
    return NextResponse.json({
      authenticated: true,
      accountId: session.accountId,
      email: session.email,
      characters,
    })
  } catch (e) {
    console.error('[session]', e)
    return NextResponse.json({ authenticated: false })
  }
}
