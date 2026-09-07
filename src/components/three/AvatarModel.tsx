'use client'

// NEXORIA — Modèle d'avatar 3D procédural
// Architecture : humanoïde paramétrique. AUCUN mesh n'est régénéré lors d'une
// modification : chaque paramètre n'agit que sur des transforms et des matériaux
// (équivalent blend shapes via échelles/positions) → performant PC + Android.
// Compatible système d'animation humanoïde (squelette articulé : hanches,
// épaules, coudes, genoux, tête) et système de slots d'équipement modulaire.

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Appearance, EquipmentDef, RaceDef } from '@/lib/game/types'
import { OUTFIT_TINTS } from '@/lib/game/types'

export interface AvatarModelProps {
  race: RaceDef
  appearance: Appearance
  equipment?: Record<string, EquipmentDef> // slot -> définition d'objet
  animated?: boolean
  moveAmount?: number // 0 = idle, 1 = marche (animation de jambes)
  moveRef?: { current: number } // ref mutable lue chaque frame (contrôleur joueur)
  hideHairForMask?: boolean
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

// ════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════

function Eye({ x, size, color, slit }: { x: number; size: number; color: string; slit?: boolean }) {
  return (
    <group position={[x, 0.012, 0.085]} scale={[size, slit ? size * 1.25 : size, size]}>
      <mesh>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshStandardMaterial color="#f4f0ea" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <sphereGeometry args={[0.013, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <sphereGeometry args={[0.006, 8, 8]} />
        <meshStandardMaterial color="#101014" roughness={0.1} />
      </mesh>
    </group>
  )
}

function Ears({ race, earSize, appearance }: { race: RaceDef; earSize: number; appearance: Appearance }) {
  const style = race.morphology.earStyle
  const s = 0.7 + earSize * 0.7
  const earShape = appearance.racial.earShape
  const earLength = appearance.racial.earLength
  if (style === 'none') return null
  if (style === 'elfic') {
    const len = earLength === 'courte' ? 0.09 : earLength === 'longue' ? 0.19 : 0.14
    const rot = earShape === 'droite' ? -0.5 : earShape === 'ornee' ? -0.9 : -0.7
    return [-1, 1].map((side) => (
      <group key={side} position={[side * 0.088, 0.01, 0]} rotation={[0, 0, side * (0.35 + Math.abs(rot))]} scale={[s, s, s]}>
        <mesh position={[0, len / 2, 0]} rotation={[0, 0, rot * side * -1]}>
          <coneGeometry args={[0.022, len * 2.2, 6]} />
          <meshStandardMaterial color={appearance.skin} roughness={0.6} />
        </mesh>
      </group>
    ))
  }
  if (style === 'animal') {
    const fox = appearance.racial.earShape === 'renard'
    const h = fox ? 0.15 : 0.12
    const w = fox ? 0.035 : 0.028
    const fur = appearance.hair.color
    return [-1, 1].map((side) => (
      <group key={side} position={[side * 0.06, 0.1, -0.01]} rotation={[0.15, 0, side * 0.35]} scale={[s, s, s]}>
        <mesh>
          <coneGeometry args={[w, h, 8]} />
          <meshStandardMaterial color={fur} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.008, 0.012]} scale={[0.6, 0.7, 0.6]}>
          <coneGeometry args={[w, h, 8]} />
          <meshStandardMaterial color="#e8b8b0" roughness={0.9} />
        </mesh>
      </group>
    ))
  }
  if (style === 'fin') {
    const v = appearance.racial.earVariation ?? appearance.racial.earShape
    const col = v === 'plume' ? appearance.hair.color : appearance.racial.glowColor ?? '#a8d8e8'
    return [-1, 1].map((side) => (
      <group key={side} position={[side * 0.09, 0.005, -0.01]} rotation={[0, 0, side * 0.6]} scale={[s, s, s]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.03, 0.11, 4]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} transparent opacity={0.85} roughness={0.4} />
        </mesh>
      </group>
    ))
  }
  // humain
  return [-1, 1].map((side) => (
    <mesh key={side} position={[side * 0.092, 0.005, -0.004]} scale={[s * 0.8, s, s * 0.5]}>
      <sphereGeometry args={[0.026, 8, 8]} />
      <meshStandardMaterial color={appearance.skin} roughness={0.6} />
    </mesh>
  ))
}

