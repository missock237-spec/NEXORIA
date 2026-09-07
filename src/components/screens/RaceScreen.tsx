'use client'

// NEXORIA — Choix de la race parmi les 9 races jouables
// Sélection → le modèle 3D apparaît, la caméra se rapproche, rotation 360°,
// informations de la race affichées, options raciales activées à l'étape suivante.
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { AvatarPreview } from '@/components/three/AvatarPreview'
import { defaultAppearance } from '@/lib/game/stats'
import type { CameraPreset } from '@/components/three/AvatarPreview'

export function RaceScreen() {
  const {
    worldConfig, draftRace, setDraftRace, setDraftAppearance, setPhase, draftName,
  } = useCreatorStore()
  const [previewRace, setPreviewRace] = useState(draftRace)
  const [preset, setPreset] = useState<CameraPreset>('full')
  const [autoRotate, setAutoRotate] = useState(true)

  const races = useMemo(() => worldConfig?.races ?? [], [worldConfig])
  const shown = previewRace ?? races[0]
  const shownId = shown?.id ?? 'humain'
  const shownAppearance = useMemo(() => defaultAppearance(shownId), [shownId])

  if (!worldConfig || races.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Chargement du monde…
      </div>
    )
  }

  function hover(r: typeof races[number]) {
    setPreviewRace(r)
    setAutoRotate(true)
  }

  function confirm() {
    if (!shown) return
    setDraftRace(shown, defaultAppearance(shown.id))
    setPhase('creator')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0a14]">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => setPhase('name')}
          className="text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          ← Identité
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-[#8a80a0]">Étape 2 — La Race</div>
        <div className="w-16" />
      </div>

      <h1 className="mt-3 text-center text-2xl font-black uppercase tracking-[0.25em] text-[#e8d8b0] sm:text-3xl">
        Choisissez votre peuple
      </h1>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-6 pt-4 lg:flex-row">
        {/* Galerie des 9 races */}
        <div className="order-2 w-full shrink-0 lg:order-1 lg:w-[340px]">
          <div className="grid max-h-[300px] grid-cols-3 gap-2 overflow-y-auto pr-1 lg:max-h-[520px] lg:grid-cols-2">
            {races.map((r) => {
              const active = shown.id === r.id
              return (
                <button
                  key={r.id}
                  onMouseEnter={() => hover(r)}
                  onClick={() => hover(r)}
                  className={`group rounded-sm border p-3 text-left transition-all ${
                    active
                      ? 'border-[#b8985c88] bg-[#2a2038] shadow-[0_0_18px_rgba(184,152,92,0.2)]'
                      : 'border-[#2c2438] bg-[#16121f] hover:border-[#4a3c60]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ background: r.morphology.skinTones[1], boxShadow: `0 0 8px ${r.morphology.eyeColors[0]}` }}
                    />
                    <span className={`text-sm font-bold ${active ? 'text-[#f0e8d8]' : 'text-[#c8c0d8]'}`}>{r.name}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#6a6080]">{r.tagline}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scène 3D + infos */}
        <div className="order-1 flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-md border border-[#2c2438] bg-gradient-to-b from-[#16121f] to-[#0e0b16] lg:order-2 lg:min-h-0">
          <div className="relative min-h-[300px] flex-1">
            <AvatarPreview race={shown} appearance={shownAppearance} preset={preset} autoRotate={autoRotate} />
            {/* caméras de preset */}
            <div className="absolute bottom-3 left-3 flex gap-1.5">
              {([['face', 'Visage'], ['full', 'Corps'], ['back', 'Dos']] as [CameraPreset, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => { setPreset(p); setAutoRotate(false) }}
                  className={`min-h-[36px] rounded-sm border px-3 text-[10px] font-bold uppercase tracking-wider transition ${
                    preset === p ? 'border-[#b8985c88] bg-[#2a2038] text-[#e8d8b0]' : 'border-[#2c2438] bg-[#0c0a14aa] text-[#8a80a0] hover:text-[#c8c0d8]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setAutoRotate((v) => !v)}
                className="min-h-[36px] rounded-sm border border-[#2c2438] bg-[#0c0a14aa] px-3 text-[10px] font-bold uppercase tracking-wider text-[#8a80a0] transition hover:text-[#c8c0d8]"
              >
                {autoRotate ? 'Arrêter la rotation' : 'Rotation 360°'}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={shown.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="border-t border-[#2c2438] bg-[#0e0b16f0] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-black tracking-wide text-[#e8d8b0]">{shown.name}</h2>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a80a0]">{shown.difficulty}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#9a90b0]">{shown.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {shown.abilities.map((a) => (
                  <span key={a.name} title={a.description} className="cursor-help rounded-sm border border-[#4a3c60] bg-[#1a1424] px-2.5 py-1 text-[11px] text-[#c8b8e8]">
                    {a.name}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-[#6a6080]">
                <span>Villages : {shown.compatibleVillages.length} compatibles</span>
                <span>Peaux : {shown.morphology.skinTones.length}</span>
                <span>Yeux : {shown.morphology.eyeColors.length}</span>
                <span>Coiffures : {shown.morphology.hairStyles.length}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[#2c2438] bg-[#0c0a14f2] px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="hidden flex-1 text-sm text-[#8a80a0] sm:block">
            Héros <span className="text-[#e8d8b0]">{draftName || '—'}</span> · race sélectionnée :{' '}
            <span className="text-[#e8d8b0]">{shown.name}</span>
          </div>
          <button
            onClick={confirm}
            className="min-h-[52px] flex-1 rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] active:scale-[0.99] sm:flex-none sm:px-16"
          >
            Personnaliser ce {shown.name} →
          </button>
        </div>
      </div>
    </div>
  )
}
