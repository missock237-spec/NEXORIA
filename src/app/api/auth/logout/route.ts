// POST /api/auth/logout — Déconnexion
import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST() {
  try {
    await destroySession()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[logout]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