function Beard({ style, mustache, color, skin }: { style: string; mustache: string; color: string; skin: string }) {
  if (style === 'aucune' && mustache === 'aucune') return null
  return (
    <group position={[0, -0.055, 0.062]}>
      {style !== 'aucune' && (
        <>
          <mesh position={[0, -0.035, 0.018]} scale={[1, 1, 0.7]}>
            <coneGeometry args={[style === 'longue' ? 0.052 : style === 'tressee' ? 0.05 : 0.046, style === 'longue' ? 0.22 : 0.1, 7]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          {(style === 'tressee' || style === 'longue') &&
            [-0.018, 0.018].map((x, i) => (
              <mesh key={i} position={[x, -0.1, 0.03]} rotation={[0.1, 0, 0]}>
                <cylinderGeometry args={[0.007, 0.005, 0.12, 6]} />
                <meshStandardMaterial color={color} roughness={0.95} />
              </mesh>
            ))}
        </>
      )}
      {mustache !== 'aucune' && (
        <>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.022, 0.012, 0.035]} rotation={[0, 0, side * -0.5]} scale={[1, 0.4, 0.6]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color={color} roughness={0.95} />
            </mesh>
          ))}
        </>
      )}
      {/* bouche visible sous la moustache seule */}
      {style === 'aucune' && mustache !== 'aucune' && (
        <mesh position={[0, -0.008, 0.022]} scale={[1, 0.35, 0.5]}>
          <sphereGeometry args={[0.014, 8, 8]} />
          <meshStandardMaterial color="#7c4a42" roughness={0.6} />
        </mesh>
      )}
    </group>
  )
}

function Hair({ appearance }: { appearance: Appearance }) {
  const { style, color, secondaryColor } = appearance.hair
  if (style === 'chauve') return null
  const cap = (
    <mesh position={[0, 0.022, -0.004]} scale={[1.09, 0.95, 1.09]}>
      <sphereGeometry args={[0.107, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  )
  const backLen = { mi_long: 0.12, long: 0.24, tres_long: 0.4, flottant: 0.2 }[style] ?? 0
  switch (style) {
    case 'court':
    case 'chignon':
      return (
        <group>
          {cap}
          {style === 'chignon' && (
            <mesh position={[0, 0.09, -0.06]}>
              <sphereGeometry args={[0.045, 10, 10]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
          )}
        </group>
      )
    case 'mi_long':
    case 'long':
    case 'tres_long':
      return (
        <group>
          {cap}
          <mesh position={[0, -backLen / 2 + 0.02, -0.075]}>
            <boxGeometry args={[0.19, backLen, 0.07]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </group>
      )
    case 'queue':
      return (
        <group>
          {cap}
          <mesh position={[0, -0.1, -0.1]} rotation={[0.35, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.014, 0.28, 8]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.03, -0.105]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color={secondaryColor} roughness={0.85} />
          </mesh>
        </group>
      )
    case 'chignon':
      return cap
    case 'sauvage':
      return (
        <group>
          {[...Array(7)].map((_, i) => {
            const a = (i / 7) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05 - 0.01]} rotation={[Math.sin(a) * 0.5, 0, Math.cos(a) * -0.5]}>
                <coneGeometry args={[0.022, 0.13, 5]} />
                <meshStandardMaterial color={i % 2 === 0 ? color : secondaryColor} roughness={0.9} />
              </mesh>
            )
          })}
          {cap}
        </group>
      )
    case 'tresses':
      return (
        <group>
          {cap}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.085, -0.09, 0.02]} rotation={[0, 0, side * 0.15]}>
              <cylinderGeometry args={[0.016, 0.01, 0.22, 6]} />
              <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )
    case 'crete':
      return (
        <group>
          {cap}
          <mesh position={[0, 0.1, -0.005]}>
            <boxGeometry args={[0.03, 0.09, 0.16]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        </group>
      )
    case 'flottant':
      return (
        <group>
          {cap}
          {[...Array(6)].map((_, i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.075, 0.14, Math.sin(a) * 0.075]} rotation={[Math.sin(a) * 0.3, 0, Math.cos(a) * -0.3]}>
                <coneGeometry args={[0.016, 0.16, 5]} />
                <meshStandardMaterial color={i % 3 === 0 ? secondaryColor : color} roughness={0.7} emissive={secondaryColor} emissiveIntensity={0.12} />
              </mesh>
            )
          })}
        </group>
      )
    case 'cristale':
      return (
        <group>
          {cap}
          {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
            <mesh key={i} position={[x, 0.12 + (i % 2) * 0.02, -0.02]} rotation={[(i % 2) * 0.25 - 0.12, 0, x * 2]}>
              <coneGeometry args={[0.02, 0.14, 4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.2} metalness={0.3} />
            </mesh>
          ))}
        </group>
      )
    default:
      return cap
  }
}

