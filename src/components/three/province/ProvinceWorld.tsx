'use client'

// NEXORIA — ProvinceWorld : assemblage de la scène 3D + contrôleur joueur.
// Prédiction locale du mouvement (règles identiques au serveur) + réconciliation.

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { BUILDINGS, MOVE, heightAt } from '@/lib/game/province/world-data'
import { provinceNet, type NetEntity } from '@/lib/game/province/network'
import { AvatarFigure, BuildingsLayer, BossFigure, DungeonLayer, MonsterFigure, Terrain, Vegetation } from './parts'

export interface NearTarget {
  kind: 'npc' | 'chest' | 'switch' | 'lore' | 'project' | 'door'
  id: string
  name: string
}

const RACE_COLORS: Record<string, [string, string]> = {
  humain: ['#c8a06a', '#e8d8c0'], humaine: ['#c8a06a', '#e8d8c0'],
  elfe: ['#9ac8a8', '#e0f0e0'], elfe_noir: ['#6a5a8a', '#d0c8e8'],
  lycan: ['#8a705a', '#d8c8b0'], drakeen: ['#a86a4a', '#f0d0b0'],
  sylphide: ['#a8d8e8', '#e8f8ff'], nain: ['#b08050', '#e8c8a0'],
  abyssien: ['#5a5a7a', '#c0c0e0'], astreen: ['#d8c87a', '#fff8d0'],
}
const PROFESSION_COLORS: Record<string, string> = {
  forgeron: '#8a4a2a', apprenti: '#9a6a4a', cuisiniere: '#c87a4a', apothicaire: '#5a8a5a',
  fermier: '#7a8a3a', garde: '#4a5a8a', aubergiste: '#8a5a7a', elder: '#b8985c',
  marchand: '#b87a3a', tisserande: '#7a6ab8', ermite: '#8a8a7a', enfant: '#c8b898',
}

function skyColors(timeOfDay: number) {
  const h = (timeOfDay / 3600) % 24
  const day = new THREE.Color('#8ec8e8')
  const dusk = new THREE.Color('#d88a5a')
  const night = new THREE.Color('#141428')
  let c: THREE.Color
  let light = 0.9
  if (h >= 6 && h < 8) { c = night.clone().lerp(dusk, (h - 6) / 2); light = 0.45 + ((h - 6) / 2) * 0.4 }
  else if (h >= 8 && h < 17) { c = day; light = 0.95 }
  else if (h >= 17 && h < 20) { c = day.clone().lerp(dusk, (h - 17) / 3); light = 0.95 - ((h - 17) / 3) * 0.5 }
  else if (h >= 20 && h < 22) { c = dusk.clone().lerp(night, (h - 20) / 2); light = 0.45 - ((h - 20) / 2) * 0.25 }
  else { c = night; light = 0.22 }
  return { sky: c, light }
}

