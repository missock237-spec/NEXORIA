'use client'

// NEXORIA — Les 10 Suprêmes en 3D · modèles 06 à 10
// 06 CHRONYX (Temps) · 07 MORPHEUS (Illusion) · 08 OMEGA-X (Mécanique)
// 09 VHALOR (Âme) · 10 ??? — LE SUPRÊME INCONNU (Inconnu)

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { ModelProps } from './parts'
import { Eyes, Orbiters, SpinRings } from './parts'

// ══════════════════════════════════════════════════════════════
// 06 · CHRONYX — Le Maître du Temps
// Mage encapuchonné doré, sablier flottant, anneaux d'horloge
// ══════════════════════════════════════════════════════════════

function Hourglass({ p }: ModelProps) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.rotation.y = clock.getElapsedTime() * 0.8
      g.current.position.y = 2.9 + Math.sin(clock.getElapsedTime() * 1.4) * 0.08
    }
  })
  return (
    <group ref={g} position={[0, 2.9, 0.75]}>
      {/* Verres du sablier */}
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.26, 0.44, 4]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.6} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.22, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.26, 0.44, 4]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.6} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* Montants dorés */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.22, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.88, 6]} />
          <meshStandardMaterial color={p.secondary} metalness={0.85} roughness={0.2} emissive="#684810" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {[0.45, -0.45].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.05, 12]} />
          <meshStandardMaterial color={p.secondary} metalness={0.85} roughness={0.2} emissive="#684810" emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function ChronyxModel({ p }: ModelProps) {
  const rune = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (rune.current) {
      rune.current.rotation.z = -clock.getElapsedTime() * 1.4
    }
  })
  return (
    <group>
      {/* Robe d'archimage dorée */}
      <mesh position={[0, 1.45, 0]}>
        <coneGeometry args={[1.0, 2.9, 12]} />
        <meshStandardMaterial color={p.primary} roughness={0.45} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0.6]}>
        <torusGeometry args={[0.85, 0.05, 8, 28, Math.PI]} />
        <meshStandardMaterial color={p.secondary} metalness={0.85} roughness={0.25} emissive="#684810" emissiveIntensity={0.5} />
      </mesh>
      {/* Épaules d'or */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.72, 2.85, 0]} rotation={[0, 0, s * -0.35]}>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshStandardMaterial color={p.secondary} metalness={0.85} roughness={0.22} emissive="#684810" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {/* Capuche : visage dans l'ombre */}
      <group position={[0, 3.65, 0]}>
        <mesh>
          <sphereGeometry args={[0.34, 14, 12]} />
          <meshStandardMaterial color={p.deep} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.14, -0.04]}>
          <coneGeometry args={[0.4, 0.72, 10]} />
          <meshStandardMaterial color={p.primary} roughness={0.45} metalness={0.4} />
        </mesh>
        <Eyes y={0.02} z={0.3} color={p.glow} sep={0.12} size={0.05} intensity={3.5} />
      </group>
      {/* Sablier du temps flottant */}
      <Hourglass p={p} />
      {/* Anneaux d'horloge (aiguilles runiques) */}
      <SpinRings
        color={p.glow}
        rings={[
          { r: 1.35, y: 2.9, tilt: [Math.PI / 2, 0, 0], speed: 1.1, tube: 0.045 },
          { r: 1.85, y: 2.5, tilt: [Math.PI / 2.3, 0.5, 0], speed: -0.7, tube: 0.04 },
          { r: 2.3, y: 2.1, tilt: [Math.PI / 1.8, -0.4, 0], speed: 0.45, tube: 0.035 },
        ]}
        emissiveIntensity={1.8}
      />
      {/* Aiguille runique au sol */}
      <mesh ref={rune} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 24, 1, 0, Math.PI * 1.4]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.6} side={THREE.DoubleSide} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <Sparkles count={40} scale={[4.2, 5.2, 4.2]} position={[0, 2.8, 0]} size={2.2} speed={0.35} color={p.glow} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 07 · MORPHEUS — Le Seigneur des Illusions
// Tête flottante fracturée, fragments en orbite, orbes d'illusion
// ══════════════════════════════════════════════════════════════

