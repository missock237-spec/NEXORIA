'use client'

// NEXORIA — Sanctuaire 3D des Suprêmes
// Arène élémentaire immersive : plateforme circulaire, environnement teinté,
// modèle 3D du Suprême, capacités jouables (VFX) et TEST D'INVINCIBILITÉ —
// chaque attaque ennemie est renvoyée : dégâts = 0, à jamais.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import type { SupremeDef, SupremePowerDef, VfxKind } from '@/lib/game/supremes'
import { SUPREME_POWER } from '@/lib/game/supremes'
import { SUPREME_MODELS } from './registry'

// ── VFX — déclenchement d'une capacité ──────────────────────

const VFX_DURATION = 1.5

function StrikeFx({ color, t }: { color: string; t: number }) {
  // Colonnes d'énergie s'abattant du ciel (foudre, geysers, frappes orbitales)
  const bolts = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      a: (i / 7) * Math.PI * 2 + 0.35,
      r: 1.2 + ((i * 13) % 10) / 7,
      h: 7 + ((i * 7) % 5),
      delay: (i % 3) * 0.12,
    })),
    [],
  )
  return (
    <group>
      {bolts.map((b, i) => {
        const local = Math.max(0, Math.min(1, (t - b.delay) / (VFX_DURATION - b.delay - 0.3)))
        const opacity = local <= 0 || local >= 1 ? 0 : Math.sin(local * Math.PI)
        const x = Math.cos(b.a) * b.r
        const z = Math.sin(b.a) * b.r
        return (
          <group key={i}>
            <mesh position={[x, b.h / 2, z]}>
              <cylinderGeometry args={[0.07, 0.16, b.h, 6]} />
              <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={3} transparent opacity={opacity} toneMapped={false} />
            </mesh>
            {/* Impact au sol */}
            <mesh position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.3 + local * 0.8, 0.42 + local * 0.9, 20]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} transparent opacity={opacity * 0.9} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function RingFx({ color, t }: { color: string; t: number }) {
  // Ondes de choc annulaires se déployant au sol
  const waves = [0, 0.22, 0.44]
  return (
    <group>
      {waves.map((delay, i) => {
        const local = Math.max(0, Math.min(1, (t - delay) / (VFX_DURATION - 0.25)))
        const scale = 0.4 + local * 8.5
        const opacity = local <= 0 || local >= 1 ? 0 : (1 - local) * 0.95
        return (
          <group key={i}>
            <mesh position={[0, 0.1 + i * 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
              <torusGeometry args={[1, 0.05 + (1 - local) * 0.06, 8, 48]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} transparent opacity={opacity} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.06 + i * 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={scale * 0.92}>
              <ringGeometry args={[0.97, 1.06, 48]} />
              <meshBasicMaterial color={color} transparent opacity={opacity * 0.5} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function NovaFx({ color, t }: { color: string; t: number }) {
  // Déflagration sphérique : le pouvoir du Suprême explose de l'intérieur
  const local = Math.min(1, t / (VFX_DURATION - 0.2))
  const flash = local < 0.12 ? local / 0.12 : Math.max(0, 1 - (local - 0.12) / 0.5)
  return (
    <group>
      <mesh position={[0, 2.8, 0]} scale={0.5 + local * 7.5}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={Math.max(0, 0.55 * (1 - local))} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 2.8, 0]} scale={0.3 + local * 5}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={3} transparent opacity={Math.max(0, flash * 0.7)} depthWrite={false} toneMapped={false} />
      </mesh>
      <Sparkles count={60} scale={[6 + local * 6, 6 + local * 6, 6 + local * 6]} position={[0, 2.8, 0]} size={4} speed={1.5} color={color} opacity={Math.max(0, 1 - local)} />
    </group>
  )
}

function RiseFx({ color, t }: { color: string; t: number }) {
  // Colonnes de puissance montant du sol (ténèbres, racines, légion des tombés)
  const motes = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      a: (i / 26) * Math.PI * 2 * 3,
      r: 0.5 + ((i * 17) % 20) / 10,
      speed: 0.8 + ((i * 7) % 10) / 8,
      s: 0.05 + ((i * 11) % 10) / 60,
    })),
    [],
  )
  return (
    <group>
      {motes.map((m, i) => {
        const cycle = ((t * m.speed + i * 0.37) % (VFX_DURATION - 0.1)) / (VFX_DURATION - 0.1)
        const opacity = Math.sin(cycle * Math.PI)
        return (
          <mesh key={i} position={[Math.cos(m.a) * m.r, cycle * 5.2, Math.sin(m.a) * m.r]}>
            <coneGeometry args={[m.s, m.s * 4, 5]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} transparent opacity={opacity} toneMapped={false} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 32]} />
        <meshBasicMaterial color={color} transparent opacity={Math.max(0, 0.35 * (1 - t / VFX_DURATION))} />
      </mesh>
    </group>
  )
}

function OrbitFx({ color, t }: { color: string; t: number }) {
  // Invocation orbitale rapide (clones temporels, drones, créatures sauvages)
  const items = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * Math.PI * 2,
      y: 1.6 + ((i * 7) % 30) / 12,
      s: 0.16 + ((i * 5) % 10) / 40,
    })),
    [],
  )
  const opacity = t <= 0 ? 0 : Math.min(1, t / 0.3) * Math.max(0, Math.min(1, (VFX_DURATION - t) / 0.35))
  return (
    <group rotation={[0, t * 3.2, 0]}>
      {items.map((it, i) => (
        <mesh key={i} position={[Math.cos(it.a) * 2.6, it.y, Math.sin(it.a) * 2.6]} rotation={[it.a, it.a * 2, 0]}>
          <octahedronGeometry args={[it.s, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} transparent opacity={opacity} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export function AbilityFx({ kind, color, trigger }: { kind: VfxKind; color: string; trigger: number }) {
  // Remontage à chaque déclenchement (key) + boucle rAF : aucun setState synchrone
  const [t, setT] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = () => {
      const el = (performance.now() - start) / 1000
      setT(el)
      if (el < VFX_DURATION) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  if (t >= VFX_DURATION) return null
  if (kind === 'strike') return <StrikeFx color={color} t={t} />
  if (kind === 'ring') return <RingFx color={color} t={t} />
  if (kind === 'nova') return <NovaFx color={color} t={t} />
  if (kind === 'rise') return <RiseFx color={color} t={t} />
  return <OrbitFx color={color} t={t} />
}

// ── TEST D'INVINCIBILITÉ — projectile ennemi → 0 dégât ──────

type ShieldPhase = 'incoming' | 'impact' | 'idle'

function InvincibilityTest({ onVerdict }: { onVerdict: () => void }) {
  // Monté avec key={attackTrigger} : commence en « incoming » à chaque attaque
  const [phase, setPhase] = useState<ShieldPhase>('incoming')
  const proj = useRef<THREE.Mesh>(null)
  const shield = useRef<THREE.Mesh>(null)
  const state = useRef({ t: 0 })

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('impact')
      onVerdict()
    }, 750)
    const endTimer = setTimeout(() => setPhase('idle'), 1900)
    return () => { clearTimeout(timer); clearTimeout(endTimer) }
  }, [onVerdict])

  useFrame((_, delta) => {
    state.current.t += delta
    if (phase === 'incoming') {
      if (proj.current) {
        const k = Math.min(1, state.current.t / 0.75)
        const e = k * k // accélération
        proj.current.position.set(0, 2.6 + (1 - e) * 0.4, 15 - e * 15)
        proj.current.rotation.x += delta * 9
      }
    }
    if (shield.current) {
      const mat = shield.current.material as THREE.MeshStandardMaterial
      const target = phase === 'impact' ? 0.55 : 0.0
      mat.opacity += (target - mat.opacity) * 0.18
      const s = phase === 'impact' ? 1 + Math.sin(state.current.t * 30) * 0.04 : 1
      shield.current.scale.setScalar(s)
    }
  })

  return (
    <group>
      {/* Projectile ennemi en fusion */}
      {phase === 'incoming' && (
        <mesh ref={proj} position={[0, 3, 15]}>
          <dodecahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#ff4838" emissive="#ff5828" emissiveIntensity={3} flatShading toneMapped={false} />
        </mesh>
      )}
      {/* Bouclier d'invincibilité absolue */}
      <mesh ref={shield} position={[0, 2.7, 0]}>
        <sphereGeometry args={[2.35, 28, 28]} />
        <meshStandardMaterial
          color="#ffe8a8" emissive="#ffd870" emissiveIntensity={1.4}
          transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false}
        />
      </mesh>
    </group>
  )
}

// ── Figure du Suprême — lévitation + rotation lente ─────────

function SupremeFigure({ id }: { id: SupremeDef['id'] }) {
  const g = useRef<THREE.Group>(null)
  const Model = SUPREME_MODELS[id]
  const palette = SUPREME_POWER[id].palette
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.getElapsedTime()
    g.current.position.y = Math.sin(t * 0.85) * 0.14
    g.current.rotation.y = t * 0.22
  })
  return (
    <group ref={g} position={[0, 0.28, 0]}>
      <Model p={palette} />
    </group>
  )
}

// ── Arène élémentaire ────────────────────────────────────────

function SanctuaryArena({ color, deep }: { color: string; deep: string }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (ring.current) ring.current.rotation.z = clock.getElapsedTime() * 0.15
  })
  return (
    <group>
      {/* Plateforme */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[4.4, 4.9, 0.36, 40]} />
        <meshStandardMaterial color={deep} roughness={0.55} metalness={0.35} />
      </mesh>
      {/* Dessin runique au sol */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.4, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.36, 6, 1, 0, Math.PI * 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[1.15, 1.19, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.45} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {/* Piliers d'élément autour du sanctuaire */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return (
          <mesh key={i} position={[Math.cos(a) * 6.3, 0.9, Math.sin(a) * 6.3]}>
            <coneGeometry args={[0.42, 1.8 + (i % 2) * 0.6, 5]} />
            <meshStandardMaterial color={deep} roughness={0.6} metalness={0.3} emissive={color} emissiveIntensity={0.12} flatShading />
          </mesh>
        )
      })}
      {/* Particules d'élément ambiantes */}
      <Sparkles count={90} scale={[15, 9, 15]} position={[0, 4, 0]} size={2.4} speed={0.3} color={color} opacity={0.55} />
    </group>
  )
}

