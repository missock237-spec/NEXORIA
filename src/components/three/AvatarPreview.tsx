'use client'

// NEXORIA — Préview 3D du personnage
// Éclairage de présentation studio, rotation 360°, zoom, caméras de preset
// (visage / avant / arrière), ombre de contact, performance adaptative.

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import type { Appearance, EquipmentDef, RaceDef } from '@/lib/game/types'
import { AvatarModel } from './AvatarModel'
import { WebGLErrorBoundary } from './WebGLErrorBoundary'
import { loadQualityProfile, QUALITY_PROFILES } from '@/lib/game/config'

export type CameraPreset = 'face' | 'front' | 'back' | 'full'

interface AvatarPreviewProps {
  race: RaceDef
  appearance: Appearance
  equipment?: Record<string, EquipmentDef>
  preset?: CameraPreset
  autoRotate?: boolean
  className?: string
  sparkles?: boolean
}

function CameraRig({ preset, autoRotate }: { preset: CameraPreset; autoRotate: boolean }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null)
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3(0, 0.95, 0))

  useEffect(() => {
    const presets: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
      face: { pos: [0, 1.42, 0.92], target: [0, 1.38, 0] },
      front: { pos: [0, 1.0, 2.35], target: [0, 0.92, 0] },
      back: { pos: [0, 1.0, -2.35], target: [0, 0.92, 0] },
      full: { pos: [0.4, 0.95, 3.55], target: [0, 0.78, 0] },
    }
    const p = presets[preset]
    camera.position.set(...p.pos)
    target.current.set(...p.target)
    if (controls.current) {
      controls.current.target.copy(target.current)
      controls.current.update()
    }
  }, [preset, camera])

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={0.55}
      maxDistance={4.2}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI * 0.62}
      autoRotate={autoRotate}
      autoRotateSpeed={1.6}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

export function AvatarPreview({
  race, appearance, equipment, preset = 'front', autoRotate = false, className, sparkles = true,
}: AvatarPreviewProps) {
  const [quality] = useState<(typeof QUALITY_PROFILES)['HIGH']>(() =>
    typeof window !== 'undefined' ? loadQualityProfile() : QUALITY_PROFILES.HIGH
  )

  const isCelestial = race.id === 'sylphide' || race.id === 'astreen'
  const showSparkles = sparkles && isCelestial && quality.particles > 0

  return (
    <div className={className ?? 'h-full w-full'}>
      <WebGLErrorBoundary label="aperçu personnage">
        <Canvas
        shadows={quality.shadows ?? true}
        dpr={quality.dpr ?? 1.5}
        camera={{ position: [0, 1.15, 2.4], fov: 42 }}
        gl={{ antialias: quality.antialias ?? true, alpha: true }}
      >
        {/* Éclairage de présentation */}
        <ambientLight intensity={0.55} color="#cfd8e8" />
        <directionalLight
          position={[2.5, 4, 3]}
          intensity={2.1}
          color="#fff2dd"
          castShadow={quality.shadows ?? true}
          shadow-mapSize={[(quality.shadowMapSize ?? 1024), (quality.shadowMapSize ?? 1024)]}
        />
        <directionalLight position={[-3, 2.5, -2]} intensity={0.85} color="#8ca8e8" />
        <pointLight position={[0, 1.4, 2.4]} intensity={0.5} color="#ffd8b0" />

        <Suspense fallback={null}>
          <group position={[0, -0.12, 0]} rotation={[0, 0, 0]}>
            <AvatarModel race={race} appearance={appearance} equipment={equipment} animated />
          </group>
          {showSparkles && (
            <Sparkles count={quality.particles} scale={[2.4, 2.2, 2.4]} position={[0, 1.1, 0]} size={2.6} speed={0.4} color={race.id === 'sylphide' ? '#a8d8e8' : '#e8d040'} />
          )}
        </Suspense>

        <ContactShadows position={[0, -0.13, 0]} opacity={0.42} scale={4} blur={2.4} far={2} />
        <CameraRig preset={preset} autoRotate={autoRotate} />
      </Canvas>
      </WebGLErrorBoundary>
    </div>
  )
}
