'use client'

// NEXORIA — Équipement de départ
// Attribué automatiquement selon la classe et visualisé directement sur l'avatar.
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { AvatarPreview } from '@/components/three/AvatarPreview'
import { EQUIPMENT_CATALOG } from '@/lib/game/classes'
import type { CameraPreset } from '@/components/three/AvatarPreview'
import type { EquipmentDef } from '@/lib/game/types'
import type { EquipmentSlot } from '@/lib/game/types'

const SLOT_LABELS: Record<string, string> = {
  HEAD: 'Tête', FACE: 'Visage', HAIR: 'Cheveux', TORSO: 'Torse', ARMS: 'Bras',
  HANDS: 'Mains', LEGS: 'Jambes', FEET: 'Pieds', BACK: 'Dos',
  WEAPON_MAIN: 'Arme principale', WEAPON_OFFHAND: 'Arme secondaire',
  ACCESSORY_1: 'Accessoire 1', ACCESSORY_2: 'Accessoire 2',
}

export function buildEquipmentMap(ids: string[]): Record<string, EquipmentDef> {
  const map: Record<string, EquipmentDef> = {}
  for (const id of ids) {
    const def = EQUIPMENT_CATALOG[id]
    if (def) map[def.slot as EquipmentSlot] = def
  }
  return map
}

export function EquipmentScreen() {
  const { draftRace, draftAppearance, draftClass, setPhase, draftName } = useCreatorStore()

  const equipmentMap = useMemo(
    () => (draftClass ? buildEquipmentMap(draftClass.startingEquipment) : {}),
    [draftClass]
  )
  const items = useMemo(
    () => (draftClass ? draftClass.startingEquipment.map((id) => EQUIPMENT_CATALOG[id]).filter(Boolean) : []),
    [draftClass]
  )

  if (!draftRace || !draftAppearance || !draftClass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Choisissez d’abord votre classe.
        <button onClick={() => setPhase('class')} className="ml-3 text-[#d4b878] underline">Retour</button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0a14]">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => setPhase('class')}
          className="text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          ← Classe
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-[#8a80a0]">Étape 5 — Équipement de départ</div>
        <div className="w-16" />
      </div>

      <h1 className="mt-3 text-center text-2xl font-black uppercase tracking-[0.25em] text-[#e8d8b0] sm:text-3xl">
        Votre arsenal de novice
      </h1>
      <p className="mt-1 text-center text-xs text-[#6a6080]">
        Attribué automatiquement en fonction de votre classe — porté en temps réel sur votre avatar.
      </p>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-6 pt-4 lg:flex-row">
        <div className="relative order-1 min-h-[340px] flex-1 overflow-hidden rounded-md border border-[#2c2438] bg-gradient-to-b from-[#1a1424] to-[#0e0b16] lg:min-h-0">
          <AvatarPreview race={draftRace} appearance={draftAppearance} equipment={equipmentMap} preset="front" sparkles={false} />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-sm bg-[#0c0a14cc] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#8a80a0]">
            Équipement porté — {items.length} pièces
          </div>
        </div>

        <div className="order-2 w-full shrink-0 rounded-md border border-[#2c2438] bg-[#16121f] p-4 lg:w-[380px]">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#8a80a0]">
            Système de slots
          </div>
          <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1 lg:max-h-[460px]">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-sm border border-[#2c2438] bg-[#141020] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#e8d8b0]">{item.name}</span>
                  <span className="h-4 w-4 rounded-sm border border-[#4a3c60]" style={{ background: item.color }} />
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#8a80a0]">
                  {SLOT_LABELS[item.slot] ?? item.slot}
                </div>
                <p className="mt-1 text-[11px] leading-snug text-[#6a6080]">{item.description}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 text-center text-[10px] uppercase tracking-wider text-[#6a6080]">
            {draftName} · {draftClass.name} · Slot system modulaire (13 slots)
          </div>
          <button
            onClick={() => setPhase('review')}
            className="mt-4 min-h-[52px] w-full rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] active:scale-[0.99]"
          >
            Vérifier mon personnage →
          </button>
        </div>
      </div>
    </div>
  )
}
