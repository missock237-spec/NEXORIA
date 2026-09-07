'use client'

// NEXORIA — Monde 3D du village de départ
// Génération déterministe depuis l'ID du village : maisons, arbres, props, PNJ.
// Joueur : contrôles PC (ZQSD/WASD/flèches + souris + E) et Android (joystick virtuel).
// Caméra troisième personne, collisions simples, sécurité de zone.

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { EnterWorldResponse, NpcDef, VillageDef } from '@/lib/game/types'
import { AvatarModel } from './AvatarModel'
import { defaultAppearance } from '@/lib/game/stats'
import { RACES } from '@/lib/game/races'
import { CLASSES, EQUIPMENT_CATALOG } from '@/lib/game/classes'
import { playerInput, playerState } from '@/lib/game/runtime'
import { useCreatorStore } from '@/lib/store'

// ── RNG déterministe ──
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Layout {
  houses: { x: number; z: number; rot: number; w: number; d: number; h: number }[]
  trees: { x: number; z: number; s: number }[]
  obstacles: { x: number; z: number; r: number }[]
}

function generateLayout(village: VillageDef, treeDensity: number): Layout {
  const rand = mulberry32(hashStr(village.id))
  const houses: Layout['houses'] = []
  const trees: Layout['trees'] = []
  const obstacles: Layout['obstacles'] = []

  const blocked = (x: number, z: number, margin = 5) => {
    if (Math.hypot(x, z) < 7.5) return true // place centrale
    for (const sp of village.spawnPoints) if (Math.hypot(sp.x - x, sp.z - z) < margin) return true
    for (const n of village.npcs) if (Math.hypot(n.x - x, n.z - z) < 3.2) return true
    if (Math.hypot(x - 11, z - 7) < 3.2) return true // mannequin d'entraînement
    return false
  }

  // Maisons en anneau
  let tries = 0
  while (houses.length < 9 && tries < 200) {
    tries++
    const a = (houses.length / 9) * Math.PI * 2 + rand() * 0.5
    const r = 15 + rand() * 9
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (blocked(x, z)) continue
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 7.5)) continue
    const w = 2.8 + rand() * 1.2
    const d = 2.4 + rand()
    const h = 2 + rand() * 0.7
    houses.push({ x, z, rot: -a + Math.PI / 2 + (rand() - 0.5) * 0.4, w, d, h })
    obstacles.push({ x, z, r: 2.4 })
  }

  // Arbres : anneau extérieur + quelques intérieurs
  const outer = Math.floor(46 * treeDensity)
  for (let i = 0; i < outer; i++) {
    const a = rand() * Math.PI * 2
    const r = 26 + rand() * 20
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    trees.push({ x, z, s: 0.8 + rand() * 0.7 })
  }
  const inner = Math.floor(10 * treeDensity)
  let t2 = 0
  while (trees.length < outer + inner && t2 < 100) {
    t2++
    const x = (rand() - 0.5) * 44
    const z = (rand() - 0.5) * 44
    if (blocked(x, z, 3.5)) continue
    if (Math.abs(x) < 2.5 || Math.abs(z) < 2.5) continue // chemins
    if (houses.some((h) => Math.hypot(h.x - x, h.z - z) < 4)) continue
    trees.push({ x, z, s: 0.7 + rand() * 0.5 })
  }
  for (const t of trees) obstacles.push({ x: t.x, z: t.z, r: 0.55 })

  return { houses, trees, obstacles }
}

// ── Ciel dégradé ──
function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, top)
    g.addColorStop(1, bottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 2, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [top, bottom])
  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[140, 24, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} fog={false} />
    </mesh>
  )
}

// ── Terrain + chemins ──
function Terrain({ village }: { village: VillageDef }) {
  const sc = village.scenery
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={sc.groundColor} roughness={1} />
      </mesh>
      {/* chemins en croix */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[6, 110]} />
        <meshStandardMaterial color={sc.pathColor} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]}>
        <planeGeometry args={[110, 6]} />
        <meshStandardMaterial color={sc.pathColor} roughness={1} />
      </mesh>
      {/* place centrale */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <circleGeometry args={[7, 24]} />
        <meshStandardMaterial color={sc.pathColor} roughness={1} />
      </mesh>
    </group>
  )
}

