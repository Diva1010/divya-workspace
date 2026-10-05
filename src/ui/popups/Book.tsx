import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject, type TouchEvent } from 'react'
import { categoryColor, companyOf, content, roleChapter, roleDates, roleInterval, techOf, type Company, type ExperienceRole } from '../../content'
import { SECTION_ICON } from '../../icons'
import { back } from '../../store/focus'
import { CloseButton } from '../CloseButton'
import { Icon } from '../Icon'
import { safeHref } from '../parts'

type Role = ExperienceRole

const TURN_MS = 550
const SLIDE_MS = 200
const SWIPE_PX = 40
const TWO_PAGE_MIN = 720
const TABS_W = 108

const clean = (items: string[]) => items.map((i) => i.trim()).filter(Boolean)

function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setOn(mq.matches)
    mq.addEventListener('change', f)
    f()
    return () => mq.removeEventListener('change', f)
  }, [query])
  return on
}

function useWide(ref: RefObject<HTMLDivElement | null>) {
  const [wide, setWide] = useState(() => Math.min(1180, window.innerWidth - 48) - TABS_W >= TWO_PAGE_MIN)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setWide(el.clientWidth - TABS_W >= TWO_PAGE_MIN)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return wide
}

function LogoPlate({ company }: { company?: Company }) {
  const src = company?.logo ? safeHref(company.logo) : undefined
  const [failed, setFailed] = useState(false)
  const letter = (company?.name.trim()[0] ?? '?').toUpperCase()
  const size = company?.logoSize
  return (
    <div className="bk-logo" aria-hidden="true" data-company={company?.id}>
      {src && !failed ? (
        <img src={src} alt="" loading="eager" decoding="async" width={size?.[0]} height={size?.[1]} onError={() => setFailed(true)} />
      ) : (
        <span className="bk-logo-initial">{letter}</span>
      )}
    </div>
  )
}

function Timeline({ list, active }: { list: Role[]; active: number }) {
  const spans = list.map(roleInterval)
  const valid = spans.filter((s): s is [number, number] => s !== null)
  if (!valid.length) return null
  const first = Math.floor(Math.min(...valid.map((s) => s[0])) / 12)
  const lastYear = Math.floor(Math.max(...valid.map((s) => s[1])) / 12)
  const start = first * 12
  const total = (lastYear + 1) * 12 - start
  const pct = (m: number) => `${((m - start) / total) * 100}%`
  const ticks: number[] = []
  for (let y = first; y <= lastYear; y += 2) ticks.push(y)
  return (
    <div className="bk-timeline" aria-hidden="true">
      <div className="bk-tl-bar">
        {spans.map((s, n) => s && <i key={n} className={n === active ? 'bk-seg on' : 'bk-seg'} style={{ left: pct(s[0]), width: `${((s[1] - s[0] + 1) / total) * 100}%` }} />)}
      </div>
      <div className="bk-tl-axis">
        {ticks.map((y) => <span key={y} className="bk-tick" style={{ left: pct(y * 12) }}><b>{y}</b></span>)}
      </div>
    </div>
  )
}

function RoleHead({ e }: { e: Role }) {
  const company = companyOf(e)
  const dates = [roleDates(e), e.location?.trim()].filter(Boolean).join(' · ')
  const tech = techOf(e)
  return (
    <>
      <div className="bk-head">
        <LogoPlate key={company?.id} company={company} />
        <div className="bk-headtext">
          {company?.name.trim() && <h3 className="bk-company">{company.name}</h3>}
          {e.role.trim() && <p className="bk-roleline">{e.role}</p>}
          {dates && <p className="bk-dates">{dates}</p>}
        </div>
      </div>
      {tech.length > 0 && (
        <ul className="bk-tags" aria-label="Tech">
          {tech.map((t, i) => <li key={i}><i className="bk-dot" aria-hidden="true" style={{ background: categoryColor(t.category) }} />{t.name}</li>)}
        </ul>
      )}
    </>
  )
}

function Highlights({ e }: { e: Role }) {
  const list = clean(e.highlights)
  if (!list.length) return null
  return <ul className="bk-list" aria-label="Highlights">{list.map((h, i) => <li key={i}>{h}</li>)}</ul>
}

