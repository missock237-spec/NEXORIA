'use client'

// NEXORIA — Écran du village : apparition du joueur, introduction, première quête
// Interface adaptative PC (ZQSD/WASD + souris + E) et Android (joystick virtuel + boutons).
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreatorStore } from '@/lib/store'
import { VillageWorld } from '@/components/three/VillageWorld'
import { playerInput, playerState, resetInput } from '@/lib/game/runtime'

interface QuestState {
  bienvenue?: { stage: number; complete: boolean; objectif?: string }
  [key: string]: { stage: number; complete: boolean; objectif?: string } | undefined
}

interface DialogData {
  name: string
  lines: string[]
  idx: number
  onEnd?: () => void
}

export function VillageScreen() {
  const { activeWorld, setPhase, setCharacters, quality, setQuality, isMobile } = useCreatorStore()
  const [introDone, setIntroDone] = useState(false)
  const [near, setNear] = useState<typeof playerState.near>(null)
  const [dialog, setDialog] = useState<DialogData | null>(null)
  const [quests, setQuests] = useState<QuestState>(
    () => ((activeWorld?.character.quests as QuestState) ?? { bienvenue: { stage: 0, complete: false } })
  )
  const [xp, setXp] = useState(activeWorld?.character.xp ?? 0)
  const [banner, setBanner] = useState<string | null>(null)
  const [hits, setHits] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const hitsRef = useRef(0)
  const hitBusy = useRef(false)
  const dialogRef = useRef<DialogData | null>(null)

  // Garder la ref de dialogue synchronisée hors du rendu
  useEffect(() => {
    dialogRef.current = dialog
  }, [dialog])

  const bienvenue = activeWorld ? ((quests.bienvenue as { stage: number; complete: boolean }) ?? { stage: 0, complete: false }) : { stage: 0, complete: false }
  const village = activeWorld?.village
  const character = activeWorld?.character

  const syncQuest = useCallback(
    async (stage: number) => {
      if (!character || !village) return
      try {
        const res = await fetch('/api/quests/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId: character.id, questId: 'bienvenue', stage }),
        })
        const data = await res.json()
        if (res.ok) {
          setQuests(data.quests)
          if (data.gainedXp > 0) {
            setXp(data.xp)
            setBanner(`Quête terminée : Bienvenue à ${village.name} — +${data.gainedXp} XP`)
            setTimeout(() => setBanner(null), 4200)
            fetch('/api/auth/session')
              .then((r) => r.json())
              .then((d) => d.characters && setCharacters(d.characters))
              .catch(() => {})
          }
        }
      } catch {
        /* hors-ligne : la progression sera rejouable */
      }
    },
    [character, village, setCharacters]
  )

  const handleNpcTalk = useCallback(
    (role: string, name: string) => {
      if (!character || !village) return
      const b = (quests.bienvenue as { stage: number; complete: boolean }) ?? { stage: 0, complete: false }
      const raceName = character.race === 'humain' ? 'voyageur' : character.race === 'nain' ? 'nain' : 'ami'
      if (role === 'ancien' && b.stage === 0) {
        setDialog({
          name,
          idx: 0,
          lines: [
            `Bienvenue à ${village.name}, jeune ${raceName}.`,
            'Le monde au-delà de nos palissades est ancien — et plein de merveilles.',
            'Mais d’abord, apprends à te défendre. Va voir le garde, près de la place.',
          ],
          onEnd: () => syncQuest(1),
        })
      } else if (role === 'garde' && b.stage === 1) {
        setDialog({
          name,
          idx: 0,
          lines: [
            'Un nouveau visage ! Bienvenue.',
            'Tu vois ce mannequin près de la place ? Frappe-le trois fois.',
            'Le fer, ça se respecte — et ça s’entraîne.',
          ],
          onEnd: () => syncQuest(2),
        })
      } else if (role === 'marchand') {
        setDialog({ name, idx: 0, lines: ['Jette un œil à mes marchandises quand tu auras quelques pièces.', 'Le premier équipement se mérite… ou s’achète.'] })
      } else if (role === 'forgeron') {
        setDialog({ name, idx: 0, lines: ['Mes enclumes ne dorment jamais. Reviens quand tu auras des matériaux.'] })
      } else if (role === 'entraineur') {
        setDialog({ name, idx: 0, lines: ['Le mannequin est ton meilleur premier adversaire : il ne riposte jamais.', 'Frappe-le trois fois pour t’échauffer !'] })
      } else if (role === 'ancien' || role === 'garde') {
        setDialog({
          name,
          idx: 0,
          lines:
            b.stage >= 2
              ? ['Le mannequin t’attend. Trois bons coups et tu seras prêt.']
              : [`Que la route te soit favorable, ${character.name}.`],
        })
      } else {
        setDialog({ name, idx: 0, lines: [`Que NEXORIA veille sur toi, ${character.name}.`] })
      }
    },
    [character, village, quests, syncQuest]
  )

  const hitDummy = useCallback(() => {
    if (hitBusy.current) return
    hitBusy.current = true
    setTimeout(() => (hitBusy.current = false), 450)
    const b = (quests.bienvenue as { stage: number; complete: boolean }) ?? { stage: 0, complete: false }
    if (b.stage === 2 && !b.complete) {
      const n = hitsRef.current + 1
      hitsRef.current = n
      setHits(n)
      if (n >= 3) {
        hitsRef.current = 0
        setHits(0)
        syncQuest(3)
      } else {
        setBanner(`Mannequin touché (${n}/3)`)
        setTimeout(() => setBanner(null), 1200)
      }
    } else {
      setBanner('Le mannequin oscille sous vos coups.')
      setTimeout(() => setBanner(null), 1000)
    }
  }, [quests, syncQuest])

  const advanceDialog = useCallback(() => {
    const d = dialogRef.current
    if (!d) return
    if (d.idx < d.lines.length - 1) {
      setDialog({ ...d, idx: d.idx + 1 })
    } else {
      d.onEnd?.()
      setDialog(null)
    }
  }, [])

  const interact = useCallback(() => {
    if (dialogRef.current) {
      advanceDialog()
      return
    }
    const n = playerState.near
    if (!n) return
    if (n.type === 'npc') handleNpcTalk(n.role ?? 'garde', n.name)
    else if (n.type === 'dummy') hitDummy()
    else if (n.type === 'arena_portal') setPhase('arenas')
  }, [advanceDialog, handleNpcTalk, hitDummy, setPhase])

  // Touche E
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') interact()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [interact])

  // Sondage de proximité pour l'UI (5 Hz)
  useEffect(() => {
    const iv = setInterval(() => setNear(playerState.near ? { ...playerState.near } : null), 200)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => resetInput, [])

  if (!activeWorld || !village || !character) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a14] text-[#8a80a0]">
        Aucun personnage actif.
        <button onClick={() => setPhase('charselect')} className="ml-3 text-[#d4b878] underline">Retour</button>
      </div>
    )
  }

  const xpNeeded = 100

  const questObjective = bienvenue.complete
    ? 'Quête accomplie ! Explorez le village.'
    : bienvenue.stage === 0
      ? 'Parlez à l’ancien du village'
      : bienvenue.stage === 1
        ? 'Parlez au garde près de la place'
        : 'Frappez le mannequin d’entraînement 3 fois'

  return (
    <div className="relative h-screen w-full touch-none overflow-hidden bg-black">
      <VillageWorld world={activeWorld} />

      {/* ── HUD haut gauche : identité ── */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-wider text-[#f0e8d8]">{character.name}</span>
          <span className="rounded-sm bg-[#2a2038] px-1.5 py-0.5 text-[10px] font-bold text-[#d4b878]">Niv. {character.level}</span>
        </div>
        <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-[#2c2438]">
          <div className="h-full bg-gradient-to-r from-[#8c6b2e] to-[#d4b878]" style={{ width: `${Math.min(100, (xp / xpNeeded) * 100)}%` }} />
        </div>
        <div className="mt-0.5 text-[9px] uppercase tracking-widest text-[#8a80a0]">{xp} / {xpNeeded} XP</div>
      </div>

      {/* ── HUD haut droite : quête + qualité ── */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="min-h-[38px] rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] px-3 text-[10px] font-bold uppercase tracking-widest text-[#c8c0d8] backdrop-blur-sm"
        >
          Qualité : {quality.id}
        </button>
        {showSettings && (
          <div className="rounded-sm border border-[#2c2438] bg-[#0c0a14f0] p-1.5">
            {(['LOW', 'MEDIUM', 'HIGH', 'ULTRA'] as const).map((q) => (
              <button
                key={q}
                onClick={() => { setQuality(q); setShowSettings(false) }}
                className={`block w-full min-h-[36px] rounded-sm px-4 text-left text-[11px] font-bold tracking-widest ${quality.id === q ? 'bg-[#2a2038] text-[#e8d8b0]' : 'text-[#8a80a0]'}`}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="pointer-events-none max-w-[240px] rounded-sm border border-[#2c2438] bg-[#0c0a14cc] px-3 py-2 backdrop-blur-sm">
          <div className="text-[9px] uppercase tracking-[0.25em] text-[#d4b878]">Quête — Bienvenue</div>
          <div className="mt-1 text-xs leading-snug text-[#e8e4f0]">{questObjective}</div>
          {bienvenue.stage === 2 && !bienvenue.complete && (
            <div className="mt-1 text-[10px] text-[#8a80a0]">Progression : {hits}/3</div>
          )}
        </div>
      </div>

      {/* ── Bannière centrale ── */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-sm border border-[#b8985c88] bg-[#0c0a14e6] px-5 py-2.5 text-center text-sm font-bold text-[#e8d8b0] backdrop-blur"
          >
            {banner}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invite d'interaction ── */}
      {near && !dialog && introDone && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2 rounded-sm border border-[#b8985c88] bg-[#0c0a14e6] px-4 py-2 text-sm text-[#e8d8b0] backdrop-blur sm:bottom-24">
          {near.type === 'npc'
            ? `Parler à ${near.name}`
            : near.type === 'arena_portal'
              ? 'Entrer dans les Arènes'
              : 'Frapper le mannequin'}
          {!isMobile && <span className="ml-2 rounded-sm bg-[#2a2038] px-1.5 py-0.5 text-[10px] font-bold text-[#d4b878]">E</span>}
        </div>
      )}

      {/* ── Contrôles PC (aide) ── */}
      {!isMobile && introDone && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-sm bg-[#0c0a14aa] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm">
          ZQSD / WASD — Déplacer · Souris — Caméra · Maj — Courir · E — Interagir
        </div>
      )}

      {/* ── Joystick virtuel Android ── */}
      {isMobile && introDone && !dialog && <VirtualJoystick />}

      {/* ── Bouton d'interaction Android ── */}
      {isMobile && introDone && near && !dialog && (
        <button
          onClick={interact}
          className={`absolute bottom-8 right-6 z-10 h-20 w-20 rounded-full border-2 bg-[#2a2038dd] text-xs font-black uppercase tracking-wider backdrop-blur active:scale-95 ${near.type === 'arena_portal' ? 'border-[#b878f0cc] text-[#e0c8ff]' : 'border-[#b8985c88] text-[#e8d8b0]'}`}
        >
          {near.type === 'npc' ? 'Parler' : near.type === 'arena_portal' ? 'Arènes' : 'Frapper'}
        </button>
      )}

      {/* ── Boîte de dialogue PNJ ── */}
      <AnimatePresence>
        {dialog && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-5"
          >
            <div className="w-full max-w-2xl rounded-md border border-[#b8985c66] bg-[#0c0a14f2] p-5 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-[#d4b878]">{dialog.name}</div>
              <p className="mt-2 min-h-[48px] text-[15px] leading-relaxed text-[#e8e4f0]">{dialog.lines[dialog.idx]}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-[#6a6080]">{dialog.idx + 1} / {dialog.lines.length}</span>
                <button
                  onClick={advanceDialog}
                  className="min-h-[44px] rounded-sm bg-gradient-to-b from-[#8c6b2e] to-[#6b4e1e] px-8 text-xs font-bold uppercase tracking-[0.25em] text-white"
                >
                  {dialog.idx < dialog.lines.length - 1 ? 'Continuer' : 'Terminer'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Séquence d'introduction ── */}
      <AnimatePresence>
        {!introDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0c0a14e8] px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-md rounded-md border border-[#b8985c66] bg-[#120e1c] p-7 text-center shadow-2xl"
            >
              <div className="text-[10px] uppercase tracking-[0.5em] text-[#8a80a0]">NEXORIA</div>
              <div className="mt-2 text-xl font-black uppercase tracking-[0.2em] text-[#e8d8b0]">
                {activeWorld.intro.title}
              </div>
              <div className="mx-auto mt-4 h-px w-32 bg-gradient-to-r from-transparent via-[#b8985c88] to-transparent" />
              <div className="mt-4 space-y-1.5 text-sm leading-relaxed text-[#9a90b0]">
                {activeWorld.intro.lines.map((l, i) => (
                  <p key={i} className={i === 2 ? 'font-bold text-[#d4b878]' : ''}>{l}</p>
                ))}
              </div>
              <div className="mt-4 rounded-sm border border-[#2c2438] bg-[#0c0a14] p-3 text-xs leading-relaxed text-[#8a80a0]">
                {village.description}
              </div>
              <button
                onClick={() => setIntroDone(true)}
                className="mt-5 min-h-[52px] w-full rounded-sm bg-gradient-to-b from-[#a87c3a] to-[#6b4e1e] text-sm font-black uppercase tracking-[0.3em] text-white transition hover:from-[#c89044] active:scale-[0.99]"
              >
                Continuer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bouton quitter (retour sélection) ── */}
      <button
        onClick={() => { resetInput(); setPhase('charselect') }}
        className="absolute bottom-3 right-3 z-10 rounded-sm border border-[#2c2438] bg-[#0c0a14aa] px-3 py-2 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm transition hover:text-[#c8c0d8]"
      >
        Menu
      </button>
    </div>
  )
}

// ── Joystick virtuel (Android / tactile) ──
function VirtualJoystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const active = useRef(false)

  function setKnob(dx: number, dy: number) {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  function handle(e: React.PointerEvent) {
    const rect = base.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const max = rect.width / 2 - 14
    const d = Math.hypot(dx, dy)
    if (d > max) {
      dx = (dx / d) * max
      dy = (dy / d) * max
    }
    setKnob(dx, dy)
    playerInput.x = dx / max
    playerInput.z = dy / max
    playerInput.sprint = d / max > 0.92
  }

  return (
    <div
      ref={base}
      onPointerDown={(e) => {
        active.current = true
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        handle(e)
      }}
      onPointerMove={(e) => active.current && handle(e)}
      onPointerUp={() => {
        active.current = false
        playerInput.x = 0
        playerInput.z = 0
        playerInput.sprint = false
        setKnob(0, 0)
      }}
      className="absolute bottom-7 left-6 z-10 h-32 w-32 touch-none rounded-full border-2 border-[#b8985c44] bg-[#0c0a1480] backdrop-blur-sm"
    >
      <div
        ref={knob}
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b8985c88] bg-[#2a2038cc]"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] uppercase tracking-widest text-[#8a80a0]">
        déplacer
      </div>
    </div>
  )
}