function FracturedHead({ p }: ModelProps) {
  const g = useRef<THREE.Group>(null)
  const shards = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (g.current) g.current.position.y = 3.4 + Math.sin(t * 1.1) * 0.14
    if (shards.current) {
      shards.current.rotation.y = t * 0.45
      shards.current.rotation.x = Math.sin(t * 0.5) * 0.2
    }
  })
  // Éclats fracturés autour de la tête
  const frags = [
    [1.05, 0.25, 0.3, 0.34], [-1.0, 0.4, -0.2, 0.3], [0.75, -0.5, -0.4, 0.26],
    [-0.8, -0.35, 0.45, 0.24], [0.15, 0.95, -0.55, 0.28], [-0.3, -0.95, 0.3, 0.22],
  ]
  return (
    <group ref={g} position={[0, 3.4, 0]}>
      {/* Tête centrale */}
      <mesh>
        <sphereGeometry args={[0.62, 20, 20]} />
        <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.55} roughness={0.3} metalness={0.25} transparent opacity={0.96} />
      </mesh>
      {/* Trois yeux d'illusion */}
      <Eyes y={0.12} z={0.54} color={p.glow} sep={0.2} size={0.075} intensity={4} />
      <mesh position={[0, 0.38, 0.5]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive={p.glow} emissiveIntensity={5} toneMapped={false} />
      </mesh>
      {/* Fragments flottants */}
      <group ref={shards}>
        {frags.map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[i * 0.7, i * 1.1, i * 0.4]}>
            <tetrahedronGeometry args={[s, 0]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? p.secondary : p.primary}
              emissive={p.glow} emissiveIntensity={0.7} transparent opacity={0.92} flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function IllusionOrb({ p, radius, speed, phase }: { p: ModelProps['p']; radius: number; speed: number; phase: number }) {
  const m = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!m.current) return
    const t = clock.getElapsedTime()
    const pulse = 0.5 + 0.5 * Math.sin(t * speed + phase)
    const mat = m.current.material as THREE.MeshStandardMaterial
    mat.opacity = 0.08 + pulse * 0.4
    m.current.scale.setScalar(0.8 + pulse * 0.5)
    const a = t * speed * 0.5 + phase
    m.current.position.set(Math.cos(a) * radius, 2.6 + Math.sin(t * 0.8 + phase) * 0.7, Math.sin(a) * radius)
  })
  return (
    <mesh ref={m}>
      <sphereGeometry args={[0.42, 16, 16]} />
      <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={0.8} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

export function MorpheusModel({ p }: ModelProps) {
  return (
    <group>
      <FracturedHead p={p} />
      {/* Corps qui se dissout en fragments */}
      <mesh position={[0, 1.85, 0]}>
        <coneGeometry args={[0.75, 2.2, 10]} />
        <meshStandardMaterial color={p.deep} emissive={p.glow} emissiveIntensity={0.3} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <coneGeometry args={[0.5, 1.0, 8]} />
        <meshStandardMaterial color={p.deep} transparent opacity={0.22} />
      </mesh>
      {/* Éclats d'illusion en orbite */}
      <Orbiters count={10} radius={1.9} y={3.3} speed={0.7} color={p.glow} size={0.14} ySpread={1.0} emissiveIntensity={2.2} opacity={0.9} />
      <Orbiters count={5} radius={1.35} y={2.2} speed={-0.9} color={p.primary} size={0.1} ySpread={0.5} emissiveIntensity={1.6} opacity={0.8} />
      {/* Orbes d'illusion pulsantes */}
      <IllusionOrb p={p} radius={2.6} speed={1.0} phase={0} />
      <IllusionOrb p={p} radius={2.2} speed={-1.3} phase={2.2} />
      <IllusionOrb p={p} radius={3.0} speed={0.8} phase={4.4} />
      <Sparkles count={48} scale={[5, 5.4, 5]} position={[0, 3, 0]} size={2.6} speed={0.5} color={p.glow} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 08 · OMEGA-X — La Machine Originelle
// Mecha ancestral, noyau d'énergie bleu, pods dorsaux, antennes
// ══════════════════════════════════════════════════════════════

function ReactorCore({ p }: ModelProps) {
  const m = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (m.current) {
      const mat = m.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 2.2 + Math.sin(clock.getElapsedTime() * 4.2) * 0.8
      m.current.rotation.y = clock.getElapsedTime() * 1.2
    }
  })
  return (
    <mesh ref={m} position={[0, 2.85, 0.34]}>
      <icosahedronGeometry args={[0.26, 1]} />
      <meshStandardMaterial color="#bfe8ff" emissive={p.glow} emissiveIntensity={2.4} roughness={0.15} toneMapped={false} />
    </mesh>
  )
}

export function OmegaXModel({ p }: ModelProps) {
  const antenna = useRef<THREE.Mesh>(null)
  const pods = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (antenna.current) {
      const mat = antenna.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = (Math.sin(t * 5) > 0 ? 3.4 : 0.4)
    }
    if (pods.current) {
      pods.current.children.forEach((c, i) => {
        c.position.y = (i === 0 ? 3.6 : 3.3) + Math.sin(t * 1.3 + i * 2.4) * 0.12
      })
    }
  })
  return (
    <group>
      {/* Jademouth / base blindée */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.0, 1.3, 1.0, 8]} />
        <meshStandardMaterial color={p.deep} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Torse mécanique */}
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[1.35, 1.9, 0.85]} />
        <meshStandardMaterial color={p.primary} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Lignes d'énergie */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 1.9, 0.44]}>
          <boxGeometry args={[0.07, 1.6, 0.02]} />
          <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      <ReactorCore p={p} />
      {/* Tête-visor */}
      <group position={[0, 3.35, 0]}>
        <mesh>
          <boxGeometry args={[0.72, 0.55, 0.6]} />
          <meshStandardMaterial color={p.primary} roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.04, 0.31]}>
          <boxGeometry args={[0.56, 0.16, 0.03]} />
          <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={3.2} toneMapped={false} />
        </mesh>
        {/* Antenne clignotante */}
        <mesh position={[0.28, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.55, 5]} />
          <meshStandardMaterial color={p.secondary} metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh ref={antenna} position={[0.28, 0.82, 0]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>
      {/* Épaulettes + bras canon */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.95, 2.95, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 0.4, 0.7]} />
            <meshStandardMaterial color={p.secondary} roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.85, 0.05]}>
            <capsuleGeometry args={[0.2, 1.2, 5, 10]} />
            <meshStandardMaterial color={p.primary} roughness={0.35} metalness={0.75} />
          </mesh>
          {/* Canon d'épaule */}
          <mesh position={[s * 0.12, -1.75, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.16, 0.5, 8]} />
            <meshStandardMaterial color={p.deep} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[s * 0.12, -1.75, 0.32]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* Pods dorsaux flottants */}
      <group ref={pods}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.9, 3.5, -0.55]}>
            <mesh>
              <boxGeometry args={[0.34, 0.9, 0.34]} />
              <meshStandardMaterial color={p.secondary} roughness={0.35} metalness={0.75} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <sphereGeometry args={[0.09, 8, 8]} />
              <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.8} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Drones de la cité mécanique */}
      <Orbiters count={6} radius={2.2} y={2.9} speed={0.9} color={p.glow} size={0.11} ySpread={0.9} emissiveIntensity={2.4} />
      <Sparkles count={30} scale={[4.4, 5.2, 4.4]} position={[0, 2.8, 0]} size={1.8} speed={0.5} color={p.glow} opacity={0.7} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 09 · VHALOR — Le Roi des Âmes