function Page({ side, label, visual, resetKey, children }: { side: 'left' | 'right' | 'single'; label: string; visual?: boolean; resetKey: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [over, setOver] = useState(false)
  const [more, setMore] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || visual) return
    el.scrollTop = 0
    const check = () => {
      setOver(el.scrollHeight > el.clientHeight + 1)
      setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    el.addEventListener('scroll', check, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', check)
    }
  }, [visual, resetKey])
  if (visual) return <div className={`bk-page ${side}`} aria-hidden="true">{children}</div>
  return (
    <div
      ref={ref}
      className={`bk-page ${side}`}
      tabIndex={over ? 0 : undefined}
      role={over ? 'region' : undefined}
      aria-label={over ? label : undefined}
    >
      {children}
      <div className="bk-fade" data-on={more} aria-hidden="true" />
    </div>
  )
}

type Leaf = { from: number; dir: 1 | -1; motion: 'flip' | 'slide' }

function pages(e: Role, narrow: boolean, visual: boolean, index: number, heading: string) {
  const name = e.role.trim() || 'Role'
  const title = <h2 className="bk-title">{heading}</h2>
  if (narrow) return { single: <Page side="single" label={name} visual={visual} resetKey={index}>{title}<RoleHead e={e} /><Timeline list={content.experience} active={index} /><Highlights e={e} /></Page> }
  return {
    left: <Page side="left" label={`${name}: details`} visual={visual} resetKey={index}>{title}<RoleHead e={e} /><Timeline list={content.experience} active={index} /></Page>,
    right: <Page side="right" label={`${name}: highlights`} visual={visual} resetKey={index}><Highlights e={e} /></Page>,
  }
}