function Tail({ appearance, race, tailRef }: { appearance: Appearance; race: RaceDef; tailRef?: React.RefObject<THREE.Group | null> }) {
  if (!race.morphology.tail) return null
  const fur = appearance.hair.color
  const isDrakeen = race.id === 'drakeen'
  const col = isDrakeen ? appearance.racial.scaleColor ?? '#c84040' : fur
  return (
    <group ref={tailRef} position={[0, 0.08, -0.12]}>
      <mesh rotation={[0.9, 0, 0]} position={[0, -0.08, -0.06]}>
        <cylinderGeometry args={[0.035, 0.05, 0.22, 8]} />
        <meshStandardMaterial color={col} roughness={isDrakeen ? 0.4 : 0.95} metalness={isDrakeen ? 0.2 : 0} />
      </mesh>
      <mesh rotation={[1.5, 0, 0]} position={[0, -0.22, -0.14]}>
        <cylinderGeometry args={[0.02, 0.035, 0.2, 8]} />
        <meshStandardMaterial color={col} roughness={isDrakeen ? 0.4 : 0.95} metalness={isDrakeen ? 0.2 : 0} />
      </mesh>
      {!isDrakeen && (
        <mesh position={[0, -0.31, -0.16]}>
          <sphereGeometry args={[0.038, 8, 8]} />
          <meshStandardMaterial color={col} roughness={0.95} />
        </mesh>
      )}
    </group>
  )
}

function RacialMarks({ race, appearance }: { race: RaceDef; appearance: Appearance }) {
  const r = appearance.racial
  const markColor = r.markColor ?? r.glowColor ?? appearance.marks.color
  const elems: React.ReactNode[] = []
  // Écailles drakéennes
  if (race.id === 'drakeen') {
    const dens = r.scaleDensity === 'lourde' ? 5 : r.scaleDensity === 'legere' ? 2 : 3
    const col = r.scaleColor ?? '#c84040'
    for (let i = 0; i < dens; i++) {
      const side = i % 2 === 0 ? -1 : 1
      elems.push(
        <mesh key={`sc${i}`} position={[side * (0.04 + (i % 3) * 0.012), -0.02 - Math.floor(i / 2) * 0.028, 0.09]} scale={[1, 0.55, 0.5]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color={col} roughness={0.35} metalness={0.35} />
        </mesh>
      )
    }
  }
  // Cornes drakéennes
  if (race.id === 'drakeen') {
    const shape = r.hornShape ?? 'curbees'
    const col = r.hornColor ?? '#3d3d3d'
    const isCrown = shape === 'couronnees'
    return (
      <group>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.055, 0.095, -0.01]} rotation={[isCrown ? -0.5 : 0.5, 0, side * (isCrown ? 0.8 : 0.45)]}>
            <mesh position={[0, 0.06, 0]} rotation={[-0.4, 0, 0]}>
              <coneGeometry args={[0.022, isCrown ? 0.12 : 0.17, 7]} />
              <meshStandardMaterial color={col} roughness={0.5} metalness={0.15} />
            </mesh>
          </group>
        ))}
        {elems}
      </group>
    )
  }
  // Marques d'ombre (elfe noir) / abyssales (abyssien) / astrales (astréen)
  const shadowStyle = r.shadowMark ?? r.abyssMark ?? r.astralMark
  if (shadowStyle && shadowStyle !== 'aucune') {
    const glow = markColor
    const isConstellation = shadowStyle === 'constellation'
    const positions: [number, number, number][] = isConstellation
      ? [[0.03, 0.05, 0.095], [-0.02, 0.065, 0.09], [0.045, 0.0, 0.095], [-0.04, -0.01, 0.095]]
      : [[0, 0.06, 0.1], [0.05, 0.0, 0.09], [-0.05, 0.005, 0.09]]
    positions.forEach((p, i) => {
      elems.push(
        <mesh key={`mk${i}`} position={p}>
          <sphereGeometry args={[0.008, 6, 6]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.6} />
        </mesh>
      )
    })
  }
  // Motifs lumineux sylphides
  if (r.glowPattern && r.glowPattern !== 'aucun') {
    const gc = r.glowColor ?? '#a8d8e8'
    return (
      <group>
        <mesh position={[0, 0.045, 0.098]} rotation={[0, 0, 0.6]} scale={[1, 0.35, 0.5]}>
          <torusGeometry args={[0.045, 0.004, 6, 20]} />
          <meshStandardMaterial color={gc} emissive={gc} emissiveIntensity={1.8} transparent opacity={0.9} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.13, 0.02, 0]} rotation={[0, 0, side * 1.2]} scale={[1, 0.4, 0.5]}>
            <torusGeometry args={[0.05, 0.0035, 6, 18]} />
            <meshStandardMaterial color={gc} emissive={gc} emissiveIntensity={1.2} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
    )
  }
  return elems.length > 0 ? <group>{elems}</group> : null
}

