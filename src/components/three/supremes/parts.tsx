'use client'

// NEXORIA — Les 10 Suprêmes en 3D · pièces partagées des modèles procéduraux
// Chaque Suprême est construit en géométrie procédurale (aucun asset externe),
// avec matériaux émissifs, anneaux, orbes orbitales et particules d'élément.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SupremePalette } from '@/lib/game/supremes'

export interface ModelProps {
  p: SupremePalette
}

/** Yeux lumineux émissifs d'un Suprême */
export function Eyes({
  y, z, color, sep = 0.22, size = 0.09, intensity = 3,
}: {
  y: number; z: number; color: string; sep?: number; size?: number; intensity?: number
}) {
  return (
    <>
      {[-sep, sep].map((x) => (
        <mesh key={x} position={[x, y, z]}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={intensity} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

/** Orbes / éclats orbitant autour d'un Suprême (âmes, drones, éclats d'illusion…) */
export function Orbiters({
  count, radius, y, speed = 1, color, size = 0.12, ySpread = 0.3, emissiveIntensity = 2, opacity = 1,
}: {
  count: number; radius: number; y: number; speed?: number; color: string
  size?: number; ySpread?: number; emissiveIntensity?: number; opacity?: number
}) {
  const g = useRef<THREE.Group>(null)
  const seeds = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      a: (i / count) * Math.PI * 2,
      dy: Math.sin(i * 2.4) * ySpread,
      s: size * (0.7 + ((i * 37) % 10) / 18),
    })),
    [count, size, ySpread],
  )
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.getElapsedTime() * speed
  })
  return (
    <group ref={g} position={[0, y, 0]}>
      {seeds.map((s, i) => (
        <mesh key={i} position={[Math.cos(s.a) * radius, s.dy, Math.sin(s.a) * radius]}>
          <octahedronGeometry args={[s.s, 0]} />
          <meshStandardMaterial
            color={color} emissive={color} emissiveIntensity={emissiveIntensity}
            transparent opacity={opacity} toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Anneau(s) en rotation autour d'un axe (halo, temps, eau…) */
export function SpinRings({
  rings, color, emissiveIntensity = 1.2, opacity = 0.85,
}: {
  rings: { r: number; y: number; tilt: [number, number, number]; speed: number; tube?: number }[]
  color: string; emissiveIntensity?: number; opacity?: number
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let i = 0; i < rings.length; i++) {
      const m = refs.current[i]
      if (m) m.rotation.z = t * rings[i].speed
    }
  })
  return (
    <>
      {rings.map((r, i) => (
        <mesh
          key={i} ref={(m) => { refs.current[i] = m }}
          position={[0, r.y, 0]} rotation={r.tilt}
        >
          <torusGeometry args={[r.r, r.tube ?? 0.08, 8, 48]} />
          <meshStandardMaterial
            color={color} emissive={color} emissiveIntensity={emissiveIntensity}
            transparent opacity={opacity} toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

/** Cape/robe effilée standard des Suprêmes humanoïdes */
export function Robe({
  p, topR, bottomR, h, yBase, opacity = 1,
}: {
  p: SupremePalette; topR: number; bottomR: number; h: number; yBase: number; opacity?: number
}) {
  return (
    <mesh position={[0, yBase + h / 2, 0]}>
      <coneGeometry args={[bottomR, h, 12]} />
      <meshStandardMaterial
        color={p.primary} roughness={0.55} metalness={0.15}
        transparent opacity={opacity}
      />
    </mesh>
  )
}

/** Paire d'épaules à pointes (colosses, démons, rois) */
export function SpikeShoulders({
  p, y, spread = 1.1, size = 0.5, glowTip = false, glowColor,
}: {
  p: SupremePalette; y: number; spread?: number; size?: number
  glowTip?: boolean; glowColor?: string
}) {
  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * spread, y, 0]} rotation={[0, 0, s * -0.5]}>
          <mesh>
            <coneGeometry args={[size, size * 2.2, 6]} />
            <meshStandardMaterial color={p.secondary} roughness={0.6} metalness={0.2} />
          </mesh>
          {glowTip && glowColor && (
            <mesh position={[0, size * 1.25, 0]}>
              <sphereGeometry args={[size * 0.28, 8, 8]} />
              <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={3} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </>
  )
}