// Roi spectral translucide, couronne de glace, fantômes en orbite
// ══════════════════════════════════════════════════════════════

function GhostWisp({ p, radius, speed, phase, size }: { p: ModelProps['p']; radius: number; speed: number; phase: number; size: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.getElapsedTime()
    const a = t * speed + phase
    g.current.position.set(Math.cos(a) * radius, 1.4 + Math.sin(t * 1.2 + phase) * 0.5 + size, Math.sin(a) * radius)
    g.current.rotation.y = -a + Math.PI / 2
  })
  return (
    <group ref={g} scale={size}>
      {/* Corps de fantôme */}
      <mesh>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.5} transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Queue effilée */}
      <mesh position={[0, -0.34, 0]}>
        <coneGeometry args={[0.18, 0.5, 8]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.2} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Yeux spectraux */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.04, 0.18]}>
          <sphereGeometry args={[0.032, 6, 6]} />
          <meshStandardMaterial color="#0c1820" emissive="#0c1820" emissiveIntensity={0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export function VhalorModel({ p }: ModelProps) {
  const robe = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (robe.current) {
      const mat = robe.current.material as THREE.MeshStandardMaterial
      mat.opacity = 0.62 + Math.sin(clock.getElapsedTime() * 1.1) * 0.12
    }
  })
  return (
    <group>
      {/* Robe spectrale translucide */}
      <mesh ref={robe} position={[0, 1.6, 0]}>
        <coneGeometry args={[1.0, 3.2, 12]} />
        <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.7} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      {/* Torse spectral */}
      <mesh position={[0, 3.25, 0]}>
        <capsuleGeometry args={[0.44, 0.7, 6, 12]} />
        <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.8} transparent opacity={0.72} depthWrite={false} />
      </mesh>
      {/* Tête + couronne de glace des âmes */}
      <group position={[0, 4.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.3, 14, 12]} />
          <meshStandardMaterial color="#d0f0f4" emissive={p.glow} emissiveIntensity={0.9} transparent opacity={0.85} />
        </mesh>
        <Eyes y={0.02} z={0.26} color={p.glow} sep={0.11} size={0.05} intensity={4} />
        {/* Couronne : 7 pointes de glace */}
        {[-0.27, -0.18, -0.09, 0, 0.09, 0.18, 0.27].map((x, i) => (
          <mesh key={i} position={[x, 0.32 - Math.abs(x) * 0.4, 0]}>
            <coneGeometry args={[0.035, 0.34 - Math.abs(x) * 0.4, 5]} />
            <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={2.2} transparent opacity={0.9} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Bras fantômes tendus */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.62, 3.4, 0]} rotation={[0, 0, s * -0.7]}>
          <mesh position={[0, -0.55, 0]}>
            <capsuleGeometry args={[0.12, 0.95, 5, 10]} />
            <meshStandardMaterial color={p.primary} emissive={p.glow} emissiveIntensity={0.8} transparent opacity={0.6} depthWrite={false} />
          </mesh>
        </group>
      ))}
      {/* Chaîne d'âmes */}
      <SpinRings
        color={p.glow}
        rings={[
          { r: 1.6, y: 2.4, tilt: [Math.PI / 2.1, 0, 0], speed: 0.6, tube: 0.035 },
          { r: 1.25, y: 3.3, tilt: [Math.PI / 2.4, 0.4, 0], speed: -0.45, tube: 0.03 },
        ]}
        emissiveIntensity={1.6}
        opacity={0.75}
      />
      {/* Fantômes en orbite */}
      <GhostWisp p={p} radius={1.9} speed={0.55} phase={0} size={1.25} />
      <GhostWisp p={p} radius={2.3} speed={-0.4} phase={2.4} size={0.95} />
      <GhostWisp p={p} radius={1.65} speed={0.7} phase={4.4} size={0.8} />
      <Sparkles count={52} scale={[4.6, 5.4, 4.6]} position={[0, 2.8, 0]} size={2.6} speed={0.25} color={p.glow} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// 10 · ??? — LE SUPRÊME INCONNU
