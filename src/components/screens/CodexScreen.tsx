'use client'

// NEXORIA — Codex des 10 Suprêmes (mise à jour officielle)
// « Ils ne sont pas seulement des boss… Ils sont les piliers de NEXORIA. »
// 10 légendes · 10 éléments · 1 seul monde.
// AETHERION (Suprême #01) est affrontable : forteresse céleste, 3 phases.

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, Zap, Moon, Droplets, Flame, Leaf, Hourglass, Eye, Cog, Ghost, HelpCircle, Swords, Box,
} from 'lucide-react'
import { useCreatorStore } from '@/lib/store'
import { SUPREME_LIST, type ElementId } from '@/lib/game/supremes'

const ELEMENT_ICONS: Record<ElementId, typeof Zap> = {
  eclair: Zap,
  tenebres: Moon,
  eau: Droplets,
  feu: Flame,
  nature: Leaf,
  temps: Hourglass,
  illusion: Eye,
  mecanique: Cog,
  ame: Ghost,
  inconnu: HelpCircle,
}

interface ProgressEntry {
  id: string
  defeated: boolean
  attempts: number
  rewards: string[]
}

export function CodexScreen() {
  const { activeWorld, setPhase, setActiveEncounter, setActiveSupremeId, setError } = useCreatorStore()
  const characterId = activeWorld?.character.id
  const [progress, setProgress] = useState<Record<string, ProgressEntry>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!characterId) return
    fetch(`/api/supremes?characterId=${characterId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        const map: Record<string, ProgressEntry> = {}
        for (const p of d.supremes) map[p.id] = p
        setProgress(map)
      })
      .catch(() => {})
  }, [characterId])

  const challenge = useCallback(
    async (supremeId: string) => {
      if (!characterId || busy) return
      setBusy(true)
      setErr(null)
      try {
        const res = await fetch('/api/supremes/challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, supremeId }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErr(data.error ?? 'Défi impossible')
          return
        }
        setActiveEncounter({
          ...data.encounter,
          boss: data.boss,
          playerLevel: data.playerLevel,
          attempts: data.attempts,
          defeatedBefore: data.defeatedBefore,
        })
        setPhase('boss')
      } catch {
        setErr('Réseau indisponible.')
      } finally {
        setBusy(false)
      }
    },
    [characterId, busy, setActiveEncounter, setPhase]
  )

  const enterSanctuary = useCallback(
    (supremeId: string) => {
      setActiveSupremeId(supremeId as import('@/lib/game/supremes').SupremeId)
      setPhase('supreme')
    },
    [setActiveSupremeId, setPhase],
  )

  if (!characterId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Aucun personnage actif.
        <button onClick={() => setPhase('charselect')} className="ml-3 text-[#d4b878] underline">Retour</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0a14] text-[#e8e4f0]">
      {/* ── En-tête façon affiche ── */}
      <header className="border-b border-[#2c2438] bg-[#0e0b18]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setPhase('arenas')}
            className="flex min-h-[38px] items-center gap-1.5 rounded-sm border border-[#3c3450] px-3 text-[10px] font-bold uppercase tracking-widest text-[#8a80a0] transition hover:text-[#c8c0d8]"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Arènes
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-[0.22em] text-[#f0e8d8] sm:text-2xl">
              Les 10 Suprêmes
            </h1>
            <p className="text-[9px] uppercase tracking-[0.32em] text-[#8a80a0] sm:text-[10px]">
              10 légendes · 10 éléments · 1 seul monde
            </p>
          </div>
          <div className="hidden max-w-[220px] text-right text-[10px] italic leading-snug text-[#6a6080] lg:block">
            « Ils ne sont pas seulement des boss…<br />Ils sont les piliers de NEXORIA. »
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-5">
        {err && (
          <div className="mb-4 rounded-sm border border-[#c8585866] bg-[#2c1418] px-4 py-2.5 text-xs text-[#f0b8b8]">{err}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SUPREME_LIST.map((s, i) => {
            const Icon = ELEMENT_ICONS[s.element]
            const p = progress[s.id]
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col overflow-hidden rounded-md border bg-[#141020]"
                style={{ borderColor: `${s.color}44` }}
              >
                {/* Portrait stylisé */}
                <div
                  className="relative flex h-28 items-center justify-center"
                  style={{ background: `radial-gradient(circle at 50% 35%, ${s.glow}22, #0c0a14 72%)` }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2"
                    style={{ borderColor: s.color, boxShadow: `0 0 18px ${s.color}55` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: s.glow }} />
                  </div>
                  {p?.defeated && (
                    <div className="absolute right-2 top-2 rounded-sm bg-[#58b84833] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#9ae8a8]">
                      Vaincu
                    </div>
                  )}
                  <div className="absolute left-2 top-2 text-[10px] font-black text-[#6a6080]">
                    {s.index}.
                  </div>
                </div>

                <div className="flex-1 px-3.5 pb-3 pt-2">
                  <div className="text-center">
                    <div className="text-base font-black uppercase tracking-[0.14em]" style={{ color: s.glow }}>
                      {s.name}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c8c0d8]">
                      {s.title}
                    </div>
                    <div
                      className="mx-auto mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.2em]"
                      style={{ borderColor: `${s.color}66`, color: s.glow, background: `${s.color}14` }}
                    >
                      <Icon className="h-2.5 w-2.5" /> {s.elementLabel}
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-[10px] leading-relaxed text-[#9a90b0]">
                    {s.lore.map((l, j) => (
                      <p key={j}>{l}</p>
                    ))}
                  </div>
                  <div className="mt-2 text-center text-[8px] uppercase tracking-[0.2em] text-[#6a6080]">
                    Domaine : {s.domain}
                  </div>
                </div>

                {/* Action */}
                <div className="space-y-1.5 px-3.5 pb-3.5">
                  {/* Sanctuaire 3D — les 10 Suprêmes, prêts à jouer */}
                  <button
                    onClick={() => enterSanctuary(s.id)}
                    className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-sm border text-[10px] font-black uppercase tracking-[0.2em] transition active:scale-[0.99]"
                    style={{
                      borderColor: `${s.color}88`,
                      color: s.glow,
                      background: `linear-gradient(180deg, ${s.color}1f, ${s.color}0a)`,
                    }}
                  >
                    <Box className="h-3.5 w-3.5" />
                    Sanctuaire 3D
                  </button>
                  {s.implementable && (
                    <button
                      onClick={() => challenge(s.id)}
                      disabled={busy}
                      className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-sm text-[10px] font-black uppercase tracking-[0.24em] text-white transition active:scale-[0.99] disabled:opacity-50"
                      style={{ background: `linear-gradient(180deg, ${s.color}, ${s.color}88)` }}
                    >
                      <Swords className="h-3.5 w-3.5" />
                      {busy ? '…' : p?.defeated ? 'Relever le défi' : 'Défier le Roi du Ciel'}
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-6 rounded-md border border-[#2c2438] bg-[#0e0b18] px-4 py-3 text-center text-[10px] uppercase tracking-[0.3em] text-[#b8985c]">
          Les 10 Suprêmes descendent en 3D — caractéristiques ultimes, invincibilité absolue.
        </div>
      </main>
    </div>
  )
}
