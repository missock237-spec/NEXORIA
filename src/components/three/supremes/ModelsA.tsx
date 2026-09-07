'use client'

// NEXORIA — Les 10 Suprêmes en 3D · modèles 01 à 05
// 01 AETHERION (Éclair) · 02 NOXAR (Ténèbres) · 03 THALYSS (Eau)
// 04 IGNAROK (Feu) · 05 VERDANIA (Nature)
// Fidèles à l'affiche officielle : silhouette, couleurs et attributs.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { ModelProps } from './parts'
import { Eyes, Orbiters, SpinRings, SpikeShoulders } from './parts'

// ══════════════════════════════════════════════════════════════
// 01 · AETHERION — Le Roi du Ciel
// Roi ailé blanc & or, halo de foudre, anneaux célestes, noyau d'énergie
// ══════════════════════════════════════════════════════════════

function AetherionWing({ side, p }: { side: 1 | -1; p: ModelProps['p'] }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.rotation.z = side * (0.25 + Math.sin(clock.getElapsedTime() * 1.1) * 0.14)
    }
  })
  const feathers = [0, 1, 2, 3, 4, 5]
  return (
    <group ref={g} position={[side * 0.55, 3.35, -0.2]} rotation={[0.15, side * -0.35, side * 0.25]}>
      {feathers.map((i) => {
        const len = 3.1 - i * 0.32
        const spread = side * (0.38 + i * 0.13)
        const drop = -i * 0.2
        return (
          <mesh key={i} position={[side * (len / 2 + 0.25), drop, -i * 0.08]} rotation={[0, 0, spread]}>
            <boxGeometry args={[len, 0.62 - i * 0.05, 0.05]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? p.primary : '#e8e0cc'}
              emissive={p.glow} emissiveIntensity={0.12} roughness={0.55}
            />
          </mesh>
        )
      })}
      <mesh position={[side * 1.25, 0.25, -0.2]} rotation={[0, 0, side * 0.5]}>
        <torusGeometry args={[1.5, 0.05, 8, 30, Math.PI]} />
        <meshStandardMaterial color={p.secondary} metalness={0.7} roughness={0.25} emissive={p.secondary} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

export function AetherionModel({ p }: ModelProps) {
  const core = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (core.current) {
      const m = core.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 1.6 + Math.sin(clock.getElapsedTime() * 5) * 0.5
    }
  })
  return (
    <group>
      {/* Robe céleste effilée */}
      <mesh position={[0, 1.3, 0]}>
        <coneGeometry args={[0.85, 2.6, 10]} />
        <meshStandardMaterial color={p.primary} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[0.72, 1.2, 10]} />
        <meshStandardMaterial color="#e0d8c4" emissive={p.glow} emissiveIntensity={0.22} transparent opacity={0.9} />
      </mesh>
      {/* Torse + plastron + noyau */}
      <mesh position={[0, 3.25, 0]}>
        <capsuleGeometry args={[0.62, 0.9, 6, 12]} />
        <meshStandardMaterial color={p.primary} roughness={0.4} metalness={0.25} />
      </mesh>
      <mesh position={[0, 3.38, 0.42]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.92, 1.1, 0.22]} />
        <meshStandardMaterial color={p.secondary} metalness={0.75} roughness={0.22} />
      </mesh>
      <mesh ref={core} position={[0, 3.36, 0.58]}>
        <sphereGeometry args={[0.24, 14, 14]} />
        <meshStandardMaterial color="#bfe8ff" emissive={p.glow} emissiveIntensity={1.8} roughness={0.1} toneMapped={false} />
      </mesh>
      {/* Tête, masque, couronne 5 pointes */}
      <group position={[0, 4.35, 0]}>
        <mesh>
          <sphereGeometry args={[0.36, 14, 12]} />
          <meshStandardMaterial color={p.primary} roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.03, 0.26]} scale={[1, 1.25, 0.5]}>
          <sphereGeometry args={[0.26, 12, 10]} />
          <meshStandardMaterial color={p.secondary} metalness={0.8} roughness={0.18} />
        </mesh>
        <Eyes y={0.04} z={0.34} color={p.glow} sep={0.11} size={0.05} />
        {[-0.24, -0.12, 0, 0.12, 0.24].map((x, i) => (
          <mesh key={i} position={[x, 0.38 - Math.abs(x) * 0.35, 0]} rotation={[0, 0, -x * 0.5]}>
            <coneGeometry args={[0.05, 0.42 - Math.abs(x) * 0.35, 5]} />
            <meshStandardMaterial color={p.secondary} metalness={0.85} roughness={0.2} emissive="#785818" emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>
      {/* Bras + lame d'éclair */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.78, 3.5, 0]} rotation={[0, 0, s * 0.3]}>
          <mesh position={[0, -0.6, 0]}>
            <capsuleGeometry args={[0.18, 1.1, 5, 10]} />
            <meshStandardMaterial color={p.primary} roughness={0.4} metalness={0.25} />
          </mesh>
          {s === 1 && (
            <mesh position={[0.1, -1.85, 0.1]} rotation={[0.2, 0, -0.1]}>
              <boxGeometry args={[0.14, 2.1, 0.05]} />
              <meshStandardMaterial color="#d8ecff" emissive={p.glow} emissiveIntensity={1.6} transparent opacity={0.95} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      <AetherionWing side={1} p={p} />
      <AetherionWing side={-1} p={p} />
      {/* Halo de foudre + anneaux célestes */}
      <SpinRings
        color={p.glow}
        rings={[
          { r: 1.35, y: 4.45, tilt: [Math.PI / 2.15, 0, 0], speed: 0.9, tube: 0.05 },
          { r: 1.95, y: 3.7, tilt: [Math.PI / 1.85, 0.4, 0], speed: -0.55, tube: 0.035 },
          { r: 2.45, y: 3.1, tilt: [Math.PI / 2.6, -0.3, 0], speed: 0.38, tube: 0.03 },
        ]}
      />
      <Sparkles count={46} scale={[4.4, 5.4, 4.4]} position={[0, 3, 0]} size={2.2} speed={0.5} color={p.glow} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 02 · NOXAR — L'Éternité Noire
// Colosse d'obsidienne à pointes, éclipse noire cerclée de violet
// ══════════════════════════════════════════════════════════════

function EclipseDisc({ p }: ModelProps) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.z = clock.getElapsedTime() * 0.12
  })
  return (
    <group ref={g} position={[0, 4.15, -0.85]}>
      {/* Disque noir (éclipse) */}
      <mesh>
        <circleGeometry args={[1.55, 40]} />
        <meshBasicMaterial color="#050308" />
      </mesh>
      {/* Couronne violette de l'éclipse */}
      <mesh>
        <torusGeometry args={[1.55, 0.09, 10, 60]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.85, 0.035, 8, 60]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.2} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function NoxarModel({ p }: ModelProps) {
  const aura = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (aura.current) {
      const m = aura.current.material as THREE.MeshStandardMaterial
      m.opacity = 0.28 + Math.sin(clock.getElapsedTime() * 1.6) * 0.1
    }
  })
  return (
    <group>
      {/* Éclipse derrière la tête */}
      <EclipseDisc p={p} />
      {/* Robe d'obsidienne */}
      <mesh position={[0, 1.55, 0]}>
        <coneGeometry args={[1.05, 3.1, 8]} />
        <meshStandardMaterial color={p.primary} roughness={0.4} metalness={0.35} />
      </mesh>
      {/* Pointes remontant la robe */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 1.0 + (i % 2) * 0.5, Math.sin(a) * 0.62]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]}>
            <coneGeometry args={[0.14, 0.85, 5]} />
            <meshStandardMaterial color={p.deep} roughness={0.35} metalness={0.4} emissive={p.glow} emissiveIntensity={0.12} />
          </mesh>
        )
      })}
      {/* Torse massif + épaules à pointes */}
      <mesh position={[0, 3.15, 0]}>
        <capsuleGeometry args={[0.68, 0.8, 6, 12]} />
        <meshStandardMaterial color={p.primary} roughness={0.35} metalness={0.4} />
      </mesh>
      <SpikeShoulders p={p} y={3.72} spread={0.95} size={0.42} glowTip glowColor={p.glow} />
      {/* Tête — yeux violets perçants */}
      <group position={[0, 4.5, 0]}>
        <mesh>
          <sphereGeometry args={[0.34, 14, 12]} />
          <meshStandardMaterial color={p.deep} roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Cornes de ténèbres */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.3, 0.32, 0]} rotation={[0, 0, s * -0.6]}>
            <coneGeometry args={[0.09, 0.62, 5]} />
            <meshStandardMaterial color={p.deep} roughness={0.3} metalness={0.5} />
          </mesh>
        ))}
        <Eyes y={0.03} z={0.3} color={p.glow} sep={0.13} size={0.06} intensity={4} />
      </group>
      {/* Bras griffus */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.95, 3.35, 0]} rotation={[0, 0, s * 0.45]}>
          <mesh position={[0, -0.75, 0]}>
            <capsuleGeometry args={[0.2, 1.3, 5, 10]} />
            <meshStandardMaterial color={p.primary} roughness={0.35} metalness={0.4} />
          </mesh>
          {[0, 1, 2].map((c) => (
            <mesh key={c} position={[(c - 1) * 0.11, -1.62, 0]} rotation={[0.2, 0, (c - 1) * 0.3]}>
              <coneGeometry args={[0.035, 0.42, 5]} />
              <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Aura d'obscurité palpitante */}
      <mesh ref={aura} position={[0, 2.9, 0]}>
        <sphereGeometry args={[1.7, 20, 20]} />
        <meshBasicMaterial color={p.glow} transparent opacity={0.28} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <Orbiters count={7} radius={2.1} y={3.2} speed={0.5} color={p.glow} size={0.1} ySpread={1.1} emissiveIntensity={1.6} />
      <Sparkles count={40} scale={[4.6, 5.6, 4.6]} position={[0, 3, 0]} size={2.4} speed={0.25} color={p.glow} opacity={0.5} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 03 · THALYSS — La Reine des Abysses
// Reine océane, chevelure flottante vers le haut, couronne, tourbillons
// ══════════════════════════════════════════════════════════════

function HairStrand({ side, i, p }: { side: number; i: number; p: ModelProps['p'] }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) {
      const t = clock.getElapsedTime()
      g.current.rotation.z = side * (0.5 + i * 0.16) + Math.sin(t * 0.9 + i * 1.7) * 0.09
      g.current.rotation.x = Math.sin(t * 0.7 + i * 2.1) * 0.08
    }
  })
  const len = 1.9 - i * 0.22
  return (
    <group ref={g} position={[side * 0.16, 4.42, -0.08]}>
      <mesh position={[side * (len / 2) * 0.7, len / 2 + 0.15, 0]} rotation={[0, 0, side * -0.25]}>
        <coneGeometry args={[0.13 - i * 0.015, len, 6]} />
        <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.5} roughness={0.35} transparent opacity={0.92} />
      </mesh>
      <mesh position={[side * len * 0.75, len + 0.35, 0]}>
        <sphereGeometry args={[0.1 - i * 0.01, 8, 8]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.4} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}

