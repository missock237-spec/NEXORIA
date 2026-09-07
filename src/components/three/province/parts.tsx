'use client'

// NEXORIA — Province : géométries procédurales partagées.
// Chaque état d'un bâtiment est VRAIMENT visible (aucune variable cachée).

import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { BUILDINGS, CITY, CITY_GATE, CITY_WALLS, DUNGEON, FOREST, heightAt } from '@/lib/game/province/world-data'

// ── TERRAIN (hauteur = fonction partagée client/serveur) ──
export function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(480, 480, 110, 110)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const cGrass = new THREE.Color('#5d7a3a')
    const cForest = new THREE.Color('#42582a')
    const cStone = new THREE.Color('#7a7468')
    const cSand = new THREE.Color('#a3916b')
    const cDark = new THREE.Color('#3f3a44')
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const y = heightAt(x, z)
      pos.setY(i, y)
      const df = Math.hypot(x - FOREST.x, z - FOREST.z)
      const dd = Math.hypot(x - DUNGEON.x, z - DUNGEON.z)
      const dc = Math.hypot(x - CITY.x, z - CITY.z)
      const dv = Math.hypot(x, z - 40)
      tmp.copy(cGrass)
      if (df < FOREST.radius) tmp.lerp(cForest, 1 - df / FOREST.radius)
      if (dc < CITY.radius + 6) tmp.lerp(cSand, 0.55)
      if (dd < 46) tmp.lerp(cDark, 1 - dd / 46)
      if (dv < 60) tmp.lerp(cSand, 0.18)
      if (y > 5.2) tmp.lerp(cStone, Math.min(1, (y - 5.2) / 2.5))
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <mesh geometry={geo} receiveShadow>
      <meshLambertMaterial vertexColors />
    </mesh>
  )
}

// ── VÉGÉTATION instanciée ──
export function Vegetation({ density }: { density: number }) {
  const trees = useMemo(() => {
    const rng = (() => { let s = 1337; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()
    const list: { x: number; z: number; s: number; r: number }[] = []
    const target = Math.floor(190 * density)
    for (let i = 0; i < target; i++) {
      const a = rng() * Math.PI * 2
      const rr = Math.sqrt(rng()) * FOREST.radius
      const x = FOREST.x + Math.cos(a) * rr
      const z = FOREST.z + Math.sin(a) * rr
      if (Math.hypot(x, z - 40) < 62 || Math.hypot(x - CITY.x, z - CITY.z) < CITY.radius + 6) continue
      list.push({ x, z, s: 0.75 + rng() * 0.8, r: rng() * Math.PI })
    }
    for (let i = 0; i < target * 0.25; i++) {
      const x = (rng() - 0.5) * 440
      const z = (rng() - 0.5) * 440
      if (Math.hypot(x, z - 40) < 62 || Math.hypot(x - CITY.x, z - CITY.z) < CITY.radius + 6) continue
      if (Math.hypot(x - FOREST.x, z - FOREST.z) < FOREST.radius) continue
      if (Math.hypot(x - DUNGEON.x, z - DUNGEON.z) < 40) continue
      list.push({ x, z, s: 0.6 + rng() * 0.6, r: rng() * Math.PI })
    }
    return list
  }, [density])

  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const leafRef = useRef<THREE.InstancedMesh>(null)
  const rockRef = useRef<THREE.InstancedMesh>(null)
  const rocks = useMemo(() => {
    const rng = (() => { let s = 99; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } })()
    return Array.from({ length: Math.floor(46 * density) }, () => {
      const x = (rng() - 0.5) * 440
      const z = (rng() - 0.5) * 440
      return { x, z, s: 0.5 + rng() * 1.4, r: rng() * Math.PI }
    })
  }, [density])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    if (!trunkRef.current || !leafRef.current) return
    trees.forEach((t, i) => {
      const y = heightAt(t.x, t.z)
      e.set(0, t.r, 0)
      q.setFromEuler(e)
      m.compose(new THREE.Vector3(t.x, y + 1.1 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s))
      trunkRef.current!.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(t.x, y + 3.0 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s))
      leafRef.current!.setMatrixAt(i, m)
    })
    trunkRef.current.instanceMatrix.needsUpdate = true
    leafRef.current.instanceMatrix.needsUpdate = true
  }, [trees])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    if (!rockRef.current) return
    rocks.forEach((r, i) => {
      const y = heightAt(r.x, r.z)
      m.makeRotationY(r.r)
      m.setPosition(r.x, y + 0.3 * r.s, r.z)
      m.scale(new THREE.Vector3(r.s, r.s, r.s))
      rockRef.current!.setMatrixAt(i, m)
    })
    rockRef.current.instanceMatrix.needsUpdate = true
  }, [rocks])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 2.4, 5]} />
        <meshLambertMaterial color="#5a4632" />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[1.5, 3.4, 6]} />
        <meshLambertMaterial color="#3d5a2a" />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[undefined, undefined, rocks.length]} castShadow>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshLambertMaterial color="#8a8578" />
      </instancedMesh>
    </group>
  )
}

