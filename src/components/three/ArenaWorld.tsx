'use client'

// NEXORIA — Arène 3D : les 5 Arènes de Combat (mise à jour officielle)
// Environnements procéduraux fidèles à l'affiche :
//   1. Sommets Célestes — îles flottantes, plateformes mobiles, vents puissants
//   2. Volcan — sol instable, geysers de lave, chaleur extrême
//   3. Forêt Éternelle — zones de camouflage, pièges naturels
//   4. Ruines Anciennes — obstacles mobiles, pièges, illusions
//   5. Glaces Éternelles — sol glissant, tempêtes de neige
// Duel temps réel : joueur vs gladiateur IA (stats fournies par le serveur).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { AvatarModel } from './AvatarModel'
import { defaultAppearance } from '@/lib/game/stats'
import { RACES } from '@/lib/game/races'
import { getClass, getStartingEquipment } from '@/lib/game/classes'
import type { Appearance, RaceDef } from '@/lib/game/types'
import { playerInput, arenaCombat, combatActions, requestAttack } from '@/lib/game/runtime'
import type { ActiveMatch } from '@/lib/store'
import { useCreatorStore } from '@/lib/store'

const ARENA_RADIUS = 15

// ── RNG déterministe (graine du duel fournie par le serveur) ──
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
    <mesh>
      <sphereGeometry args={[160, 24, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}

// ══════════════════════════════════════════════════════════════
// DÉCORS D'ARÈNE (un composant par thème, fidèle à l'affiche)
// ══════════════════════════════════════════════════════════════

function ArenaFloor({ ground, ring, accent }: { ground: string; ring: string; accent: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS, 48]} />
        <meshStandardMaterial color={ground} roughness={0.85} />
      </mesh>
      {/* Motif circulaire central (vue de dessus de l'affiche) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[9.6, 10, 48]} />
        <meshStandardMaterial color={ring} roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.4, 4.9, 40]} />
        <meshStandardMaterial color={ring} roughness={0.7} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={`dot${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[Math.cos((i / 4) * Math.PI * 2) * 7.2, 0.015, Math.sin((i / 4) * Math.PI * 2) * 7.2]}
        >
          <circleGeometry args={[0.55, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* Liseré de bordure */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 0.5, ARENA_RADIUS, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} />
      </mesh>
    </group>
  )
}

function Banners({ accent, positions }: { accent: string; positions: [number, number][] }) {
  return (
    <>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 3.2, 6]} />
            <meshStandardMaterial color="#4a4038" roughness={1} />
          </mesh>
          <mesh position={[0.42, 2.6, 0]}>
            <planeGeometry args={[0.8, 1.5]} />
            <meshStandardMaterial color={accent} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// 1 — SOMMETS CÉLESTES : îles flottantes, nuages, plateformes mobiles