// ── Maison ──
function House({ village, h }: { village: VillageDef; h: Layout['houses'][number] }) {
  const sc = village.scenery
  const style = sc.houseStyle
  const walls = style === 'stone' ? sc.houseColor : style === 'darkwood' ? '#4c4438' : style === 'troglodyte' ? sc.houseColor : sc.houseColor
  const isDome = style === 'troglodyte'
  const isTent = style === 'nomad'
  return (
    <group position={[h.x, 0, h.z]} rotation={[0, h.rot, 0]}>
      {isDome ? (
        <mesh position={[0, h.h / 2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[h.w * 0.62, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={walls} roughness={1} />
        </mesh>
      ) : isTent ? (
        <mesh position={[0, h.h * 0.8, 0]} castShadow>
          <coneGeometry args={[h.w * 0.7, h.h * 1.6, 8]} />
          <meshStandardMaterial color={walls} roughness={0.9} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, h.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[h.w, h.h, h.d]} />
            <meshStandardMaterial color={walls} roughness={0.9} />
          </mesh>
          <mesh position={[0, h.h + 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[Math.max(h.w, h.d) * 0.78, 1.15, 4]} />
            <meshStandardMaterial color={sc.roofColor} roughness={0.85} />
          </mesh>
        </>
      )}
      {/* porte */}
      <mesh position={[0, 0.75, h.d / 2 + 0.03]}>
        <boxGeometry args={[0.62, 1.5, 0.08]} />
        <meshStandardMaterial color="#3a2c1e" roughness={0.9} />
      </mesh>
      {/* fenêtres */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * h.w * 0.32, h.h * 0.6, h.d / 2 + 0.03]}>
          <boxGeometry args={[0.42, 0.42, 0.05]} />
          <meshStandardMaterial color="#ffd890" emissive="#ffb050" emissiveIntensity={0.55} />
        </mesh>
      ))}
    </group>
  )
}

// ── Arbre ──
function Tree({ village, x, z, s }: { village: VillageDef; x: number; z: number; s: number }) {
  const sc = village.scenery
  const style = sc.treeStyle
  const col = sc.treeColor
  if (style === 'none') return null
  return (
    <group position={[x, 0, z]} scale={s}>
      {style === 'pine' && (
        <>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 1.8, 7]} />
            <meshStandardMaterial color="#4a3826" roughness={1} />
          </mesh>
          {[1.6, 2.5, 3.3].map((y, i) => (
            <mesh key={i} position={[0, y, 0]} castShadow>
              <coneGeometry args={[1.15 - i * 0.28, 1.5, 8]} />
              <meshStandardMaterial color={col} roughness={1} />
            </mesh>
          ))}
        </>
      )}
      {style === 'oak' && (
        <>
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 2.1, 7]} />
            <meshStandardMaterial color="#4a3826" roughness={1} />
          </mesh>
          <mesh position={[0, 2.7, 0]} castShadow>
            <sphereGeometry args={[1.25, 9, 8]} />
            <meshStandardMaterial color={col} roughness={1} />
          </mesh>
          <mesh position={[0.6, 2.3, 0.3]} castShadow>
            <sphereGeometry args={[0.75, 8, 7]} />
            <meshStandardMaterial color={col} roughness={1} />
          </mesh>
        </>
      )}
      {style === 'dead' && (
        <>
          <mesh position={[0, 1.3, 0]} rotation={[0, 0, 0.06]} castShadow>
            <cylinderGeometry args={[0.09, 0.2, 2.6, 6]} />
            <meshStandardMaterial color={col} roughness={1} />
          </mesh>
          <mesh position={[0.35, 2.1, 0]} rotation={[0, 0, -0.7]}>
            <cylinderGeometry args={[0.04, 0.07, 1, 5]} />
            <meshStandardMaterial color={col} roughness={1} />
          </mesh>
        </>
      )}
      {style === 'crystal' && (
        <>
          <mesh position={[0, 1.1, 0]} rotation={[0, 0, 0.05]}>
            <coneGeometry args={[0.5, 2.4, 5]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.7} transparent opacity={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0.4, 0.7, 0.15]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[0.25, 1.2, 5]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} transparent opacity={0.8} roughness={0.2} />
          </mesh>
        </>
      )}
      {style === 'palm' && (
        <>
          <mesh position={[0, 1.5, 0]} rotation={[0, 0, 0.08]}>
            <cylinderGeometry args={[0.1, 0.16, 3, 6]} />
            <meshStandardMaterial color="#7c6244" roughness={1} />
          </mesh>
          {[...Array(5)].map((_, i) => {
            const a = (i / 5) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 0.7, 3 + Math.sin(a) * 0.2, Math.sin(a) * 0.7]} rotation={[0.5, -a, 0.4]} scale={[1, 0.25, 0.4]}>
                <sphereGeometry args={[0.8, 6, 5]} />
                <meshStandardMaterial color={col} roughness={1} />
              </mesh>
            )
          })}
        </>
      )}
      {style === 'mushroom' && (
        <>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.16, 0.22, 1, 7]} />
            <meshStandardMaterial color="#d8d0c0" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.1, 0]} scale={[1, 0.6, 1]}>
            <sphereGeometry args={[0.55, 10, 8]} />
            <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.8} roughness={0.6} />
          </mesh>
        </>
      )}
    </group>
  )
}