// Silhouette encapuchonnée, œil d'or unique, cristaux noirs, halo voilé
// ══════════════════════════════════════════════════════════════

function VoidHalo({ p }: ModelProps) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.35) * 0.16
  })
  return (
    <group ref={g} position={[0, 4.0, -0.75]}>
      <mesh>
        <torusGeometry args={[1.35, 0.05, 8, 48]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={1.3} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.62, 0.02, 8, 48]} />
        <meshStandardMaterial color={p.glow} emissive={p.glow} emissiveIntensity={0.8} transparent opacity={0.3} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function InconnuModel({ p }: ModelProps) {
  const eye = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (eye.current) {
      const mat = eye.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 2.6 + Math.sin(clock.getElapsedTime() * 1.8) * 1.0
    }
  })
  return (
    <group>
      <VoidHalo p={p} />
      {/* Cape d'ombre déchirée */}
      <mesh position={[0, 1.7, 0]}>
        <coneGeometry args={[1.05, 3.4, 12]} />
        <meshStandardMaterial color={p.primary} roughness={0.65} metalness={0.2} />
      </mesh>
      {/* Lambeaux de cape animés */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.8, 0.32, Math.sin(a) * 0.8]} rotation={[Math.sin(a) * 0.4, -a, Math.cos(a) * 0.4 + 0.2]}>
            <coneGeometry args={[0.09, 0.7 + (i % 3) * 0.22, 4]} />
            <meshStandardMaterial color={p.deep} roughness={0.7} />
          </mesh>
        )
      })}
      {/* Épaules voilées */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.7, 3.35, 0]} rotation={[0, 0, s * -0.4]}>
          <sphereGeometry args={[0.3, 10, 10]} />
          <meshStandardMaterial color={p.primary} roughness={0.65} />
        </mesh>
      ))}
      {/* Capuche — visage du vide, ŒIL D'OR unique */}
      <group position={[0, 3.95, 0]}>
        <mesh>
          <sphereGeometry args={[0.35, 14, 12]} />
          <meshStandardMaterial color={p.deep} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.2, -0.02]}>
          <coneGeometry args={[0.38, 0.66, 10]} />
          <meshStandardMaterial color={p.primary} roughness={0.6} />
        </mesh>
        {/* Le vide absolu à la place du visage */}
        <mesh position={[0, 0, 0.22]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshBasicMaterial color="#020204" />
        </mesh>
        <mesh ref={eye} position={[0, 0.02, 0.4]}>
          <sphereGeometry args={[0.075, 10, 10]} />
          <meshStandardMaterial color="#fff2c8" emissive={p.glow} emissiveIntensity={3} toneMapped={false} />
        </mesh>
      </group>
      {/* Cristaux d'obsidienne en orbite — mystère */}
      <Orbiters count={9} radius={2.0} y={3.1} speed={0.4} color={p.deep} size={0.16} ySpread={1.2} emissiveIntensity={0.5} opacity={0.95} />
      <Orbiters count={5} radius={1.45} y={3.6} speed={-0.6} color={p.glow} size={0.06} ySpread={0.7} emissiveIntensity={2.4} />
      <Sparkles count={34} scale={[4.4, 5.4, 4.4]} position={[0, 2.9, 0]} size={2} speed={0.2} color={p.glow} opacity={0.6} />
      <pointLight position={[0, 4, 1]} color={p.glow} intensity={4} distance={6} decay={2} />
    </group>
  )
}
