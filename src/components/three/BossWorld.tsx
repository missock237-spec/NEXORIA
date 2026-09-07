'use client'

// NEXORIA — AETHERION, Suprême #01 « Le Roi du Ciel » (mise à jour officielle)
// Forteresse céleste au-dessus des nuages. Boss mondial en 3 phases :
//   1. LE SOUVERAIN DU CIEL — éclairs ciblés
//   2. LA TEMPÊTE SE DÉCHAÎNE — ondes de choc + gravité fluctuante
//   3. FORME SPIRITUELLE — pluie de foudre continue, noyau vulnérable
// Le serveur fournit les PV du boss et valide les 3 phases dans l'ordre.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarModel } from './AvatarModel'
import { RACES } from '@/lib/game/races'
import type { RaceDef } from '@/lib/game/types'
import {
  playerInput, bossCombat, combatActions, requestAttack,
} from '@/lib/game/runtime'
import type { BossEncounter } from '@/lib/store'
import { useCreatorStore } from '@/lib/store'

const PLATFORM_R = 11.5

// Or des armures dorées (commun à Aetherion et à la forteresse)
const GOLD = '#c8a850'

// ── RNG déterministe ──
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ══════════════════════════════════════════════════════════════
// AETHERION — modèle procédural (masque/couronne, ailes, anneaux,
// griffe céleste, noyau d'énergie — détails officiels de la fiche)
// ══════════════════════════════════════════════════════════════