// ── Scène complète ──────────────────────────────────────────

function SanctuaryScene({
  supreme, power, abilityTrigger, activeAbility, attackTrigger, onVerdict,
}: {
  supreme: SupremeDef
  power: SupremePowerDef
  abilityTrigger: number
  activeAbility: VfxKind | null
  attackTrigger: number
  onVerdict: () => void
}) {
  const { glow, deep } = power.palette
  return (
    <>
      <color attach="background" args={['#07060d']} />
      <fog attach="fog" args={['#07060d', 14, 34]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 5]} intensity={1.15} color="#fff4e0" />
      <pointLight position={[-5, 5, -4]} intensity={16} distance={22} decay={2} color={glow} />
      <pointLight position={[5, 3, 4]} intensity={10} distance={18} decay={2} color={glow} />
      <Stars radius={70} depth={30} count={2600} factor={3.4} saturation={0} fade speed={0.6} />
      <SanctuaryArena color={glow} deep={deep} />
      <SupremeFigure id={supreme.id} />
      {activeAbility && abilityTrigger > 0 && (
        <AbilityFx key={`${activeAbility}-${abilityTrigger}`} kind={activeAbility} color={glow} trigger={abilityTrigger} />
      )}
      {attackTrigger > 0 && <InvincibilityTest key={attackTrigger} onVerdict={onVerdict} />}
      <OrbitControls
        makeDefault
        target={[0, 2.7, 0]}
        enablePan={false}
        minDistance={5.5}
        maxDistance={16}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  )
}

export function SupremeSanctuary(props: {
  supreme: SupremeDef
  power: SupremePowerDef
  abilityTrigger: number
  activeAbility: VfxKind | null
  attackTrigger: number
  onVerdict: () => void
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.4, 10.5], fov: 46 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <SanctuaryScene {...props} />
    </Canvas>
  )
}
