import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { navDebug } from './navDebug'

export type NavMode = 'full' | 'icons' | 'stacked'
const TITLE_SCALES = [1, 0.85, 0.72]
const MARGIN = 14
const GAP = 16
const HYSTERESIS = 8
const SUB_MIN_PX = 180

export interface Fit { mode: NavMode; scale: number; showSub: boolean }
interface Refs {
  stage: RefObject<HTMLElement | null>
  title: RefObject<HTMLElement | null>
  nav: RefObject<HTMLElement | null>
  probe: RefObject<HTMLElement | null>
  probeFull: RefObject<HTMLElement | null>
  probeIcons: RefObject<HTMLElement | null>
  probeName: RefObject<HTMLElement | null>
  probeSub: RefObject<HTMLElement | null>
}

const width = (el: HTMLElement | null) => (el ? el.getBoundingClientRect().width : 0)

export function useNavFit(r: Refs): Fit {
  const [fit, setFit] = useState<Fit>({ mode: 'full', scale: 1, showSub: true })
  const cur = useRef(fit)

  const measure = useCallback(() => {
    const stage = r.stage.current
    if (!stage || !r.probeFull.current) return
    const probeStyle = r.probe.current ? getComputedStyle(r.probe.current) : null
    const safeL = probeStyle ? parseFloat(probeStyle.paddingLeft) || 0 : 0
    const safeR = probeStyle ? parseFloat(probeStyle.paddingRight) || 0 : 0
    const avail = stage.clientWidth - 2 * MARGIN - safeL - safeR
    const fullW = width(r.probeFull.current)
    const iconsW = width(r.probeIcons.current)
    const nameW = width(r.probeName.current)
    const subW = width(r.probeSub.current)

    const candidates: Fit[] = [
      { mode: 'full', scale: 1, showSub: true },
      ...TITLE_SCALES.map((scale) => ({ mode: 'icons' as const, scale, showSub: true })),
      { mode: 'stacked', scale: 1, showSub: false },
    ]
    const need = (c: Fit) => (c.mode === 'full' ? nameW + GAP + fullW : c.mode === 'icons' ? nameW * c.scale + GAP + iconsW : 0)
    const prev = cur.current
    const curIdx = candidates.findIndex((c) => c.mode === prev.mode && c.scale === prev.scale)
    let idx = candidates.length - 1
    for (let i = 0; i < candidates.length - 1; i++) {
      const slack = curIdx !== -1 && i < curIdx ? HYSTERESIS : 0
      if (need(candidates[i]) + slack <= avail) {
        idx = i
        break
      }
    }
    const pick = candidates[idx]
    const navW = pick.mode === 'full' ? fullW : pick.mode === 'icons' ? iconsW : 0
    const titleRoom = avail - navW - GAP
    const subThreshold = Math.max(SUB_MIN_PX, 0.55 * subW)
    const showSub = pick.mode !== 'stacked' && titleRoom >= subThreshold + (prev.showSub ? 0 : HYSTERESIS)
    const next: Fit = { mode: pick.mode, scale: pick.scale, showSub }

    stage.style.setProperty('--nav-w', `${navW}px`)
    stage.style.setProperty('--title-scale', String(next.scale))
    Object.assign(navDebug, { mode: next.mode, scale: next.scale, full: Math.round(fullW), icons: Math.round(iconsW), name: Math.round(nameW), sub: Math.round(subW), avail: Math.round(avail) })
    if (next.mode !== prev.mode || next.scale !== prev.scale || next.showSub !== prev.showSub) {
      cur.current = next
      setFit(next)
    }
  }, [r])

  const vars = useCallback(() => {
    const stage = r.stage.current
    if (!stage) return
    if (r.title.current) stage.style.setProperty('--title-h', `${r.title.current.offsetHeight}px`)
    if (r.nav.current) stage.style.setProperty('--menu-b', `${r.nav.current.getBoundingClientRect().bottom - stage.getBoundingClientRect().top}px`)
  }, [r])

  useLayoutEffect(() => {
    let raf = 0
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        measure()
        vars()
      })
    }
    measure()
    vars()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    for (const el of [r.stage.current, r.title.current, r.nav.current, r.probeFull.current, r.probeIcons.current, r.probeName.current, r.probeSub.current]) if (el) ro?.observe(el)
    window.addEventListener('resize', schedule)
    document.fonts?.ready.then(schedule)
    document.fonts?.addEventListener?.('loadingdone', schedule)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', schedule)
      document.fonts?.removeEventListener?.('loadingdone', schedule)
    }
  }, [measure, vars, r])

  useLayoutEffect(() => {
    vars()
  }, [fit, vars])

  return fit
}