function Wing({ side }: { side: 1 | -1 }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.rotation.z = side * (0.25 + Math.sin(clock.getElapsedTime() * 1.1) * 0.12)
    }
  })
  const feathers = useMemo(() => [0, 1, 2, 3, 4, 5], [])
  return (
    <group ref={g} position={[side * 0.9, 9.2, -0.3]} rotation={[0.15, side * -0.35, side * 0.25]}>
      {feathers.map((i) => {
        const len = 5.4 - i * 0.55
        const spread = side * (0.38 + i * 0.13)
        const drop = -i * 0.34
        return (
          <mesh key={i} position={[side * (len / 2 + 0.4), drop, -i * 0.12]} rotation={[0, 0, spread]}>
            <boxGeometry args={[len, 1.15 - i * 0.08, 0.06]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#f4efe2' : '#e8e0cc'}
              emissive="#a8c8f0"
              emissiveIntensity={0.12}
              roughness={0.55}
            />
          </mesh>
        )
      })}
      {/* Arc doré (bordure d'aile) */}
      <mesh position={[side * 2.2, 0.4, -0.3]} rotation={[0, 0, side * 0.5]}>
        <torusGeometry args={[2.6, 0.09, 8, 30, Math.PI]} />
        <meshStandardMaterial color="#c8a850" metalness={0.6} roughness={0.3} emissive="#886818" emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

function AetherionModel({ phase, window }: { phase: number; window: boolean }) {
  const root = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Group>(null)
  const rings2 = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const bodyMats = useRef<THREE.MeshStandardMaterial[]>([])

  const spiritual = phase >= 3

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    // Collecte paresseuse des matériaux (une seule fois) pour la forme spirituelle
    if (root.current && bodyMats.current.length === 0) {
      root.current.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) {
          const m = mesh.material as THREE.MeshStandardMaterial
          if (m) {
            m.transparent = true
            bodyMats.current.push(m)
          }
        }
      })
    }
    if (root.current) {
      // Vol stationnaire ; descend pendant la fenêtre de tir
      const targetY = window ? 6.2 : 10.5 + Math.sin(t * 0.9) * 0.8
      root.current.position.y += (targetY - root.current.position.y) * Math.min(1, delta * 1.6)
      root.current.rotation.y = Math.sin(t * 0.4) * 0.14
    }
    if (rings.current) rings.current.rotation.y = t * 0.8
    if (rings2.current) {
      rings2.current.rotation.y = -t * 0.55
      rings2.current.rotation.x = Math.sin(t * 0.5) * 0.3
    }
    if (core.current) {
      const m = core.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = (window ? 2.6 : 1.1) + Math.sin(t * 5) * 0.4
      const s = window ? 1.18 : 1
      core.current.scale.setScalar(core.current.scale.x + (s - core.current.scale.x) * 0.12)
    }
    // Forme spirituelle : translucide + lueur
    for (const m of bodyMats.current) {
      const targetOpacity = spiritual ? 0.42 : 1
      m.opacity += (targetOpacity - m.opacity) * 0.06
      const targetEmissive = spiritual ? 0.5 : 0.1
      m.emissiveIntensity += (targetEmissive - m.emissiveIntensity) * 0.06
    }
  })

  const armor = '#f0ead8'

  return (
    <group ref={root} position={[0, 10.5, -9]}>
      {/* ── Torse armuré ── */}
      <mesh position={[0, 8.6, 0]}>
        <capsuleGeometry args={[1.5, 3.4, 6, 12]} />
        <meshStandardMaterial color={armor} roughness={0.4} metalness={0.25} />
      </mesh>
      {/* Plastron doré */}
      <mesh position={[0, 8.9, 0.95]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[2.1, 2.6, 0.5]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.25} />
      </mesh>
      {/* ── Noyau d'énergie (point faible officiel) ── */}
      <mesh ref={core} position={[0, 8.8, 1.35]}>
        <sphereGeometry args={[0.62, 16, 16]} />
        <meshStandardMaterial color="#bfe8ff" emissive="#58c8f0" emissiveIntensity={1.4} roughness={0.1} />
      </mesh>

      {/* ── Tête + masque/couronne ── */}
      <group position={[0, 11.4, 0]}>
        <mesh>
          <sphereGeometry args={[0.85, 14, 12]} />
          <meshStandardMaterial color={armor} roughness={0.35} metalness={0.3} />
        </mesh>
        {/* Masque */}
        <mesh position={[0, -0.05, 0.62]} scale={[1, 1.25, 0.5]}>
          <sphereGeometry args={[0.62, 12, 10]} />
          <meshStandardMaterial color={GOLD} metalness={0.75} roughness={0.2} />
        </mesh>
        {/* Yeux lumineux (foudre) */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 0.06, 0.85]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color="#d8f4ff" emissive="#58c8f0" emissiveIntensity={3} />
          </mesh>
        ))}
        {/* Couronne : 5 pointes */}
        {[-0.52, -0.26, 0, 0.26, 0.52].map((x, i) => (
          <mesh key={i} position={[x, 0.85 - Math.abs(x) * 0.35, 0]} rotation={[0, 0, -x * 0.5]}>
            <coneGeometry args={[0.11, 0.9 - Math.abs(x) * 0.7, 5]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.2} emissive="#785818" emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>

      {/* ── Bras + griffe céleste (lame) ── */}
      <group position={[-1.8, 9.3, 0]} rotation={[0, 0, 0.35]}>
        <mesh position={[0, -1.4, 0]}>
          <capsuleGeometry args={[0.42, 2.2, 5, 10]} />
          <meshStandardMaterial color={armor} roughness={0.4} metalness={0.25} />
        </mesh>
      </group>
      <group position={[1.8, 9.3, 0]} rotation={[0, 0, -0.35]}>
        <mesh position={[0, -1.4, 0]}>
          <capsuleGeometry args={[0.42, 2.2, 5, 10]} />
          <meshStandardMaterial color={armor} roughness={0.4} metalness={0.25} />
        </mesh>
        {/* Lame d'éclair (griffe céleste de l'affiche) */}
        <mesh position={[0.25, -4.3, 0.2]} rotation={[0.25, 0, -0.1]}>
          <boxGeometry args={[0.34, 4.6, 0.1]} />
          <meshStandardMaterial color="#d8ecff" emissive="#58a8f0" emissiveIntensity={1.5} transparent opacity={0.95} />
        </mesh>
      </group>

      {/* ── Bas du corps effilé (esprit céleste) ── */}
      <mesh position={[0, 5.4, 0]}>
        <coneGeometry args={[1.45, 5.2, 10]} />
        <meshStandardMaterial color={armor} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <coneGeometry args={[0.75, 2.4, 9]} />
        <meshStandardMaterial color="#e0d8c4" emissive="#88b8e8" emissiveIntensity={0.25} transparent opacity={0.85} />
      </mesh>

      {/* ── Ailes (plumes des ailes, détail officiel) ── */}
      <Wing side={1} />
      <Wing side={-1} />

      {/* ── Anneaux flottants (détail officiel) ── */}
      <group ref={rings} position={[0, 8.6, 0]}>
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[3.6, 0.1, 8, 48]} />
          <meshStandardMaterial color="#a8d8ff" emissive="#58a8f0" emissiveIntensity={1.2} transparent opacity={0.85} />
        </mesh>
      </group>
      <group ref={rings2} position={[0, 9.4, 0]}>
        <mesh rotation={[Math.PI / 1.8, 0.4, 0]}>
          <torusGeometry args={[4.6, 0.07, 8, 48]} />
          <meshStandardMaterial color="#c8e8ff" emissive="#78b8f0" emissiveIntensity={0.9} transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  )
}

