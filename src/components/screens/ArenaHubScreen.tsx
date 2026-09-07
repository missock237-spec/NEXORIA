'use client'

// NEXORIA — Hub « Les 5 Arènes de Combat » (mise à jour officielle)
// Fidèle à l'affiche : 5 cartes d'arènes, 3 systèmes, classement temps réel,
// profil de gladiateur, accès au Codex des 10 Suprêmes et au défi AETHERION.

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Swords, Map as MapIcon, Sparkles, TrendingUp, Zap, Feather, Flame, Leaf, Eye,
  Snowflake, Trophy, Users, Gift, ChevronLeft, Crown, Skull, RefreshCw,
} from 'lucide-react'
import { useCreatorStore } from '@/lib/store'
import type { ArenaDef } from '@/lib/game/arenas'
import { arenaRankTitle } from '@/lib/game/arenas'

interface ArenaProfileData {
  rating: number
  wins: number
  losses: number
  streak: number
  bestStreak: number
  milestones: string[]
}

interface RecentMatch {
  id: string
  arenaId: string
  opponentName: string
  opponentRating: number
  result: string | null
  ratingDelta: number | null
  training: boolean
}

interface LeaderRow {
  rank: number
  name: string
  race: string
  class: string
  level: number
  rating: number
  wins: number
  losses: number
  rankTitle: string
  isPlayer: boolean
}

const EMBLEMS = { wing: Feather, flame: Flame, leaf: Leaf, eye: Eye, snowflake: Snowflake } as const

// Bandeau d'illustration CSS par arène (rappel des ambiances de l'affiche)
const CARD_ART: Record<string, string> = {
  sommets_celestes: 'linear-gradient(140deg,#7ab8f0 0%,#e8f4ff 55%,#f8f4e0 100%)',
  volcan: 'linear-gradient(140deg,#f8c848 0%,#f06018 45%,#5c1408 100%)',
  foret_eternelle: 'linear-gradient(140deg,#a8e890 0%,#58a848 50%,#2c5828 100%)',
  ruines_anciennes: 'linear-gradient(140deg,#b8a8e8 0%,#6b5498 50%,#241c3c 100%)',
  glaces_eternelles: 'linear-gradient(140deg,#e8f8ff 0%,#88d0e8 45%,#28587c 100%)',
}

function SpecRow({ icon: Icon, label, value }: { icon: typeof Swords; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] leading-snug">
      <Icon className="h-3 w-3 shrink-0 text-[#8a80a0]" />
      <span className="text-[#6a6080]">{label} :</span>
      <span className="font-semibold text-[#c8c0d8]">{value}</span>
    </div>
  )
}