// ── Props de village ──
function VillageProps({ village }: { village: VillageDef }) {
  const sc = village.scenery
  return (
    <group>
      {/* puits central / feu de conseil selon thème */}
      {village.theme === 'wild' || village.theme === 'dark' ? (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.5, 0.6, 0.5, 10]} />
            <meshStandardMaterial color="#5c544a" roughness={1} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <coneGeometry args={[0.25, 0.5, 8]} />
            <meshStandardMaterial color="#ff9040" emissive="#ff7020" emissiveIntensity={1.6} />
          </mesh>
          <pointLight position={[0, 1.1, 0]} intensity={12} distance={12} color="#ff9040" />
        </group>
      ) : (
        <group position={[0, 0, -1.5]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.75, 1.1, 10]} />
            <meshStandardMaterial color="#8c8478" roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <coneGeometry args={[0.9, 0.7, 6]} />
            <meshStandardMaterial color={sc.roofColor} roughness={0.85} />
          </mesh>
        </group>
      )}

      {village.props.includes('totem') && (
        <group position={[-5.5, 0, -5]}>
          {[0, 0.7, 1.4].map((y, i) => (
            <mesh key={i} position={[0, y + 0.35, 0]} castShadow>
              <boxGeometry args={[0.5 - i * 0.08, 0.62, 0.5 - i * 0.08]} />
              <meshStandardMaterial color={['#7c5a3a', '#a87848', '#8c6b4a'][i]} roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}
      {village.props.includes('banner') &&
        [[3.2, -3.2], [-3.2, 3.2]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 3.2, 6]} />
              <meshStandardMaterial color="#4a3826" roughness={1} />
            </mesh>
            <mesh position={[0.3, 2.5, 0]}>
              <boxGeometry args={[0.6, 0.9, 0.03]} />
              <meshStandardMaterial color={sc.roofColor} roughness={0.85} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      {village.props.includes('lantern') &&
        [[5.8, 0], [-5.8, 0], [0, 5.8], [0, -5.8]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.04, 0.06, 2.6, 6]} />
              <meshStandardMaterial color="#3a342c" roughness={1} />
            </mesh>
            <mesh position={[0, 2.7, 0]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color="#ffd890" emissive="#ffb050" emissiveIntensity={2} />
            </mesh>
            <pointLight position={[0, 2.7, 0]} intensity={4} distance={7} color="#ffb050" />
          </group>
        ))}
      {village.props.includes('forge') && (
        <group position={[9.4, 0, -2]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.8, 1, 1.2]} />
            <meshStandardMaterial color="#5c5448" roughness={1} />
          </mesh>
          <mesh position={[0.5, 1.6, -0.2]}>
            <cylinderGeometry args={[0.18, 0.22, 1.4, 7]} />
            <meshStandardMaterial color="#4c4438" roughness={1} />
          </mesh>
          <mesh position={[-0.3, 1.15, 0.3]}>
            <coneGeometry args={[0.22, 0.4, 7]} />
            <meshStandardMaterial color="#ff9040" emissive="#ff7020" emissiveIntensity={1.8} />
          </mesh>
          <pointLight position={[-0.3, 1.3, 0.3]} intensity={6} distance={6} color="#ff7020" />
        </group>
      )}
      {village.props.includes('market') && (
        <group position={[7.5, 0, 3.5]} rotation={[0, -0.5, 0]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.7, 0.9, 0.8]} />
            <meshStandardMaterial color="#8c6b4a" roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.55, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[2, 0.06, 1.1]} />
            <meshStandardMaterial color="#a8422e" roughness={0.9} />
          </mesh>
        </group>
      )}
      {village.props.includes('barrel') &&
        [[6.4, -3.4], [6.9, -3.0]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.4, z]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.8, 9]} />
            <meshStandardMaterial color="#6b5236" roughness={0.95} />
          </mesh>
        ))}
      {village.props.includes('crystal') &&
        [[-8, 4], [-8.7, 4.6]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.8, z]} rotation={[0.1, i, -0.12]}>
            <coneGeometry args={[0.32, 1.7, 5]} />
            <meshStandardMaterial color="#a8c8e8" emissive="#88b8e8" emissiveIntensity={0.9} transparent opacity={0.85} roughness={0.2} />
          </mesh>
        ))}
      {village.props.includes('pond') && (
        <group position={[-16, 0.01, -13]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[4.5, 20]} />
            <meshStandardMaterial color="#3c6b7c" roughness={0.15} metalness={0.4} />
          </mesh>
        </group>
      )}
      {village.props.includes('egg') && (
        <mesh position={[-6, 0.5, 4]} scale={[1, 1.3, 1]} castShadow>
          <sphereGeometry args={[0.5, 10, 10]} />
          <meshStandardMaterial color="#c8a86b" roughness={0.5} />
        </mesh>
      )}
      {village.props.includes('flowers') &&
        [...Array(14)].map((_, i) => {
          const a = (i / 14) * Math.PI * 2
          const r = 9 + (i % 4) * 2
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.12, Math.sin(a) * r]}>
              <sphereGeometry args={[0.14, 6, 6]} />
              <meshStandardMaterial color={['#e8a0b8', '#f0d060', '#a0c8f0'][i % 3]} roughness={0.8} />
            </mesh>
          )
        })}
      {village.props.includes('hay') &&
        [[-10, 6], [-11, 6.8]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.55, z]} rotation={[0, i * 0.6, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 1.1, 8]} />
            <meshStandardMaterial color="#c8a850" roughness={1} />
          </mesh>
        ))}
      {village.props.includes('fence') &&
        [...Array(28)].map((_, i) => {
          const a = (i / 28) * Math.PI * 2
          const r = 30
          return (
            <mesh key={i} position={[Math.cos(a) * r, 0.6, Math.sin(a) * r]} rotation={[0, -a, 0]} castShadow>
              <boxGeometry args={[0.14, 1.2, 0.14]} />
              <meshStandardMaterial color="#5c4a34" roughness={1} />
            </mesh>
          )
        })}
    </group>
  )
}

