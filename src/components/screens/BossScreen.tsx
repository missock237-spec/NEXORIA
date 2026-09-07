'use client'

// NEXORIA — Combat contre AETHERION, Suprême #01 (mise à jour officielle)
// HUD : PV du boss avec seuils de phases (66 % / 33 %), bannières de phase
// avec citations officielles, fenêtres de tir, résolution serveur + récompenses.

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, ChevronLeft, Zap, Award, Sparkles, Timer } from 'lucide-react'
import { useCreatorStore } from '@/lib/store'
import { BossWorld } from '@/components/three/BossWorld'
import { AETHERION_SPEC } from '@/lib/game/supremes'
import { bossCombat, resetBossCombat, requestAttack, playerInput } from '@/lib/game/runtime'
import { useMovementKeyboard, VirtualJoystick } from '@/components/ui-game/Controls'

interface ResolveResult {
  result: string
  phasesPassed: number
  firstDefeat: boolean
  rewards: string[]
  goldEarned: number
  quote: string | null
}

export function BossScreen() {
  const { activeEncounter, activeWorld, setPhase, setActiveEncounter, setCharacters } = useCreatorStore()
  const [hud, setHud] = useState({
    bossHp: 1,
    php: 1,
    elapsed: 0,
    phase: 1,
    window: false,
  })
  const [banner, setBanner] = useState<{ title: string; quote: string } | null>(null)
  const [outcome, setOutcome] = useState<'victory' | 'defeat' | null>(null)
  const [res, setRes] = useState<ResolveResult | null>(null)
  const [resolving, setResolving] = useState(false)
  const endedRef = useRef(false)
  const lastPhaseRef = useRef(1)
  const startRef = useRef<number>(0)

  // Horodatage de montage (couverture de l'horloge serveur) + bannière d'ouverture
  useEffect(() => {
    startRef.current = Date.now()
    const ph = AETHERION_SPEC.phases[0]
    setBanner({ title: ph.name, quote: ph.quote })
    const t = setTimeout(() => setBanner(null), 3800)
    return () => clearTimeout(t)
  }, [])

  // Suivi des transitions de phase pour les bannières
  useEffect(() => {
    const iv = setInterval(() => {
      setHud({
        bossHp: bossCombat.bossMaxHp ? bossCombat.bossHp / bossCombat.bossMaxHp : 1,
        php: bossCombat.playerMaxHp ? bossCombat.playerHp / bossCombat.playerMaxHp : 1,
        elapsed: Math.floor(bossCombat.elapsed),
        phase: bossCombat.phase,
        window: bossCombat.window,
      })
      if (bossCombat.phase !== lastPhaseRef.current && !bossCombat.over) {
        lastPhaseRef.current = bossCombat.phase
        const ph = AETHERION_SPEC.phases[bossCombat.phase - 1]
        if (ph) {
          setBanner({ title: ph.name, quote: ph.quote })
          setTimeout(() => setBanner(null), 3400)
        }
      }
    }, 100)
    return () => clearInterval(iv)
  }, [])

  const resolve = useCallback(
    async (result: 'victory' | 'defeat') => {
      if (endedRef.current || !activeEncounter || !activeWorld) return
      endedRef.current = true
      setOutcome(result)
      setResolving(true)
      const wallSec = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000)
      const durationSec = Math.max(15, Math.floor(bossCombat.elapsed), wallSec)
      // Phases cumulées réellement traversées (1..3)
      const cum: number[] = []
      let acc = 0
      for (const t of bossCombat.phaseTimes) {
        acc += t
        cum.push(Math.round(acc))
      }
      try {
        const r = await fetch('/api/supremes/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: activeWorld.character.id,
            encounterId: activeEncounter.id,
            result,
            durationSec,
            phases: result === 'victory' ? cum : [],
          }),
        })
        const data = await r.json()
        if (r.ok) setRes(data)
        else setRes(null)
      } catch {
        setRes(null)
      } finally {
        setResolving(false)
        fetch('/api/auth/session')
          .then((r2) => r2.json())
          .then((d) => d.characters && setCharacters(d.characters))
          .catch(() => {})
      }
    },
    [activeEncounter, activeWorld, setCharacters]
  )

  const onEnd = useCallback((result: 'victory' | 'defeat') => resolve(result), [resolve])

  // E / Espace : attaque — ZQSD/WASD/flèches : déplacement
  useMovementKeyboard(true)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' || e.code === 'Space') {
        e.preventDefault()
        requestAttack()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    lastPhaseRef.current = 1
    return () => {
      resetBossCombat()
      playerInput.x = 0
      playerInput.z = 0
    }
  }, [])

  if (!activeEncounter || !activeWorld) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Aucune tentative active.
        <button onClick={() => setPhase('codex')} className="ml-3 text-[#d4b878] underline">Retour au codex</button>
      </div>
    )
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const boss = activeEncounter.boss
  const currentPhase = AETHERION_SPEC.phases[Math.min(hud.phase, 3) - 1]

  return (
    <div className="relative h-screen w-full touch-none overflow-hidden bg-black">
      <BossWorld encounter={activeEncounter} onEnd={onEnd} />

      {/* ── Barre de PV du boss + seuils de phases ── */}
      <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-full max-w-3xl -translate-x-1/2 px-3">
        <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.25em]">
          <span className="text-[#b8d8f0]" style={{ textShadow: '0 0 8px #58a8f0' }}>{boss.name} — {boss.title}</span>
          <span className="text-[#6a7890]">Suprême #{activeEncounter.supremeId === 'aetherion' ? '01' : '?'} · Foudre / Ciel</span>
        </div>
        <div className="relative h-4 overflow-hidden rounded-sm border border-[#58a8f066] bg-[#0c1420]">
          <div
            className="h-full bg-gradient-to-r from-[#2c5890] via-[#58a8f0] to-[#bfe8ff] transition-[width] duration-300"
            style={{ width: `${hud.bossHp * 100}%` }}
          />
          {/* Marqueurs 66 % / 33 % */}
          <div className="absolute inset-y-0 left-[33.3%] w-0.5 bg-[#0c0a14aa]" />
          <div className="absolute inset-y-0 left-[66.6%] w-0.5 bg-[#0c0a14aa]" />
        </div>
        <div className="mt-1 flex items-center justify-between text-[8px] uppercase tracking-widest text-[#5c6c88]">
          <span>Phase {hud.phase}/3 — {currentPhase?.name}</span>
          <span className="flex items-center gap-1"><Timer className="h-2.5 w-2.5" /> {fmt(hud.elapsed)}</span>
        </div>
      </div>

      {/* ── PV joueur ── */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-44">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-[#9ae8a8]">{activeWorld.character.name}</div>
        <div className="h-2.5 overflow-hidden rounded-sm border border-[#3c5c48] bg-[#141c18]">
          <div
            className="h-full bg-gradient-to-r from-[#2e7c48] to-[#58c878] transition-[width] duration-200"
            style={{ width: `${hud.php * 100}%` }}
          />
        </div>
      </div>

      {/* ── Bannière de phase ── */}
      <AnimatePresence>
        {banner && !outcome && (
          <motion.div
            key={banner.title}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-[30%] z-20 w-full max-w-lg -translate-x-1/2 px-4 text-center"
          >
            <div className="rounded-md border border-[#58a8f088] bg-[#0c1420e8] px-6 py-4 backdrop-blur">
              <div className="text-sm font-black uppercase tracking-[0.3em] text-[#bfe4ff]" style={{ textShadow: '0 0 12px #58a8f0' }}>
                {banner.title}
              </div>
              <div className="mt-1.5 text-xs italic text-[#88b8d8]">« {banner.quote} »</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Indicateur de fenêtre de tir ── */}
      {!outcome && hud.window && (
        <div className="pointer-events-none absolute left-1/2 top-[46%] z-10 -translate-x-1/2 rounded-sm border border-[#ffe08888] bg-[#2c2410e0] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-[#ffe8a0] backdrop-blur animate-pulse">
          Le noyau est exposé — FRAPPEZ !
        </div>
      )}

      {/* ── Mécanique de phase (rappel) ── */}
      {!outcome && (
        <div className="pointer-events-none absolute right-3 top-14 z-10 max-w-[230px] rounded-sm border border-[#2c3c58] bg-[#0c1420cc] px-3 py-2 backdrop-blur-sm">
          <div className="text-[8px] uppercase tracking-[0.25em] text-[#58a8f0]">Mécanique — Phase {hud.phase}</div>
          <div className="mt-1 text-[10px] leading-snug text-[#a8bcd8]">{currentPhase?.mechanic}</div>
        </div>
      )}

      {/* ── Contrôles ── */}
      {!outcome && (
        <>
          {useCreatorStore.getState().isMobile && <VirtualJoystick />}
          <button
            onClick={() => {
              if (bossCombat.elapsed >= 15) resolve('defeat')
              else {
                setActiveEncounter(null)
                setPhase('codex')
              }
            }}
            className="absolute bottom-3 right-3 z-10 flex min-h-[38px] items-center gap-1 rounded-sm border border-[#2c2438] bg-[#0c0a14aa] px-3 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Se retirer
          </button>
          {!useCreatorStore.getState().isMobile && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-sm bg-[#0c0a14aa] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm">
              ZQSD / WASD — Déplacer · Clic ou E — Frapper le noyau · Glisser — Caméra
            </div>
          )}
          <button
            onClick={() => requestAttack()}
            className={`absolute bottom-8 right-6 z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 backdrop-blur active:scale-95 ${
              hud.window ? 'border-[#ffe088] bg-[#3c3010ee] text-[#ffe8a0]' : 'border-[#58a8f088] bg-[#102030dd] text-[#a8c8e8]'
            }`}
          >
            <span className="flex flex-col items-center">
              <Swords className="mb-1 h-5 w-5" />
              Frapper
            </span>
          </button>
        </>
      )}

      {/* ── Résolution ── */}
      <AnimatePresence>
        {outcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0c0a14ee] px-4 backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-md border bg-[#101828] p-7 text-center shadow-2xl"
              style={{ borderColor: outcome === 'victory' ? '#58a8f088' : '#8c484888' }}
            >
              {outcome === 'victory' ? (
                <>
                  <div className="text-2xl font-black uppercase tracking-[0.22em] text-[#bfe4ff]" style={{ textShadow: '0 0 16px #58a8f0' }}>
                    Le Roi du Ciel est tombé
                  </div>
                  <div className="mt-2 text-xs italic text-[#88b8d8]">« Les nuages sont mes ailes… la foudre… ma voix… »</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-black uppercase tracking-[0.22em] text-[#e89a9a]">Le ciel reste innavigable</div>
                  <div className="mt-2 text-xs italic text-[#8898a8]">« Revenez quand la tempête vous aura apprivoisé. »</div>
                </>
              )}
              <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-[#58a8f088] to-transparent" />

              {resolving && <div className="mt-5 text-xs text-[#8a80a0]">Le serveur consigne la légende…</div>}

              {res && (
                <div className="mt-5 space-y-2">
                  {res.firstDefeat ? (
                    <div className="rounded-sm border border-[#b8985c66] bg-[#1c1628] px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-[#d4b878]">
                        <Award className="h-3.5 w-3.5" /> Récompenses officielles
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {res.rewards.map((r) => (
                          <li key={r} className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#e8d8b0]">
                            <Sparkles className="h-3 w-3 text-[#d4b878]" /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-[#e8d8b0]">+ {res.goldEarned} pièces d'or (victoire répétée)</div>
                  )}
                  <div className="text-[10px] text-[#8a80a0]">
                    Phases franchies : {res.phasesPassed}/3 · Tentative n°{activeEncounter.attempts}
                  </div>
                </div>
              )}
              {!resolving && !res && (
                <div className="mt-5 text-xs text-[#c88]">La tentative n'a pas pu être validée (hors délais). Le Roi du Ciel vous attendra.</div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveEncounter(null)
                    setPhase('codex')
                  }}
                  className="min-h-[48px] rounded-sm border border-[#3c3450] bg-[#1c1830] text-xs font-black uppercase tracking-[0.2em] text-[#c8c0d8]"
                >
                  Codex
                </button>
                <button
                  onClick={() => {
                    setActiveEncounter(null)
                    resetBossCombat()
                    setPhase('village')
                  }}
                  className="min-h-[48px] rounded-sm bg-gradient-to-b from-[#a87c3a] to-[#6b4e1e] text-xs font-black uppercase tracking-[0.2em] text-white"
                >
                  Au village
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
