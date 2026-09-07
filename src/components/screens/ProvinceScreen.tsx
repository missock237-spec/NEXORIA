'use client'

// NEXORIA — ProvinceScreen : écran du monde multijoueur persistant.
// HUD complet : PV/MP, XP, or, inventaire, minimap, chat, quêtes, événements,
// chantiers, dialogue Gen3ia, mort/respawn. PC (ZQSD/souris) + Android paysage.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useCreatorStore } from '@/lib/store'
import { playerInput } from '@/lib/game/runtime'
import { useMovementKeyboard, VirtualJoystick } from '@/components/ui-game/Controls'
import { provinceNet } from '@/lib/game/province/network'
import { PROVINCE_SIZE, DUNGEON, VILLAGE, CITY } from '@/lib/game/province/world-data'
import { ProvinceWorld, type NearTarget } from '@/components/three/province/ProvinceWorld'
import { WebGLErrorBoundary } from '@/components/three/WebGLErrorBoundary'

export function ProvinceScreen() {
  const { quality, setQuality, provinceCharacterId, setPhase, isMobile } = useCreatorStore()
  const [near, setNear] = useState<NearTarget | null>(null)
  const [showChat, setShowChat] = useState(!isMobile)
  const [chatInput, setChatInput] = useState('')
  const [portrait, setPortrait] = useState(false)
  const [, force] = useState(0)
  const inputRef = useRef(playerInput)
  const cameraDragRef = useRef(0)
  const attackRef = useRef<(skill: boolean) => void>(() => {})
  const dragActive = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  useMovementKeyboard(true)

  // ── Connexion au monde persistant (état lu directement depuis le réseau) ──
  useEffect(() => {
    if (!provinceCharacterId) {
      setPhase('village')
      return
    }
    provinceNet.connect(provinceCharacterId).catch(() => {})
    const unsub = provinceNet.subscribe(() => force((v) => v + 1))
    const tick = setInterval(() => force((v) => v + 1), 400)
    return () => {
      unsub()
      clearInterval(tick)
      provinceNet.disconnect()
    }
  }, [provinceCharacterId, setPhase])

  const status = provinceNet.status

  // Orientation paysage obligatoire sur Android
  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth && ('ontouchstart' in window))
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Interactions clavier ──
  const interact = useCallback(() => {
    if (!near) return
    if (near.kind === 'npc') provinceNet.sendInteract('npc', near.id)
    else if (near.kind === 'switch') provinceNet.sendInteract('switch', near.id)
    else if (near.kind === 'lore') provinceNet.sendInteract('lore', near.id)
    else if (near.kind === 'project') provinceNet.sendWork(near.id)
    force((v) => v + 1)
  }, [near])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') interact()
      if (e.code === 'KeyT' && near?.kind === 'project') provinceNet.sendWork(near.id)
      if (e.code === 'KeyA' && e.ctrlKey) attackRef.current?.(true)
      if (e.code === 'Enter') setShowChat(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [interact, near])

  // ── Glissement caméra (souris) ──
  const onPointerDown = (e: React.PointerEvent) => {
    dragActive.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current) return
    cameraDragRef.current += e.clientX - lastPointer.current.x
    lastPointer.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => {
    dragActive.current = false
  }

  const sendChat = () => {
    const t = chatInput.trim()
    if (t) provinceNet.sendChat(t)
    setChatInput('')
  }

  // ── États hors jeu ──
  if (portrait && isMobile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0c0a14] text-center">
        <div className="text-4xl">📱↻</div>
        <p className="mt-4 max-w-xs text-sm text-[#c8c0d8]">Tournez votre appareil en mode <b className="text-[#d4b878]">paysage</b> pour jouer à NEXORIA.</p>
      </div>
    )
  }

  if (status !== 'online') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0c0a14] text-center">
        <div className="mb-4 text-3xl font-black tracking-widest text-[#d4b878]">PROVINCE DE SOLMÈRE</div>
        {status === 'kicked' ? (
          <>
            <p className="max-w-md text-sm text-[#e8a0a0]">{provinceNet.kickReason}</p>
            <button onClick={() => setPhase('village')} className="mt-6 rounded-sm border border-[#b8985c66] px-6 py-2 text-xs font-bold uppercase tracking-widest text-[#d4b878]">Retour au village</button>
          </>
        ) : status === 'connecting' ? (
          <p className="animate-pulse text-sm text-[#8a80a0]">Connexion au monde persistant…</p>
        ) : (
          <>
            <p className="max-w-md text-sm text-[#e8a0a0]">Serveur de simulation injoignable ({provinceNet.kickReason ?? 'hors ligne'}).</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => provinceCharacterId && provinceNet.connect(provinceCharacterId)} className="rounded-sm border border-[#b8985c66] px-6 py-2 text-xs font-bold uppercase tracking-widest text-[#d4b878]">Réessayer</button>
              <button onClick={() => setPhase('village')} className="rounded-sm border border-[#b8985c44] px-6 py-2 text-xs font-bold uppercase tracking-widest text-[#8a80a0]">Retour au village</button>
            </div>
          </>
        )}
      </div>
    )
  }

  const self = provinceNet.self
  const dead = self?.dead ?? false
  const xpNext = 100 * Math.pow(self?.level ?? 1, 1.5)
  const activeEvent = provinceNet.events.find((e) => e.status === 'ACTIVE')

  return (
    <div
      className="relative h-screen w-full touch-none overflow-hidden bg-black select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <WebGLErrorBoundary>
        <Canvas shadows={quality.shadows} dpr={[0.75, quality.dpr]} camera={{ fov: 60, near: 0.5, far: 300, position: [10, 12, 60] }}>
          <ProvinceWorld quality={quality} onNear={setNear} inputRef={inputRef} cameraDragRef={cameraDragRef} attackRef={attackRef} />
        </Canvas>
      </WebGLErrorBoundary>

      {/* ── HUD haut gauche : identité + barres ── */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-wider text-[#f0e8d8]">{self?.name}</span>
          <span className="rounded-sm bg-[#2a2038] px-1.5 py-0.5 text-[10px] font-bold text-[#d4b878]">Niv. {self?.level}</span>
        </div>
        <Bar value={self?.hp ?? 0} max={self?.maxHp ?? 1} color="#c8383a" label="PV" />
        <Bar value={self?.mp ?? 0} max={self?.maxMp ?? 1} color="#3a6ac8" label="MP" />
        <div className="mt-1 h-1 w-44 overflow-hidden rounded-full bg-[#2c2438]">
          <div className="h-full bg-gradient-to-r from-[#8c6b2e] to-[#d4b878]" style={{ width: `${Math.min(100, ((self?.xp ?? 0) / xpNext) * 100)}%` }} />
        </div>
        <div className="mt-1 flex gap-3 text-[9px] uppercase tracking-widest text-[#8a80a0]">
          <span className="text-[#e8c860]">◆ {self?.gold ?? 0} or</span>
          <span>🪵 {self?.inventory?.bois ?? 0}</span>
          <span>🪨 {self?.inventory?.pierre ?? 0}</span>
          <span>⛓ {self?.inventory?.fer ?? 0}</span>
          <span>🧪 {self?.inventory?.potion ?? 0}</span>
        </div>
      </div>

      {/* ── HUD haut centre : horloge + événement ── */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 text-center">
        <div className="rounded-sm border border-[#b8985c44] bg-[#0c0a14cc] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c8c0d8] backdrop-blur-sm">
          Jour {provinceNet.world.dayCount} · {String(Math.floor((provinceNet.world.timeOfDay / 3600) % 24)).padStart(2, '0')}h · Prospérité {Math.round(provinceNet.world.prosperity)}
        </div>
        {activeEvent && (
          <div className="mt-2 animate-pulse rounded-sm border border-[#e84a3a88] bg-[#2a0c0ccc] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#ff8a7a] backdrop-blur-sm">
            ⚠ {activeEvent.title} — {activeEvent.description}
          </div>
        )}
      </div>

      {/* ── HUD haut droite : minimap + qualité + quitter ── */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <select
            value={quality.id}
            onChange={(e) => setQuality(e.target.value as 'LOW')}
            className="rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] px-1.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#c8c0d8] backdrop-blur-sm"
            aria-label="Qualité graphique"
          >
            {['LOW', 'MEDIUM', 'HIGH', 'ULTRA'].map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <button onClick={() => setPhase('village')} className="rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#d4b878] backdrop-blur-sm">
            Village
          </button>
        </div>
        <Minimap />
      </div>

      {/* ── Quêtes (gauche) ── */}
      {(self?.quests?.length ?? 0) > 0 && (
        <div className="pointer-events-none absolute left-3 top-40 z-10 max-w-[220px] rounded-sm border border-[#b8985c44] bg-[#0c0a14cc] px-3 py-2 backdrop-blur-sm">
          <div className="text-[9px] font-black uppercase tracking-widest text-[#8a80a0]">Quêtes</div>
          {self!.quests.map((q) => (
            <div key={q.id} className={`mt-1 text-[11px] ${q.done ? 'text-[#7ad87a] line-through' : 'text-[#e8d8b0]'}`}>
              {q.targetName} : {q.have}/{q.need} {q.done ? '— accomplie' : `→ ${q.rewardGold} or, ${q.rewardXp} XP`}
            </div>
          ))}
        </div>
      )}

      {/* ── Chat ── */}
      <div className="absolute bottom-3 left-1/2 z-10 w-[min(560px,52vw)] -translate-x-1/2">
        {showChat && (
          <div className="mb-1 max-h-28 overflow-y-auto rounded-sm border border-[#b8985c33] bg-[#0c0a14aa] px-2 py-1 backdrop-blur-sm" style={{ scrollbarWidth: 'thin' }}>
            {provinceNet.chat.slice(-12).map((c, i) => (
              <div key={i} className="text-[11px] leading-snug">
                <span className={c.from === 'Système' || c.from === 'Héraut' ? 'font-bold text-[#d4b878]' : 'font-bold text-[#8ac8ff]'}>{c.from} :</span>{' '}
                <span className="text-[#d8d0e0]">{c.text}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <button onClick={() => setShowChat((v) => !v)} className="rounded-sm border border-[#b8985c44] bg-[#0c0a14cc] px-2 py-1 text-[10px] font-bold text-[#8a80a0]">
            {showChat ? '▾' : '💬'}
          </button>
          {showChat && (
            <>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); e.stopPropagation() }}
                placeholder="Message à la province…"
                maxLength={140}
                className="min-h-[32px] flex-1 rounded-sm border border-[#b8985c44] bg-[#0c0a14cc] px-2 text-xs text-[#f0e8d8] outline-none placeholder:text-[#6a6280]"
              />
              <button onClick={sendChat} className="min-h-[32px] rounded-sm border border-[#b8985c55] bg-[#2a2038cc] px-3 text-[10px] font-black uppercase tracking-widest text-[#d4b878]">Envoyer</button>
            </>
          )}
        </div>
      </div>

      {/* ── Invite d'interaction + boutons d'action ── */}
      {near && !dead && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-sm border border-[#b8985c66] bg-[#0c0a14cc] px-3 py-1.5 text-xs text-[#e8d8b0] backdrop-blur-sm">
          {near.kind === 'project' ? 'Travailler' : near.kind === 'npc' ? 'Parler à' : near.kind === 'switch' ? 'Activer' : near.kind === 'lore' ? 'Lire' : 'Examiner'} — <b className="text-[#d4b878]">{near.name}</b>
          {!isMobile && <span className="ml-2 rounded-sm bg-[#2a2038] px-1.5 py-0.5 text-[10px] font-bold text-[#d4b878]">E</span>}
        </div>
      )}

      {near?.kind === 'project' && !dead && (
        <div className="absolute bottom-40 right-6 z-10 flex flex-col gap-1 rounded-sm border border-[#b8985c55] bg-[#0c0a14dd] p-2 backdrop-blur-sm">
          <div className="text-center text-[9px] font-black uppercase tracking-widest text-[#8a80a0]">Déposer</div>
          {(['bois', 'pierre', 'fer'] as const).map((m) => (
            <button key={m} onClick={() => provinceNet.sendDeposit(near.id, m, 10)} className="min-h-[34px] rounded-sm border border-[#b8985c44] px-3 text-[11px] font-bold text-[#e8d8b0] active:scale-95">
              10 × {m} ({self?.inventory?.[m] ?? 0})
            </button>
          ))}
        </div>
      )}

      {/* ── Contrôles ── */}
      {isMobile && <VirtualJoystick />}
      {isMobile ? (
        <div className="absolute bottom-7 right-6 z-10 flex items-end gap-2">
          <button onClick={() => attackRef.current?.(true)} className="h-14 w-14 rounded-full border-2 border-[#5a8ac8aa] bg-[#1a2438cc] text-[10px] font-black uppercase text-[#a8d0ff] backdrop-blur active:scale-95">Sort</button>
          <button onClick={interact} className="h-14 w-14 rounded-full border-2 border-[#7ac88aaa] bg-[#122a18cc] text-[10px] font-black uppercase text-[#b0ffb8] backdrop-blur active:scale-95">Action</button>
          <button onClick={() => attackRef.current?.(false)} className="h-20 w-20 rounded-full border-2 border-[#e8a83acc] bg-[#2a1c0ccc] text-xs font-black uppercase tracking-wider text-[#ffd88a] backdrop-blur active:scale-95">Attaque</button>
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-16 right-6 z-10 rounded-sm border border-[#b8985c33] bg-[#0c0a14aa] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#8a80a0] backdrop-blur-sm">
          ZQSD — Déplacer · Maj — Courir · Clic/Espace — Attaque · E — Interagir · Glisser — Caméra
        </div>
      )}

      {/* ── Toasts + butin ── */}
      <div className="pointer-events-none absolute left-1/2 top-24 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
        {provinceNet.toasts.slice(-3).map((t, i) => (
          <div key={t.at + '' + i} className={`rounded-sm border px-3 py-1 text-xs backdrop-blur-sm ${t.kind === 'death' ? 'border-[#e84a3a66] bg-[#2a0c0ccc] text-[#ff8a7a]' : t.kind === 'level' ? 'border-[#d4b87866] bg-[#2a2410cc] text-[#ffe8a0]' : t.kind === 'warning' ? 'border-[#e8a83a66] bg-[#2a2010cc] text-[#ffd88a]' : 'border-[#b8985c44] bg-[#0c0a14cc] text-[#d8d0e0]'}`}>
            {t.msg}
          </div>
        ))}
        {provinceNet.lootBanner && Date.now() - provinceNet.lootBanner.at < 3500 && (
          <div className="rounded-sm border border-[#d4b87866] bg-[#2a2410cc] px-4 py-1.5 text-xs font-bold text-[#ffe8a0] backdrop-blur-sm">
            Butin : {provinceNet.lootBanner.gold} or · {provinceNet.lootBanner.drops.join(', ')}
          </div>
        )}
      </div>

      {/* ── Dialogue Gen3ia ── */}
      {provinceNet.dialogue && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/30 pb-24" onClick={() => { provinceNet.dialogue = null; force((v) => v + 1) }}>
          <div className="w-[min(520px,86vw)] rounded-sm border border-[#b8985c66] bg-[#14101ecc] p-4 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-black uppercase tracking-widest text-[#d4b878]">{provinceNet.dialogue.name}</div>
            {provinceNet.dialogue.lines.map((l, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-[#e8e0d0]">« {l} »</p>
            ))}
            <button onClick={() => { provinceNet.dialogue = null; force((v) => v + 1) }} className="mt-3 min-h-[36px] w-full rounded-sm border border-[#b8985c55] text-[10px] font-black uppercase tracking-widest text-[#d4b878]">Fermer</button>
          </div>
        </div>
      )}

      {/* ── Écran de mort ── */}
      {dead && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#1a0505cc] backdrop-blur-sm">
          <div className="text-4xl font-black tracking-widest text-[#e84a3a]">VOUS ÊTES TOMBÉ</div>
          <p className="mt-2 text-sm text-[#c8a0a0]">Les Sentinelles vous ramènent à Solmère… ({Math.ceil(provinceNet.respawnIn)} s)</p>
        </div>
      )}
    </div>
  )
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="w-5 text-[9px] font-bold text-[#8a80a0]">{label}</span>
      <div className="h-2 w-44 overflow-hidden rounded-full bg-[#2c2438]">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
      </div>
      <span className="text-[9px] text-[#8a80a0]">{Math.round(value)}</span>
    </div>
  )
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    let last = 0
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 200) return
      last = t
      const cv = ref.current
      if (!cv) return
      const ctx = cv.getContext('2d')
      if (!ctx) return
      const S = cv.width
      const k = S / PROVINCE_SIZE
      const px = (x: number) => (x + PROVINCE_SIZE / 2) * k
      ctx.clearRect(0, 0, S, S)
      ctx.fillStyle = '#20301a'
      ctx.fillRect(0, 0, S, S)
      // zones
      ctx.fillStyle = '#31421f'
      ctx.beginPath()
      ctx.arc(px(-140), px(-110), 95 * k, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#4a4438'
      ctx.beginPath()
      ctx.arc(px(CITY.x), px(CITY.z), CITY.radius * k, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#2a2030'
      ctx.beginPath()
      ctx.arc(px(DUNGEON.x), px(DUNGEON.z), 24 * k, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#5a5240'
      ctx.beginPath()
      ctx.arc(px(VILLAGE.x), px(VILLAGE.z), 40 * k, 0, 7)
      ctx.fill()
      ctx.fillStyle = '#d4b878'
      ctx.font = 'bold 8px sans-serif'
      ctx.fillText('Solmère', px(VILLAGE.x) - 16, px(VILLAGE.z) + 3)
      // entités
      for (const n of provinceNet.npcs.values()) {
        if (n.lifeState === 'DEAD' || n.inside) continue
        ctx.fillStyle = n.isGuard ? '#8ac8ff' : '#7ad87a'
        ctx.fillRect(px(n.x) - 1, px(n.z) - 1, 2.4, 2.4)
      }
      for (const m of provinceNet.monsters.values()) {
        ctx.fillStyle = m.raider ? '#ff7a30' : '#e84a3a'
        ctx.fillRect(px(m.x) - 1.5, px(m.z) - 1.5, 3, 3)
      }
      for (const p of provinceNet.players.values()) {
        ctx.fillStyle = '#f0e8d8'
        ctx.fillRect(px(p.x) - 1.5, px(p.z) - 1.5, 3, 3)
      }
      ctx.fillStyle = '#ffd88a'
      ctx.beginPath()
      ctx.arc(px(provinceNet.selfX), px(provinceNet.selfZ), 3.2, 0, 7)
      ctx.fill()
      ctx.strokeStyle = '#d4b87888'
      ctx.strokeRect(0.5, 0.5, S - 1, S - 1)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="rounded-sm border border-[#b8985c55] bg-[#0c0a14cc] p-1 backdrop-blur-sm">
      <canvas ref={ref} width={148} height={148} className="block h-[110px] w-[110px] rounded-sm sm:h-[148px] sm:w-[148px]" aria-label="Mini-carte de la province" />
    </div>
  )
}
