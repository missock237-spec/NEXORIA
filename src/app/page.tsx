'use client'

// NEXORIA — Orchestrateur du parcours complet de création de personnage
// Lancement → Accueil → Compte → Identité → Race → Avatar 3D → Classe →
// Équipement → Vérification → Création serveur → Village → Apparition → Aventure.

import { useEffect } from 'react'
import { useCreatorStore } from '@/lib/store'
import { TitleScreen } from '@/components/screens/TitleScreen'
import { AuthScreen } from '@/components/screens/AuthScreen'
import { CharacterSelectScreen } from '@/components/screens/CharacterSelectScreen'
import { NameScreen } from '@/components/screens/NameScreen'
import { RaceScreen } from '@/components/screens/RaceScreen'
import { CreatorScreen } from '@/components/screens/CreatorScreen'
import { ClassScreen } from '@/components/screens/ClassScreen'
import { EquipmentScreen } from '@/components/screens/EquipmentScreen'
import { ReviewScreen } from '@/components/screens/ReviewScreen'
import { CreatingScreen, LoadingScreen } from '@/components/screens/TransitionScreens'
import { VillageScreen } from '@/components/screens/VillageScreen'
import { ArenaHubScreen } from '@/components/screens/ArenaHubScreen'
import { ArenaDuelScreen } from '@/components/screens/ArenaDuelScreen'
import { CodexScreen } from '@/components/screens/CodexScreen'
import { BossScreen } from '@/components/screens/BossScreen'
import type { WorldConfig } from '@/lib/store'

export default function Home() {
  const phase = useCreatorStore((s) => s.phase)
  const setPhase = useCreatorStore((s) => s.setPhase)
  const setWorldConfig = useCreatorStore((s) => s.setWorldConfig)
  const setAccount = useCreatorStore((s) => s.setAccount)
  const setCharacters = useCreatorStore((s) => s.setCharacters)
  const initPlatform = useCreatorStore((s) => s.initPlatform)

  // Initialisation : plateforme + configuration du monde + session existante
  useEffect(() => {
    initPlatform()

    fetch('/api/world/config')
      .then((r) => r.json())
      .then((d: WorldConfig) => setWorldConfig(d))
      .catch(() => {})

    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAccount({ accountId: d.accountId, email: d.email })
          setCharacters(d.characters ?? [])
        }
      })
      .catch(() => {})
  }, [initPlatform, setWorldConfig, setAccount, setCharacters])

  return (
    <main className="min-h-screen bg-[#0c0a14] text-[#e8e4f0] antialiased">
      {phase === 'title' && <TitleScreen />}
      {phase === 'auth' && <AuthScreen />}
      {phase === 'charselect' && <CharacterSelectScreen />}
      {phase === 'name' && <NameScreen />}
      {phase === 'race' && <RaceScreen />}
      {phase === 'creator' && <CreatorScreen />}
      {phase === 'class' && <ClassScreen />}
      {phase === 'equipment' && <EquipmentScreen />}
      {phase === 'review' && <ReviewScreen />}
      {phase === 'creating' && <CreatingScreen />}
      {phase === 'loading' && <LoadingScreen />}
      {phase === 'village' && <VillageScreen />}
      {phase === 'arenas' && <ArenaHubScreen />}
      {phase === 'arena' && <ArenaDuelScreen />}
      {phase === 'codex' && <CodexScreen />}
      {phase === 'boss' && <BossScreen />}
    </main>
  )
}