// ── Forteresse céleste : plateforme + nuages + îles ──
function Fortress() {
  const quality = useCreatorStore((s) => s.quality)
  const clouds = useMemo(() => {
    const rand = mulberry32(9101)
    return [...Array(10)].map(() => {
      const a = rand() * Math.PI * 2
      const r = 24 + rand() * 30
      return { x: Math.cos(a) * r, y: -3 + rand() * 8, z: Math.sin(a) * r, s: 2.4 + rand() * 2.6 }
    })
  }, [])
  return (
    <group>
      {/* Plateforme de marbre et d'or */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[PLATFORM_R, 56]} />
        <meshStandardMaterial color="#e8e2d4" roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[PLATFORM_R - 1.1, PLATFORM_R - 0.55, 56]} />
        <meshStandardMaterial color="#c8a850" metalness={0.75} roughness={0.25} emissive="#78581c" emissiveIntensity={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[4.2, 4.65, 48]} />
        <meshStandardMaterial color="#c8a850" metalness={0.75} roughness={0.25} />
      </mesh>
      {/* runes concentriques */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[Math.cos(a) * 7.6, 0.03, Math.sin(a) * 7.6]}>
            <circleGeometry args={[0.34, 12]} />
            <meshStandardMaterial color="#78b8e8" emissive="#58a8f0" emissiveIntensity={0.7} />
          </mesh>
        )
      })}
      {/* Dessous de l'île */}
      <mesh position={[0, -4.2, 0]}>
        <coneGeometry args={[PLATFORM_R, 8.6, 56]} />
        <meshStandardMaterial color="#9a8f7c" flatShading roughness={1} />
      </mesh>
      {/* Piliers cérémonieux */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.26
        const x = Math.cos(a) * (PLATFORM_R - 1.9)
        const z = Math.sin(a) * (PLATFORM_R - 1.9)
        return (
          <group key={`p${i}`} position={[x, 0, z]}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.36, 3, 9]} />
              <meshStandardMaterial color="#efe9da" roughness={0.5} />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <sphereGeometry args={[0.22, 10, 8]} />
              <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.2} emissive="#886818" emissiveIntensity={0.5} />
            </mesh>
          </group>
        )
      })}
      {/* Nuages autour */}
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[j * 2.1 - 2.1, j * 0.4, j]}>
              <sphereGeometry args={[1.6 + (j % 2) * 0.6, 10, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.88} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
      {quality.particles > 0 && (
        <Sparkles count={quality.particles} scale={[50, 22, 50]} size={2.6} speed={0.5} color="#cfe8ff" position={[0, 8, 0]} />
      )}
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// LOGIQUE DU COMBAT DE BOSS
// ══════════════════════════════════════════════════════════════

interface Strike {
  id: number
  x: number
  z: number
  t: number // heure du combat où la foudre tombe
  r: number
}

function BossFight({ encounter, onEnd }: { encounter: BossEncounter; onEnd: (r: 'victory' | 'defeat') => void }) {
  const activeWorld = useCreatorStore((s) => s.activeWorld)
  const playerRace = (
    useCreatorStore((s) => s.worldConfig)?.races.find((r) => r.id === activeWorld?.character.race) ?? null
  ) as RaceDef | null
  const playerApp = activeWorld?.character.appearance ?? null
  const playerEq = useMemo(() => {
    const cfg = useCreatorStore.getState().worldConfig
    const m: Record<string, import('@/lib/game/types').EquipmentDef> = {}
    if (activeWorld && cfg) {
      for (const [, id] of Object.entries(activeWorld.character.equipment)) {
        const item = cfg.equipment.find((e) => e.id === id)
        if (item) m[item.slot] = item as import('@/lib/game/types').EquipmentDef
      }
    }
    return m
  }, [activeWorld])

  const stats = useRef({
    maxHp: activeWorld?.character.stats.maxHp ?? 100,
    atk: activeWorld?.character.stats.attaquePhysique ?? 10,
  })

  const playerG = useRef<THREE.Group>(null)
  const cam = useRef({ yaw: 0, pitch: 0.52, dist: 8.6 })
  const pos = useRef(new THREE.Vector3(0, 0, 7))
  const moveRef = useRef(0)
  const { camera, gl } = useThree()
  const rand = useRef(mulberry32(encounter.seed))

  const strikes = useRef<Strike[]>([])
  const shockwaves = useRef<{ r: number; speed: number; hit: boolean }[]>([])
  const [strikesView, setStrikesView] = useState<Strike[]>([])
  const waveRefs = useRef<(THREE.Mesh | null)[]>([])
  const [, force] = useState(0)

  useEffect(() => {
    bossCombat.bossHp = encounter.bossHp
    bossCombat.bossMaxHp = encounter.bossHp
    bossCombat.playerHp = stats.current.maxHp
    bossCombat.playerMaxHp = stats.current.maxHp
    bossCombat.running = true
    bossCombat.over = false
    bossCombat.result = null
    bossCombat.phase = 1
    bossCombat.phaseStart = 0
    bossCombat.phaseTimes = []
    bossCombat.window = false
    bossCombat.telegraph = null
    bossCombat.shockwave = 0
    return () => {
      bossCombat.running = false
    }
  }, [encounter])

  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lx = 0
    let ly = 0
    const down = (e: PointerEvent) => {
      dragging = true
      lx = e.clientX
      ly = e.clientY
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      cam.current.yaw -= (e.clientX - lx) * 0.0052
      cam.current.pitch = Math.max(0.06, Math.min(1.1, cam.current.pitch + (e.clientY - ly) * 0.0036))
      lx = e.clientX
      ly = e.clientY
    }
    const up = () => (dragging = false)
    const click = (e: MouseEvent) => {
      if (Math.abs(e.clientX - lx) < 4 && Math.abs(e.clientY - ly) < 4) requestAttack()
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('click', click)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('click', click)
    }
  }, [gl])

  const hurtPlayer = useCallback((pct: number) => {
    const d = Math.max(4, Math.round(stats.current.maxHp * pct))
    bossCombat.playerHp = Math.max(0, bossCombat.playerHp - d)
    bossCombat.hitFlash = Date.now()
    if (bossCombat.playerHp <= 0 && !bossCombat.over) {
      bossCombat.over = true
      bossCombat.result = 'defeat'
      onEnd('defeat')
    }
  }, [onEnd])

  const hitBoss = useCallback(() => {
    // Dégâts plafonnés : chaque fenêtre ne peut pas trancher une phase entière
    const cap = bossCombat.bossMaxHp * 0.16
    const d = Math.round(Math.min(cap, Math.max(8, stats.current.atk * 1.5)) * (0.9 + rand.current() * 0.2))
    bossCombat.bossHp = Math.max(0, bossCombat.bossHp - d)
    bossCombat.bossHitFlash = Date.now()
    if (bossCombat.bossHp <= 0 && !bossCombat.over) {
      bossCombat.over = true
      bossCombat.result = 'victory'
      bossCombat.window = false
      onEnd('victory')
    }
  }, [onEnd])

  const timers = useRef({ strike: 3.4, wave: 8, window: 2.2, windowDur: 0, force: 0 })

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    if (!bossCombat.running || bossCombat.over) {
      if (playerG.current) {
        camera.position.lerp(new THREE.Vector3(pos.current.x, 4.5, pos.current.z + 11), 0.03)
        camera.lookAt(0, 8, -6)
      }
      return
    }
    bossCombat.elapsed += dt
    const T = timers.current

    // ── Joueur ──
    const mag = Math.hypot(playerInput.x, playerInput.z)
    const yaw = cam.current.yaw
    const speed = playerInput.sprint ? 8.6 : 5.8
    if (mag > 0.08) {
      const fx = Math.sin(yaw)
      const fz = Math.cos(yaw)
      const ax = -fz * playerInput.x + fx * -playerInput.z
      const az = fx * playerInput.x + fz * -playerInput.z
      const l = Math.hypot(ax, az) || 1
      pos.current.x += (ax / l) * speed * dt
      pos.current.z += (az / l) * speed * dt
      moveRef.current = Math.min(1, moveRef.current + dt * 6)
    } else {
      moveRef.current = Math.max(0, moveRef.current - dt * 8)
    }
    // Gravité fluctuante (phase 2+) : aspiration vers le centre
    if (bossCombat.phase >= 2) {
      bossCombat.gravityPull = 0.22
      const d = Math.hypot(pos.current.x, pos.current.z)
      if (d > 2.4) {
        pos.current.x -= (pos.current.x / d) * 2.1 * dt
        pos.current.z -= (pos.current.z / d) * 2.1 * dt
      }
    } else {
      bossCombat.gravityPull = 0
    }
    const r = Math.hypot(pos.current.x, pos.current.z)
    if (r > PLATFORM_R - 0.9) {
      pos.current.x = (pos.current.x / r) * (PLATFORM_R - 0.9)
      pos.current.z = (pos.current.z / r) * (PLATFORM_R - 0.9)
    }

    // ── Fenêtres de vulnérabilité (le noyau s'expose) ──
    T.window -= dt
    if (T.window <= 0) {
      bossCombat.window = true
      T.windowDur = bossCombat.phase >= 3 ? 2.2 : 2.6
      T.window = (bossCombat.phase >= 3 ? 4.4 : 5.4) + T.windowDur
      setTimeout(() => (bossCombat.window = false), T.windowDur * 1000)
    }

    // ── Attaques du boss ──
    const phase = bossCombat.phase
    // Phase 1+ : éclairs ciblés
    T.strike -= dt
    if (T.strike <= 0) {
      const interval = phase >= 3 ? 2.3 : phase >= 2 ? 3 : 3.8
      T.strike = interval
      const count = phase >= 3 ? 2 : 1
      for (let i = 0; i < count; i++) {
        const lead = 0.55
        const x = THREE.MathUtils.clamp(
          pos.current.x + playerInput.x * speed * lead * 0.5 + (rand.current() - 0.5) * 2.4,
          -PLATFORM_R + 1.5, PLATFORM_R - 1.5
        )
        const z = THREE.MathUtils.clamp(
          pos.current.z + playerInput.z * speed * lead * 0.5 + (rand.current() - 0.5) * 2.4,
          -PLATFORM_R + 1.5, PLATFORM_R - 1.5
        )
        const warn = 1.25
        strikes.current.push({ id: Date.now() + i, x, z, t: bossCombat.elapsed + warn, r: 1.6 })
      }
      setStrikesView([...strikes.current])
    }
    strikes.current = strikes.current.filter((s) => {
      if (bossCombat.elapsed >= s.t) {
        // Impact
        if (Math.hypot(pos.current.x - s.x, pos.current.z - s.z) < s.r) hurtPlayer(0.13)
        setStrikesView([...strikes.current.filter((x) => x.id !== s.id)])
        return false
      }
      return true
    })

    // Phase 2+ : ondes de choc annulaires
    if (phase >= 2) {
      T.wave -= dt
      if (T.wave <= 0) {
        T.wave = 7.5
        shockwaves.current.push({ r: 2.2, speed: 7.5, hit: false })
      }
    }
    shockwaves.current = shockwaves.current.filter((w) => {
      w.r += w.speed * dt
      if (!w.hit) {
        const d = Math.hypot(pos.current.x, pos.current.z)
        if (Math.abs(d - w.r) < 0.85) {
          w.hit = true
          hurtPlayer(0.1)
        }
      }
      return w.r <= PLATFORM_R + 4
    })
    // Rendu des ondes via refs (aucun re-render par frame)
    for (let i = 0; i < 3; i++) {
      const mesh = waveRefs.current[i]
      if (!mesh) continue
      const w = shockwaves.current[i]
      if (w) {
        mesh.visible = true
        const s = w.r
        mesh.scale.set(s, s, 1)
      } else {
        mesh.visible = false
      }
    }
    bossCombat.shockwave = shockwaves.current[0]?.r ?? 0

    // ── Attaque du joueur (fenêtre uniquement) ──
    if (combatActions.playerAttack > 0) {
      const hits = combatActions.playerAttack
      combatActions.playerAttack = 0
      if (bossCombat.window) {
        for (let i = 0; i < hits; i++) hitBoss()
      }
    }

    // ── Transitions de phase (seuils officiels 66 % / 33 %) ──
    const hpPct = bossCombat.bossHp / bossCombat.bossMaxHp
    const phaseDur = bossCombat.elapsed - bossCombat.phaseStart
    if (phase === 1 && (hpPct <= 0.66 || bossCombat.bossHp <= 0) && phaseDur >= 8.2) {
      bossCombat.phase = 2
      bossCombat.phaseTimes.push(phaseDur)
      bossCombat.phaseStart = bossCombat.elapsed
      bossCombat.playerHp = Math.min(bossCombat.playerMaxHp, bossCombat.playerHp + bossCombat.playerMaxHp * 0.3)
    } else if (phase === 2 && (hpPct <= 0.33 || bossCombat.bossHp <= 0) && phaseDur >= 8.2) {
      bossCombat.phase = 3
      bossCombat.phaseTimes.push(phaseDur)
      bossCombat.phaseStart = bossCombat.elapsed
      bossCombat.playerHp = Math.min(bossCombat.playerMaxHp, bossCombat.playerHp + bossCombat.playerMaxHp * 0.3)
    }

    // ── Transforms ──
    if (playerG.current) {
      playerG.current.position.copy(pos.current)
      playerG.current.rotation.y = Math.atan2(-pos.current.x, -6 - pos.current.z)
    }
    // Caméra : cadre le joueur ET le boss (regard vers le haut de la forteresse)
    const cd = cam.current.dist
    const cx = pos.current.x - Math.sin(cam.current.yaw) * cd * Math.cos(cam.current.pitch)
    const cz = pos.current.z - Math.cos(cam.current.yaw) * cd * Math.cos(cam.current.pitch)
    const cy = 1.6 + Math.sin(cam.current.pitch) * cd
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.2)
    camera.lookAt(pos.current.x * 0.3, 5.2, -5.5)

    // Synchronisation HUD (10 Hz via state externe)
    T.force -= dt
    if (T.force <= 0) {
      T.force = 0.1
      force((n) => n + 1)
    }
  })

  const windowNow = bossCombat.window

  return (
    <group>
      <Fortress />
      <AetherionModel phase={bossCombat.phase} window={windowNow} />

      {/* Étiquette du boss */}
      <Html center distanceFactor={30} position={[0, 17.5, -9]} zIndexRange={[20, 0]}>
        <div className="whitespace-nowrap rounded-sm px-3 py-1 text-center text-[15px] font-black tracking-[0.2em] text-[#d8f0ff]"
          style={{ background: '#0c0a14cc', border: '1px solid #58a8f088', textShadow: '0 0 8px #58c8f0' }}>
          AETHERION — LE ROI DU CIEL
          <div className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[#88c8f0]">Suprême · Boss Mondial</div>
        </div>
      </Html>

      {/* Joueur */}
      <group ref={playerG} position={[0, 0, 7]}>
        {playerRace && playerApp && (
          <AvatarModel race={playerRace} appearance={playerApp} equipment={playerEq} animated moveRef={moveRef} />
        )}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.55, 0.72, 24]} />
          <meshBasicMaterial color="#58c878" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Télégraphes d'éclairs */}
      {strikesView.map((s) => {
        const remaining = s.t - bossCombat.elapsed
        const imminent = remaining < 0.35
        return (
          <group key={s.id}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s.x, 0.08, s.z]}>
              <ringGeometry args={[s.r - 0.5, s.r, 26]} />
              <meshBasicMaterial color={imminent ? '#ffffff' : '#58a8f0'} transparent opacity={imminent ? 0.95 : 0.7} />
            </mesh>
            {imminent && (
              <mesh position={[s.x, 6, s.z]}>
                <cylinderGeometry args={[0.32, 0.55, 12, 8, 1, true]} />
                <meshBasicMaterial color="#bfe4ff" transparent opacity={0.85} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Ondes de choc (phase 2) — pool de 3 meshes pilotés par refs */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`wave${i}`}
          ref={(el) => {
            waveRefs.current[i] = el
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.14, 0]}
          visible={false}
        >
          <ringGeometry args={[0.9, 1, 48]} />
          <meshBasicMaterial color="#88b8f0" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

function BossScene({ encounter, onEnd }: { encounter: BossEncounter; onEnd: (r: 'victory' | 'defeat') => void }) {
  const phase = bossCombat.phase
  const spiritual = phase >= 3
  return (
    <>
      <color attach="background" args={[spiritual ? '#1c2440' : '#5c94d8']} />
      <fog attach="fog" args={[spiritual ? '#243055' : '#a8cdf0', 40, 150]} />
      <ambientLight intensity={spiritual ? 0.65 : 1.1} color={spiritual ? '#8898d8' : '#ffffff'} />
      <directionalLight position={[20, 34, 16]} intensity={1.6} color="#fff4e0" castShadow={false} />
      <directionalLight position={[-14, 10, -18]} intensity={0.8} color="#88c8f0" />
      <SkyGradient spiritual={spiritual} />
      <BossFight encounter={encounter} onEnd={onEnd} />
    </>
  )
}

function SkyGradient({ spiritual }: { spiritual: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, spiritual ? '#0c1228' : '#3c78c8')
    g.addColorStop(0.6, spiritual ? '#28345c' : '#88bce8')
    g.addColorStop(1, spiritual ? '#384470' : '#e8f2fc')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [spiritual])
  return (
    <mesh>
      <sphereGeometry args={[170, 24, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}

export function BossWorld({ encounter, onEnd }: { encounter: BossEncounter; onEnd: (r: 'victory' | 'defeat') => void }) {
  const quality = useCreatorStore.getState().quality
  return (
    <div className="h-full w-full">
      <Canvas
        shadows={quality.shadows}
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias }}
        style={{ touchAction: 'none' }}
      >
        <Suspense fallback={null}>
          <BossScene encounter={encounter} onEnd={onEnd} />
        </Suspense>
      </Canvas>
    </div>
  )
}