// ── Mannequin d'entraînement ──
function TrainingDummy({ dummyRef }: { dummyRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={dummyRef} position={[11, 0, 7]}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 2, 7]} />
        <meshStandardMaterial color="#8c6b3a" roughness={1} />
      </mesh>
      <mesh position={[0, 1.55, 0]} scale={[1, 1.25, 0.7]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color="#c8a850" roughness={1} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.3, 6]} />
        <meshStandardMaterial color="#8c6b3a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.4, 0.45, 0.16, 9]} />
        <meshStandardMaterial color="#5c5448" roughness={1} />
      </mesh>
    </group>
  )
}

// ── Portail des Arènes (mise à jour « Arènes & Suprêmes ») ──
// Anneau runique qui pulse ; interagir ouvre le hub des 5 Arènes de Combat.
function ArenaPortal() {
  const ring = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ring.current) {
      const m = ring.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.35
      ring.current.rotation.z = t * 0.4
    }
    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.16 + Math.sin(t * 1.6) * 0.06
    }
  })
  return (
    <group position={[11, 0, -7]}>
      {/* Socle de pierre */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.7, 2, 0.24, 12]} />
        <meshStandardMaterial color="#4c4458" roughness={0.9} />
      </mesh>
      {/* Anneau runique vertical */}
      <mesh ref={ring} position={[0, 2.1, 0]}>
        <torusGeometry args={[1.35, 0.12, 10, 40]} />
        <meshStandardMaterial color="#3a3060" emissive="#b878f0" emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
      {/* Voile lumineux */}
      <mesh ref={glow} position={[0, 2.1, 0]}>
        <circleGeometry args={[1.28, 32]} />
        <meshBasicMaterial color="#c898ff" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      {/* Deux oriflammes d'arène */}
      {[[-1.8, 0], [1.8, 0]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 3, 6]} />
            <meshStandardMaterial color="#4a4038" roughness={1} />
          </mesh>
          <mesh position={[0.3, 2.5, 0]}>
            <planeGeometry args={[0.62, 1.1]} />
            <meshStandardMaterial color="#b878f0" side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      ))}
      <Html center distanceFactor={12} position={[0, 3.9, 0]} zIndexRange={[20, 0]}>
        <div className="whitespace-nowrap rounded-sm bg-[#0c0a14e0] px-2.5 py-1 text-center text-[13px] font-black text-[#e0c8ff] shadow" style={{ border: '1px solid #b878f088' }}>
          Arènes de Combat
          <div className="text-[9px] font-semibold uppercase tracking-widest text-[#b878f0]">5 arènes · 10 Suprêmes</div>
        </div>
      </Html>
    </group>
  )
}