// ── BÂTIMENT : 7 états réellement visibles ──
const WALL_H: Record<string, number> = { forge: 3.2, maison: 2.9, auberge: 3.6, marche: 2.4, garde: 3.0, tour: 6.5, comptoir: 3.4, caserne: 3.4, entrepot: 3.8 }
const W_SIZE: Record<string, number> = { forge: 5.4, maison: 4.6, auberge: 6.4, marche: 6.0, garde: 4.4, tour: 3.0, comptoir: 6.0, caserne: 5.6, entrepot: 6.6 }

export function BuildingMesh({ def, state, progress }: {
  def: { id: string; type: string; label: string; x: number; z: number; rotY: number }
  state: string
  progress: number
}) {
  const w = W_SIZE[def.type] ?? 5
  const h = WALL_H[def.type] ?? 3
  const y = heightAt(def.x, def.z)
  const destroyed = state === 'DESTROYED' || state === 'RUINS'
  const wallH = state === 'DESTROYED' ? h * 0.35 : state === 'RUINS' ? h * 0.22 : h
  const charred = state === 'RUINS'
  const damaged = state === 'DAMAGED' || state === 'HEAVILY_DAMAGED'
  const roofScale = state === 'HEAVILY_DAMAGED' ? 0.55 : damaged ? 0.85 : destroyed ? 0 : 1
  const recons = state === 'RECONSTRUCTION'
  const stage = recons ? (progress >= 75 ? 3 : progress >= 50 ? 2 : progress >= 25 ? 1 : 0) : 0
  const wallColor = charred ? '#2f2a28' : recons ? '#9a8a72' : '#c8b898'
  const roofColor = charred ? '#241f1e' : recons ? '#7a6a50' : '#8c4a38'

  return (
    <group position={[def.x, y, def.z]} rotation={[0, def.rotY, 0]}>
      <mesh position={[0, wallH / 2, 0]} castShadow>
        <boxGeometry args={[w, Math.max(0.3, wallH), w * 0.8]} />
        <meshLambertMaterial color={wallColor} />
      </mesh>
      {roofScale > 0 && (
        <mesh position={[0, (recons ? h * (0.6 + stage * 0.13) : wallH) + (h * 0.42 * roofScale) / 2, 0]} castShadow>
          <coneGeometry args={[w * 0.78, h * 0.85 * roofScale, 4]} />
          <meshLambertMaterial color={roofColor} />
        </mesh>
      )}
      {(state === 'INTACT' || state === 'RESTORED' || damaged) && (
        <mesh position={[0, 0.9, w * 0.4 + 0.02]}>
          <boxGeometry args={[1.1, 1.8, 0.1]} />
          <meshLambertMaterial color="#4a3626" />
        </mesh>
      )}
      {destroyed && (
        <group>
          {[[-1.4, 0.6], [1.2, -0.8], [0.4, 1.4], [-0.9, -1.2]].map(([rx, rz], i) => (
            <mesh key={i} position={[rx, 0.35, rz * w * 0.12]} rotation={[0.4, i, 0.2]}>
              <dodecahedronGeometry args={[0.55 + i * 0.12, 0]} />
              <meshLambertMaterial color={charred ? '#3a332f' : '#9a9080'} />
            </mesh>
          ))}
        </group>
      )}
      {recons && (
        <group>
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w + 1.2, w + 0.9]} />
            <meshLambertMaterial color="#6a5c48" />
          </mesh>
          {stage >= 2 && [-1, 1].map((s) => (
            <mesh key={s} position={[s * (w / 2 - 0.2), h * 0.5, 0]}>
              <boxGeometry args={[0.22, h, 0.22]} />
              <meshLambertMaterial color="#5a4632" />
            </mesh>
          ))}
          {stage >= 1 && (
            <mesh position={[0, h * stage * 0.28, 0]}>
              <boxGeometry args={[w * (0.4 + stage * 0.2), h * stage * 0.28, w * 0.8 * (0.4 + stage * 0.2)]} />
              <meshLambertMaterial color={wallColor} />
            </mesh>
          )}
          {stage < 3 && [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} position={[sx * (w / 2), h / 2, sz * (w * 0.4)]}>
              <boxGeometry args={[0.14, h, 0.14]} />
              <meshLambertMaterial color="#7a6848" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

export function BuildingsLayer({ buildings, projects }: { buildings: Map<string, { id: string; st: string; hp: number }>; projects: Map<string, { progress: number }> }) {
  return (
    <group>
      {BUILDINGS.map((def) => {
        const st = buildings.get(def.id)?.st ?? 'INTACT'
        const pr = projects.get(def.id)?.progress ?? 0
        return <BuildingMesh key={def.id} def={def} state={st} progress={pr} />
      })}
      {CITY_WALLS.map((wseg) => (
        <WallSegment key={wseg.id} x={wseg.x} z={wseg.z} rotY={wseg.rotY} state={buildings.get(wseg.id)?.st ?? 'INTACT'} />
      ))}
      <WallSegment x={CITY_GATE.x} z={CITY_GATE.z} rotY={0} state={buildings.get(CITY_GATE.id)?.st ?? 'INTACT'} gate />
    </group>
  )
}

function WallSegment({ x, z, rotY, state, gate }: { x: number; z: number; rotY: number; state: string; gate?: boolean }) {
  const y = heightAt(x, z)
  const destroyed = state === 'DESTROYED' || state === 'RUINS'
  const h = gate ? 5 : 4.2
  const wallH = destroyed ? 1.1 : h
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, wallH / 2, 0]} castShadow>
        <boxGeometry args={[gate ? 5 : 7.4, wallH, 1.6]} />
        <meshLambertMaterial color={destroyed ? '#6a6156' : '#8d8574'} />
      </mesh>
      {!destroyed && (
        <mesh position={[0, wallH + 0.25, 0]}>
          <boxGeometry args={[gate ? 5.4 : 7.8, 0.5, 2.0]} />
          <meshLambertMaterial color="#7a7263" />
        </mesh>
      )}
      {gate && !destroyed && (
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[3.4, 3.2, 0.3]} />
          <meshLambertMaterial color="#4a3626" />
        </mesh>
      )}
    </group>
  )
}

