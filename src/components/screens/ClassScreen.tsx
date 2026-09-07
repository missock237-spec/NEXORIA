'use client'

// NEXORIA — Choix de la classe (4 classes initiales)
// Toutes les combinaisons race × classe sont autorisées — aucune verrouillage.
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { AvatarPreview } from '@/components/three/AvatarPreview'
import { EQUIPMENT_CATALOG } from '@/lib/game/classes'
import type { CameraPreset, EquipmentDef } from '@/components/three/AvatarPreview'
import type { EquipmentSlot } from '@/lib/game/types'

function buildEquipmentMap(ids: string[]): Record<string, EquipmentDef> {
  const map: Record<string, EquipmentDef> = {}
  for (const id of ids) {
    const def = EQUIPMENT_CATALOG[id]
    if (def) map[def.slot as EquipmentSlot] = def
  }
  return map
}

export function ClassScreen() {
  const { worldConfig, draftRace, draftAppearance, draftClass, setDraftClass, setPhase, draftName } = useCreatorStore()
  const [previewClass, setPreviewClass] = useState(draftClass)
  const [preset] = useState<CameraPreset>('full')

  const classes = useMemo(() => worldConfig?.classes ?? [], [worldConfig])
  const shown = previewClass ?? draftClass

  if (!draftRace || !draftAppearance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Terminez d’abord votre apparence.
        <button onClick={() => setPhase('creator')} className="ml-3 text-[#d4b878] underline">Retour</button>
      </div>
    )
  }

  function confirm() {
    if (!shown) return
    setDraftClass(shown)
    setPhase('equipment')
  }

  const shownEquipment = shown ? buildEquipmentMap(shown.startingEquipment) : undefined

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0a14]">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => setPhase('creator')}
          className="text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          ← Avatar
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-[#8a80a0]">Étape 4 — La Classe</div>
        <div className="w-16" />
      </div>

      <h1 className="mt-3 text-center text-2xl font-black uppercase tracking-[0.25em] text-[#e8d8b0] sm:text-3xl">
        Choisissez votre destinée
      </h1>
      <p className="mt-1 text-center text-xs text-[#6a6080]">
        Aucune race n’est verrouillée à une classe — toutes les combinaisons fonctionnent.
      </p>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-6 pt-4 lg:flex-row">
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[330px]">
          <div className="grid grid-cols-2 gap-2">
            {classes.map((c) => {
              const active = shown?.id === c.id
              return (
                <button
                  key={c.id}
                  onMouseEnter={() => setPreviewClass(c)}
                  onClick={() => setPreviewClass(c)}
                  className={`rounded-sm border p-3 text-left transition-all ${
                    active ? 'border-[#b8985c88] bg-[#2a2038] shadow-[0_0_18px_rgba(184,152,92,0.2)]' : 'border-[#2c2438] bg-[#16121f] hover:border-[#4a3c60]'
                  }`}
                >
                  <div className={`text-sm font-bold ${active ? 'text-[#f0e8d8]' : 'text-[#c8c0d8]'}`}>{c.name}</div>
                  <div className="mt-0.5 text-[10px] leading-snug text-[#6a6080]">{c.combatStyle}</div>
                  <div className="mt-2 flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`h-1.5 w-4 rounded-full ${i < c.difficulty ? 'bg-[#b8985c]' : 'bg-[#2c2438]'}`} />
                    ))}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-[#6a6080]">Difficulté : {c.difficultyLabel}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="order-1 flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-md border border-[#2c2438] bg-gradient-to-b from-[#16121f] to-[#0e0b16] lg:order-2 lg:min-h-0">
          <div className="relative min-h-[300px] flex-1">
            <AvatarPreview
              race={draftRace}
              appearance={draftAppearance}
              equipment={shownEquipment}
              preset={preset}
              autoRotate={false}
              sparkles={false}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={shown?.id ?? 'none'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="border-t border-[#2c2438] bg-[#0e0b16f0] p-4 sm:p-5"
            >
              {shown ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-xl font-black tracking-wide text-[#e8d8b0]">{shown.name}</h2>
                    <span className="rounded-sm border border-[#4a3c60] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8a9cc0]">
                      Arme : {shown.mainWeapon}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#9a90b0]">{shown.description}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {shown.skills.map((s) => (
                      <div key={s.name} className="rounded-sm border border-[#2c2438] bg-[#141020] p-2">
                        <div className="text-[11px] font-bold text-[#c8b8e8]">{s.name}</div>
                        <div className="mt-0.5 text-[10px] leading-snug text-[#6a6080]">{s.description}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-[#6a6080]">
                    <span>Style : {shown.playStyle}</span>
                    <span>Équipement de départ : {shown.startingEquipment.length} pièces</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#6a6080]">Survolez une classe pour l’aperçu 3D.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[#2c2438] bg-[#0c0a14f2] px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="hidden flex-1 text-sm text-[#8a80a0] sm:block">
            <span className="text-[#e8d8b0]">{draftName}</span> · {draftRace.name} ·{' '}
            <span className="text-[#e8d8b0]">{shown?.name ?? 'classe ?'}</span>
          </div>
          <button
            onClick={confirm}
            disabled={!shown}
            className="min-h-[52px] flex-1 rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] disabled:opacity-40 active:scale-[0.99] sm:flex-none sm:px-16"
          >
            Recevoir mon équipement →
          </button>
        </div>
      </div>
    </div>
  )
}
