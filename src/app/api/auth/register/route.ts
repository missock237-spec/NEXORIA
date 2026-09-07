// POST /api/auth/register — Création de compte NEXORIA
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, generateRecoveryKey, hashPassword, recoveryKeyHash } from '@/lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!EMAIL_RE.test(email) || email.length > 120) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 100) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir entre 8 et 100 caractères' }, { status: 400 })
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins une lettre et un chiffre' }, { status: 400 })
    }

    const existing = await db.account.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cette adresse email' }, { status: 409 })
    }

    const recoveryKey = generateRecoveryKey()
    const account = await db.account.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        recoveryKey: recoveryKeyHash(recoveryKey),
        lastLoginAt: new Date(),
      },
    })

    await createSession(account.id)

    return NextResponse.json({
      accountId: account.id,
      email: account.email,
      recoveryKey, // affichée UNE SEULE fois au joueur
    })
  } catch (e) {
    console.error('[register]', e)
    return NextResponse.json({ error: 'Erreur serveur lors de la création du compte' }, { status: 500 })
  }
}