// ── PNJ ──
function npcAppearance(npc: NpcDef, index: number) {
  const raceIds = Object.keys(RACES)
  const race = RACES[raceIds[index % raceIds.length]]
  const app = defaultAppearance(race.id)
  app.skin = race.morphology.skinTones[(hashStr(npc.id) + index) % race.morphology.skinTones.length]
  app.hair.color = race.morphology.hairColors[(hashStr(npc.id) >> 3) % race.morphology.hairColors.length]
  app.hair.style = race.morphology.hairStyles[(hashStr(npc.id) >> 5) % race.morphology.hairStyles.length]
  return { race, app }
}

function Npc({ npc, index }: { npc: NpcDef; index: number }) {
  const { race, app } = useMemo(() => npcAppearance(npc, index), [npc, index])
  const outfit = useMemo(
    () => ({
      TORSO: { id: 'npc_torso', name: 'Tenue', slot: 'TORSO', visual: npc.role === 'garde' ? 'heavy_armor' : npc.role === 'marchand' ? 'robe' : 'light_armor', color: npc.color, description: '' },
      FEET: { id: 'npc_boots', name: 'Bottes', slot: 'FEET', visual: 'boots', color: '#3a2c1e', description: '' },
    }),
    [npc]
  )
  return (
    <group position={[npc.x, 0, npc.z]} rotation={[0, Math.atan2(-npc.x, -npc.z), 0]}>
      <AvatarModel race={race} appearance={app} equipment={outfit} animated moveAmount={0} />
      <Html center distanceFactor={11} position={[0, 2.35, 0]} zIndexRange={[20, 0]}>
        <div className="whitespace-nowrap rounded-sm bg-[#0c0a14e0] px-2.5 py-1 text-center text-[13px] font-bold text-[#f0e8d8] shadow" style={{ border: '1px solid #b8985c66' }}>
          {npc.name}
          <div className="text-[9px] font-semibold uppercase tracking-widest text-[#d4b878]">{npc.role}</div>
        </div>
      </Html>
    </group>
  )
}

