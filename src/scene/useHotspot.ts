import { useEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { makeClickHandlers } from './clickRule'
import { addHover, clearHover, removeHover } from './hotspotHover'
import { runtime, type WallKey } from './runtime'
import { focus, getState, useFocus } from '../store/focus'
import type { ObjectHotspot } from '../zones/types'

export function useHotspot(spec: ObjectHotspot, opts: { wall?: WallKey } = {}) {
  const gl = useThree((s) => s.gl)
  const phase = useFocus((s) => s.phase)
  const group = spec.pose
  const pressed = useRef(false)
  const wall = opts.wall

  const usable = () => {
    const s = getState()
    if (s.phase !== 'idle' || s.active !== null) return false
    if (wall && runtime.wallOp[wall] < 0.5) return false
    return true
  }

  useEffect(() => {
    if (phase !== 'idle') {
      clearHover(group)
      pressed.current = false
      gl.domElement.style.cursor = ''
    }
  }, [phase, group, gl])

  useEffect(() => () => clearHover(group), [group])

  const click = useMemo(() => makeClickHandlers(() => focus(spec.contentKey, spec.pose), usable), [spec.contentKey, spec.pose])
  const release = () => {
    if (pressed.current) {
      pressed.current = false
      removeHover(group)
    }
  }

  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (e.nativeEvent.pointerType !== 'mouse' || !usable()) return
      e.stopPropagation()
      addHover(group)
      gl.domElement.style.cursor = 'pointer'
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      if (e.nativeEvent.pointerType !== 'mouse') return
      removeHover(group)
      gl.domElement.style.cursor = ''
    },
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      if (!usable()) return
      if (e.nativeEvent.pointerType !== 'mouse' && !pressed.current) {
        pressed.current = true
        addHover(group)
      }
      click.onPointerDown(e)
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      release()
      click.onPointerUp(e)
    },
    onPointerCancel: () => {
      release()
      click.onPointerCancel()
    },
  }
}