// ── DONJON (extérieur + salles) ──
export function DungeonLayer({ dungeon }: { dungeon: { doorState: string; switches: string[]; chests: string[] } }) {
  const y0 = heightAt(DUNGEON.doorX, DUNGEON.doorZ)
  const doorBroken = dungeon.doorState === 'DESTROYED'
  return (
    <group>
      <group position={[DUNGEON.doorX, y0, DUNGEON.doorZ]}>
        {!doorBroken ? (
          <mesh position={[0, 1.9, 0]} castShadow>
            <boxGeometry args={[4.6, 3.8, 0.7]} />
            <meshLambertMaterial color={dungeon.doorState === 'DAMAGED' ? '#5a4638' : '#3f3128'} />
          </mesh>
        ) : (
          <group>
            {[-1.5, 0, 1.6].map((rx, i) => (
              <mesh key={i} position={[rx, 0.4, 0.5]} rotation={[0.5, i, 0.3]}>
                <boxGeometry args={[1.4, 0.7, 0.5]} />
                <meshLambertMaterial color="#3a2f26" />
              </mesh>
            ))}
          </group>
        )}
        {[-2.8, 2.8].map((rx) => (
          <mesh key={rx} position={[rx, 2.6, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.7, 5.2, 6]} />
            <meshLambertMaterial color="#565058" />
          </mesh>
        ))}
      </group>
      {DUNGEON.rooms.map((r) => (
        <group key={r.id} position={[r.x, heightAt(r.x, r.z), r.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <circleGeometry args={[r.r, 20]} />
            <meshLambertMaterial color="#35313b" />
          </mesh>
          {[0, 2.1, 4.2].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * r.r * 0.72, 1.1, Math.sin(a) * r.r * 0.72]} castShadow>
              <cylinderGeometry args={[0.45, 0.55, 2.2, 5]} />
              <meshLambertMaterial color="#514b55" />
            </mesh>
          ))}
        </group>
      ))}
      <SwitchMesh activated={dungeon.switches.includes('switch_r1')} />
      <ChestMesh x={DUNGEON.chestPos.x} z={DUNGEON.chestPos.z} open={dungeon.chests.includes('chest_r2')} />
      {DUNGEON.loreStones.map((s, i) => (
        <mesh key={i} position={[s.x, heightAt(s.x, s.z) + 0.8, s.z]} rotation={[0, i, 0.06]} castShadow>
          <boxGeometry args={[1.0, 1.6, 0.3]} />
          <meshLambertMaterial color="#6a6470" />
        </mesh>
      ))}
    </group>
  )
}

