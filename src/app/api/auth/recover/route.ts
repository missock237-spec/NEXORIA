// POST /api/auth/recover — Récupération de compte via clé de récupération
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, hashPassword, recoveryKeyHash } from '@/lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const recoveryKey = typeof body?.recoveryKey === 'string' ? body.recoveryKey : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!EMAIL_RE.test(email) || !recoveryKey || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Email, clé de récupération et nouveau mot de passe (8+ caractères) requis' },
        { status: 400 }
      )
    }

    const account = await db.account.findUnique({ where: { email } })
    if (!account) {
      return NextResponse.json({ error: 'Compte introuvable ou clé invalide' }, { status: 400 })
    }

    const provided = recoveryKeyHash(recoveryKey)
    if (provided !== account.recoveryKey) {
      return NextResponse.json({ error: 'Compte introuvable ou clé invalide' }, { status: 400 })
    }

    await db.account.update({
      where: { id: account.id },
      data: { passwordHash: hashPassword(newPassword) },
    })
    // Invalider toutes les sessions existantes (sécurité)
    await db.session.deleteMany({ where: { accountId: account.id } })
    await createSession(account.id)

    return NextResponse.json({ ok: true, accountId: account.id })
  } catch (e) {
    console.error('[recover]', e)
    return NextResponse.json({ error: 'Erreur serveur lors de la récupération' }, { status: 500 })
  }
}