function BubbleColumn({ p }: ModelProps) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.getElapsedTime()
    g.current.children.forEach((c, i) => {
      const ph = (t * (0.5 + i * 0.13) + i * 1.3) % 3.2
      c.position.y = ph
      const s = 1 - ph / 3.4
      c.scale.setScalar(Math.max(0.05, s) * (0.7 + (i % 3) * 0.18))
    })
  })
  return (
    <group ref={g}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.5} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  )
}

export function ThalyssModel({ p }: ModelProps) {
  return (
    <group>
      {/* Robe-queue d'océane */}
      <mesh position={[0, 0.85, 0]}>
        <coneGeometry args={[1.0, 1.7, 12]} />
        <meshStandardMaterial color={p.secondary} roughness={0.3} metalness={0.35} transparent opacity={0.96} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <coneGeometry args={[0.78, 1.1, 12]} />
        <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.3} roughness={0.3} metalness={0.3} transparent opacity={0.95} />
      </mesh>
      {/* Torso élancé */}
      <mesh position={[0, 3.05, 0]}>
        <capsuleGeometry args={[0.42, 0.75, 6, 12]} />
        <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.22} roughness={0.35} />
      </mesh>
      {/* Collier d'eau */}
      <mesh position={[0, 3.5, 0]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.5, 0.045, 8, 32]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* Tête + couronne des abysses */}
      <group position={[0, 4.1, 0]}>
        <mesh>
          <sphereGeometry args={[0.32, 14, 12]} />
          <meshStandardMaterial color="#bfeef4" emissive={p.glow} emissiveIntensity={0.25} roughness={0.3} />
        </mesh>
        <Eyes y={0.02} z={0.28} color={p.glow} sep={0.12} size={0.05} intensity={3.5} />
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[0.3, 0.035, 8, 24]} />
          <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
        {[-0.2, 0, 0.2].map((x, i) => (
          <mesh key={i} position={[x, 0.46 - Math.abs(x) * 0.4, 0]}>
            <coneGeometry args={[0.035, 0.3 - Math.abs(x) * 0.3, 5]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Chevelure abyssale flottant vers le haut */}
      {[0, 1, 2].map((i) => (
        <HairStrand key={`l${i}`} side={-1} i={i} p={p} />
      ))}
      {[0, 1, 2].map((i) => (
        <HairStrand key={`r${i}`} side={1} i={i} p={p} />
      ))}
      {/* Bras déployés vers l'eau */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.58, 3.35, 0]} rotation={[0, 0, s * -0.9]}>
          <mesh position={[0, -0.55, 0]}>
            <capsuleGeometry args={[0.13, 1.0, 5, 10]} />
            <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.3} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* Tourbillons d'eau */}
      <SpinRings
        color={p.glow}
        rings={[
          { r: 1.5, y: 1.1, tilt: [Math.PI / 2.05, 0, 0], speed: 0.8, tube: 0.06 },
          { r: 1.95, y: 2.3, tilt: [Math.PI / 1.9, 0.35, 0], speed: -0.5, tube: 0.04 },
          { r: 1.7, y: 3.4, tilt: [Math.PI / 2.3, -0.3, 0], speed: 0.6, tube: 0.035 },
        ]}
        emissiveIntensity={1.6}
        opacity={0.8}
      />
      <BubbleColumn p={p} />
      <Sparkles count={42} scale={[4.2, 5.2, 4.2]} position={[0, 2.8, 0]} size={2} speed={0.4} color={p.glow} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 04 · IGNAROK — Le Cœur du Monde
// Colosse-montagne, roche fissurée de lave, épaules éruptives
// ══════════════════════════════════════════════════════════════

export function IgnarokModel({ p }: ModelProps) {
  const lava = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (lava.current) {
      const pulse = 1.4 + Math.sin(clock.getElapsedTime() * 2.4) * 0.7
      lava.current.children.forEach((c) => {
        const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
        m.emissiveIntensity = pulse
      })
    }
  })
  return (
    <group>
      {/* Base-montagne */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.7, 2.1, 1.1, 9]} />
        <meshStandardMaterial color={p.deep} roughness={0.95} />
      </mesh>
      {/* Torse colossal en roche */}
      <mesh position={[0, 2.35, 0]} scale={[1.25, 1.15, 1.05]}>
        <dodecahedronGeometry args={[1.35, 0]} />
        <meshStandardMaterial color={p.primary} roughness={0.9} flatShading />
      </mesh>
      {/* Fissures de lave (émissives, pulsées) */}
      <group ref={lava}>
        {[
          [0, 2.1, 1.08, 0.14, 1.5], [-0.5, 2.6, 1.0, 0.1, 1.1], [0.55, 2.7, 1.0, 0.1, 1.2],
          [0.1, 3.2, 1.05, 0.08, 0.9], [-0.35, 1.7, 1.1, 0.09, 1.0],
        ].map(([x, y, z, w, h], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, 0, (i % 2 === 0 ? 1 : -1) * 0.35]}>
            <boxGeometry args={[w, h, 0.03]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))}
        {/* Cœur de magma visible entre les roches */}
        <mesh position={[0, 2.3, 1.02]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      </group>
      {/* Épaules-montagnes avec cratères éruptifs */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.35, 3.35, 0]}>
          <mesh rotation={[0, 0, s * 0.2]}>
            <coneGeometry args={[0.62, 1.15, 7]} />
            <meshStandardMaterial color={p.secondary} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.16, 0.22, 0.14, 8]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Pic central du sommet */}
      <mesh position={[0, 3.9, 0]}>
        <coneGeometry args={[0.5, 1.0, 7]} />
        <meshStandardMaterial color={p.secondary} roughness={0.9} flatShading />
      </mesh>
      {/* Petit visage de pierre, yeux de lave */}
      <group position={[0, 3.28, 0.85]}>
        <mesh>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshStandardMaterial color={p.primary} roughness={0.85} flatShading />
        </mesh>
        <Eyes y={0.03} z={0.24} color={p.glow} sep={0.11} size={0.05} intensity={4} />
      </group>
      {/* Bras-masse rocheux */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 1.55, 2.7, 0]} rotation={[0, 0, s * 0.28]}>
          <mesh position={[0, -0.8, 0]}>
            <capsuleGeometry args={[0.4, 1.3, 5, 10]} />
            <meshStandardMaterial color={p.primary} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, -1.75, 0]}>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color={p.secondary} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, -1.05, 0.3]} rotation={[0, 0, s * 0.4]}>
            <boxGeometry args={[0.1, 0.9, 0.05]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.8} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Braises éruptives */}
      <Sparkles count={55} scale={[4.6, 5.4, 4.6]} position={[0, 3, 0]} size={3} speed={0.9} color={p.glow} />
      <Sparkles count={26} scale={[2.2, 1.4, 2.2]} position={[0, 4.3, 0]} size={4} speed={1.2} color="#ffc868" />
      <pointLight position={[0, 2.2, 1.2]} color={p.glow} intensity={7} distance={7} decay={2} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 05 · VERDANIA — La Mère Sauvage
