// GET /api/world/config — Données publiques du monde (races, classes, équipement, villages, règles)
import { NextResponse } from 'next/server'
import { RACE_LIST } from '@/lib/game/races'
import { CLASS_LIST, EQUIPMENT_CATALOG } from '@/lib/game/classes'
import { VILLAGES } from '@/lib/game/villages'
import { NAME_RULES, FORBIDDEN_NAMES, MAX_CHARACTERS_PER_ACCOUNT, QUALITY_PROFILES } from '@/lib/game/config'

export async function GET() {
  return NextResponse.json(
    {
      races: RACE_LIST,
      classes: CLASS_LIST,
      equipment: Object.values(EQUIPMENT_CATALOG),
      villages: VILLAGES.map((v) => ({
        ...v,
        // Les positions exactes de spawn ne sont PAS divulguées avant création (anti-exploit)
        spawnPointCount: v.spawnPoints.length,
        spawnPoints: undefined,
      })),
      nameRules: NAME_RULES,
      forbiddenNamesCount: FORBIDDEN_NAMES.length,
      maxCharactersPerAccount: MAX_CHARACTERS_PER_ACCOUNT,
      qualityProfiles: QUALITY_PROFILES,
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  )
}
