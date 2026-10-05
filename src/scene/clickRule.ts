import type { ThreeEvent } from '@react-three/fiber'

export const CLICK_MAX_MOVE_PX = 6
export const CLICK_MAX_MS = 600

export function makeClickHandlers(onClick: () => void, canClick: () => boolean = () => true) {
  let down: { x: number; y: number; t: number } | null = null
  return {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!canClick()) return
      down = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, t: performance.now() }
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      const d = down
      down = null
      if (!d || !canClick()) return
      const moved = Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y)
      if (moved < CLICK_MAX_MOVE_PX && performance.now() - d.t < CLICK_MAX_MS) {
        e.stopPropagation()
        onClick()
      }
    },
    onPointerCancel: () => {
      down = null
    },
  }
}
