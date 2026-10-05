import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { categoryColor, content, projectTech, type Project } from '../../content'
import { CloseButton } from '../CloseButton'
import { Icon } from '../Icon'
import { KIND_LABEL, ProjectArt, safeHref } from '../parts'
import { PopupShell } from './PopupShell'

const DETAIL_TWO_COLUMN_MIN = 720

function useCardWide(ref: RefObject<HTMLDivElement | null>) {
  const [wide, setWide] = useState(() => Math.min(980, window.innerWidth - 48) >= DETAIL_TWO_COLUMN_MIN)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setWide(el.clientWidth >= DETAIL_TWO_COLUMN_MIN)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return wide
}

export function ProjectDetail({ startIndex, onClose }: { startIndex: number; onClose: () => void }) {
  const list = content.projects
  const n = list.length
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(n - 1, 0)))
  const p: Project | undefined = list[index]
  const card = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const wide = useCardWide(card)
  const [over, setOver] = useState(false)
  const scroller = wide ? rightRef : bodyRef

  const go = useCallback((d: 1 | -1) => setIndex((i) => (i + d + n) % n), [n])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = 0
    const check = () => setOver(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [index, wide, scroller])

  useEffect(() => {
    if (n < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return
      const t = e.target as HTMLElement | null
      if (t?.closest('a') || t?.closest('[data-scroll-region]')) return
      e.preventDefault()
      go(e.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, n])

  if (!p) return null
  const bullets = p.bullets.map((b) => b.trim()).filter(Boolean)
  const tech = projectTech(p)
  const links = p.links.filter((l) => safeHref(l.url))
  const region = over ? { tabIndex: 0, role: 'region', 'aria-label': `${p.title}: details`, 'data-scroll-region': '' } : {}

  return (
    <PopupShell title={p.title} variant="project-full">
      <div ref={card} className="pd" data-layout={wide ? 'wide' : 'narrow'}>
        <CloseButton label="Close project" variant="paper" onClick={onClose} />
        <div key={p.id} ref={bodyRef} className="pd-body" {...(wide ? {} : region)}>
          <div className="pd-left">
            <ProjectArt p={p} variant="card" />
            <p className="pd-kind">{KIND_LABEL[p.kind]}</p>
            <h2 className="pd-title">{p.title}</h2>
            {p.tagline?.trim() && <p className="pd-tagline">{p.tagline}</p>}
          </div>
          <div ref={rightRef} className="pd-right" {...(wide ? region : {})}>
            {p.summary.trim() && <p className="pd-summary">{p.summary}</p>}
            {bullets.length > 0 && <ul className="bk-list pd-bullets">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
            {tech.length > 0 && (
              <>
                <h3 className="pd-h">Technologies</h3>
                <ul className="bk-tags" aria-label="Technologies">
                  {tech.map((t) => <li key={t.id}><i className="bk-dot" aria-hidden="true" style={{ background: categoryColor(t.category) }} />{t.name}</li>)}
                </ul>
              </>
            )}
            {links.length > 0 && (
              <ul className="pd-links">
                {links.map((l, i) => (
                  <li key={i}>
                    <a className="pd-link" href={safeHref(l.url)} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <Icon name="externalLink" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {n > 1 && (
          <nav className="pd-pager" aria-label="Projects">
            <button type="button" className="pd-nav" onClick={() => go(-1)}><span aria-hidden="true">←</span> Previous project</button>
            <span aria-hidden="true">Project {index + 1} of {n}</span>
            <button type="button" className="pd-nav" onClick={() => go(1)}>Next project <span aria-hidden="true">→</span></button>
          </nav>
        )}
        <p className="bk-sr" aria-live="polite">{`Project ${index + 1} of ${n}: ${p.title}`}</p>
      </div>
    </PopupShell>
  )
}
