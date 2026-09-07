'use client'

// NEXORIA — Aperçu final avant création définitive
// Le bouton « CRÉER LE PERSONNAGE » envoie tout au serveur, qui est autoritaire :
// nom, race, classe, apparence, équipement → stats, village, spawn générés côté serveur.
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { AvatarPreview } from '@/components/three/AvatarPreview'
import { EQUIPMENT_CATALOG } from '@/lib/game/classes'
import type { EquipmentDef } from '@/lib/game/types'
import type { EquipmentSlot } from '@/lib/game/types'

export function ReviewScreen() {
  const {
    draftName, draftRace, draftClass, draftAppearance, setPhase, setCreationResult,
  } = useCreatorStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!draftRace || !draftClass || !draftAppearance || !draftName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Votre personnage est incomplet.
        <button onClick={() => setPhase('name')} className="ml-3 text-[#d4b878] underline">Reprendre au début</button>
      </div>
    )
  }

  const equipmentIds = draftClass.startingEquipment
  const equipmentMap: Record<string, EquipmentDef> = {}
  for (const id of equipmentIds) {
    const def = EQUIPMENT_CATALOG[id]
    if (def) equipmentMap[def.slot as EquipmentSlot] = def
  }

  async function createCharacter() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/characters/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName,
          race: draftRace!.id,
          class: draftClass!.id,
          appearance: draftAppearance,
          equipment: Object.fromEntries(equipmentIds.map((id) => [EQUIPMENT_CATALOG[id]?.slot, id])),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'La création a échoué')
        setBusy(false)
        return
      }
      setCreationResult(data)
      // Le serveur a choisi le village → écran d'annonce → chargement → apparition
      setPhase('creating')
    } catch {
      setError('Connexion au serveur impossible. Réessayez.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0a14]">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => setPhase('equipment')}
          className="text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          ← Équipement
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-[#8a80a0]">Étape 6 — Vérification</div>
        <div className="w-16" />
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-8 pt-4 lg:flex-row lg:items-stretch">
        {/* Fiche personnage */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="order-2 w-full lg:order-1 lg:w-[400px]"
        >
          <div className="rounded-md border border-[#b8985c55] bg-gradient-to-b from-[#1a1424] to-[#120e1c] p-5 shadow-[0_0_40px_rgba(90,74,140,0.2)]">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.5em] text-[#8a80a0]">NEXORIA</div>
              <div className="mt-1 text-lg font-black uppercase tracking-[0.3em] text-[#d4b878]">
                Votre Personnage
              </div>
              <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-[#b8985c88] to-transparent" />
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between border-b border-[#2c2438] pb-2">
                <span className="text-[#8a80a0]">Nom</span>
                <span className="font-bold text-[#f0e8d8]">{draftName}</span>
              </div>
              <div className="flex justify-between border-b border-[#2c2438] pb-2">
                <span className="text-[#8a80a0]">Race</span>
                <span className="font-bold text-[#f0e8d8]">{draftRace.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#2c2438] pb-2">
                <span className="text-[#8a80a0]">Classe</span>
                <span className="font-bold text-[#f0e8d8]">{draftClass.name}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[#8a80a0]">Équipement</div>
              <ul className="space-y-1.5">
                {equipmentIds.map((id) => (
                  <li key={id} className="flex items-center gap-2 text-xs text-[#c8c0d8]">
                    <span className="h-2.5 w-2.5 rounded-sm border border-[#4a3c60]" style={{ background: EQUIPMENT_CATALOG[id]?.color }} />
                    {EQUIPMENT_CATALOG[id]?.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-sm border border-dashed border-[#4a3c60] bg-[#0c0a14] p-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#8a80a0]">Village de départ</div>
              <div className="mt-1 text-sm font-black uppercase tracking-[0.2em] text-[#c8b8e8]">
                Sélection automatique
              </div>
              <div className="mt-1 text-[10px] leading-snug text-[#6a6080]">
                Le serveur choisira équitablement un village compatible avec votre race,
                ainsi qu’un point d’apparition sûr.
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-sm border border-[#8c3a2e55] bg-[#8c3a2e18] px-4 py-3 text-sm text-[#e89880]">
                {error}
              </div>
            )}

            <div className="mt-5 grid gap-2">
              <button
                onClick={createCharacter}
                disabled={busy}
                className="min-h-[56px] rounded-sm bg-gradient-to-b from-[#a87c3a] to-[#6b4e1e] text-sm font-black uppercase tracking-[0.3em] text-white shadow-[0_0_25px_rgba(168,124,58,0.35)] transition hover:from-[#c89044] disabled:opacity-50 active:scale-[0.99]"
              >
                {busy ? 'Le serveur décide de votre destin…' : 'Créer le personnage'}
              </button>
              <div className="grid grid-cols-4 gap-1.5">
                {([['name', 'Nom'], ['race', 'Race'], ['creator', 'Avatar'], ['class', 'Classe']] as const).map(([p, label]) => (
                  <button
                    key={p}
                    onClick={() => setPhase(p)}
                    className="min-h-[38px] rounded-sm border border-[#2c2438] text-[10px] uppercase tracking-wider text-[#8a80a0] transition hover:border-[#b8985c66] hover:text-[#d4b878]"
                  >
                    Modifier : {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Avatar 3D final */}
        <div className="relative order-1 mb-4 min-h-[380px] w-full flex-1 overflow-hidden rounded-md border border-[#2c2438] bg-gradient-to-b from-[#1a1424] to-[#0e0b16] lg:order-2 lg:mb-0 lg:ml-4">
          <AvatarPreview race={draftRace} appearance={draftAppearance} equipment={equipmentMap} preset="full" autoRotate />
        </div>
      </div>
    </div>
  )
}
