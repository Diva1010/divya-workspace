import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMarkerUi } from '../scene/markerState'
import { useFocus } from '../store/focus'

const CURSOR_DX = 14
const CURSOR_DY = 18
const MARKER_DY = 30
const MARKER_DX = 16
const EDGE = 8

export function MarkerOverlay() {
  const label = useMarkerUi((s) => s.label)
  const hint = useMarkerUi((s) => s.hint && s.sparkles)
  const idle = useFocus((s) => s.phase === 'idle' && s.active === null)
  const tip = useRef<HTMLDivElement>(null)
  const at = useRef({ x: 0, y: 0 })
  const [hintBottom, setHintBottom] = useState(76)

  const place = () => {
    const el = tip.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    let x: number
    let y: number
    if (label?.at === 'cursor') {
      x = at.current.x + CURSOR_DX
      y = at.current.y + CURSOR_DY
      if (x + w + EDGE > window.innerWidth) x = at.current.x - CURSOR_DX - w
      if (y + h + EDGE > window.innerHeight) y = at.current.y - CURSOR_DY - h
    } else if (label?.at === 'marker') {
      x = at.current.x + MARKER_DX
      y = at.current.y - MARKER_DY - h
      if (y < EDGE) y = at.current.y + MARKER_DY
    } else {
      x = at.current.x - w / 2
      y = at.current.y - MARKER_DY - h
      if (y < EDGE) y = at.current.y + MARKER_DY
    }
    x = Math.min(Math.max(x, EDGE), Math.max(EDGE, window.innerWidth - w - EDGE))
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
  }

  useLayoutEffect(() => {
    if (!label) return
    at.current = { x: label.x, y: label.y }
    place()
  }, [label])

  useEffect(() => {
    if (label?.at !== 'cursor') return
    const move = (e: PointerEvent) => {
      at.current = { x: e.clientX, y: e.clientY }
      place()
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [label?.at])

  useEffect(() => {
    const measure = () => {
      const bar = document.querySelector('.bar')
      if (bar) setHintBottom(Math.round(window.innerHeight - bar.getBoundingClientRect().top + 8))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <>
      <div className="spark-tip" ref={tip} data-on={!!label && idle} aria-hidden="true">{label?.text}</div>
      <div className="spark-hint" style={{ bottom: hintBottom }} data-on={hint && idle} aria-hidden="true">Tap the sparkles to explore</div>
    </>
  )
}
