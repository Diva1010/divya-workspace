import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  barFraction, careerYearsText, categoryColor, companyOf, content, formatExperience, relatedTech, roleDates, sortedTechs, techMonths, techProjects, techsByCategory, techUsage,
} from '../../content'
import { openDetail } from '../../store/focus'
import { CloseButton } from '../CloseButton'
import { Icon } from '../Icon'
import { projectItemId } from '../parts'
import { PopupShell } from './PopupShell'

const DASH_TWO_COLUMN_MIN = 760

let resume: { category: string; techId: string } | null = null

function useCardWide(ref: RefObject<HTMLDivElement | null>) {
  const [wide, setWide] = useState(() => Math.min(1040, window.innerWidth - 48) >= DASH_TWO_COLUMN_MIN)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setWide(el.clientWidth >= DASH_TWO_COLUMN_MIN)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return wide
}

function Dot({ category }: { category: string }) {
  return <i className="bk-dot" aria-hidden="true" style={{ background: categoryColor(category) }} />
}

function TechDetail({ id, onProject, onRelated }: { id: string; onProject: (projectIndex: number) => void; onRelated: (techId: string, category: string) => void }) {
  const tech = content.technologies.find((t) => t.id === id)
  if (!tech) return null
  const months = techMonths(id)
  const years = formatExperience(months)
  const frac = barFraction(months)
  const roles = techUsage().get(id)?.roles ?? []
  const projects = techProjects(id)
  const related = relatedTech(id)
  const color = categoryColor(tech.category)
  return (
    <div className="sd-detail-body">
      <div className="sd-dhead">
        <h3 className="sd-name"><Dot category={tech.category} />{tech.name}</h3>
        <p className="sd-cat">{tech.category}</p>
      </div>
      {years !== null && frac !== null && (
        <div className="sd-yearsblock">
          <p className="sd-years">{years}</p>
          <div className="sd-bar" aria-hidden="true"><i style={{ width: `${frac * 100}%`, background: color }} /></div>
          <p className="sd-of">of {careerYearsText()} years of employment</p>
        </div>
      )}
      {tech.note?.trim() && <p className="sd-note">{tech.note}</p>}
      {roles.length === 0 && projects.length === 0 ? (
        <p className="sd-listed">Listed in my skills section.</p>
      ) : (
        <>
          <h4 className="sd-h">Used in</h4>
          <ul className="sd-used">
            {roles.map((r) => (
              <li key={r.id}>
                <strong>{companyOf(r)?.name}</strong>
                <span>{r.role} · {roleDates(r)}</span>
              </li>
            ))}
            {projects.map((p) => {
              const index = content.projects.indexOf(p)
              return (
                <li key={p.id}>
                  <button type="button" className="sd-link" onClick={() => onProject(index)}>{p.title}<Icon name="externalLink" size={14} /></button>
                  <span>Project</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {related.length > 0 && (
        <>
          <h4 className="sd-h">Related technologies</h4>
          <ul className="bk-tags sd-related">
            {related.map(({ tech: r }) => (
              <li key={r.id}>
                <button type="button" className="sd-chip" onClick={() => onRelated(r.id, r.category)}><Dot category={r.category} />{r.name}</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function SkillsDashboard({ initialCategory, returnable, onClose }: { initialCategory: string; returnable: boolean; onClose: () => void }) {
  const groups = techsByCategory()
  const names = groups.map((g) => g.category)
  const uid = useId()
  const start = useMemo(() => {
    const r = returnable ? resume : null
    const cat = r && names.includes(r.category) ? r.category : names.includes(initialCategory) ? initialCategory : names[0]
    const list = cat ? sortedTechs(cat) : []
    const tid = r && list.some((t) => t.id === r.techId) ? r.techId : list[0]?.id
    return { cat, tid, resumed: !!r }
  }, [])
  useEffect(() => {
    resume = null
  }, [])
  const [category, setCategory] = useState<string>(start.cat ?? '')
  const [techId, setTechId] = useState<string>(start.tid ?? '')
  const [showDetail, setShowDetail] = useState(start.resumed)
  const card = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const opts = useRef<(HTMLButtonElement | null)[]>([])
  const wide = useCardWide(card)
  const list = useMemo(() => sortedTechs(category), [category])
  const [rove, setRove] = useState(0)
  const [overList, setOverList] = useState(false)
  const [overDetail, setOverDetail] = useState(false)
  const tech = content.technologies.find((t) => t.id === techId)
  const tabIndex = Math.max(0, names.indexOf(category))

  const chooseCategory = (cat: string, focusTab = false) => {
    setCategory(cat)
    setTechId(sortedTechs(cat)[0]?.id ?? '')
    setShowDetail(false)
    setRove(0)
    if (focusTab) tabs.current[names.indexOf(cat)]?.focus()
  }
  const select = (id: string, cat?: string) => {
    if (cat && cat !== category) {
      setCategory(cat)
      setRove(Math.max(0, sortedTechs(cat).findIndex((t) => t.id === id)))
    } else setRove(Math.max(0, list.findIndex((t) => t.id === id)))
    setTechId(id)
    setShowDetail(true)
  }

  useLayoutEffect(() => {
    const check = (el: HTMLElement | null, set: (v: boolean) => void) => {
      if (!el) return () => {}
      el.scrollTop = 0
      const f = () => set(el.scrollHeight > el.clientHeight + 1)
      f()
      const ro = new ResizeObserver(f)
      ro.observe(el)
      return () => ro.disconnect()
    }
    const a = check(listRef.current, setOverList)
    const b = check(detailRef.current, setOverDetail)
    return () => {
      a()
      b()
    }
  }, [techId, category, wide, showDetail])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !wide && showDetail) {
        e.preventDefault()
        e.stopPropagation()
        setShowDetail(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [wide, showDetail])

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const to = e.key === 'ArrowRight' ? (i + 1) % names.length : e.key === 'ArrowLeft' ? (i - 1 + names.length) % names.length : e.key === 'Home' ? 0 : e.key === 'End' ? names.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    chooseCategory(names[to], true)
  }
  const onListKey = (e: React.KeyboardEvent) => {
    const to = e.key === 'ArrowDown' ? Math.min(list.length - 1, rove + 1) : e.key === 'ArrowUp' ? Math.max(0, rove - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    setRove(to)
    opts.current[to]?.focus()
  }
  const toProject = (index: number) => {
    if (returnable) resume = { category, techId }
    openDetail({ section: 'projects', id: projectItemId(content.projects[index], index) })
  }

  const showList = wide || !showDetail
  const showPanel = wide || showDetail
  const status = tech ? `${tech.name}: ${formatExperience(techMonths(tech.id)) ?? 'no years recorded'}` : ''
  const region = (over: boolean, label: string) => (over ? { tabIndex: 0, role: 'region', 'aria-label': label } : {})

  return (
    <PopupShell title={content.sections.skills.label} variant="skills-full">
      <div ref={card} className="sd" data-layout={wide ? 'wide' : 'narrow'}>
        <CloseButton label="Close skills" variant="paper" onClick={onClose} />
        <div className="sd-head">
          <h2 className="sd-title">{content.sections.skills.label}</h2>
          <div className="sd-tabs" role="tablist" aria-orientation="horizontal" aria-label="Skill categories">
            {groups.map((g, i) => (
              <button
                key={g.category}
                ref={(el) => { tabs.current[i] = el }}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                className="sd-tab"
                aria-selected={i === tabIndex}
                aria-controls={`${uid}-panel`}
                tabIndex={i === tabIndex ? 0 : -1}
                onClick={() => chooseCategory(g.category)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <Dot category={g.category} />
                {g.category}
                <span className="sd-count">{g.technologies.length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sd-main">
          {showList && (
            <div ref={listRef} className="sd-list" id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tabIndex}`} {...region(overList, `${category}: technologies`)}>
              <div role="listbox" aria-label={`${category} technologies`} onKeyDown={onListKey}>
                {list.map((t, i) => {
                  const months = techMonths(t.id)
                  const years = formatExperience(months)
                  const frac = barFraction(months)
                  return (
                    <button
                      key={t.id}
                      ref={(el) => { opts.current[i] = el }}
                      type="button"
                      role="option"
                      className="sd-row"
                      aria-selected={t.id === techId}
                      tabIndex={i === rove ? 0 : -1}
                      onFocus={() => setRove(i)}
                      onClick={() => select(t.id)}
                    >
                      <span className="sd-rowtop"><Dot category={t.category} /><span className="sd-rowname">{t.name}</span>{years !== null && <span className="sd-rowyears">{years}</span>}</span>
                      {frac !== null && <span className="sd-bar" aria-hidden="true"><i style={{ width: `${frac * 100}%`, background: categoryColor(t.category) }} /></span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {showPanel && (
            <div ref={detailRef} className="sd-detail" {...region(overDetail, `${tech?.name ?? 'Technology'}: details`)}>
              {!wide && (
                <button type="button" className="sd-back" onClick={() => setShowDetail(false)}><span aria-hidden="true">←</span> Back to list</button>
              )}
              {tech && <TechDetail id={tech.id} onProject={toProject} onRelated={(id, cat) => select(id, cat)} />}
            </div>
          )}
        </div>
        <p className="bk-sr" aria-live="polite">{status}</p>
      </div>
    </PopupShell>
  )
}
