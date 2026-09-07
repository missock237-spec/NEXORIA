// POST /api/auth/login — Connexion sécurisée
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const account = await db.account.findUnique({ where: { email } })
    // Message volontairement identique pour ne pas révéler si l'email existe
    const fail = { error: 'Email ou mot de passe incorrect' }
    if (!account) return NextResponse.json(fail, { status: 401 })
    if (!verifyPassword(password, account.passwordHash)) {
      return NextResponse.json(fail, { status: 401 })
    }

    await db.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } })
    await createSession(account.id)

    return NextResponse.json({ accountId: account.id, email: account.email })
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json({ error: 'Erreur serveur lors de la connexion' }, { status: 500 })
  }
}
