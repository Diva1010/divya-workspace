import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CloseButton } from './CloseButton'
import { content } from '../content'
import { barGap, eduCount, PAGER_GAP_PX, SWIPE_HORIZONTAL_RATIO, SWIPE_MIN_PX } from '../scene/educationFocus'
import { back, stepEduCard, useFocus } from '../store/focus'

const OUTSIDE_SWIPE = '.focus-ui, .menu, .bar'

function useBarGap(on: boolean) {
  const [gap, setGap] = useState(0)
  useLayoutEffect(() => {
    if (!on) return
    const stage = document.getElementById('stage')
    const bar = document.querySelector('.bar')
    const measure = () => stage && setGap(barGap(stage.getBoundingClientRect().bottom) + PAGER_GAP_PX)
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (stage) ro?.observe(stage)
    if (bar) ro?.observe(bar)
    return () => ro?.disconnect()
  }, [on])
  return gap
}

export function FocusControls() {
  const active = useFocus((s) => s.active)
  const show = useFocus((s) => s.active !== null && s.screenUi && (s.phase === 'gliding' || s.phase === 'screen'))
  const cards = useFocus((s) => show && s.active === 'education' && s.eduCards)
  const card = useFocus((s) => s.eduCard)
  const count = eduCount()
  const pager = cards && count > 1
  const gap = useBarGap(pager)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show || document.querySelector('.scr [data-screen-item]')) return
    wrap.current?.querySelector('button')?.focus({ preventScroll: true })
  }, [show])

  useEffect(() => {
    if (!pager) return
    let from: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      from = e.isPrimary && e.button === 0 && !(e.target instanceof Element && e.target.closest(OUTSIDE_SWIPE)) ? { x: e.clientX, y: e.clientY } : null
    }
    const onUp = (e: PointerEvent) => {
      const f = from
      from = null
      if (!f || !e.isPrimary) return
      const dx = e.clientX - f.x
      const dy = e.clientY - f.y
      if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) stepEduCard(dx < 0 ? 1 : -1, count)
    }
    const onCancel = () => { from = null }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onCancel, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onCancel, true)
    }
  }, [pager, count])

  if (!show) return null
  const item = content.education.items[card]
  const announce = pager && item ? `Showing degree ${card + 1} of ${count}: ${[item.degree, item.institution].map((t) => t.trim()).filter(Boolean).join(', ')}` : ''
  return (
    <>
      <div className="focus-ui focus-close" ref={wrap}>
        <CloseButton label={active === 'education' ? 'Close Education view' : 'Exit focused view'} variant="paper" onClick={back} />
      </div>
      {pager && (
        <div className="focus-ui edu-pager" role="group" aria-label="Degrees" style={{ bottom: gap }}>
          <button type="button" aria-label="Previous degree" disabled={card <= 0} onClick={() => stepEduCard(-1, count)}>‹ Previous</button>
          <span aria-hidden="true">{card + 1} / {count}</span>
          <button type="button" aria-label="Next degree" disabled={card >= count - 1} onClick={() => stepEduCard(1, count)}>Next ›</button>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    </>
  )
}
