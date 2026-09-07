// POST /api/quests/progress — Progression de quête (persistée côté serveur)
// Le serveur valide : propriété du personnage + transition d'étape cohérente.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/auth'

// Tables de progression autorisées (anti-triche : pas d'étape arbitraire)
const QUEST_RULES: Record<string, { maxStage: number; xpReward: number }> = {
  bienvenue: { maxStage: 3, xpReward: 50 },
  entrainement: { maxStage: 2, xpReward: 30 },
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    const body = await req.json().catch(() => null)
    const characterId = typeof body?.characterId === 'string' ? body.characterId : ''
    const questId = typeof body?.questId === 'string' ? body.questId : ''
    const stage = Number(body?.stage)

    if (!characterId || !questId || !Number.isInteger(stage) || stage < 0) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }
    const rules = QUEST_RULES[questId]
    if (!rules || stage > rules.maxStage) {
      return NextResponse.json({ error: 'Quête ou étape inconnue' }, { status: 400 })
    }

    const character = await db.character.findUnique({ where: { id: characterId } })
    if (!character) {
      return NextResponse.json({ error: 'Personnage introuvable' }, { status: 404 })
    }
    if (character.accountId !== session.accountId) {
      return NextResponse.json({ error: 'Ce personnage ne vous appartient pas' }, { status: 403 })
    }

    let quests: Record<string, { stage: number; complete: boolean; objectif?: string }> = {}
    try {
      quests = JSON.parse(character.questsJson)
    } catch {
      quests = {}
    }
    const current = quests[questId]
    // Interdire les sauts d'étapes arbitraires : avancer d'au plus 1 étape par appel
    if (current && stage > current.stage + 1) {
      return NextResponse.json({ error: 'Progression de quête invalide' }, { status: 400 })
    }

    const wasComplete = current?.complete ?? false
    const complete = stage >= rules.maxStage
    const gainedXp = complete && !wasComplete ? rules.xpReward : 0

    quests[questId] = {
      stage,
      complete,
      objectif:
        questId === 'bienvenue'
          ? stage === 0
            ? 'Parlez à l’ancien du village'
            : stage === 1
              ? 'Rencontrez le maître d’armes'
              : stage === 2
                ? 'Frappez le mannequin d’entraînement 3 fois'
                : 'Quête terminée !'
          : undefined,
    }

    const newXp = character.xp + gainedXp
    await db.character.update({
      where: { id: character.id },
      data: { questsJson: JSON.stringify(quests), xp: newXp },
    })

    return NextResponse.json({ ok: true, quests, gainedXp, xp: newXp })
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Session requise')) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }
    console.error('[quests]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