function Marks({ appearance }: { appearance: Appearance }) {
  const { type, color } = appearance.marks
  if (!type || type === 'aucune') return null
  if (type.startsWith('cicatrice')) {
    const pos: [number, number, number] = type === 'cicatrice_sourcil' ? [0.035, 0.055, 0.095] : [-0.035, -0.005, 0.095]
    return (
      <mesh position={pos} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.006, 0.05, 0.004]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    )
  }
  // tatouages / motifs génériques — bandes lumineuses sur les avant-bras et le front
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.155, 0.32, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.012, 8, 1, true]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ════════════════════════════════════════════════════════════════
// ÉQUIPEMENT (slots modulaires suivant le squelette)
// ════════════════════════════════════════════════════════════════

function WeaponMesh({ def }: { def: EquipmentDef }) {
  const c = def.color
  switch (def.visual) {
    case 'sword':
    case 'sword_slim':
      return (
        <group rotation={[0.2, 0, -0.15]}>
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[def.visual === 'sword_slim' ? 0.014 : 0.024, 0.42, 0.006]} />
            <meshStandardMaterial color={c} metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[0.07, 0.014, 0.016]} />
            <meshStandardMaterial color="#6b5a3a" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.09, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
            <meshStandardMaterial color="#4a3826" roughness={0.8} />
          </mesh>
        </group>
      )
    case 'daggers':
      return (
        <group rotation={[0.3, 0, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.014, 0.2, 0.005]} />
            <meshStandardMaterial color={c} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.06, 6]} />
            <meshStandardMaterial color="#2c2c30" roughness={0.6} />
          </mesh>
        </group>
      )
    case 'staff':
      return (
        <group rotation={[0.12, 0, 0.06]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.014, 0.018, 0.95, 8]} />
            <meshStandardMaterial color={c} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color="#8ce8e0" emissive="#5cd8d0" emissiveIntensity={1.4} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <torusGeometry args={[0.035, 0.008, 6, 16]} />
            <meshStandardMaterial color="#c8b060" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