function ArenaCard({
  arena,
  playerLevel,
  busy,
  onFight,
}: {
  arena: ArenaDef
  playerLevel: number
  busy: boolean
  onFight: (arenaId: string) => void
}) {
  const Emblem = EMBLEMS[arena.visuals.emblem] ?? Swords
  const below = playerLevel < arena.recommendedLevel
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col overflow-hidden rounded-md border border-[#3c3450] bg-[#141020] shadow-lg"
    >
      {/* En-tête de carte */}
      <div className="flex items-start gap-2.5 border-b border-[#2c2438] px-4 pb-2.5 pt-3.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border"
          style={{ borderColor: `${arena.visuals.accentColor}66`, background: `${arena.visuals.accentColor}22` }}
        >
          <Emblem className="h-4.5 w-4.5" style={{ color: arena.visuals.accentColor }} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black uppercase tracking-wider text-[#f0e8d8]">
            {arena.index}. {arena.name}
          </div>
          <div className="truncate text-[11px] italic text-[#8a80a0]">« {arena.tagline} »</div>
        </div>
      </div>

      {/* Illustration d'ambiance */}
      <div className="relative h-16 w-full" style={{ background: CARD_ART[arena.id] }}>
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 120%, rgba(0,0,0,0.55), transparent 60%)' }} />
        {/* Vue de dessus (mini-anneau, clin d'œil à l'affiche) */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-sm bg-[#0c0a14cc] px-2 py-1">
          <div
            className="h-5 w-5 rounded-full border-2"
            style={{ borderColor: arena.visuals.accentColor, boxShadow: `0 0 6px ${arena.visuals.accentColor}88` }}
          >
            <div className="m-[3px] h-[8px] w-[8px] rounded-full" style={{ background: arena.visuals.accentColor }} />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest text-[#8a80a0]">Vue de dessus</span>
        </div>
      </div>

      {/* Spécifications officielles */}
      <div className="flex-1 space-y-1.5 px-4 py-3">
        <SpecRow icon={Swords} label="Type" value={`Duel ${arena.type.join(' / ')}`} />
        <SpecRow icon={MapIcon} label="Environnement" value={arena.environment} />
        <SpecRow icon={Sparkles} label="Thème" value={arena.theme} />
        <SpecRow icon={TrendingUp} label="Niveau recommandé" value={`${arena.recommendedLevel}+`} />
        <SpecRow icon={Zap} label="Particularité" value={arena.features.join(', ')} />
      </div>

      {/* Matchmaking */}
      <button
        onClick={() => onFight(arena.id)}
        disabled={busy}
        className="m-3 mt-0 min-h-[44px] rounded-sm text-xs font-black uppercase tracking-[0.2em] text-white transition active:scale-[0.99] disabled:opacity-50"
        style={{ background: `linear-gradient(180deg, ${arena.visuals.accentColor}, ${arena.visuals.accentColor}99)` }}
      >
        {below ? `Trouver un adversaire (entraînement)` : 'Trouver un adversaire'}
      </button>
    </motion.div>
  )
}

export function ArenaHubScreen() {
  const { activeWorld, setPhase, setActiveMatch, setError } = useCreatorStore()
  const characterId = activeWorld?.character.id
  const [arenas, setArenas] = useState<ArenaDef[]>([])
  const [profile, setProfile] = useState<ArenaProfileData | null>(null)
  const [recent, setRecent] = useState<RecentMatch[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([])
  const [showBoard, setShowBoard] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!characterId) return
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/arenas?characterId=${characterId}`),
        fetch('/api/arenas/leaderboard'),
      ])
      const d1 = await r1.json()
      if (r1.ok) {
        setArenas(d1.arenas)
        setProfile(d1.profile)
        setRecent(d1.recentMatches)
      }
      const d2 = await r2.json()
      if (r2.ok) setLeaderboard(d2.leaderboard)
    } catch {
      setErr('Impossible de joindre le serveur des arènes.')
    }
  }, [characterId])

  useEffect(() => {
    load()
  }, [load])

  const startMatch = useCallback(
    async (arenaId: string) => {
      if (!characterId || busy) return
      setBusy(arenaId)
      setErr(null)
      try {
        const res = await fetch('/api/arenas/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, arenaId }),
        })
        const data = await res.json()
        if (!res.ok) {
          setErr(data.error ?? 'Matchmaking impossible')
          return
        }
        setActiveMatch({ ...data.match, opponent: data.opponent, arena: data.arena })
        setPhase('arena')
      } catch {
        setErr('Réseau indisponible.')
      } finally {
        setBusy(null)
      }
    },
    [characterId, busy, setActiveMatch, setPhase]
  )

  if (!characterId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Aucun personnage actif.
        <button onClick={() => setPhase('charselect')} className="ml-3 text-[#d4b878] underline">Retour</button>
      </div>
    )
  }

  const playerLevel = activeWorld?.character.level ?? 1
  const rating = profile?.rating ?? 1000

  return (
    <div className="min-h-screen bg-[#0c0a14] text-[#e8e4f0]">
      {/* ── En-tête façon affiche ── */}
      <header className="border-b border-[#2c2438] bg-[#0e0b18]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setPhase('village')}
            className="flex min-h-[38px] items-center gap-1.5 rounded-sm border border-[#3c3450] px-3 text-[10px] font-bold uppercase tracking-widest text-[#8a80a0] transition hover:text-[#c8c0d8]"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Village
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-[0.18em] text-[#f0e8d8] sm:text-xl">
              Les 5 Arènes de Combat
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#8a80a0] sm:text-[10px]">
              5 lieux. 5 ambiances. 1 seul objectif : prouver ta valeur.
            </p>
          </div>
          <div className="hidden max-w-[200px] text-right text-[10px] italic leading-snug text-[#6a6080] lg:block">
            « Ici, la force ne suffit pas…<br />il faut aussi savoir se battre. »
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-5">
        {/* ── Profil de gladiateur + accès codex ── */}
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-[#b8985c44] bg-[#141020] px-4 py-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-[#8a80a0]">Rating des Arènes</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#e8d8b0]">{rating}</span>
                <span className="rounded-sm bg-[#2a2038] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#d4b878]">
                  {arenaRankTitle(rating)}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-[#8a80a0]">
              <span className="font-bold text-[#9ae8a8]">{profile?.wins ?? 0} V</span>
              {' · '}
              <span className="font-bold text-[#e89a9a]">{profile?.losses ?? 0} D</span>
              {' · Série '}
              <span className="font-bold text-[#e8d8b0]">{profile?.streak ?? 0}</span>
            </div>
            <div className="text-[11px] text-[#8a80a0]">
              Niveau du héros : <span className="font-bold text-[#c8c0d8]">{playerLevel}</span>
              <span className="ml-1 text-[9px]">(sous le niveau recommandé, les duels comptent comme entraînement)</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowBoard((v) => !v)}
              className="flex min-h-[44px] items-center gap-2 rounded-sm border border-[#3c3450] bg-[#141020] px-4 text-[10px] font-black uppercase tracking-widest text-[#c8c0d8] transition hover:border-[#b8985c66]"
            >
              <Trophy className="h-4 w-4 text-[#d4b878]" /> Classement
            </button>
            <button
              onClick={() => load()}
              className="flex min-h-[44px] items-center gap-2 rounded-sm border border-[#3c3450] bg-[#141020] px-3 text-[10px] font-black uppercase tracking-widest text-[#8a80a0]"
              aria-label="Rafraîchir"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPhase('codex')}
              className="flex min-h-[44px] items-center gap-2 rounded-sm border border-[#7c58c866] bg-gradient-to-b from-[#3a2c58] to-[#241c3c] px-4 text-[10px] font-black uppercase tracking-widest text-[#e0c8ff]"
            >
              <Skull className="h-4 w-4" /> Codex des 10 Suprêmes
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-sm border border-[#c8585866] bg-[#2c1418] px-4 py-2.5 text-xs text-[#f0b8b8]">{err}</div>
        )}

        {/* ── Grille des arènes (2 + 3, comme l'affiche) ── */}
        <div className="grid gap-4 md:grid-cols-2">
          {arenas.slice(0, 2).map((a) => (
            <ArenaCard key={a.id} arena={a} playerLevel={playerLevel} busy={busy === a.id} onFight={startMatch} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {arenas.slice(2).map((a) => (
            <ArenaCard key={a.id} arena={a} playerLevel={playerLevel} busy={busy === a.id} onFight={startMatch} />
          ))}
        </div>

        {/* ── Classement temps réel ── */}
        {showBoard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-5 overflow-hidden rounded-md border border-[#3c3450] bg-[#141020]"
          >
            <div className="flex items-center gap-2 border-b border-[#2c2438] px-4 py-3">
              <Users className="h-4 w-4 text-[#d4b878]" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#f0e8d8]">
                Classement en temps réel
              </span>
              <span className="ml-auto text-[9px] uppercase tracking-widest text-[#6a6080]">
                Monte ton rang et ta puissance
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-[#181428] text-[9px] uppercase tracking-widest text-[#6a6080]">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-2 py-2">Nom</th>
                    <th className="hidden px-2 py-2 sm:table-cell">Race / Classe</th>
                    <th className="px-2 py-2">Titre</th>
                    <th className="px-2 py-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row) => (
                    <tr
                      key={`${row.rank}-${row.name}`}
                      className={`border-t border-[#1e1830] ${row.isPlayer ? 'bg-[#2a203866]' : ''}`}
                    >
                      <td className="px-4 py-1.5 font-black text-[#d4b878]">{row.rank}</td>
                      <td className="px-2 py-1.5 font-semibold text-[#e8e4f0]">
                        {row.name}
                        {row.isPlayer && <span className="ml-1.5 rounded-sm bg-[#b878f033] px-1 text-[8px] font-bold text-[#e0c8ff]">VOUS</span>}
                      </td>
                      <td className="hidden px-2 py-1.5 capitalize text-[#8a80a0] sm:table-cell">{row.race} · {row.class}</td>
                      <td className="px-2 py-1.5 text-[#8a80a0]">{row.rankTitle}</td>
                      <td className="px-2 py-1.5 text-right font-black text-[#e8d8b0]">{row.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ── Derniers duels ── */}
        {recent.length > 0 && (
          <div className="mt-5 rounded-md border border-[#3c3450] bg-[#141020] px-4 py-3">
            <div className="text-[9px] uppercase tracking-[0.25em] text-[#8a80a0]">Derniers duels</div>
            <ul className="mt-2 space-y-1">
              {recent.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`font-black ${m.result === 'win' ? 'text-[#9ae8a8]' : 'text-[#e89a9a]'}`}>
                    {m.result === 'win' ? 'VICTOIRE' : 'DÉFAITE'}
                  </span>
                  <span className="text-[#c8c0d8]">vs {m.opponentName}</span>
                  <span className="text-[#6a6080]">({m.opponentRating})</span>
                  {m.training && <span className="rounded-sm bg-[#2a2038] px-1 text-[8px] uppercase text-[#8a80a0]">entraînement</span>}
                  {m.ratingDelta !== null && (
                    <span className={`ml-auto font-bold ${m.ratingDelta >= 0 ? 'text-[#9ae8a8]' : 'text-[#e89a9a]'}`}>
                      {m.ratingDelta >= 0 ? '+' : ''}{m.ratingDelta}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Récompenses exclusives (paliers) ── */}
        <div className="mt-5 rounded-md border border-[#3c3450] bg-[#141020] px-4 py-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-[#d4b878]" />
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#8a80a0]">Récompenses exclusives — objets, titres, skins</span>
          </div>
          <div className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {(profile?.milestones ?? []).map((m) => (
              <div key={m} className="flex items-center gap-1.5 text-[#9ae8a8]">
                <Crown className="h-3 w-3" /> {m}
              </div>
            ))}
            {(profile?.milestones ?? []).length === 0 && (
              <div className="text-[#6a6080]">Gagnez du rating pour débloquer objets, titres et skins exclusifs.</div>
            )}
          </div>
        </div>

        {/* ── Bandeau final de l'affiche ── */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#2c2438] bg-[#0e0b18] px-4 py-3">
          <div className="flex flex-wrap gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Swords className="h-4 w-4 text-[#d4b878]" />
              <div>
                <div className="font-bold text-[#c8c0d8]">Système de matchmaking</div>
                <div className="text-[#6a6080]">Trouve un adversaire en quelques secondes</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-[#d4b878]" />
              <div>
                <div className="font-bold text-[#c8c0d8]">Classements en temps réel</div>
                <div className="text-[#6a6080]">Monte ton rang et ta puissance</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-[#d4b878]" />
              <div>
                <div className="font-bold text-[#c8c0d8]">Récompenses exclusives</div>
                <div className="text-[#6a6080]">Objets, titres, skins</div>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#b8985c]">
            Combats. Progresse. Deviens une légende.
          </div>
        </div>
      </main>
    </div>
  )
}