export function SwitchMesh({ activated }: { activated: boolean }) {
  const y = heightAt(DUNGEON.switchPos.x, DUNGEON.switchPos.z)
  return (
    <group position={[DUNGEON.switchPos.x, y, DUNGEON.switchPos.z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.65, 1.0, 6]} />
        <meshLambertMaterial color={activated ? '#8a6a30' : '#5c5c66'} />
      </mesh>
      <mesh position={[0, activated ? 1.02 : 1.3, activated ? 0.25 : 0]} rotation={[activated ? 1.1 : 0.25, 0, 0]}>
        <boxGeometry args={[0.16, 0.7, 0.16]} />
        <meshLambertMaterial color={activated ? '#d4b878' : '#b8b4c0'} />
      </mesh>
      {activated && <pointLight position={[0, 1.6, 0]} color="#d4b878" intensity={1.4} distance={7} />}
    </group>
  )
}

export function ChestMesh({ x, z, open }: { x: number; z: number; open?: boolean }) {
  const y = heightAt(x, z)
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.1, 0.7, 0.75]} />
        <meshLambertMaterial color="#6a4a28" />
      </mesh>
      <mesh position={[0, open ? 0.85 : 0.75, open ? -0.28 : 0]} rotation={[open ? -1.9 : 0, 0, 0]}>
        <boxGeometry args={[1.14, 0.3, 0.78]} />
        <meshLambertMaterial color="#57402a" />
      </mesh>
      {!open && <pointLight position={[0, 0.9, 0]} color="#d4b878" intensity={0.7} distance={4} />}
    </group>
  )
}

// ── ENTITÉS ──
function useBob(ref: React.RefObject<THREE.Group | null>, speed = 6, amp = 0.12) {
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current) return
    t.current += dt * speed
    ref.current.position.y = Math.abs(Math.sin(t.current)) * amp
  })
}

export function AvatarFigure({ color, accent, big }: { color: string; accent: string; big?: boolean }) {
  const s = big ? 1.6 : 1
  return (
    <group scale={s}>
      <mesh position={[0, 0.65, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.75, 3, 8]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.24, 10, 8]} />
        <meshLambertMaterial color={accent} />
      </mesh>
      <mesh position={[0.42, 0.85, 0.1]} rotation={[0.3, 0, -0.5]}>
        <boxGeometry args={[0.09, 0.85, 0.09]} />
        <meshLambertMaterial color="#8a8578" />
      </mesh>
    </group>
  )
}

export function MonsterFigure({ raider }: { raider: boolean }) {
  const g = useRef<THREE.Group>(null)
  useBob(g, 9, 0.16)
  return (
    <group ref={g}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.6, 3, 7]} />
        <meshLambertMaterial color={raider ? '#7a2f22' : '#5c3830'} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.26, 8, 7]} />
        <meshLambertMaterial color="#6e4a3a" />
      </mesh>
      {[-0.1, 0.1].map((ex) => (
        <mesh key={ex} position={[ex, 1.3, 0.22]}>
          <sphereGeometry args={[0.05, 6, 5]} />
          <meshBasicMaterial color="#ff3b30" />
        </mesh>
      ))}
      {raider && (
        <mesh position={[0, 1.75, 0]}>
          <torusGeometry args={[0.32, 0.05, 6, 14]} />
          <meshBasicMaterial color="#ff7a30" />
        </mesh>
      )}
    </group>
  )
}

export function BossFigure() {
  const g = useRef<THREE.Group>(null)
  useBob(g, 3, 0.2)
  return (
    <group ref={g} scale={2.4}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.75, 1.1, 0.55]} />
        <meshLambertMaterial color="#6f6a5e" />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshLambertMaterial color="#7d7768" />
      </mesh>
      <mesh position={[0, 1.58, 0.27]}>
        <boxGeometry args={[0.36, 0.1, 0.05]} />
        <meshBasicMaterial color="#ffb03b" />
      </mesh>
      {[-0.55, 0.55].map((sx) => (
        <mesh key={sx} position={[sx, 0.85, 0]} castShadow>
          <boxGeometry args={[0.28, 1.0, 0.3]} />
          <meshLambertMaterial color="#655f55" />
        </mesh>
      ))}
    </group>
  )
}