// ── Joueur + caméra + contrôles ──
function PlayerController({ world }: { world: EnterWorldResponse }) {
  const { village, character, spawn } = world
  const quality = useCreatorStore((s) => s.quality)
  const layout = useMemo(() => generateLayout(village, quality.treeDensity), [village, quality.treeDensity])
  const group = useRef<THREE.Group>(null)
  const cam = useRef({ yaw: Math.atan2(-spawn.x, -spawn.z) + Math.PI, pitch: 0.42, dist: 5.6 })
  const vel = useRef(new THREE.Vector3())
  const moveRef = useRef(0)
  const { camera, gl } = useThree()

  // Hook de test (window.__nx) : orienter la caméra du village
  useEffect(() => {
    const nx = (window as unknown as { __nx?: Record<string, unknown> }).__nx
    if (nx) nx.setVillageCam = (yaw: number) => { cam.current.yaw = yaw }
    return () => { if (nx) delete nx.setVillageCam }
  }, [])

  const raceDef = RACES[character.race as keyof typeof RACES]
  const equipMap = useMemo(() => {
    const m: Record<string, never> = {}
    for (const [slot, id] of Object.entries(character.equipment)) {
      const def = EQUIPMENT_CATALOG[id]
      if (def) m[slot] = def as never
    }
    return m
  }, [character.equipment])

  // Clavier PC (e.code = position physique → ZQSD sur AZERTY et WASD sur QWERTY gérés)
  useEffect(() => {
    const keys = new Set<string>()
    const apply = () => {
      let x = 0
      let z = 0
      if (keys.has('KeyW')) z -= 1
      if (keys.has('KeyS')) z += 1
      if (keys.has('KeyA')) x -= 1
      if (keys.has('KeyD')) x += 1
      if (keys.has('ArrowUp')) z -= 1
      if (keys.has('ArrowDown')) z += 1
      if (keys.has('ArrowLeft')) x -= 1
      if (keys.has('ArrowRight')) x += 1
      playerInput.x = x
      playerInput.z = z
      playerInput.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight')
    }
    const down = (e: KeyboardEvent) => { keys.add(e.code); apply() }
    const up = (e: KeyboardEvent) => { keys.delete(e.code); apply() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      keys.clear()
      playerInput.x = 0
      playerInput.z = 0
    }
  }, [])

  // Souris / tactile : rotation caméra par glissement
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lastX = 0
    let lastY = 0
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      cam.current.yaw -= (e.clientX - lastX) * 0.0052
      cam.current.pitch = Math.min(1.05, Math.max(0.12, cam.current.pitch + (e.clientY - lastY) * 0.0032))
      lastX = e.clientX
      lastY = e.clientY
    }
    const up = () => { dragging = false }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])

  const interactables = useMemo(
    () => village.npcs.map((n) => ({ type: 'npc' as const, id: n.id, name: n.name, role: n.role, x: n.x, z: n.z })),
    [village.npcs]
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const g = group.current
    if (!g) return
    const ix = playerInput.x
    const iz = playerInput.z
    const mag = Math.hypot(ix, iz)
    const yaw = cam.current.yaw
    const speed = (playerInput.sprint ? 7.2 : 4.1) * Math.min(1, mag)

    if (mag > 0.05) {
      // Direction relative à la caméra
      const dirX = ix * Math.cos(yaw) - iz * Math.sin(yaw)
      const dirZ = ix * Math.sin(yaw) + iz * Math.cos(yaw)
      const len = Math.hypot(dirX, dirZ) || 1
      vel.current.set((dirX / len) * speed, 0, (dirZ / len) * speed)
    } else {
      vel.current.multiplyScalar(0.82)
    }

    const next = g.position.clone().addScaledVector(vel.current, dt)

    // Collisions cercle-cercle + limites du village
    for (const o of layout.obstacles) {
      const dx = next.x - o.x
      const dz = next.z - o.z
      const d = Math.hypot(dx, dz)
      const min = o.r + 0.42
      if (d < min && d > 0.0001) {
        next.x = o.x + (dx / d) * min
        next.z = o.z + (dz / d) * min
      }
    }
    const r = Math.hypot(next.x, next.z)
    if (r > 46) {
      next.x = (next.x / r) * 46
      next.z = (next.z / r) * 46
    }
    g.position.copy(next)

    // Orientation vers la direction de déplacement
    if (mag > 0.05) {
      const targetRot = Math.atan2(vel.current.x, vel.current.z)
      let diff = targetRot - g.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      g.rotation.y += diff * Math.min(1, dt * 11)
    }

    // Caméra 3e personne
    const cy = cam.current.yaw
    const cp = cam.current.pitch
    const dist = cam.current.dist
    const camTarget = new THREE.Vector3(g.position.x, g.position.y + 1.45, g.position.z)
    const camPos = new THREE.Vector3(
      camTarget.x + Math.sin(cy) * Math.cos(cp) * dist,
      camTarget.y + Math.sin(cp) * dist,
      camTarget.z + Math.cos(cy) * Math.cos(cp) * dist
    )
    camera.position.lerp(camPos, Math.min(1, dt * 7))
    camera.lookAt(camTarget)

    // État partagé pour l'UI
    playerState.x = g.position.x
    playerState.z = g.position.z
    playerState.moving = mag > 0.05
    moveRef.current = mag > 0.05 ? Math.min(1, mag) : Math.max(0, moveRef.current - dt * 6)
    let best: typeof playerState.near = null
    let bestD = 2.9
    for (const it of interactables) {
      const d = Math.hypot(it.x - g.position.x, it.z - g.position.z)
      if (d < bestD) {
        bestD = d
        best = { type: 'npc', id: it.id, name: it.name, role: it.role }
      }
    }
    const dd = Math.hypot(11 - g.position.x, 7 - g.position.z)
    if (dd < bestD) {
      best = { type: 'dummy', id: 'mannequin', name: 'Mannequin d’entraînement' }
    }
    // Portail des Arènes
    const dp = Math.hypot(11 - g.position.x, -7 - g.position.z)
    if (dp < bestD) {
      best = { type: 'arena_portal', id: 'arena_portal', name: 'Arènes de Combat' }
    }
    playerState.near = best
  })

  return (
    <group ref={group} position={[spawn.x, 0, spawn.z]}>
      <AvatarModel race={raceDef} appearance={character.appearance} equipment={equipMap} animated moveRef={moveRef} />
    </group>
  )
}

