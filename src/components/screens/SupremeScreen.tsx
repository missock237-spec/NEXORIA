'use client'

// NEXORIA — Sanctuaire des 10 Suprêmes (mise à jour « 3D prêts à jouer »)
// Vue 3D interactive de chaque Suprême : rotation 360°, zoom, capacités
// jouables avec effets visuels, caractéristiques ULTIMES et INVINCIBILITÉ
// absolue — testée en direct : toute attaque ennemie inflige 0 dégât.

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Zap, Moon, Droplets, Flame, Leaf, Hourglass, Eye, Cog, Ghost,
  HelpCircle, Shield, ShieldCheck, Swords, Skull, Infinity as InfinityIcon, Crosshair,
} from 'lucide-react'
import { useCreatorStore } from '@/lib/store'
import { SUPREME_LIST, SUPREME_POWER, type ElementId } from '@/lib/game/supremes'

const SupremeSanctuary = dynamic(
  () => import('@/components/three/supremes/SupremeSanctuary').then((m) => m.SupremeSanctuary),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#07060d]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#d4b87833] border-t-[#d4b878]" />
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-[#8a80a0]">Invocation du Sanctuaire…</p>
        </div>
      </div>
    ),
  },
)

const ELEMENT_ICONS: Record<ElementId, typeof Zap> = {
  eclair: Zap, tenebres: Moon, eau: Droplets, feu: Flame, nature: Leaf,
  temps: Hourglass, illusion: Eye, mecanique: Cog, ame: Ghost, inconnu: HelpCircle,
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

type Feedback = 'verdict' | null

export function SupremeScreen() {
  const activeSupremeId = useCreatorStore((s) => s.activeSupremeId)
  const setActiveSupremeId = useCreatorStore((s) => s.setActiveSupremeId)
  const setPhase = useCreatorStore((s) => s.setPhase)

  const [abilityTrigger, setAbilityTrigger] = useState(0)
  const [activeAbilityIdx, setActiveAbilityIdx] = useState<number | null>(null)
  const [attackTrigger, setAttackTrigger] = useState(0)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const idx = Math.max(0, SUPREME_LIST.findIndex((s) => s.id === activeSupremeId))
  const supreme = SUPREME_LIST[idx]
  const power = SUPREME_POWER[supreme.id]
  const ElementIcon = ELEMENT_ICONS[supreme.element]

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const next = SUPREME_LIST[(idx + dir + SUPREME_LIST.length) % SUPREME_LIST.length]
      setActiveSupremeId(next.id)
      setActiveAbilityIdx(null)
      setFeedback(null)
    },
    [idx, setActiveSupremeId],
  )

  const castAbility = useCallback((i: number) => {
    setActiveAbilityIdx(i)
    setAbilityTrigger((t) => t + 1)
  }, [])

  const testInvincibility = useCallback(() => setAttackTrigger((t) => t + 1), [])

  const onVerdict = useCallback(() => setFeedback('verdict'), [])
  const activeAbility = activeAbilityIdx !== null ? power.abilities[activeAbilityIdx].vfx : null

  const verdictVisible = useMemo(() => feedback === 'verdict', [feedback])

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#07060d]">
      {/* ── En-tête ── */}
      <header className="relative z-20 border-b border-[#2c2438] bg-[#0c0a14cc] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <button
            onClick={() => setPhase('codex')}
            className="flex min-h-[38px] items-center gap-1.5 rounded-sm border border-[#3c3450] px-3 text-[10px] font-bold uppercase tracking-widest text-[#8a80a0] transition hover:text-[#c8c0d8]"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Codex
          </button>
          <div className="text-center">
            <h1 className="text-sm font-black uppercase tracking-[0.24em] text-[#f0e8d8] sm:text-lg">
              {supreme.index}. {supreme.name}
            </h1>
            <p className="text-[8px] uppercase tracking-[0.28em] text-[#8a80a0] sm:text-[10px]">
              {supreme.title} · Sanctuaire {power.invincible ? 'des Invincibles' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              aria-label="Suprême précédent"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-sm border border-[#3c3450] text-[#8a80a0] transition hover:text-[#c8c0d8]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="Suprême suivant"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-sm border border-[#3c3450] text-[#8a80a0] transition hover:text-[#c8c0d8]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Sélecteur rapide : les 10 Suprêmes */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2 sm:px-4">
          {SUPREME_LIST.map((s) => {
            const Icon = ELEMENT_ICONS[s.element]
            const active = s.id === supreme.id
            return (
              <button
                key={s.id}
                onClick={() => { setActiveSupremeId(s.id); setActiveAbilityIdx(null); setFeedback(null) }}
                title={`${s.index}. ${s.name}`}
                className="flex min-h-[30px] min-w-[30px] shrink-0 items-center justify-center rounded-sm border px-1.5 transition"
                style={{
                  borderColor: active ? s.color : '#2c2438',
                  background: active ? `${s.color}22` : 'transparent',
                  boxShadow: active ? `0 0 10px ${s.color}44` : 'none',
                }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: active ? s.glow : '#6a6080' }} />
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Scène 3D plein écran ── */}
      <div className="relative flex-1">
        <SupremeSanctuary
          supreme={supreme}
          power={power}
          abilityTrigger={abilityTrigger}
          activeAbility={activeAbility}
          attackTrigger={attackTrigger}
          onVerdict={onVerdict}
        />

        {/* Verdict d'invincibilité (HUD) */}
        <AnimatePresence>
          {verdictVisible && (
            <motion.div
              key={attackTrigger}
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute left-1/2 top-[26%] z-20 -translate-x-1/2 text-center"
            >
              <div className="text-5xl font-black text-[#ff6858] drop-shadow-[0_2px_12px_#ff483866]">-0</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#ffd87088] bg-[#1a140899] px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#ffd870] backdrop-blur">
                <ShieldCheck className="h-4 w-4" /> Invincible
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#c8c0d8]">
                Dégâts subis : 0 · PV : {fmt(power.stats.pv)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge élément + menace (coin) */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] backdrop-blur"
            style={{ borderColor: `${supreme.color}77`, color: supreme.glow, background: '#0c0a14aa' }}
          >
            <ElementIcon className="h-3 w-3" /> {supreme.elementLabel}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#c8585866] bg-[#0c0a14aa] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#f0a8a8] backdrop-blur">
            <Skull className="h-3 w-3" /> Menace ∞
          </div>
        </div>

        {/* Badge INVINCIBLE (coin droit) */}
        <motion.div
          animate={{ boxShadow: ['0 0 8px #ffd87033', '0 0 20px #ffd87066', '0 0 8px #ffd87033'] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#ffd87088] bg-[#1a1408cc] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd870] backdrop-blur"
        >
          <Shield className="h-3.5 w-3.5" /> Invincible
        </motion.div>
      </div>

      {/* ── Barre de commande : caractéristiques + capacités ── */}
      <footer className="relative z-20 border-t border-[#2c2438] bg-[#0c0a14e8] backdrop-blur">
        {/* Caractéristiques ultimes */}
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-1.5 px-3 pt-2.5 sm:grid-cols-5 sm:px-4">
          {[
            { label: 'PV', value: power.stats.pv },
            { label: 'Attaque', value: power.stats.attaque },
            { label: 'Défense', value: power.stats.defense },
            { label: 'Vitesse', value: power.stats.vitesse },
            { label: 'Puissance', value: power.stats.puissance },
          ].map((s) => (
            <div key={s.label} className="rounded-sm border border-[#2c2438] bg-[#100c1a] px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-[0.2em] text-[#8a80a0]">{s.label}</div>
              <div className="text-[11px] font-black tabular-nums tracking-tight" style={{ color: supreme.glow }}>
                {fmt(s.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Capacités jouables + test d'invincibilité */}
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-stretch">
          <div className="grid flex-1 gap-1.5 sm:grid-cols-3">
            {power.abilities.map((a, i) => (
              <button
                key={a.name}
                onClick={() => castAbility(i)}
                className="group flex min-h-[46px] flex-col items-start justify-center rounded-sm border px-3 py-1.5 text-left transition active:scale-[0.99]"
                style={{
                  borderColor: activeAbilityIdx === i ? supreme.color : '#2c2438',
                  background: activeAbilityIdx === i ? `${supreme.color}1e` : '#100c1a',
                  boxShadow: activeAbilityIdx === i ? `0 0 14px ${supreme.color}33` : 'none',
                }}
              >
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: supreme.glow }}>
                  <Crosshair className="h-3 w-3 opacity-70" /> {a.name}
                </span>
                <span className="mt-0.5 line-clamp-1 text-[9px] leading-snug text-[#9a90b0]">{a.desc}</span>
              </button>
            ))}
          </div>
          <button
            onClick={testInvincibility}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-sm border border-[#ffd87066] bg-gradient-to-b from-[#2a2008] to-[#1a1408] px-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd870] transition hover:from-[#3a2c0c] active:scale-[0.99] lg:w-56"
          >
            <Swords className="h-4 w-4" /> Tester l&apos;invincibilité
          </button>
        </div>

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 pb-2 text-[8px] uppercase tracking-[0.22em] text-[#6a6080] sm:px-4">
          <span className="inline-flex items-center gap-1">
            <InfinityIcon className="h-3 w-3" /> Niveau ∞
          </span>
          <span className="hidden sm:inline">Glisser pour orbiter · Molette pour zoomer</span>
          <span>Suprême {idx + 1} / 10</span>
        </div>
      </footer>
    </div>
  )
}
