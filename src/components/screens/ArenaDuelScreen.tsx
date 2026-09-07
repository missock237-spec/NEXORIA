'use client'

// NEXORIA — Écran de duel d'arène : HUD temps réel + résolution serveur.
// Le client joue le combat ; SEUL le serveur valide l'issue, le rating et l'or.

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, ChevronLeft, Timer, Wind } from 'lucide-react'
import { useCreatorStore } from '@/lib/store'
import { ArenaWorld } from '@/components/three/ArenaWorld'
import { arenaCombat, resetArenaCombat, requestAttack, playerInput } from '@/lib/game/runtime'
import { useMovementKeyboard, VirtualJoystick } from '@/components/ui-game/Controls'

interface ResolveResult {
  result: string
  ratingDelta: number
  rating: number
  rankTitle: string
  streak: number
  bestStreak: number
  goldEarned: number
  newMilestones: string[]
  training: boolean
}

export function ArenaDuelScreen() {
  const { activeMatch, activeWorld, setPhase, setActiveMatch, setCharacters } = useCreatorStore()
  const [hud, setHud] = useState({ php: 1, ohp: 1, elapsed: 0, telegraph: 0, alert: null as string | null })
  const [outcome, setOutcome] = useState<'win' | 'loss' | null>(null)
  const [res, setRes] = useState<ResolveResult | null>(null)
  const [resolving, setResolving] = useState(false)
  const endedRef = useRef(false)
  const startRef = useRef(Date.now())

  // HUD lu à 10 Hz depuis l'état mutable
  useEffect(() => {
    const iv = setInterval(() => {
      setHud({
        php: arenaCombat.playerMaxHp ? arenaCombat.playerHp / arenaCombat.playerMaxHp : 1,
        ohp: arenaCombat.oppMaxHp ? arenaCombat.oppHp / arenaCombat.oppMaxHp : 1,
        elapsed: Math.floor(arenaCombat.elapsed),
        telegraph: arenaCombat.oppTelegraph,
        alert: arenaCombat.hazardAlert,
      })
    }, 100)
    return () => clearInterval(iv)
  }, [])

  const resolve = useCallback(
    async (result: 'win' | 'loss') => {
      if (endedRef.current || !activeMatch || !activeWorld) return
      endedRef.current = true
      setOutcome(result)
      setResolving(true)
      // Durée d'horloge murale depuis le montage (couvre le temps de chargement,
      // toujours ≤ horloge serveur du match) — plancher : temps de jeu effectif.
      const wallSec = Math.floor((Date.now() - startRef.current) / 1000)
      const durationSec = Math.max(4, Math.floor(arenaCombat.elapsed), wallSec)
      try {
        const r = await fetch('/api/arenas/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: activeWorld.character.id,
            matchId: activeMatch.id,
            result,
            durationSec,
          }),
        })
        const data = await r.json()
        if (r.ok) setRes(data)
        else setRes(null)
      } catch {
        setRes(null)
      } finally {
        setResolving(false)
        // Rafraîchit la liste des personnages (or mis à jour)
        fetch('/api/auth/session')
          .then((r) => r.json())
          .then((d) => d.characters && setCharacters(d.characters))
          .catch(() => {})
      }
    },
    [activeMatch, activeWorld, setCharacters]
  )

  const onEnd = useCallback((result: 'win' | 'loss') => resolve(result), [resolve])

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
    startRef.current = Date.now()
    return () => {
      resetArenaCombat()
      playerInput.x = 0
      playerInput.z = 0
    }
  }, [])

  // Abandon : résolu comme défaite (durée réelle)
  const quit = useCallback(() => {
    if (!endedRef.current && !arenaCombat.over && arenaCombat.elapsed >= 2) {
      resolve('loss')
      setTimeout(() => {
        setActiveMatch(null)
        setPhase('arenas')
      }, 600)
    } else {
      setActiveMatch(null)
      setPhase('arenas')
    }
  }, [resolve, setActiveMatch, setPhase])

  if (!activeMatch || !activeWorld) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Aucun duel actif.
        <button onClick={() => setPhase('arenas')} className="ml-3 text-[#d4b878] underline">Retour aux arènes</button>
      </div>
    )
  }

  const m = activeMatch
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="relative h-screen w-full touch-none overflow-hidden bg-black">
      <ArenaWorld match={m} onEnd={onEnd} />

      {/* ── Barres de vie ── */}
      <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-full max-w-2xl -translate-x-1/2 px-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
              <span className="text-[#9ae8a8]">{activeWorld.character.name}</span>
              <span className="text-[#8a80a0]">Niv. {activeWorld.character.level}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-sm border border-[#3c5c48] bg-[#141c18]">
              <div
                className="h-full bg-gradient-to-r from-[#2e7c48] to-[#58c878] transition-[width] duration-200"
                style={{ width: `${hud.php * 100}%`, float: 'right' }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center rounded-sm bg-[#0c0a14cc] px-2 py-1 backdrop-blur-sm">
            <span className="flex items-center gap-1 text-[10px] font-black text-[#e8d8b0]">
              <Timer className="h-3 w-3" /> {fmt(hud.elapsed)}
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#6a6080]">vs</span>
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
              <span className="text-[#8a80a0]">{m.opponent.rankTitle}</span>
              <span className="text-[#f0a8a8]">{m.opponent.name} · {m.opponent.rating}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-sm border border-[#5c3c3c] bg-[#1c1414]">
              <div
                className="h-full bg-gradient-to-r from-[#8c2e38] to-[#e85868] transition-[width] duration-200"
                style={{ width: `${hud.ohp * 100}%` }}
              />
            </div>
          </div>
        </div>
        {/* Télégraphe d'attaque adverse */}
        {hud.telegraph > 0.02 && (
          <div className="mx-auto mt-1.5 h-1 w-40 overflow-hidden rounded-full bg-[#241818]">
            <div className="h-full bg-[#e8b848]" style={{ width: `${hud.telegraph * 100}%` }} />
          </div>
        )}
      </div>

      {/* ── Badge d'arène / entraînement ── */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] px-3 py-2 backdrop-blur-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#f0e8d8]">{m.arena.name}</div>
        <div className="text-[9px] italic text-[#8a80a0]">« {m.arena.tagline} »</div>
        {m.training && (
          <div className="mt-1 inline-block rounded-sm bg-[#2a2038] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-[#d4b878]">
            Duel d'entraînement — gains réduits
          </div>
        )}
      </div>

      {/* ── Alerte de danger d'arène ── */}
      <AnimatePresence>
        {hud.alert && !outcome && (
          <motion.div
            key={hud.alert}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-sm border border-[#e8585866] bg-[#2c1418e6] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#f0b8b8] backdrop-blur"
          >
            <span className="mr-1.5 inline-flex align-middle"><Wind className="h-3.5 w-3.5" /></span>
            {hud.alert}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contrôles ── */}
      {!outcome && (
        <>
          {useCreatorStore.getState().isMobile && <VirtualJoystick />}
          <button
            onClick={quit}
            className="absolute bottom-3 left-3 z-10 flex min-h-[38px] items-center gap-1 rounded-sm border border-[#2c2438] bg-[#0c0a14aa] px-3 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Abandonner
          </button>
          {!useCreatorStore.getState().isMobile && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-sm bg-[#0c0a14aa] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm">
              ZQSD / WASD — Déplacer · Clic ou E — Frapper · Maj — Courir · Glisser — Caméra
            </div>
          )}
          <button
            onClick={() => requestAttack()}
            className="absolute bottom-8 right-6 z-10 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#e8b84888] bg-[#2c2418dd] text-xs font-black uppercase tracking-wider text-[#f0e0b0] backdrop-blur active:scale-95"
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
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0c0a14e8] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-md border bg-[#120e1c] p-7 text-center shadow-2xl"
              style={{ borderColor: outcome === 'win' ? '#b8985c88' : '#8c484888' }}
            >
              <div
                className="text-2xl font-black uppercase tracking-[0.3em]"
                style={{ color: outcome === 'win' ? '#e8d8b0' : '#e89a9a' }}
              >
                {outcome === 'win' ? 'Victoire' : 'Défaite'}
              </div>
              <div className="mt-1 text-xs text-[#8a80a0]">
                {outcome === 'win' ? `Vous avez vaincu ${m.opponent.name}` : `${m.opponent.name} l'a emporté`}
              </div>
              <div className="mx-auto mt-4 h-px w-32 bg-gradient-to-r from-transparent via-[#b8985c88] to-transparent" />

              {resolving && <div className="mt-5 text-xs text-[#8a80a0]">Le serveur valide le duel…</div>}

              {res && (
                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#8a80a0]">Rating</div>
                      <div className="text-xl font-black text-[#e8d8b0]">
                        {res.rating}
                        <span className={`ml-2 text-sm font-bold ${res.ratingDelta >= 0 ? 'text-[#9ae8a8]' : 'text-[#e89a9a]'}`}>
                          {res.ratingDelta >= 0 ? '+' : ''}{res.ratingDelta}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-widest text-[#8a80a0]">Rang</div>
                      <div className="text-sm font-bold text-[#c8c0d8]">{res.rankTitle}</div>
                    </div>
                  </div>
                  {res.goldEarned > 0 && (
                    <div className="text-xs font-bold text-[#e8d8b0]">+ {res.goldEarned} pièces d'or</div>
                  )}
                  {res.newMilestones.map((mi) => (
                    <div key={mi} className="rounded-sm border border-[#b8985c66] bg-[#1c1628] px-3 py-1.5 text-xs font-bold text-[#e8d8b0]">
                      Récompense exclusive : {mi}
                    </div>
                  ))}
                  {res.training && (
                    <div className="text-[10px] italic text-[#6a6080]">
                      Duel d'entraînement : gains d'expérience de combat réduits.
                    </div>
                  )}
                </div>
              )}
              {!resolving && !res && (
                <div className="mt-5 text-xs text-[#c88]">Le duel n'a pas pu être validé (hors délais).</div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setActiveMatch(null)
                    setPhase('arenas')
                  }}
                  className="min-h-[48px] rounded-sm border border-[#3c3450] bg-[#1c1830] text-xs font-black uppercase tracking-[0.2em] text-[#c8c0d8]"
                >
                  Aux arènes
                </button>
                <button
                  onClick={() => {
                    setActiveMatch(null)
                    resetArenaCombat()
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