function CelestialEnv({ quality }: { quality: { particles: number; treeDensity: number } }) {
  const islands = useMemo(() => {
    const rand = mulberry32(7001)
    return [...Array(9)].map(() => {
      const a = rand() * Math.PI * 2
      const r = 26 + rand() * 24
      return { x: Math.cos(a) * r, y: 2 + rand() * 10, z: Math.sin(a) * r, s: 2 + rand() * 3.5 }
    })
  }, [])
  const plat1 = useRef<THREE.Group>(null)
  const plat2 = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (plat1.current) {
      plat1.current.position.y = 1.1 + Math.sin(t * 0.7) * 0.45
      plat1.current.position.x = Math.sin(t * 0.35) * 5.5
    }
    if (plat2.current) {
      plat2.current.position.y = 1.1 + Math.cos(t * 0.6) * 0.45
      plat2.current.position.x = -Math.sin(t * 0.35) * 5.5
    }
  })
  return (
    <group>
      {/* Plateformes mobiles (particularité officielle) */}
      <group ref={plat1} position={[5.5, 1.1, -6]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.7, 1.3, 0.35, 10]} />
          <meshStandardMaterial color="#e8e0c8" roughness={0.6} />
        </mesh>
      </group>
      <group ref={plat2} position={[-5.5, 1.1, 6]}>
        <mesh castShadow>
          <cylinderGeometry args={[1.7, 1.3, 0.35, 10]} />
          <meshStandardMaterial color="#e8e0c8" roughness={0.6} />
        </mesh>
      </group>
      {/* Îles flottantes avec cascades suggérées */}
      {islands.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} scale={p.s}>
          <mesh>
            <coneGeometry args={[1, 1.6, 7]} />
            <meshStandardMaterial color="#8c7a68" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 0.75, 0]}>
            <cylinderGeometry args={[1.02, 0.9, 0.3, 7]} />
            <meshStandardMaterial color="#7ca85c" roughness={1} />
          </mesh>
        </group>
      ))}
      {/* Nuages */}
      {[
        [30, 8, -20], [-28, 6, 24], [10, 12, 34], [-18, 10, -30], [38, 5, 8],
      ].map(([x, y, z], i) => (
        <group key={`c${i}`} position={[x, y, z]}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[j * 2.4 - 2.4, (i % 2) * 0.5, j * 0.8]}>
              <sphereGeometry args={[1.8 + (j % 2) * 0.7, 10, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.85} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
      <Banners accent="#4a90d8" positions={[[-13, 0], [13, 0], [0, -13]]} />
      {quality.particles > 0 && <Sparkles count={quality.particles} scale={40} size={3} speed={0.4} color="#ffffff" position={[0, 6, 0]} />}
    </group>
  )
}

// 2 — VOLCAN : volcan actif, lave, geysers (gérés par la logique de combat)
function VolcanoEnv({ quality }: { quality: { particles: number } }) {
  return (
    <group>
      {/* Volcan en toile de fond */}
      <group position={[0, 0, -55]}>
        <mesh position={[0, 12, 0]}>
          <coneGeometry args={[34, 30, 9]} />
          <meshStandardMaterial color="#3a2a22" flatShading roughness={1} />
        </mesh>
        <mesh position={[0, 28.2, 0]}>
          <cylinderGeometry args={[5.4, 7, 3.4, 9]} />
          <meshStandardMaterial color="#f06018" emissive="#f04808" emissiveIntensity={1.4} />
        </mesh>
        {/* Coule de lave */}
        <mesh position={[4, 14, 12]} rotation={[0.35, 0, 0.15]}>
          <boxGeometry args={[4, 1.2, 26]} />
          <meshStandardMaterial color="#f06018" emissive="#e84808" emissiveIntensity={1.1} />
        </mesh>
      </group>
      {/* Anneau de lave autour de la plateforme */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <ringGeometry args={[ARENA_RADIUS + 1.2, ARENA_RADIUS + 9, 48]} />
        <meshStandardMaterial color="#f06018" emissive="#e84808" emissiveIntensity={1.2} />
      </mesh>
      {/* Rochers et piliers de basalte */}
      {[[10, -9], [-11, 8], [-9, -11], [12, 10]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.1, z]} rotation={[0.08 * i, i, 0.05]}>
          <cylinderGeometry args={[0.7, 1, 2.2, 6]} />
          <meshStandardMaterial color="#3c3028" roughness={1} flatShading />
        </mesh>
      ))}
      {/* Chaînes (comme sur l'affiche) */}
      {[-60, -20, 20, 60].map((deg, i) => {
        const a = (deg * Math.PI) / 180
        return (
          <mesh key={`ch${i}`} position={[Math.cos(a) * (ARENA_RADIUS + 5), 3, Math.sin(a) * (ARENA_RADIUS + 5)]} rotation={[0, -a, 0.5]}>
            <torusGeometry args={[4.2, 0.12, 6, 24, Math.PI]} />
            <meshStandardMaterial color="#28201c" roughness={0.9} />
          </mesh>
        )
      })}
      {quality.particles > 0 && <Sparkles count={quality.particles} scale={36} size={4} speed={1.6} color="#ff8838" position={[0, 4, 0]} />}
    </group>
  )
}

