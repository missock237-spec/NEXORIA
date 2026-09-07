// POST /api/characters/validate-name — Validation serveur du nom (temps réel côté créateur)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { FORBIDDEN_NAMES, NAME_RULES } from '@/lib/game/config'

const re = new RegExp(NAME_RULES.pattern)

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ valid: false, error: 'Session requise' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const rawName = typeof body?.name === 'string' ? body.name : ''

    // 1. Normalisation : trim + espaces multiples
    const name = rawName.trim().replace(/\s+/g, ' ')

    // 2. Longueur configurable
    if (name.length < NAME_RULES.minLength) {
      return NextResponse.json({
        valid: false, reason: 'length',
        error: `Minimum ${NAME_RULES.minLength} caractères`,
      })
    }
    if (name.length > NAME_RULES.maxLength) {
      return NextResponse.json({
        valid: false, reason: 'length',
        error: `Maximum ${NAME_RULES.maxLength} caractères`,
      })
    }

    // 3. Caractères autorisés
    if (!re.test(name)) {
      return NextResponse.json({
        valid: false, reason: 'characters',
        error: `Caractères autorisés : ${NAME_RULES.allowedCharacters}`,
      })
    }

    // 4. Noms interdits / réservés
    const lower = name.toLowerCase()
    if (FORBIDDEN_NAMES.some((f) => lower === f || lower.replace(/[\s'-]/g, '') === f.replace(/[\s'-]/g, ''))) {
      return NextResponse.json({ valid: false, reason: 'forbidden', error: 'Ce nom est réservé ou interdit' })
    }

    // 5. Unicité — vérification serveur (base de données)
    const existing = await db.character.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ valid: false, reason: 'duplicate', error: 'Ce nom est déjà utilisé par un autre héros' })
    }

    return NextResponse.json({ valid: true, name })
  } catch (e) {
    console.error('[validate-name]', e)
    return NextResponse.json({ valid: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
