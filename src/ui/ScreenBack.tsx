import { useEffect, useRef } from 'react'
import { CLICK_MAX_MOVE_PX, CLICK_MAX_MS } from '../scene/clickRule'
import { back, getState, useFocus } from '../store/focus'
import { restoreFocus } from './focusReturn'
import { insideCount } from '../scene/wallView'

const INSIDE = '.scr, .menu, .bar, .scrim, .popup'
const isOutside = (t: EventTarget | null) => t instanceof Element && !t.closest(INSIDE)

export function ScreenBack() {
  const phase = useFocus((s) => s.phase)
  const show = phase === 'screen'
  const prev = useRef(phase)
  useEffect(() => {
    if (prev.current === 'screen' && phase === 'idle') {
      const a = document.activeElement
      if (!a || a === document.body || a.closest('.scr')) restoreFocus()
    }
    prev.current = phase
  }, [phase])

  useEffect(() => {
    if (!show) return
    let down: { x: number; y: number; t: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = e.isPrimary && e.button === 0 && isOutside(e.target) ? { x: e.clientX, y: e.clientY, t: performance.now() } : null
    }
    const onUp = (e: PointerEvent) => {
      const d = down
      down = null
      if (!d || !e.isPrimary || !isOutside(e.target)) return
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= CLICK_MAX_MOVE_PX || performance.now() - d.t >= CLICK_MAX_MS) return
      const inside = insideCount()
      setTimeout(() => {
        if (insideCount() !== inside) return
        const s = getState()
        if (s.phase === 'screen' && s.detail === null) back()
      }, 0)
    }
    const onCancel = () => { down = null }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = [...document.querySelectorAll<HTMLElement>('.scr [data-screen-item]')]
      if (!items.length) return
      const at = items.indexOf(document.activeElement as HTMLElement)
      if (at === -1) { e.preventDefault(); items[0].focus({ preventScroll: true }); return }
      const next = e.shiftKey ? at - 1 : at + 1
      if (next < 0 || next >= items.length) { e.preventDefault(); items[(next + items.length) % items.length].focus({ preventScroll: true }) }
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [show])

  return null
}
