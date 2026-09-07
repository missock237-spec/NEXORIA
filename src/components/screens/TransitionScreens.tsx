'use client'

// NEXORIA — Transitions : création serveur → chargement du village → apparition
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'

// ── Phase 'creating' : le serveur crée le personnage étape par étape ──
export function CreatingScreen() {
  const { creationResult, setActiveWorld, setPhase, setDraftName, setDraftRace, setDraftClass, setDraftAppearance, setError } = useCreatorStore()
  const [step, setStep] = useState(0)

  const steps = [
    'Validation de l’identité…',
    'Race et classe confirmées…',
    'Apparence scellée…',
    'Statistiques générées par le serveur…',
    'Choix du village de départ…',
    'Sélection d’un point d’apparition sûr…',
  ]

  const villageName = creationResult?.character.startingVillage.name

  useEffect(() => {
    if (step < steps.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 650)
      return () => clearTimeout(t)
    }
    // Récupérer les données complètes du monde depuis le serveur
    const enter = async () => {
      try {
        const res = await fetch(`/api/characters/${creationResult?.character.id}/enter`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Erreur d’entrée dans le monde')
          return
        }
        setActiveWorld(data)
        // Synchroniser le draft avec le personnage finalisé
        setDraftName(data.character.name)
        setDraftRace(null)
        setPhase('loading')
      } catch {
        setError('Connexion perdue pendant la création')
      }
    }
    const t = setTimeout(enter, 500)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0a14] px-4">
      <div className="w-full max-w-md">
        <div className="text-center text-[10px] uppercase tracking-[0.5em] text-[#8a80a0]">NEXORIA</div>
        <h1 className="mt-2 text-center text-2xl font-black uppercase tracking-[0.25em] text-[#e8d8b0]">
          Le serveur forge votre héros
        </h1>
        <div className="mt-8 space-y-2.5">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: step > i ? 1 : 0.25, x: 0 }}
              className="flex items-center gap-3 text-sm"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  step > i ? 'border-[#7cc88c] text-[#7cc88c]' : 'border-[#2c2438] text-[#2c2438]'
                }`}
              >
                ✓
              </span>
              <span className={step > i ? 'text-[#c8c0d8]' : 'text-[#4a4260]'}>{s}</span>
            </motion.div>
          ))}
          {step >= 4 && villageName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 rounded-sm border border-[#b8985c66] bg-[#1a1424] p-4 text-center"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a80a0]">Village attribué</div>
              <div className="mt-1 text-xl font-black uppercase tracking-[0.2em] text-[#d4b878]">{villageName}</div>
              <div className="mt-1 text-[11px] text-[#8a80a0]">
                Point d’apparition : {creationResult?.character.spawn.id}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Phase 'loading' : chargement du village ──
export function LoadingScreen() {
  const { activeWorld, setPhase } = useCreatorStore()
  const [progress, setProgress] = useState(8)

  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => Math.min(100, p + 6 + Math.random() * 12))
    }, 140)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => setPhase('village'), 420)
      return () => clearTimeout(t)
    }
  }, [progress, setPhase])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c0a14] px-4">
      <div className="w-full max-w-md text-center">
        <div className="text-[10px] uppercase tracking-[0.5em] text-[#8a80a0]">Chargement du village</div>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.3em] text-[#e8d8b0]">
          {activeWorld?.village.name ?? 'Monde'}
        </h1>
        <div className="mt-1 text-xs text-[#8a80a0]">{activeWorld?.village.region}</div>
        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-[#2c2438]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#8c6b2e] to-[#d4b878] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-widest text-[#6a6080]">
          {progress < 40 ? 'Génération du terrain…' : progress < 70 ? 'Réveil des villageois…' : progress < 95 ? 'Ouverture des portes…' : 'Prêt !'}
        </div>
      </div>
    </div>
  )
}
