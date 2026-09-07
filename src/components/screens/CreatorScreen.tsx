'use client'

// NEXORIA — Character Creator
// Personnalisation complète : visage (10 paramètres), cheveux, corps, marques,
// options raciales propres à chaque race. Toutes les couleurs proviennent des
// palettes autorisées de la race — aucune combinaison incohérente possible.
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { AvatarPreview } from '@/components/three/AvatarPreview'
import { OUTFIT_TINTS } from '@/lib/game/types'
import type { CameraPreset } from '@/components/three/AvatarPreview'

type Tab = 'visage' | 'cheveux' | 'corps' | 'marques' | 'race'

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider">
        <span className="text-[#8a80a0]">{label}</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer appearance-none rounded-sm bg-[#2c2438] accent-[#b8985c] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4b878] [&::-webkit-slider-thumb]:shadow"
      />
    </label>
  )
}

function Palette({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[#8a80a0]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
            className={`h-8 w-8 rounded-full border-2 transition ${
              value === c ? 'scale-110 border-[#d4b878] shadow-[0_0_10px_rgba(212,184,120,0.5)]' : 'border-[#2c2438] hover:border-[#5a4c70]'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  )
}

function Pills({ options, value, onChange }: { options: { key: string; label: string; values: string[]; default: string }; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[#8a80a0]">{options.label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.values.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`min-h-[34px] rounded-sm border px-3 text-xs capitalize transition ${
              value === v ? 'border-[#b8985c88] bg-[#2a2038] text-[#e8d8b0]' : 'border-[#2c2438] bg-[#16121f] text-[#8a80a0] hover:border-[#4a3c60]'
            }`}
          >
            {v.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CreatorScreen() {
  const {
    draftRace, draftAppearance, setDraftAppearance, setPhase,
  } = useCreatorStore()
  const [tab, setTab] = useState<Tab>('visage')
  const [preset, setPreset] = useState<CameraPreset>('face')
  const [autoRotate, setAutoRotate] = useState(false)

  const race = draftRace
  const app = draftAppearance

  const hairStyleLabels = useMemo(() => race?.morphology.hairStyles ?? [], [race])

  if (!race || !app) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Choisissez d’abord une race…
        <button onClick={() => setPhase('race')} className="ml-3 text-[#d4b878] underline">Retour</button>
      </div>
    )
  }

  const patch = (p: Partial<typeof app>) => setDraftAppearance({ ...app, ...p })
  const patchFace = (k: string, v: number) => setDraftAppearance({ ...app, face: { ...app.face, [k]: v } })
  const patchHair = (p: Partial<typeof app.hair>) => setDraftAppearance({ ...app, hair: { ...app.hair, ...p } })
  const patchBody = (p: Partial<typeof app.body>) => setDraftAppearance({ ...app, body: { ...app.body, ...p } })
  const patchMarks = (p: Partial<typeof app.marks>) => setDraftAppearance({ ...app, marks: { ...app.marks, ...p } })
  const patchRacial = (k: string, v: string) =>
    setDraftAppearance({ ...app, racial: { ...app.racial, [k]: v } })

  const tabs: [Tab, string][] = [
    ['visage', 'Visage'], ['cheveux', 'Cheveux'], ['corps', 'Corps'],
    ['marques', 'Marques'], ['race', `Traits ${race.name}`],
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0a14]">
      <div className="flex items-center justify-between px-5 pt-5">
        <button
          onClick={() => setPhase('race')}
          className="text-xs uppercase tracking-[0.2em] text-[#6a6080] transition hover:text-[#9a90b0]"
        >
          ← Races
        </button>
        <div className="text-[11px] uppercase tracking-[0.4em] text-[#8a80a0]">Étape 3 — Création de l’avatar</div>
        <div className="w-16" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
        {/* Préview 3D */}
        <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-md border border-[#2c2438] bg-gradient-to-b from-[#1a1424] to-[#0e0b16] lg:min-h-0">
          <AvatarPreview race={race} appearance={app} preset={preset} autoRotate={autoRotate} />
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {([['face', 'Visage'], ['front', 'Avant'], ['back', 'Arrière'], ['full', 'Corps']] as [CameraPreset, string][]).map(([p, label]) => (
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
              360°
            </button>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 rounded-sm bg-[#0c0a14cc] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-[#8a80a0]">
            {race.name}
          </div>
        </div>

        {/* Panneau de personnalisation */}
        <div className="flex w-full shrink-0 flex-col rounded-md border border-[#2c2438] bg-[#16121f] lg:w-[380px]">
          <div className="grid grid-cols-5 gap-1 border-b border-[#2c2438] p-1.5">
            {tabs.map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`min-h-[40px] rounded-sm text-[10px] font-bold uppercase tracking-wide transition ${
                  tab === t ? 'bg-[#2a2038] text-[#e8d8b0]' : 'text-[#6a6080] hover:text-[#9a90b0]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[46vh] space-y-5 overflow-y-auto p-4 lg:max-h-[480px]">
            {tab === 'visage' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <Palette label="Teint de peau" colors={race.morphology.skinTones} value={app.skin} onChange={(c) => patch({ skin: c })} />
                <Palette label="Couleur des yeux" colors={race.morphology.eyeColors} value={app.eyeColor} onChange={(c) => patch({ eyeColor: c })} />
                <Slider label="Largeur du visage" value={app.face.faceWidth} onChange={(v) => patchFace('faceWidth', v)} />
                <Slider label="Hauteur du visage" value={app.face.faceHeight} onChange={(v) => patchFace('faceHeight', v)} />
                <Slider label="Mâchoire" value={app.face.jawWidth} onChange={(v) => patchFace('jawWidth', v)} />
                <Slider label="Menton" value={app.face.chinLength} onChange={(v) => patchFace('chinLength', v)} />
                <Slider label="Nez" value={app.face.noseSize} onChange={(v) => patchFace('noseSize', v)} />
                <Slider label="Taille des yeux" value={app.face.eyeSize} onChange={(v) => patchFace('eyeSize', v)} />
                <Slider label="Écartement des yeux" value={app.face.eyeDistance} onChange={(v) => patchFace('eyeDistance', v)} />
                <Slider label="Sourcils" value={app.face.browThickness} onChange={(v) => patchFace('browThickness', v)} />
                <Slider label="Bouche" value={app.face.mouthWidth} onChange={(v) => patchFace('mouthWidth', v)} />
                <Slider label="Oreilles" value={app.face.earSize} onChange={(v) => patchFace('earSize', v)} />
              </motion.div>
            )}

            {tab === 'cheveux' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[#8a80a0]">Coiffure</div>
                  <div className="flex flex-wrap gap-1.5">
                    {hairStyleLabels.map((s) => (
                      <button
                        key={s}
                        onClick={() => patchHair({ style: s })}
                        className={`min-h-[34px] rounded-sm border px-3 text-xs capitalize transition ${
                          app.hair.style === s ? 'border-[#b8985c88] bg-[#2a2038] text-[#e8d8b0]' : 'border-[#2c2438] bg-[#16121f] text-[#8a80a0] hover:border-[#4a3c60]'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <Palette label="Couleur de cheveux" colors={race.morphology.hairColors} value={app.hair.color} onChange={(c) => patchHair({ color: c })} />
                <Palette label="Reflets / mèches" colors={[...race.morphology.hairColors, '#e8b0c8', '#8ce8e0', '#d4b878']} value={app.hair.secondaryColor} onChange={(c) => patchHair({ secondaryColor: c })} />
              </motion.div>
            )}

            {tab === 'corps' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <p className="text-[11px] leading-relaxed text-[#6a6080]">
                  Les proportions restent dans les limites définies par la race afin de
                  préserver la compatibilité complète avec le système d’animation.
                </p>
                <Slider label="Taille" value={app.body.height} onChange={(v) => patchBody({ height: v })} />
                <Slider label="Corpulence" value={app.body.bulk} onChange={(v) => patchBody({ bulk: v })} />
                <Slider label="Épaules" value={app.body.shoulders} onChange={(v) => patchBody({ shoulders: v })} />
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wider text-[#8a80a0]">Teinte des vêtements</div>
                  <div className="flex flex-wrap gap-1.5">
                    {OUTFIT_TINTS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => patch({ outfitTint: t.id })}
                        className={`min-h-[34px] rounded-sm border px-3 text-xs transition ${
                          (app.outfitTint ?? 'naturel') === t.id ? 'border-[#b8985c88] bg-[#2a2038] text-[#e8d8b0]' : 'border-[#2c2438] bg-[#16121f] text-[#8a80a0] hover:border-[#4a3c60]'
                        }`}
                      >
                        <span className="mr-1.5 inline-block h-3 w-3 rounded-full align-middle" style={{ background: t.torso }} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'marques' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <Pills options={{ key: 'marks', label: 'Marques du visage', values: race.marks.types, default: 'aucune' }} value={app.marks.type} onChange={(v) => patchMarks({ type: v })} />
                <Palette label="Couleur des marques" colors={race.marks.colors} value={app.marks.color} onChange={(c) => patchMarks({ color: c })} />
              </motion.div>
            )}

            {tab === 'race' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {race.racialOptions.length === 0 ? (
                  <p className="text-sm leading-relaxed text-[#6a6080]">
                    Les {race.name}s ne possèdent pas de traits raciaux supplémentaires.
                    Explorez les autres onglets pour peaufiner votre apparence.
                  </p>
                ) : (
                  race.racialOptions.map((opt) => (
                    <Pills
                      key={opt.key}
                      options={opt}
                      value={app.racial[opt.key] ?? opt.default}
                      onChange={(v) => patchRacial(opt.key, v)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </div>

          <div className="border-t border-[#2c2438] p-3">
            <button
              onClick={() => setPhase('class')}
              className="min-h-[52px] w-full rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:from-[#a87c3a] active:scale-[0.99]"
            >
              Apparence terminée — Choisir ma classe →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
