'use client'

// NEXORIA — Store du parcours de création / d'entrée dans le monde
// + Mise à jour « Arènes & Suprêmes » : hub, duel, codex, boss.
// + Mise à jour « Les 10 Suprêmes en 3D » : sanctuaires jouables.
import { create } from 'zustand'
import type {
  Appearance, ClassId, RaceDef, ClassDef, VillageDef, NameRules, QualityProfile,
} from '@/lib/game/types'
import type { ArenaDef } from '@/lib/game/arenas'
import type { SupremeId } from '@/lib/game/supremes'
import { QUALITY_PROFILES, loadQualityProfile } from '@/lib/game/config'

export type Phase =
  | 'title' | 'auth' | 'charselect' | 'name' | 'race' | 'creator'
  | 'class' | 'equipment' | 'review' | 'creating' | 'loading' | 'village'
  | 'arenas' | 'arena' | 'codex' | 'boss' | 'supreme' | 'province'

// ── Arènes : adversaire désigné par le matchmaking serveur ──
export interface MatchOpponent {
  name: string
  race: string
  class: string
  rating: number
  rankTitle: string
  stats: { maxHp: number; attaque: number; defense: number; vitesse: number }
}

export interface ActiveMatch {
  id: string
  arenaId: string
  format: string
  training: boolean
  seed: number
  opponent: MatchOpponent
  arena: Pick<ArenaDef, 'id' | 'name' | 'tagline' | 'recommendedLevel' | 'hazards' | 'visuals'>
}

// ── Suprêmes : rencontre boss créée par le serveur ──
export interface BossEncounter {
  id: string
  supremeId: string
  bossHp: number
  seed: number
  phases: { index: number; name: string; hpThreshold: number; mechanic: string; attacks: string[] }[]
  boss: { name: string; title: string; element: string; recommendedLevel: number }
  playerLevel: number
  attempts: number
  defeatedBefore: boolean
}

export interface CharacterSummary {
  id: string
  name: string
  race: string
  class: string
  level: number
  xp?: number
  gold?: number
  startingVillage: { id: string; name: string; region: string } | null
  createdAt: string
}

export interface WorldConfig {
  races: RaceDef[]
  classes: ClassDef[]
  equipment: { id: string; name: string; slot: string; visual: string; color: string; description: string }[]
  villages: VillageDef[]
  nameRules: NameRules
  maxCharactersPerAccount: number
  qualityProfiles: Record<string, QualityProfile>
}

export interface CreationResult {
  character: {
    id: string
    name: string
    race: string
    class: string
    level: number
    startingVillage: { id: string; name: string; region: string; description: string }
    spawn: { id: string }
    stats: Record<string, number>
    skills: { name: string; description: string }[]
    equipment: Record<string, string>
  }
  intro: { title: string; lines: string[] }
}

interface CreatorState {
  phase: Phase
  previousPhase: Phase
  account: { accountId: string; email: string } | null
  characters: CharacterSummary[]
  worldConfig: WorldConfig | null
  draftName: string
  draftRace: RaceDef | null
  draftAppearance: Appearance | null
  draftClass: ClassDef | null
  creationResult: CreationResult | null
  activeWorld: import('@/lib/game/types').EnterWorldResponse | null
  quality: QualityProfile
  isMobile: boolean
  error: string | null

  // État « Arènes & Suprêmes »
  activeMatch: ActiveMatch | null
  activeEncounter: BossEncounter | null

  // État « Les 10 Suprêmes en 3D »
  activeSupremeId: SupremeId | null

  // État « Province de Solmère » (monde multijoueur persistant)
  provinceCharacterId: string | null

  setPhase: (p: Phase) => void
  setAccount: (a: { accountId: string; email: string } | null) => void
  setCharacters: (c: CharacterSummary[]) => void
  setWorldConfig: (c: WorldConfig) => void
  setDraftName: (n: string) => void
  setDraftRace: (r: RaceDef | null, defaultAppearance?: Appearance | null) => void
  setDraftAppearance: (a: Appearance) => void
  setDraftClass: (c: ClassDef | null) => void
  setCreationResult: (r: CreationResult | null) => void
  setActiveWorld: (w: import('@/lib/game/types').EnterWorldResponse | null) => void
  setActiveMatch: (m: ActiveMatch | null) => void
  setActiveEncounter: (e: BossEncounter | null) => void
  setActiveSupremeId: (id: SupremeId | null) => void
  setProvinceCharacterId: (id: string | null) => void
  setQuality: (q: QualityProfile['id']) => void
  setError: (e: string | null) => void
  initPlatform: () => void
}

export const useCreatorStore = create<CreatorState>((set) => ({
  phase: 'title',
  previousPhase: 'title',
  account: null,
  characters: [],
  worldConfig: null,
  draftName: '',
  draftRace: null,
  draftAppearance: null,
  draftClass: null,
  creationResult: null,
  activeWorld: null,
  quality: QUALITY_PROFILES.HIGH,
  isMobile: false,
  error: null,
  activeMatch: null,
  activeEncounter: null,
  activeSupremeId: null,
  provinceCharacterId: null,

  setPhase: (p) => set((s) => ({ phase: p, previousPhase: s.phase, error: null })),
  setAccount: (a) => set({ account: a }),
  setCharacters: (c) => set({ characters: c }),
  setWorldConfig: (c) => set({ worldConfig: c }),
  setDraftName: (n) => set({ draftName: n }),
  setDraftRace: (r, defaultAppearance) =>
    set({ draftRace: r, draftAppearance: defaultAppearance ?? undefined }),
  setDraftAppearance: (a) => set({ draftAppearance: a }),
  setDraftClass: (c) => set({ draftClass: c }),
  setCreationResult: (r) => set({ creationResult: r }),
  setActiveWorld: (w) => set({ activeWorld: w }),
  setActiveMatch: (m) => set({ activeMatch: m }),
  setActiveEncounter: (e) => set({ activeEncounter: e }),
  setActiveSupremeId: (id) => set({ activeSupremeId: id }),
  setProvinceCharacterId: (id) => set({ provinceCharacterId: id }),
  setQuality: (q) => {
    try { window.localStorage.setItem('nexoria_quality', q) } catch { /* ignore */ }
    set({ quality: QUALITY_PROFILES[q] })
  },
  setError: (e) => set({ error: e }),
  initPlatform: () => {
    const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
    const ua = navigator.userAgent.toLowerCase()
    const mobile = ua.includes('android') || ua.includes('mobile') || (touch && window.innerWidth < 900)
    set({ isMobile: mobile, quality: loadQualityProfile() })
  },
}))