function OffhandMesh({ def }: { def: EquipmentDef }) {
  const c = def.color
  switch (def.visual) {
    case 'shield':
      return (
        <group rotation={[0, 0, 0]} position={[0, 0, 0.04]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.035, 14]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.02, 10]} />
            <meshStandardMaterial color="#8c8478" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      )
    case 'tome':
      return (
        <group rotation={[0.4, 0.3, 0.15]}>
          <mesh>
            <boxGeometry args={[0.14, 0.19, 0.045]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.026]}>
            <boxGeometry args={[0.125, 0.175, 0.006]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.8} />
          </mesh>
        </group>
      )
    case 'kunai':
      return (
        <group rotation={[0.5, 0, 0.3]}>
          <mesh position={[0, 0.08, 0]}>
            <coneGeometry args={[0.012, 0.16, 6]} />
            <meshStandardMaterial color={c} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <torusGeometry args={[0.016, 0.004, 6, 12]} />
            <meshStandardMaterial color="#3c3c44" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

function ArmorMesh({ def, torsoColor }: { def: EquipmentDef; torsoColor: string }) {
  const c = def.color
  switch (def.visual) {
    case 'heavy_armor':
      return (
        <group>
          <mesh position={[0, 0.06, 0.035]}>
            <boxGeometry args={[0.3, 0.3, 0.06]} />
            <meshStandardMaterial color={c} metalness={0.55} roughness={0.45} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.2, 0.14, 0]} scale={[1, 0.8, 1]}>
              <sphereGeometry args={[0.075, 10, 10]} />
              <meshStandardMaterial color={c} metalness={0.55} roughness={0.45} />
            </mesh>
          ))}
          <mesh position={[0, -0.09, 0.03]}>
            <boxGeometry args={[0.24, 0.1, 0.05]} />
            <meshStandardMaterial color={c} metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      )
    case 'light_armor':
      return (
        <group>
          <mesh position={[0, 0.05, 0.03]}>
            <boxGeometry args={[0.29, 0.26, 0.05]} />
            <meshStandardMaterial color={c} roughness={0.75} />
          </mesh>
          <mesh position={[0, -0.06, 0.028]}>
            <boxGeometry args={[0.25, 0.1, 0.045]} />
            <meshStandardMaterial color="#4a3826" roughness={0.8} />
          </mesh>
        </group>
      )
    case 'robe':
      return (
        <group>
          <mesh position={[0, 0.05, 0.025]}>
            <boxGeometry args={[0.3, 0.28, 0.05]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.38, 0]}>
            <cylinderGeometry args={[0.19, 0.26, 0.85, 12, 1, true]} />
            <meshStandardMaterial color={c} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.78, 0]}>
            <torusGeometry args={[0.255, 0.012, 6, 20]} />
            <meshStandardMaterial color="#c8b060" metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      )
    case 'ninja_outfit':
      return (
        <group>
          <mesh position={[0, 0.05, 0.02]}>
            <boxGeometry args={[0.28, 0.27, 0.05]} />
            <meshStandardMaterial color={c} roughness={0.85} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.09, -0.02, 0.028]}>
              <boxGeometry args={[0.09, 0.14, 0.02]} />
              <meshStandardMaterial color="#2c2c30" roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[0, 0.17, 0]}>
            <boxGeometry args={[0.3, 0.05, 0.06]} />
            <meshStandardMaterial color="#8c3a2e" roughness={0.85} />
          </mesh>
        </group>
      )
    default:
      return (
        <mesh position={[0, 0.05, 0.025]}>
          <boxGeometry args={[0.28, 0.26, 0.05]} />
          <meshStandardMaterial color={torsoColor} roughness={0.8} />
        </mesh>
      )
  }
}

function Cape({ def, sway }: { def?: EquipmentDef; sway: React.RefObject<THREE.Group | null> }) {
  if (!def) return null
  if (def.visual === 'sash') {
    return (
      <group ref={sway} position={[0, 0.16, -0.1]}>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.07, 0.62, 0.015]} />
          <meshStandardMaterial color={def.color} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }
  return (
    <group ref={sway} position={[0, 0.17, -0.11]}>
      <mesh position={[0, -0.32, 0.005]}>
        <boxGeometry args={[0.4, 0.68, 0.018]} />
        <meshStandardMaterial color={def.color} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.3, 0.12, 0.02]} />
        <meshStandardMaterial color={def.color} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ════════════════════════════════════════════════════════════════