export function Book() {
  const list = content.experience
  const root = useRef<HTMLDivElement>(null)
  const wide = useWide(root)
  const coarse = useMedia('(pointer: coarse)')
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const narrow = !wide
  const motion: 'none' | 'slide' | 'flip' = reduced ? 'none' : coarse || narrow ? 'slide' : 'flip'
  const uid = useId()
  const [index, setIndex] = useState(0)
  const [leaf, setLeaf] = useState<Leaf | null>(null)
  const busy = useRef(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const prevBtn = useRef<HTMLButtonElement>(null)
  const nextBtn = useRef<HTMLButtonElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const last = list.length - 1
  const i = Math.min(index, Math.max(last, 0))

  useEffect(() => {
    if (!leaf) return
    busy.current = true
    const t = window.setTimeout(() => { busy.current = false; setLeaf(null) }, leaf.motion === 'flip' ? TURN_MS : SLIDE_MS)
    return () => { window.clearTimeout(t); busy.current = false }
  }, [leaf])

  const go = useCallback((to: number) => {
    if (busy.current || to < 0 || to > last || to === i) return
    if (motion === 'none') { setIndex(to); return }
    setLeaf({ from: i, dir: to > i ? 1 : -1, motion })
    setIndex(to)
  }, [i, last, motion])

  useEffect(() => {
    if (document.activeElement !== document.body) return
    ;(i === last ? prevBtn.current : nextBtn.current)?.focus()
  }, [i, last])
  useEffect(() => {
    if (document.activeElement?.getAttribute('role') === 'tab') tabs.current[i]?.focus()
  }, [i])

  useEffect(() => {
    if (list.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement | null
      const onTab = t?.getAttribute('role') === 'tab'
      const paging = e.key === 'PageDown' || e.key === 'PageUp'
      if (paging && t?.classList.contains('bk-page') && t.scrollHeight > t.clientHeight + 1) {
        const atEnd = t.scrollTop + t.clientHeight >= t.scrollHeight - 1
        const atTop = t.scrollTop <= 0
        if (e.key === 'PageDown' ? !atEnd : !atTop) return
      }
      let to: number | null = null
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (onTab && e.key === 'ArrowDown')) to = i + 1
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (onTab && e.key === 'ArrowUp')) to = i - 1
      else if (e.key === 'Home') to = 0
      else if (e.key === 'End') to = last
      if (to === null) return
      e.preventDefault()
      go(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, i, last, list.length])

  const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } }
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const t = e.changedTouches[0]
    const dx = t.clientX - s.x
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(t.clientY - s.y)) go(dx < 0 ? i + 1 : i - 1)
  }

  const heading = content.sections.experience.label
  const vars = { '--bk-turn-ms': `${TURN_MS}ms`, '--bk-slide-ms': `${SLIDE_MS}ms`, '--bk-tabs-w': `${TABS_W}px` } as CSSProperties
  const flip = motion === 'flip'
  const close = (
    <CloseButton label="Close experience" variant="paper" onClick={back} />
  )

  if (list.length === 0) {
    return (
      <div ref={root} className="bk" data-layout={narrow ? 'narrow' : 'wide'} style={vars}>
        <div className="bk-main">
          {close}
          <div className="bk-empty">
            <Icon name={SECTION_ICON.experience} size={48} />
            <p>No experience added yet</p>
          </div>
        </div>
      </div>
    )
  }

  const e = list[i]
  const company = companyOf(e)?.name.trim()
  const now = pages(e, narrow, false, i, heading)
  const status = `Chapter ${i + 1} of ${list.length}: ${[e.role.trim(), company].filter(Boolean).join(' at ')}`.replace(/: $/, '')
  const tabbed = list.length > 1

  const old = leaf ? pages(list[Math.min(leaf.from, last)], narrow, true, leaf.from, heading) : null
  const target = leaf && leaf.motion === 'flip' ? pages(e, narrow, true, i, heading) : null
  const fwd = leaf?.dir === 1
  const front = old && leaf?.motion === 'flip' ? (fwd ? old.right : old.left) : null
  const rear = target ? (fwd ? target.left : target.right) : null
  const overlay = old && leaf?.motion === 'flip' ? (fwd ? old.left : old.right) : null
  const sliding = leaf?.motion === 'slide'

  return (
    <div ref={root} className="bk" data-layout={narrow ? 'narrow' : 'wide'} data-flip={flip} style={vars}>
      {tabbed && (
        <div className="bk-tabs" role="tablist" aria-label="Experience chapters" aria-orientation={narrow ? 'horizontal' : 'vertical'}>
          {list.map((r, n) => {
            const label = roleChapter(r)
            const co = companyOf(r)?.name.trim()
            return (
              <button
                key={n}
                ref={(el) => { tabs.current[n] = el }}
                type="button"
                role="tab"
                id={`${uid}-tab-${n}`}
                className="bk-tab"
                aria-selected={n === i}
                aria-controls={`${uid}-panel`}
                aria-label={`${label}: ${[r.role.trim(), co].filter(Boolean).join(', ')}`}
                tabIndex={n === i ? 0 : -1}
                onClick={() => go(n)}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
      <div className="bk-main">
        {close}
        <div className="bk-persp" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div
            className={`bk-book${sliding ? (fwd ? ' slide-fwd' : ' slide-back') : ''}`}
            {...(tabbed ? { role: 'tabpanel', id: `${uid}-panel`, 'aria-labelledby': `${uid}-tab-${i}` } : {})}
          >
            {narrow ? now.single : <>{now.left}{now.right}</>}
            {overlay && <div className={`bk-overlay ${fwd ? 'left' : 'right'}`} aria-hidden="true">{overlay}</div>}
            {leaf?.motion === 'flip' && (
              <div className={`bk-leaf ${fwd ? 'fwd' : 'back'}`} aria-hidden="true">
                <div className="bk-face bk-front">{front}</div>
                <div className="bk-face bk-rear">{rear}</div>
              </div>
            )}
            {sliding && old && (
              <div className={`bk-slide-out ${fwd ? 'fwd' : 'back'}`} aria-hidden="true">
                {narrow ? old.single : <>{old.left}{old.right}</>}
              </div>
            )}
          </div>
        </div>
        {tabbed && (
          <nav className="bk-pager" aria-label="Chapters">
            <button ref={prevBtn} type="button" className="bk-nav" onClick={() => go(i - 1)} disabled={i === 0}><span aria-hidden="true">←</span> Previous</button>
            <span aria-hidden="true">Chapter {i + 1} of {list.length} · {roleChapter(e)}</span>
            <button ref={nextBtn} type="button" className="bk-nav" onClick={() => go(i + 1)} disabled={i >= last}>Next <span aria-hidden="true">→</span></button>
          </nav>
        )}
        <p className="bk-sr" aria-live="polite">{status}</p>
      </div>
    </div>
  )
}
