// NEXORIA — État d'exécution partagé entre la scène 3D et l'interface du village
// (objet mutable hors React pour éviter les re-renders à 60 fps)

export const playerInput = { x: 0, z: 0, sprint: false }

export const playerState = {
  x: 0,
  z: 0,
  moving: false,
  near: null as null | { type: 'npc' | 'dummy'; id: string; name: string; role?: string },
}

export function resetInput() {
  playerInput.x = 0
  playerInput.z = 0
  playerInput.sprint = false
  playerState.near = null
  playerState.moving = false
}

// Hook de debug/test (inspectable via window.__nx)
if (typeof window !== 'undefined') {
  ;(window as unknown as { __nx: unknown }).__nx = { playerState, playerInput }
}