function DayNightLighting() {
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const lastKey = useRef(-1)
  const [skyHex, setSkyHex] = useState('#8ec8e8')
  useFrame(() => {
    // Quantifié par tranches de 10 minutes en jeu (= 10 s réelles) pour éviter
    // toute tempête de re-renders : le ciel évolue par paliers visibles.
    const key = Math.floor(provinceNet.world.timeOfDay / 600)
    if (key !== lastKey.current) {
      lastKey.current = key
      const { sky, light } = skyColors(provinceNet.world.timeOfDay)
      const hex = '#' + sky.getHexString()
      setSkyHex(hex)
      const sunAngle = ((key / 6 - 6) / 24) * Math.PI * 2
      if (dirRef.current) {
        dirRef.current.position.set(Math.cos(sunAngle) * 80, Math.max(8, Math.sin(sunAngle) * 100), 40)
        dirRef.current.intensity = light
      }
      if (ambRef.current) ambRef.current.intensity = 0.25 + light * 0.35
    }
  })
  return (
    <>
      <color attach="background" args={[skyHex]} />
      <fog attach="fog" args={[skyHex, 90, 240]} />
      <ambientLight ref={ambRef} intensity={0.6} />
      <directionalLight
        ref={dirRef}
        position={[60, 90, 40]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={[1024, 1024]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />
    </>
  )
}

function EntitiesLayer({ onNear }: { onNear: (n: NearTarget | null) => void }) {
  const groupRefs = useRef(new Map<string, THREE.Group>())
  const [, force] = useState(0)
  const lastNearKey = useRef('')
  // Re-renders throttlés à 3 Hz (les positions restent lissées par useFrame)
  useEffect(() => {
    const iv = setInterval(() => force((v) => v + 1), 333)
    return () => clearInterval(iv)
  }, [])
  useFrame(() => {
    provinceNet.interpolate(1 / 60)
    for (const [id, e] of provinceNet.players) {
      const g = groupRefs.current.get('p_' + id)
      if (g) g.position.set(e.x, heightAt(e.x, e.z), e.z)
    }
    for (const [id, e] of provinceNet.npcs) {
      const g = groupRefs.current.get('n_' + id)
      if (g) g.position.set(e.x, heightAt(e.x, e.z), e.z)
    }
    for (const [id, e] of provinceNet.monsters) {
      const g = groupRefs.current.get('m_' + id)
      if (g) g.position.set(e.x, heightAt(e.x, e.z), e.z)
    }
  })

  return (
    <group>
      {/* Joueurs distants */}
      {[...provinceNet.players.values()].map((p) => (
        <group key={'p_' + p.id} ref={(g) => { if (g) groupRefs.current.set('p_' + p.id, g) }} position={[p.x, heightAt(p.x, p.z), p.z]}>
          <AvatarFigure color={RACE_COLORS[p.race]?.[0] ?? '#c8a06a'} accent={RACE_COLORS[p.race]?.[1] ?? '#e8d8c0'} />
          <PlayerLabel text={p.name} />
        </group>
      ))}
      {/* PNJ vivants */}
      {[...provinceNet.npcs.values()].filter((n) => n.lifeState !== 'DEAD' && !n.inside).map((n) => (
        <group key={'n_' + n.id} ref={(g) => { if (g) groupRefs.current.set('n_' + n.id, g) }} position={[n.x, heightAt(n.x, n.z), n.z]}>
          <AvatarFigure color={PROFESSION_COLORS[n.profession ?? ''] ?? '#b0a890'} accent={n.isGuard ? '#d8d8e8' : '#e8d0b0'} />
          {n.state === 'flee' && <mesh position={[0, 2.6, 0]}><sphereGeometry args={[0.12, 6, 5]} /><meshBasicMaterial color="#ff5a4a" /></mesh>}
        </group>
      ))}
      {/* PNJ morts : corps au sol — le monde garde la trace des siens */}
      {provinceNet.deadNpcs.map((d) => (
        <group key={'d_' + d.id} position={[d.x, heightAt(d.x, d.z) + 0.15, d.z]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <capsuleGeometry args={[0.3, 0.7, 3, 6]} />
            <meshLambertMaterial color="#4a4038" />
          </mesh>
        </group>
      ))}
      {/* Monstres */}
      {[...provinceNet.monsters.values()].map((m) => (
        <group key={'m_' + m.id} ref={(g) => { if (g) groupRefs.current.set('m_' + m.id, g) }} position={[m.x, heightAt(m.x, m.z), m.z]}>
          {m.typeId === 'colosse' ? <BossFigure /> : <MonsterFigure raider={m.raider} />}
          <HealthBar hp={m.hp} mhp={m.mhp} y={m.typeId === 'colosse' ? 4.6 : 2.0} />
        </group>
      ))}
      <NearDetector onNear={onNear} />
    </group>
  )
}

function PlayerLabel({ text }: { text: string }) {
  return (
    <mesh position={[0, 2.35, 0]}>
      <planeGeometry args={[text.length * 0.13 + 0.4, 0.36]} />
      <meshBasicMaterial color="#0c0a14" transparent opacity={0.6} depthWrite={false} />
    </mesh>
  )
}

function HealthBar({ hp, mhp, y }: { hp: number; mhp: number; y: number }) {
  const ratio = Math.max(0, Math.min(1, hp / mhp))
  return (
    <group position={[0, y, 0]}>
      <mesh><planeGeometry args={[1.3, 0.12]} /><meshBasicMaterial color="#20141a" /></mesh>
      <mesh position={[-(1.3 * (1 - ratio)) / 2, 0, 0.01]}><planeGeometry args={[1.3 * ratio, 0.09]} /><meshBasicMaterial color={ratio > 0.5 ? '#4ac85a' : ratio > 0.25 ? '#e8a83a' : '#e84a3a'} /></mesh>
    </group>
  )
}

function NearDetector({ onNear }: { onNear: (n: NearTarget | null) => void }) {
  const t = useRef(0)
  const lastEmitted = useRef('')
  useFrame((_, dt) => {
    t.current += dt
    if (t.current < 0.3) return
    t.current = 0
    const x = provinceNet.selfX
    const z = provinceNet.selfZ
    let best: NearTarget | null = null
    let bd = 3.4
    for (const n of provinceNet.npcs.values()) {
      if (n.lifeState === 'DEAD' || n.inside) continue
      const d = Math.hypot(n.x - x, n.z - z)
      if (d < bd) { bd = d; best = { kind: 'npc', id: n.id, name: n.name } }
    }
    if (!best) {
      for (const [id, pr] of provinceNet.projects) {
        const bld = provinceNet.buildings.get(id)
        if (!bld || bld.st !== 'RECONSTRUCTION') continue
        const def = BUILDINGS.find((b) => b.id === id)
        if (!def) continue
        const d = Math.hypot(def.x - x, def.z - z)
        if (d < 7) {
          best = { kind: 'project', id, name: `Chantier (${Math.round(pr.progress)} %)` }
          break
        }
      }
    }
    if (!best) {
      const dy = Math.hypot(172 - x, -42 - z)
      if (dy < 3.6 && !provinceNet.dungeon.switches.includes('switch_r1')) best = { kind: 'switch', id: 'switch_r1', name: 'Mécanisme ancien' }
      const dl = Math.hypot(174 - x, -34 - z)
      if (dl < 3.6) best = { kind: 'lore', id: 'lore_1', name: 'Pierre gravée' }
      const dl2 = Math.hypot(196 - x, -36 - z)
      if (dl2 < 3.6) best = { kind: 'lore', id: 'lore_2', name: 'Pierre gravée' }
    }
    // Ne notifie le HUD que si la cible change réellement
    const key = best ? `${best.kind}:${best.id}` : ''
    if (key !== lastEmitted.current) {
      lastEmitted.current = key
      onNear(best)
    }
  })
  return null
}

// ── CONTRÔLEUR JOUEUR : prédiction + caméra + envoi d'intentions ──
const camYawGlobal = { value: Math.PI }

function PlayerController({ inputRef, cameraDragRef, attackRef }: {
  inputRef: React.MutableRefObject<{ x: number; z: number; sprint: boolean }>
  cameraDragRef: React.MutableRefObject<number>
  attackRef: React.MutableRefObject<(skill: boolean) => void>
}) {
  const { camera } = useThree()
  const sendAcc = useRef(0)

  function doAttack(skill: boolean) {
    const x = provinceNet.selfX
    const z = provinceNet.selfZ
    let best: NetEntity | null = null
    let bd = skill ? 6.6 : 3.8
    for (const m of provinceNet.monsters.values()) {
      const d = Math.hypot(m.x - x, m.z - z)
      if (d < bd) { bd = d; best = m }
    }
    if (best) {
      provinceNet.sendAttack(best.id, skill)
      return
    }
    // porte du donjon à portée ?
    const dd = Math.hypot(171 - x, -22 - z)
    if (dd < 4.8 && provinceNet.dungeon.doorState !== 'DESTROYED') {
      provinceNet.sendAttack('dungeon_door', skill)
    }
  }
  useEffect(() => {
    attackRef.current = doAttack
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        doAttack(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(0.1, rawDt)
    const inp = inputRef.current
    // Prédiction locale : mêmes règles que le serveur (vitesse encadrée)
    const mag = Math.min(1, Math.hypot(inp.x, inp.z))
    if (mag > 0.01 && provinceNet.self && !provinceNet.self.dead) {
      const nx = inp.x / Math.hypot(inp.x, inp.z)
      const nz = inp.z / Math.hypot(inp.x, inp.z)
      const speed = inp.sprint ? MOVE.sprint : MOVE.walk
      provinceNet.selfX = Math.max(-238, Math.min(238, provinceNet.selfX + nx * mag * speed * dt))
      provinceNet.selfZ = Math.max(-238, Math.min(238, provinceNet.selfZ + nz * mag * speed * dt))
    }
    // Envoi d'intentions à 10 Hz
    sendAcc.current += dt
    if (sendAcc.current >= 0.1) {
      provinceNet.sendMove(inp.x, inp.z, sendAcc.current, inp.sprint)
      sendAcc.current = 0
    }
    // Rotation caméra par glissement (souris / doigt droit)
    if (cameraDragRef.current !== 0) {
      camYawGlobal.value += cameraDragRef.current * 0.014
      cameraDragRef.current = 0
    }
    // Caméra 3e personne
    const cx = provinceNet.selfX
    const cz = provinceNet.selfZ
    const cy = heightAt(cx, cz)
    const dist = 10
    const target = new THREE.Vector3(cx - Math.sin(camYawGlobal.value) * dist, cy + 6.4, cz - Math.cos(camYawGlobal.value) * dist)
    camera.position.lerp(target, Math.min(1, 5 * dt))
    camera.lookAt(cx, cy + 1.4, cz)
  })
  return null
}

export const ProvinceWorld = memo(function ProvinceWorld({ quality, onNear, inputRef, cameraDragRef, attackRef }: {
  quality: { treeDensity: number; shadows: boolean }
  onNear: (n: NearTarget | null) => void
  inputRef: React.MutableRefObject<{ x: number; z: number; sprint: boolean }>
  cameraDragRef: React.MutableRefObject<number>
  attackRef: React.MutableRefObject<(skill: boolean) => void>
}) {
  const selfRef = useRef<THREE.Group>(null)
  const [tick, forceTick] = useState(0)
  // Re-renders throttlés à 1 Hz pour les états (bâtiments/donjon) —
  // les positions d'entités sont mises à jour par useFrame sans render.
  useEffect(() => {
    const iv = setInterval(() => forceTick((v) => v + 1), 1000)
    return () => clearInterval(iv)
  }, [])
  useFrame(() => {
    if (selfRef.current) {
      const x = provinceNet.selfX
      const z = provinceNet.selfZ
      selfRef.current.position.set(x, heightAt(x, z), z)
    }
  })
  void tick

  return (
    <>
      <DayNightLighting />
      <Terrain />
      <Vegetation density={quality.treeDensity} />
      <BuildingsLayer buildings={provinceNet.buildings} projects={provinceNet.projects} />
      <DungeonLayer dungeon={provinceNet.dungeon} />
      <EntitiesLayer onNear={onNear} />
      {/* Avatar local */}
      <group ref={selfRef}>
        <AvatarFigure color="#d8b878" accent="#fff0d0" />
        <pointLight position={[0, 2.2, 0]} intensity={0.35} distance={9} color="#ffe8c0" />
      </group>
      <PlayerController inputRef={inputRef} cameraDragRef={cameraDragRef} attackRef={attackRef} />
    </>
  )
})