// MODÈLE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export function AvatarModel({ race, appearance, equipment = {}, animated = true, moveAmount = 0, moveRef }: AvatarModelProps) {
  const f = appearance.face
  const tints = OUTFIT_TINTS.find((t) => t.id === appearance.outfitTint) ?? OUTFIT_TINTS[0]

  // Proportions — 100% transform (aucune géométrie régénérée)
  const props = useMemo(() => {
    const h = lerp(race.morphology.heightScale[0], race.morphology.heightScale[1], appearance.body.height)
    const bulk = lerp(race.morphology.bulkScale[0], race.morphology.bulkScale[1], appearance.body.bulk)
    const shoulder = lerp(0.92, 1.12, appearance.body.shoulders)
    return {
      h, bulk, shoulder,
      legLen: 0.42 * h,
      shinLen: 0.4 * h,
      torsoH: 0.52 * h,
      shoulderW: 0.19 * shoulder * (0.9 + bulk * 0.2),
      headR: 0.107 * h,
      armLen: 0.26 * h,
      forearmLen: 0.24 * h,
      hipY: 0.84 * h,
      jawW: 0.55 + f.jawWidth * 0.5,
      chin: 0.5 + f.chinLength * 0.7,
      faceW: 0.85 + f.faceWidth * 0.3,
    }
  }, [race, appearance.body, f])

  const rootRef = useRef<THREE.Group>(null)
  const chestRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const armLRef = useRef<THREE.Group>(null)
  const armRRef = useRef<THREE.Group>(null)
  const legLRef = useRef<THREE.Group>(null)
  const legRRef = useRef<THREE.Group>(null)
  const capeRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!animated) return
    const t = clock.getElapsedTime()
    const mv = moveRef ? moveRef.current : moveAmount
    const breathe = 1 + Math.sin(t * 1.6) * 0.012
    if (chestRef.current) {
      chestRef.current.scale.x = 1
      chestRef.current.scale.y = breathe
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.7) * 0.12 * (1 - mv)
      headRef.current.rotation.x = Math.sin(t * 1.1) * 0.03
    }
    const swing = Math.sin(t * 9.5) * Math.min(1, mv) * 0.72
    const idleArm = Math.sin(t * 1.6) * 0.05 * (1 - mv)
    if (armLRef.current) armLRef.current.rotation.x = -swing * 0.6 + idleArm
    if (armRRef.current) armRRef.current.rotation.x = swing * 0.6 - idleArm
    if (legLRef.current) legLRef.current.rotation.x = swing * 0.8
    if (legRRef.current) legRRef.current.rotation.x = -swing * 0.8
    if (capeRef.current) capeRef.current.rotation.x = 0.12 + Math.sin(t * 2.2) * 0.05 + mv * 0.25
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 2.4) * 0.25
    if (rootRef.current) {
      rootRef.current.position.y = race.id === 'sylphide' ? Math.sin(t * 1.8) * 0.03 : 0
    }
  })

  const skinMat = { color: appearance.skin, roughness: 0.65 }
  const hairColor = appearance.hair.color
  const torsoBase = tints.torso
  const bootsDef = equipment.FEET
  const glovesDef = equipment.HANDS
  const maskDef = equipment.FACE

  const legColor = equipment['TORSO']?.visual === 'ninja_outfit' ? '#3a4438' : tints.torso

  return (
    <group ref={rootRef}>
      {/* ── JAMBES ── */}
      {[-1, 1].map((side) => (
        <group key={side} ref={side === -1 ? legLRef : legRRef} position={[side * 0.075 * props.bulk, props.hipY, 0]}>
          <mesh position={[0, -props.legLen / 2, 0]}>
            <cylinderGeometry args={[0.062 * props.bulk, 0.052 * props.bulk, props.legLen, 10]} />
            <meshStandardMaterial color={legColor} roughness={0.8} />
          </mesh>
          <group position={[0, -props.legLen, 0]}>
            <mesh position={[0, -props.shinLen / 2, 0.01]}>
              <cylinderGeometry args={[0.05 * props.bulk, 0.042 * props.bulk, props.shinLen, 10]} />
              <meshStandardMaterial color={legColor} roughness={0.8} />
            </mesh>
            {/* pied / botte */}
            <mesh position={[0, -props.shinLen + 0.03, 0.05]} castShadow>
              <boxGeometry args={[0.085 * props.bulk, 0.07, 0.19]} />
              <meshStandardMaterial color={bootsDef?.color ?? '#3a2c1e'} roughness={0.75} />
            </mesh>
            {bootsDef && (
              <mesh position={[0, -props.shinLen / 2, 0.01]}>
                <cylinderGeometry args={[0.058 * props.bulk, 0.05 * props.bulk, props.shinLen * 0.6, 10]} />
                <meshStandardMaterial color={bootsDef.color} roughness={0.75} />
              </mesh>
            )}
          </group>
        </group>
      ))}

      {/* ── TORSO ── */}
      <group ref={chestRef} position={[0, props.hipY + 0.04, 0]}>
        {/* bassin */}
        <mesh position={[0, -0.03, 0]} scale={[props.bulk, 0.9, 0.9]}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <meshStandardMaterial color={legColor} roughness={0.8} />
        </mesh>
        {/* torse */}
        <mesh position={[0, 0.14, 0]} scale={[props.bulk, 1, 0.78]}>
          <cylinderGeometry args={[props.shoulderW, 0.13 * props.bulk, 0.32, 12]} />
          <meshStandardMaterial color={tints.torso} roughness={0.8} />
        </mesh>
        {/* plastron chemise / peau (cou suggéré) */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 0.06, 10]} />
          <meshStandardMaterial {...skinMat} />
        </mesh>

        {equipment.TORSO && <ArmorMesh def={equipment.TORSO} torsoColor={tints.torso} />}

        {/* ── BRAS ── */}
        {[-1, 1].map((side) => (
          <group key={side} ref={side === -1 ? armLRef : armRRef} position={[side * (props.shoulderW + 0.045), 0.24, 0]}>
            <mesh position={[0, -props.armLen / 2, 0]}>
              <cylinderGeometry args={[0.045 * props.bulk, 0.038 * props.bulk, props.armLen, 10]} />
              <meshStandardMaterial color={equipment.TORSO ? tints.torso : appearance.skin} roughness={0.75} />
            </mesh>
            {/* avant-bras */}
            <group position={[0, -props.armLen, 0]}>
              <mesh position={[0, -props.forearmLen / 2, 0]} rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.036 * props.bulk, 0.03, props.forearmLen, 10]} />
                <meshStandardMaterial color={glovesDef && side === -1 ? glovesDef.color : equipment.TORSO ? tints.torso : appearance.skin} roughness={0.75} />
              </mesh>
              {/* main */}
              <mesh position={[0, -props.forearmLen - 0.03, 0]} scale={[0.8, 1.1, 0.5]}>
                <sphereGeometry args={[0.04 * props.bulk, 10, 8]} />
                <meshStandardMaterial color={glovesDef?.color ?? appearance.skin} roughness={0.7} />
              </mesh>
              {/* arme main droite / arme secondaire main gauche */}
              <group position={[0, -props.forearmLen - 0.05, 0.02]}>
                {side === 1 && equipment.WEAPON_MAIN && <WeaponMesh def={equipment.WEAPON_MAIN} />}
                {/* dagues jumelles : la 2e dague occupe la main gauche à la place de l'offhand */}
                {side === -1 && equipment.WEAPON_MAIN?.visual === 'daggers' && <WeaponMesh def={{ ...equipment.WEAPON_MAIN }} />}
                {side === -1 && equipment.WEAPON_OFFHAND && equipment.WEAPON_MAIN?.visual !== 'daggers' && <OffhandMesh def={equipment.WEAPON_OFFHAND} />}
                {/* kunai porté à la ceinture quand des dagues sont en main */}
                {side === -1 && equipment.WEAPON_OFFHAND?.visual === 'kunai' && equipment.WEAPON_MAIN?.visual === 'daggers' && (
                  <group position={[0.06, 0.08, 0.06]} rotation={[0.3, 0, 0.8]}>
                    <mesh position={[0, 0.05, 0]}>
                      <coneGeometry args={[0.008, 0.11, 6]} />
                      <meshStandardMaterial color={equipment.WEAPON_OFFHAND.color} metalness={0.7} roughness={0.35} />
                    </mesh>
                  </group>
                )}
              </group>
            </group>
          </group>
        ))}

        {/* ── TÊTE ── */}
        <group ref={headRef} position={[0, 0.34, 0]}>
          <group position={[0, props.headR + 0.045, 0]}>
            {/* crâne */}
            <mesh scale={[props.faceW, 0.55 + f.faceHeight * 0.28 + 0.62, 0.95]}>
              <sphereGeometry args={[props.headR, 20, 18]} />
              <meshStandardMaterial color={appearance.skin} roughness={0.6} />
            </mesh>
            {/* mâchoire */}
            <mesh position={[0, -props.headR * 0.52, 0.012]} scale={[props.jawW * props.faceW, props.chin * 0.75, 0.92]}>
              <sphereGeometry args={[props.headR * 0.72, 14, 12]} />
              <meshStandardMaterial color={appearance.skin} roughness={0.6} />
            </mesh>
            {/* museau lycan */}
            {race.id === 'lycan' && (
              <group position={[0, -0.028, 0.075]} scale={appearance.racial.muzzleSize === 'discret' ? 0.7 : appearance.racial.muzzleSize === 'marque' ? 1.25 : 1}>
                <mesh scale={[1, 0.7, 1.4]}>
                  <sphereGeometry args={[0.05, 12, 10]} />
                  <meshStandardMaterial color={appearance.skin} roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.028, 0.06]}>
                  <sphereGeometry args={[0.016, 8, 8]} />
                  <meshStandardMaterial color="#1c1c1c" roughness={0.4} />
                </mesh>
                {appearance.racial.fangs !== 'discrets' && [-0.018, 0.018].map((x, i) => (
                  <mesh key={i} position={[x, -0.032, 0.05]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.006, appearance.racial.fangs === 'imposants' ? 0.035 : 0.022, 5]} />
                    <meshStandardMaterial color="#e8e0d0" roughness={0.5} />
                  </mesh>
                ))}
              </group>
            )}
            {/* yeux */}
            <Eye x={-0.035 - f.eyeDistance * 0.018} size={0.75 + f.eyeSize * 0.5} color={appearance.eyeColor} slit={race.id === 'drakeen' && appearance.racial.pupil === 'fente'} />
            <Eye x={0.035 + f.eyeDistance * 0.018} size={0.75 + f.eyeSize * 0.5} color={appearance.eyeColor} slit={race.id === 'drakeen' && appearance.racial.pupil === 'fente'} />
            {/* sourcils */}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * (0.038 + f.eyeDistance * 0.018), 0.045, 0.088]} rotation={[0, 0, side * -0.1]}>
                <boxGeometry args={[0.032, 0.006 + f.browThickness * 0.006, 0.008]} />
                <meshStandardMaterial color={hairColor} roughness={0.9} />
              </mesh>
            ))}
            {/* nez */}
            <mesh position={[0, -0.012, 0.095]} scale={[0.8, 0.55 + f.noseSize * 0.9, 0.6 + f.noseSize * 0.8]}>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color={appearance.skin} roughness={0.6} />
            </mesh>
            {/* bouche */}
            <mesh position={[0, -0.052 - f.chinLength * 0.008, 0.082]} scale={[0.6 + f.mouthWidth * 0.8, 0.35, 0.5]}>
              <sphereGeometry args={[0.016, 8, 6]} />
              <meshStandardMaterial color="#7c4a42" roughness={0.6} />
            </mesh>
            {/* masque (ninja) */}
            {maskDef && (
              <mesh position={[0, -0.045, 0.055]} scale={[props.faceW, 0.75, 1]}>
                <boxGeometry args={[props.headR * 1.75, props.headR * 0.85, props.headR * 1.05]} />
                <meshStandardMaterial color={maskDef.color} roughness={0.85} />
              </mesh>
            )}
            {/* oreilles */}
            <Ears race={race} earSize={f.earSize} appearance={appearance} />
            {/* cheveux */}
            <Hair appearance={appearance} />
            {/* barbe (nain) */}
            {race.id === 'nain' && <Beard style={appearance.racial.beard ?? 'aucune'} mustache={appearance.racial.mustache ?? 'aucune'} color={hairColor} skin={appearance.skin} />}
            {/* cornes + écailles + marques raciales */}
            <RacialMarks race={race} appearance={appearance} />
            {/* orbe / couronne astréenne */}
            {race.id === 'astreen' && appearance.racial.halo === 'orbe' && (
              <mesh position={[0, 0.16, 0]}>
                <sphereGeometry args={[0.022, 10, 10]} />
                <meshStandardMaterial color={appearance.racial.markColor ?? '#e8d040'} emissive={appearance.racial.markColor ?? '#e8d040'} emissiveIntensity={2.2} />
              </mesh>
            )}
          </group>
          {/* cou */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 0.07, 10]} />
            <meshStandardMaterial color={appearance.skin} roughness={0.6} />
          </mesh>
          {/* ouies abyssien */}
          {race.id === 'abyssien' && appearance.racial.fins === 'ouies' &&
            [-0.03, 0, 0.03].map((y, i) => (
              <mesh key={i} position={[0, 0.02 + y, 0.045]} scale={[1, 0.4, 0.4]}>
                <boxGeometry args={[0.03, 0.012, 0.01]} />
                <meshStandardMaterial color={appearance.racial.markColor ?? '#32e8d8'} emissive={appearance.racial.markColor ?? '#32e8d8'} emissiveIntensity={0.9} />
              </mesh>
            ))}
        </group>

        <Cape def={equipment.BACK} sway={capeRef} />
        <Tail race={race} appearance={appearance} tailRef={tailRef} />
      </group>
    </group>
  )
}