// 3 — FORÊT ÉTERNELLE : arbre géant, végétation luxuriante
function ForestEnv({ quality }: { quality: { particles: number; treeDensity: number } }) {
  const trees = useMemo(() => {
    const rand = mulberry32(7003)
    return [...Array(Math.floor(34 * quality.treeDensity))].map(() => {
      const a = rand() * Math.PI * 2
      const r = ARENA_RADIUS + 2.5 + rand() * 14
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.9 + rand() * 1.4 }
    })
  }, [quality.treeDensity])
  return (
    <group>
      {/* Arche de l'arbre ancestral (comme sur l'affiche) */}
      <group position={[0, 0, -24]}>
        <mesh position={[0, 7, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[1.3, 2.4, 15, 8]} />
          <meshStandardMaterial color="#5c4a34" roughness={1} />
        </mesh>
        <mesh position={[2.5, 14.5, 0]} rotation={[0, 0, -0.7]}>
          <cylinderGeometry args={[0.5, 0.9, 9, 7]} />
          <meshStandardMaterial color="#5c4a34" roughness={1} />
        </mesh>
        <mesh position={[-3, 15.5, 0]} rotation={[0, 0, 0.8]}>
          <cylinderGeometry args={[0.45, 0.85, 8, 7]} />
          <meshStandardMaterial color="#5c4a34" roughness={1} />
        </mesh>
        <mesh position={[0, 19, 0]}>
          <sphereGeometry args={[8.5, 12, 10]} />
          <meshStandardMaterial color="#4a7c38" roughness={1} flatShading />
        </mesh>
        <mesh position={[4, 17.4, 2]}>
          <sphereGeometry args={[5, 10, 8]} />
          <meshStandardMaterial color="#588c40" roughness={1} flatShading />
        </mesh>
      </group>
      {/* Ring forestier */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.22, 0.34, 2.8, 6]} />
            <meshStandardMaterial color="#4c3a28" roughness={1} />
          </mesh>
          <mesh position={[0, 3.6, 0]}>
            <sphereGeometry args={[1.7, 8, 7]} />
            <meshStandardMaterial color="#3f7034" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
      {/* Zones de camouflage : nappes de brume verdoyante */}
      {[[-6, 4], [7, 5], [0, -8]].map(([x, z], i) => (
        <mesh key={`f${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.09, z]}>
          <circleGeometry args={[2.6, 20]} />
          <meshBasicMaterial color="#9ad890" transparent opacity={0.28} />
        </mesh>
      ))}
      {/* Fleurs lumineuses */}
      {quality.particles > 0 && (
        <Sparkles count={quality.particles} scale={34} size={3} speed={0.25} color="#c8f0a8" position={[0, 3, 0]} />
      )}
      <Banners accent="#58b848" positions={[[-13.5, 3], [13.5, -3]]} />
    </group>
  )
}

// 4 — RUINES ANCIENNES : colonnes brisées, brume violette, obstacle rotatif
function RuinsEnv({ quality }: { quality: { particles: number } }) {
  const arm = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.y = clock.getElapsedTime() * 0.85
  })
  const columns = useMemo(() => {
    const rand = mulberry32(7004)
    return [...Array(12)].map((_, i) => {
      const a = (i / 12) * Math.PI * 2
      const r = ARENA_RADIUS - 1.2
      const broken = rand() > 0.5
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: broken ? 1.4 + rand() * 1.6 : 3.6 + rand() * 0.8 }
    })
  }, [])
  return (
    <group>
      {/* Colonnes en cercle (comme sur l'affiche) */}
      {columns.map((c, i) => (
        <mesh key={i} position={[c.x, c.h / 2, c.z]}>
          <cylinderGeometry args={[0.42, 0.5, c.h, 9]} />
          <meshStandardMaterial color="#8c8474" roughness={1} />
        </mesh>
      ))}
      {/* Pièce centrale : pilier + bras rotatif (obstacle mobile officiel) */}
      <group ref={arm} position={[0, 0, 0]}>
        <mesh position={[7, 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <boxGeometry args={[0.9, 14, 0.9]} />
          <meshStandardMaterial color="#6b6458" roughness={1} />
        </mesh>
      </group>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.9, 1.2, 2.8, 8]} />
        <meshStandardMaterial color="#544e44" roughness={1} />
      </mesh>
      {/* Décombres flottants (mystère) */}
      {[[6, 3.2, -5], [-7, 4, 3], [3, 5, 7], [-4, 3.6, -7]].map(([x, y, z], i) => (
        <mesh key={`r${i}`} position={[x, y, z]} rotation={[i, i * 0.7, i * 0.3]}>
          <boxGeometry args={[0.6, 0.5, 0.7]} />
          <meshStandardMaterial color="#7c7468" roughness={1} />
        </mesh>
      ))}
      {/* Brume violette (illusions) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[6, ARENA_RADIUS - 2, 48]} />
        <meshBasicMaterial color="#a858d8" transparent opacity={0.07} />
      </mesh>
      {quality.particles > 0 && <Sparkles count={quality.particles} scale={30} size={3} speed={0.5} color="#c898e8" position={[0, 3, 0]} />}
      <Banners accent="#a858d8" positions={[[-14, 6], [14, -6]]} />
    </group>
  )
}

// 5 — GLACES ÉTERNELLES : pics de glace, aurore, neige
function IceEnv({ quality }: { quality: { particles: number } }) {
  const aurora = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (aurora.current) {
      const m = aurora.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.16 + Math.sin(clock.getElapsedTime() * 0.8) * 0.08
    }
  })
  const spikes = useMemo(() => {
    const rand = mulberry32(7005)
    return [...Array(16)].map(() => {
      const a = rand() * Math.PI * 2
      const r = ARENA_RADIUS + 3 + rand() * 12
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, s: 1.2 + rand() * 3.2 }
    })
  }, [])
  return (
    <group>
      {/* Aurore polaire */}
      <mesh ref={aurora} position={[0, 22, -30]} rotation={[-0.5, 0, 0.2]}>
        <planeGeometry args={[120, 26]} />
        <meshBasicMaterial color="#58e8c8" transparent opacity={0.2} side={THREE.DoubleSide} fog={false} />
      </mesh>
      {/* Pics de glace */}
      {spikes.map((s, i) => (
        <mesh key={i} position={[s.x, (s.s * 2.2) / 2, s.z]}>
          <coneGeometry args={[s.s * 0.55, s.s * 2.2, 6]} />
          <meshStandardMaterial color="#b8ddef" emissive="#68b8d8" emissiveIntensity={0.18} transparent opacity={0.92} roughness={0.25} flatShading />
        </mesh>
      ))}
      {/* Montagnes lointaines */}
      {[[-45, -50], [10, -58], [48, -45]].map(([x, z], i) => (
        <mesh key={`m${i}`} position={[x, 10, z]}>
          <coneGeometry args={[22, 26, 6]} />
          <meshStandardMaterial color="#dceefc" flatShading roughness={0.9} />
        </mesh>
      ))}
      {/* Sol glissant : reflet bleuté */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[ARENA_RADIUS - 0.6, 48]} />
        <meshBasicMaterial color="#9ed4ee" transparent opacity={0.16} />
      </mesh>
      {quality.particles > 0 && <Sparkles count={quality.particles * 2} scale={44} size={2.4} speed={1.2} color="#ffffff" position={[0, 8, 0]} />}
      <Banners accent="#58c8e8" positions={[[-13, 0], [13, 0]]} />
    </group>
  )
}

// ══════════════════════════════════════════════════════════════
// APPARENCE DU GLADIATEUR (déterministe : race + classe serveur)
// ══════════════════════════════════════════════════════════════
function gladiatorAppearance(raceId: string, classId: string, seed: number): { race: RaceDef; appearance: Appearance; equipment: Record<string, import('@/lib/game/types').EquipmentDef> } {
  const race = RACES[raceId as keyof typeof RACES] ?? RACES.humain
  const app = defaultAppearance(race.id)
  const rand = mulberry32(seed)
  const m = race.morphology
  app.skin = m.skinTones[Math.floor(rand() * m.skinTones.length)]
  app.hair.color = m.hairColors[Math.floor(rand() * m.hairColors.length)]
  app.hair.style = m.hairStyles[Math.floor(rand() * m.hairStyles.length)]
  app.eyeColor = m.eyeColors[Math.floor(rand() * m.eyeColors.length)]
  const eq: Record<string, import('@/lib/game/types').EquipmentDef> = {}
  const cls = getClass(classId)
  if (cls) {
    for (const id of cls.startingEquipment) {
      const item = getStartingEquipment(cls.id).find((e) => e.id === id)
      if (item) eq[item.slot] = item
    }
  }
  return { race, appearance: app, equipment: eq }
}

// ══════════════════════════════════════════════════════════════
// LOGIQUE DE DUEL (joueurs + IA + dangers d'arène)
// ══════════════════════════════════════════════════════════════

interface DuelStats {
  playerMaxHp: number
  playerAtk: number
  playerDef: number
  oppMaxHp: number
  oppAtk: number
  oppDef: number
}

interface HazardSpot {
  x: number
  z: number
  t: number // temps d'activation (s d'horloge du duel)
  stage: 0 | 1 | 2 // 0=annonce, 1=éruption, 2=fini
}

// Proxy d'animation de marche pour l'IA (avance quand il poursuit)
const aiMoveProxy = { current: 0 }

function DuelActors({ match, onEnd }: { match: ActiveMatch; onEnd: (result: 'win' | 'loss') => void }) {
  const { worldConfig } = useCreatorStore()
  const activeWorld = useCreatorStore((s) => s.activeWorld)
  const quality = useCreatorStore((s) => s.quality)
  const arenaId = match.arena.id

  // Avatars
  const playerRace = (worldConfig?.races.find((r) => r.id === activeWorld?.character.race) ?? null) as RaceDef | null
  const playerApp = activeWorld?.character.appearance ?? null
  const playerEq = useMemo(() => {
    if (!activeWorld || !worldConfig) return {}
    const map: Record<string, import('@/lib/game/types').EquipmentDef> = {}
    for (const [, id] of Object.entries(activeWorld.character.equipment)) {
      const item = worldConfig.equipment.find((e) => e.id === id)
      if (item) map[item.slot] = item as import('@/lib/game/types').EquipmentDef
    }
    return map
  }, [activeWorld, worldConfig])

  const glad = useMemo(
    () => gladiatorAppearance(match.opponent.race, match.opponent.class, match.seed),
    [match]
  )

  // Stats serveur
  const stats = useRef<DuelStats>({
    playerMaxHp: activeWorld?.character.stats.maxHp ?? 100,
    playerAtk: activeWorld?.character.stats.attaquePhysique ?? 10,
    playerDef: activeWorld?.character.stats.defense ?? 2,
    oppMaxHp: match.opponent.stats.maxHp,
    oppAtk: match.opponent.stats.attaque,
    oppDef: match.opponent.stats.defense,
  })

  // Réfs de groupe
  const playerG = useRef<THREE.Group>(null)
  const oppG = useRef<THREE.Group>(null)
  const cam = useRef({ yaw: 0, pitch: 0.38, dist: 6.4 })
  const vel = useRef({ px: 0, pz: 0 }) // inertie (glace)
  const playerPos = useRef(new THREE.Vector3(0, 0, 6))
  const oppPos = useRef(new THREE.Vector3(0, 0, -6))
  const moveRef = useRef(0)
  const { camera, gl } = useThree()

  // IA du gladiateur
  const ai = useRef({
    state: 'chase' as 'chase' | 'windup' | 'strike' | 'recover' | 'strafe',
    timer: 0,
    strafeDir: 1,
    rand: mulberry32(match.seed),
  })

  // Dangers d'arène
  const hazards = useRef({
    spots: [] as HazardSpot[],
    nextSpawn: 4,
    wind: { active: false, dir: new THREE.Vector2(), until: 0, next: 9 },
    storm: { active: false, until: 0, next: 14 },
    time: 0,
  })
  const telegraphRefs = useRef<Map<number, THREE.Mesh>>(new Map())
  const [spotsView, setSpotsView] = useState<{ id: number; x: number; z: number; stage: number }[]>([])

  // Initialisation du combat
  useEffect(() => {
    arenaCombat.playerHp = stats.current.playerMaxHp
    arenaCombat.playerMaxHp = stats.current.playerMaxHp
    arenaCombat.oppHp = stats.current.oppMaxHp
    arenaCombat.oppMaxHp = stats.current.oppMaxHp
    arenaCombat.running = true
    arenaCombat.over = false
    arenaCombat.result = null
    arenaCombat.elapsed = 0
    const t = setTimeout(() => setSpotsView([]), 100)
    return () => {
      clearTimeout(t)
      arenaCombat.running = false
    }
  }, [match])

  // Souris : orbite caméra ; clic : attaque (PC)
  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let lx = 0
    let ly = 0
    const down = (e: PointerEvent) => {
      if (e.button === 2) return
      dragging = true
      lx = e.clientX
      ly = e.clientY
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      cam.current.yaw -= (e.clientX - lx) * 0.0052
      cam.current.pitch = Math.max(0.08, Math.min(1.15, cam.current.pitch + (e.clientY - ly) * 0.0038))
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

  const damagePlayer = useCallback((amount: number) => {
    const d = Math.max(3, Math.round(amount - stats.current.playerDef * 0.2))
    arenaCombat.playerHp = Math.max(0, arenaCombat.playerHp - d)
    arenaCombat.playerHitFlash = Date.now()
    if (arenaCombat.playerHp <= 0 && !arenaCombat.over) {
      arenaCombat.over = true
      arenaCombat.result = 'loss'
      onEnd('loss')
    }
  }, [onEnd])

  const damageOpp = useCallback((amount: number) => {
    const r = Math.random()
    const d = Math.max(5, Math.round((amount * (0.85 + r * 0.3)) - stats.current.oppDef * 0.25))
    arenaCombat.oppHp = Math.max(0, arenaCombat.oppHp - d)
    arenaCombat.oppHitFlash = Date.now()
    arenaCombat.comboHits++
    if (arenaCombat.oppHp <= 0 && !arenaCombat.over) {
      arenaCombat.over = true
      arenaCombat.result = 'win'
      onEnd('win')
    }
  }, [onEnd])

  const spawnHazard = useCallback((px: number, pz: number, ox: number, oz: number, rand: () => number) => {
    const h = hazards.current
    // Cible : position prévisible du joueur ou de l'adversaire (léger lead)
    const targetPlayer = rand() > 0.45
    const bx = targetPlayer ? px + px * 0.12 : ox
    const bz = targetPlayer ? pz + pz * 0.12 : oz
    const a = rand() * Math.PI * 2
    const dist = 1 + rand() * 3.2
    const x = THREE.MathUtils.clamp(bx + Math.cos(a) * dist, -ARENA_RADIUS + 1.5, ARENA_RADIUS - 1.5)
    const z = THREE.MathUtils.clamp(bz + Math.sin(a) * dist, -ARENA_RADIUS + 1.5, ARENA_RADIUS - 1.5)
    const id = Date.now() + Math.floor(rand() * 9999)
    h.spots.push({ x, z, t: h.time, stage: 0, id } as HazardSpot & { id: number })
    setSpotsView((v) => [...v.slice(-3), { id, x, z, stage: 0 }])
  }, [])

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    if (!arenaCombat.running || arenaCombat.over) {
      // Fin de duel : les avatars se figent, caméra s'éloigne légèrement
      if (playerG.current) {
        camera.position.lerp(new THREE.Vector3(playerPos.current.x - 4, 6.5, playerPos.current.z + 9), 0.03)
        camera.lookAt(playerPos.current.x, 1.2, playerPos.current.z)
      }
      return
    }
    arenaCombat.elapsed += dt
    const h = hazards.current
    h.time += dt

    // ── Déplacement joueur (ZQSD/joystick relatif caméra) ──
    const slippery = arenaId === 'glaces_eternelles'
    const inputLen = Math.hypot(playerInput.x, playerInput.z)
    const speed = (playerInput.sprint ? 9.2 : 6.2) * (h.storm.active && arenaId === 'glaces_eternelles' ? 0.7 : 1)
    let ax = 0
    let az = 0
    if (inputLen > 0.08) {
      const yaw = cam.current.yaw
      const fx = Math.sin(yaw)
      const fz = Math.cos(yaw)
      ax = (-fz * playerInput.x + fx * -playerInput.z)
      az = (fx * playerInput.x + fz * -playerInput.z)
      const l = Math.hypot(ax, az) || 1
      ax = (ax / l) * speed
      az = (az / l) * speed
      moveRef.current = Math.min(1, moveRef.current + dt * 6)
    } else {
      moveRef.current = Math.max(0, moveRef.current - dt * 8)
    }
    if (slippery) {
      // Sol glissant : inertie forte
      vel.current.px += (ax - vel.current.px * 1.6) * dt * (inputLen > 0.08 ? 2.2 : 1.2)
      vel.current.pz += (az - vel.current.pz * 1.6) * dt * (inputLen > 0.08 ? 2.2 : 1.2)
      playerPos.current.x += vel.current.px * dt
      playerPos.current.z += vel.current.pz * dt
    } else {
      playerPos.current.x += ax * dt
      playerPos.current.z += az * dt
    }

    // ── Vents puissants (Sommets Célestes) ──
    if (arenaId === 'sommets_celestes') {
      const w = h.wind
      if (!w.active && h.time > w.next) {
        w.active = true
        w.until = h.time + 0.9
        const a = ai.current.rand() * Math.PI * 2
        w.dir.set(Math.cos(a), Math.sin(a))
        arenaCombat.hazardAlert = 'Rafale de vent !'
        setTimeout(() => (arenaCombat.hazardAlert = null), 1300)
      }
      if (w.active) {
        playerPos.current.x += w.dir.x * 5.4 * dt
        playerPos.current.z += w.dir.y * 5.4 * dt
        oppPos.current.x += w.dir.x * 5.4 * dt
        oppPos.current.z += w.dir.y * 5.4 * dt
        if (h.time > w.until) {
          w.active = false
          w.next = h.time + 7 + ai.current.rand() * 5
        }
      }
    }

    // ── Tempête de neige (Glaces Éternelles) ──
    if (arenaId === 'glaces_eternelles') {
      const s = h.storm
      if (!s.active && h.time > s.next) {
        s.active = true
        s.until = h.time + 4
        arenaCombat.hazardAlert = 'Tempête de neige !'
        setTimeout(() => (arenaCombat.hazardAlert = null), 1600)
      }
      if (s.active && h.time > s.until) {
        s.active = false
        s.next = h.time + 12 + ai.current.rand() * 8
      }
    }

    // ── Dangers télégraphiés (geysers / ronces / pièges) ──
    const hazardArena = arenaId === 'volcan' || arenaId === 'foret_eternelle' || arenaId === 'ruines_anciennes'
    if (hazardArena && h.time > h.nextSpawn) {
      h.nextSpawn = h.time + 5 + ai.current.rand() * 3.5
      spawnHazard(playerPos.current.x, playerPos.current.z, oppPos.current.x, oppPos.current.z, ai.current.rand)
    }
    const stageDur = arenaId === 'ruines_anciennes' ? [0.9, 0.4] : [1.15, 0.5]
    h.spots = h.spots.filter((s) => {
      const age = h.time - s.t
      if (s.stage === 0 && age > stageDur[0]) {
        s.stage = 1
        // Éruption : dégâts si un combattant est dedans
        const rr = 1.7
        if (Math.hypot(playerPos.current.x - s.x, playerPos.current.z - s.z) < rr) {
          damagePlayer(arenaId === 'volcan' ? 14 : 9)
        }
        if (Math.hypot(oppPos.current.x - s.x, oppPos.current.z - s.z) < rr) {
          damageOpp(arenaId === 'volcan' ? 16 : 12) // l'IA subit aussi les pièges
        }
        setSpotsView((v) => v.map((x) => (x.id === (s as HazardSpot & { id: number }).id ? { ...x, stage: 1 } : x)))
      } else if (s.stage === 1 && age > stageDur[0] + stageDur[1]) {
        setSpotsView((v) => v.filter((x) => x.id !== (s as HazardSpot & { id: number }).id))
        return false
      }
      return true
    })

    // ── IA du gladiateur ──
    const dx = playerPos.current.x - oppPos.current.x
    const dz = playerPos.current.z - oppPos.current.z
    const dist = Math.hypot(dx, dz) || 0.001
    const ai_ = ai.current
    ai_.timer -= dt
    arenaCombat.oppTelegraph = 0
    const oppSpeed = 4.4 + match.opponent.stats.vitesse * 0.06
    switch (ai_.state) {
      case 'chase': {
        const s = oppSpeed * dt
        oppPos.current.x += (dx / dist) * s
        oppPos.current.z += (dz / dist) * s
        if (dist < 2.2) {
          ai_.state = 'windup'
          ai_.timer = 0.55
        } else if (ai_.timer <= 0 && ai_.rand() > 0.86) {
          ai_.state = 'strafe'
          ai_.timer = 1 + ai_.rand()
          ai_.strafeDir = ai_.rand() > 0.5 ? 1 : -1
        }
        break
      }
      case 'strafe': {
        const tx = -dz / dist
        const tz = dx / dist
        oppPos.current.x += tx * ai_.strafeDir * oppSpeed * 0.75 * dt
        oppPos.current.z += tz * ai_.strafeDir * oppSpeed * 0.75 * dt
        oppPos.current.x += (dx / dist) * oppSpeed * 0.3 * dt
        oppPos.current.z += (dz / dist) * oppSpeed * 0.3 * dt
        if (ai_.timer <= 0) {
          ai_.state = 'chase'
          ai_.timer = 1
        }
        break
      }
      case 'windup': {
        arenaCombat.oppTelegraph = 1 - ai_.timer / 0.55
        if (ai_.timer <= 0) {
          ai_.state = 'strike'
          ai_.timer = 0.22
        }
        break
      }
      case 'strike': {
        if (dist < 3.0) damagePlayer(stats.current.oppAtk * 0.62)
        ai_.state = 'recover'
        ai_.timer = 0.9 + ai_.rand() * 0.8
        break
      }
      case 'recover': {
        if (ai_.timer <= 0) {
          ai_.state = 'chase'
          ai_.timer = 1
        }
        break
      }
    }

    // ── Attaque joueur ──
    if (combatActions.playerAttack > 0) {
      const hits = combatActions.playerAttack
      combatActions.playerAttack = 0
      if (dist < 2.9) {
        for (let i = 0; i < hits; i++) damageOpp(stats.current.playerAtk)
      }
    }

    // ── Limites d'arène ──
    const clampR = (p: THREE.Vector3) => {
      const r = Math.hypot(p.x, p.z)
      if (r > ARENA_RADIUS - 0.8) {
        p.x = (p.x / r) * (ARENA_RADIUS - 0.8)
        p.z = (p.z / r) * (ARENA_RADIUS - 0.8)
        if (slippery) {
          vel.current.px *= -0.35
          vel.current.pz *= -0.35
        }
      }
    }
    clampR(playerPos.current)
    clampR(oppPos.current)
    // Séparation minimale entre combattants
    if (dist < 1.3) {
      oppPos.current.x -= (dx / dist) * (1.3 - dist)
      oppPos.current.z -= (dz / dist) * (1.3 - dist)
    }

    // ── Appliquer les transforms ──
    aiMoveProxy.current = ai_.state === 'chase' || ai_.state === 'strafe' ? 1 : 0
    if (playerG.current) {
      playerG.current.position.copy(playerPos.current)
      const targetYaw = Math.atan2(oppPos.current.x - playerPos.current.x, oppPos.current.z - playerPos.current.z)
      playerG.current.rotation.y = targetYaw
    }
    if (oppG.current) {
      oppG.current.position.copy(oppPos.current)
      oppG.current.rotation.y = Math.atan2(playerPos.current.x - oppPos.current.x, playerPos.current.z - oppPos.current.z)
    }

    // ── Caméra 3e personne ──
    const cd = cam.current.dist
    const cx = playerPos.current.x - Math.sin(cam.current.yaw) * cd * Math.cos(cam.current.pitch)
    const cz = playerPos.current.z - Math.cos(cam.current.yaw) * cd * Math.cos(cam.current.pitch)
    const cy = 1.4 + Math.sin(cam.current.pitch) * cd
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.22)
    camera.lookAt(playerPos.current.x, 1.3, playerPos.current.z)

    // Mort subite après 150 s (évite les duels interminables)
    if (arenaCombat.elapsed > 150) {
      damagePlayer(3)
      damageOpp(3)
    }
  })

  const playerOpacity = useRef(1)
  void playerOpacity

  return (
    <group>
      <group ref={playerG} position={[0, 0, 6]}>
        {playerRace && playerApp && (
          <AvatarModel race={playerRace} appearance={playerApp} equipment={playerEq} animated moveRef={moveRef} />
        )}
        {/* Anneau de sélection joueur */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.55, 0.72, 24]} />
          <meshBasicMaterial color="#58c878" transparent opacity={0.8} />
        </mesh>
        <Html center distanceFactor={12} position={[0, 2.5, 0]} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-sm bg-[#0c0a14e0] px-2 py-0.5 text-center text-[12px] font-bold text-[#b8f0c8]" style={{ border: '1px solid #58c87866' }}>
            Vous
          </div>
        </Html>
      </group>

      <group ref={oppG} position={[0, 0, -6]}>
        <AvatarModel race={glad.race} appearance={glad.appearance} equipment={glad.equipment} animated moveRef={aiMoveProxy} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.55, 0.72, 24]} />
          <meshBasicMaterial color="#e85858" transparent opacity={0.8} />
        </mesh>
        <Html center distanceFactor={12} position={[0, 2.5, 0]} zIndexRange={[20, 0]}>
          <div className="whitespace-nowrap rounded-sm bg-[#0c0a14e0] px-2 py-0.5 text-center text-[12px] font-bold text-[#f0b8b8]" style={{ border: '1px solid #e8585866' }}>
            {match.opponent.name} · {match.opponent.rating}
          </div>
        </Html>
      </group>

      {/* Télégraphes de dangers au sol */}
      {spotsView.map((s) => (
        <mesh key={s.id} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, 0.1, s.z]}>
          {s.stage === 0 ? (
            <ringGeometry args={[1.1, 1.7, 24]} />
          ) : (
            <circleGeometry args={[1.55, 24]} />
          )}
          <meshBasicMaterial
            color={arenaId === 'volcan' ? '#ff7830' : arenaId === 'foret_eternelle' ? '#78c850' : '#c8a8f0'}
            transparent
            opacity={s.stage === 0 ? 0.65 : 0.85}
          />
        </mesh>
      ))}
      {/* Colonne d'éruption */}
      {spotsView.filter((s) => s.stage === 1).map((s) => (
        <mesh key={`col${s.id}`} position={[s.x, 1.6, s.z]}>
          <cylinderGeometry args={[0.9, 1.3, 3.2, 10, 1, true]} />
          <meshBasicMaterial
            color={arenaId === 'volcan' ? '#ff9040' : arenaId === 'foret_eternelle' ? '#8ad860' : '#d0a8ff'}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function ArenaScene({ match, onEnd }: { match: ActiveMatch; onEnd: (r: 'win' | 'loss') => void }) {
  const quality = useCreatorStore((s) => s.quality)
  const v = match.arena.visuals
  return (
    <>
      <color attach="background" args={[v.skyBottom]} />
      <fog attach="fog" args={[v.fogColor, 34, 130]} />
      <ambientLight intensity={v.ambient} color="#ffffff" />
      <directionalLight
        position={[18, 26, 12]}
        intensity={1.5}
        color="#fff2dc"
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
      />
      <SkyDome top={v.skyTop} bottom={v.skyBottom} />
      <ArenaFloor ground={v.groundColor} ring={v.ringColor} accent={v.accentColor} />
      {match.arena.id === 'sommets_celestes' && <CelestialEnv quality={quality} />}
      {match.arena.id === 'volcan' && <VolcanoEnv quality={quality} />}
      {match.arena.id === 'foret_eternelle' && <ForestEnv quality={quality} />}
      {match.arena.id === 'ruines_anciennes' && <RuinsEnv quality={quality} />}
      {match.arena.id === 'glaces_eternelles' && <IceEnv quality={quality} />}
      <DuelActors match={match} onEnd={onEnd} />
    </>
  )
}

export function ArenaWorld({ match, onEnd }: { match: ActiveMatch; onEnd: (r: 'win' | 'loss') => void }) {
  return (
    <div className="h-full w-full">
      <Canvas
        shadows={useCreatorStore.getState().quality.shadows}
        dpr={useCreatorStore.getState().quality.dpr}
        gl={{ antialias: useCreatorStore.getState().quality.antialias }}
        style={{ touchAction: 'none' }}
      >
        <Suspense fallback={null}>
          <ArenaScene match={match} onEnd={onEnd} />
        </Suspense>
      </Canvas>
    </div>
  )
}

// Réexport pour le HUD mobile
export { requestAttack }