// ── Scène principale ──
export function VillageWorld({ world }: { world: EnterWorldResponse }) {
  const village = world.village
  const quality = useCreatorStore((s) => s.quality)
  const dummyRef = useRef<THREE.Group>(null)
  const sc = village.scenery

  return (
    <Canvas
      shadows={quality.shadows}
      dpr={quality.dpr}
      camera={{ position: [0, 3.4, 8], fov: 52 }}
      gl={{ antialias: quality.antialias }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={[sc.skyBottom]} />
      <fog attach="fog" args={[sc.fogColor, 34, 120]} />
      <hemisphereLight args={[sc.skyTop, sc.groundColor, 1.05]} />
      <directionalLight
        position={[28, 42, 18]}
        intensity={1.9}
        color={sc.lightColor}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-far={130}
      />
      <SkyDome top={sc.skyTop} bottom={sc.skyBottom} />
      <Suspense fallback={null}>
        <Terrain village={village} />
        <VillageProps village={village} />
        <TrainingDummy dummyRef={dummyRef} />
        <ArenaPortal />
        {village.npcs.map((n, i) => (
          <Npc key={n.id} npc={n} index={i} />
        ))}
        <PlayerController world={world} />
        {quality.particles > 0 && (village.theme === 'celestial' || village.theme === 'dark') && (
          <Sparkles count={quality.particles} scale={[80, 14, 80]} position={[0, 7, 0]} size={2.2} speed={0.3} color={village.theme === 'celestial' ? '#e8d8b0' : '#8c5aa8'} />
        )}
      </Suspense>
    </Canvas>
  )
}