// Géante-arbre, chevelure-canopée, boiseries vivantes, feuilles
// ══════════════════════════════════════════════════════════════

function FoliageCluster({ p }: ModelProps) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.12
      g.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.05
    }
  })
  const blobs = [
    [0, 0.3, 0, 0.62], [-0.5, 0.05, 0.15, 0.42], [0.5, 0.05, 0.15, 0.42],
    [-0.28, 0.42, -0.2, 0.36], [0.3, 0.45, -0.18, 0.34], [0, 0.15, 0.35, 0.3],
  ]
  return (
    <group ref={g} position={[0, 4.75, 0]}>
      {blobs.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[s, 0]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? p.secondary : p.glow}
            emissive={p.glow} emissiveIntensity={0.28} roughness={0.75} flatShading
          />
        </mesh>
      ))}
    </group>
  )
}

export function VerdaniaModel({ p }: ModelProps) {
  return (
    <group>
      {/* Robe-tronc d'arbre */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.55, 1.05, 3.0, 9]} />
        <meshStandardMaterial color={p.primary} roughness={0.95} />
      </mesh>
      {/* Racines en base */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.9, 0.16, Math.sin(a) * 0.9]} rotation={[Math.sin(a) * 0.55, -a, Math.cos(a) * 0.55]}>
            <cylinderGeometry args={[0.09, 0.16, 0.8, 6]} />
            <meshStandardMaterial color={p.deep} roughness={0.95} />
          </mesh>
        )
      })}
      {/* Lièges lumineux (veines de sève) */}
      {[0.5, 1.4, 2.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, i * 1.1]}>
          <torusGeometry args={[0.72 - i * 0.12, 0.03, 6, 24]} />
          <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      {/* Torse + épaules de bois */}
      <mesh position={[0, 3.5, 0]}>
        <capsuleGeometry args={[0.48, 0.62, 6, 12]} />
        <meshStandardMaterial color={p.secondary} roughness={0.85} />
      </mesh>
      <SpikeShoulders p={p} y={3.95} spread={0.8} size={0.3} />
      {/* Tête-pistil, yeux verts bienveillants */}
      <group position={[0, 4.42, 0]}>
        <mesh>
          <sphereGeometry args={[0.3, 14, 12]} />
          <meshStandardMaterial color="#d8c8a8" roughness={0.6} />
        </mesh>
        <Eyes y={0.02} z={0.26} color={p.glow} sep={0.11} size={0.05} intensity={3} />
      </group>
      {/* Bois de cerf (branches) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.22, 4.68, 0]} rotation={[0, 0, s * -0.5]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.035, 0.05, 0.7, 5]} />
            <meshStandardMaterial color={p.deep} roughness={0.9} />
          </mesh>
          <mesh position={[s * 0.14, 0.52, 0]} rotation={[0, 0, s * 0.7]}>
            <cylinderGeometry args={[0.025, 0.035, 0.34, 5]} />
            <meshStandardMaterial color={p.deep} roughness={0.9} />
          </mesh>
          <mesh position={[s * 0.1, 0.72, 0]}>
            <icosahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.2} flatShading toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Bras de branches avec vigne-serpent */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.75, 3.7, 0]} rotation={[0, 0, s * -0.75]}>
          <mesh position={[0, -0.62, 0]}>
            <capsuleGeometry args={[0.15, 1.05, 5, 10]} />
            <meshStandardMaterial color={p.primary} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[0.22, 0.035, 6, 18]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <FoliageCluster p={p} />
      {/* Feuilles et lucioles */}
      <Orbiters count={8} radius={1.9} y={2.6} speed={0.35} color={p.glow} size={0.07} ySpread={1.6} emissiveIntensity={1.8} />
      <Sparkles count={44} scale={[4.4, 5.4, 4.4]} position={[0, 2.9, 0]} size={2.4} speed={0.3} color={p.glow} />
    </group>
  )
}
