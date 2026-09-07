'use client'

// NEXORIA — Contrôles partagés du jeu (arènes + boss) : clavier ZQSD/WASD
// + flèches (e.code = position physique, AZERTY natif) et joystick virtuel tactile.

import { useEffect, useRef } from 'react'
import { playerInput } from '@/lib/game/runtime'

// Lie le clavier physique à playerInput (comme dans le village)
export function useMovementKeyboard(enabled = true) {
  useEffect(() => {
    if (!enabled) return
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
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') return // géré par l'attaque
      keys.add(e.code)
      apply()
    }
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code)
      apply()
    }
    const blur = () => {
      keys.clear()
      apply()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      keys.clear()
      playerInput.x = 0
      playerInput.z = 0
      playerInput.sprint = false
    }
  }, [enabled])
}

// Joystick virtuel tactile (identique au village)
export function VirtualJoystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const active = useRef(false)

  function setKnob(dx: number, dy: number) {
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  function handle(e: React.PointerEvent) {
    const rect = base.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const max = rect.width / 2 - 14
    const d = Math.hypot(dx, dy)
    if (d > max) {
      dx = (dx / d) * max
      dy = (dy / d) * max
    }
    setKnob(dx, dy)
    playerInput.x = dx / max
    playerInput.z = dy / max
    playerInput.sprint = d / max > 0.92
  }

  return (
    <div
      ref={base}
      onPointerDown={(e) => {
        active.current = true
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        handle(e)
      }}
      onPointerMove={(e) => active.current && handle(e)}
      onPointerUp={() => {
        active.current = false
        playerInput.x = 0
        playerInput.z = 0
        playerInput.sprint = false
        setKnob(0, 0)
      }}
      className="absolute bottom-7 left-6 z-10 h-32 w-32 touch-none rounded-full border-2 border-[#b8985c44] bg-[#0c0a1480] backdrop-blur-sm"
    >
      <div
        ref={knob}
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b8985c88] bg-[#2a2038cc]"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[8px] uppercase tracking-widest text-[#8a80a0]">
        déplacer
      </div>
    </div>
  )
}
