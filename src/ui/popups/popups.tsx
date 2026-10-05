import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { categoryColor, content, techsByCategory } from '../../content'
import { back, focus } from '../../store/focus'
import { AboutPhoto, DownloadPdf, Empty, ProjectTile, projectItemId, safeHref } from '../parts'
import { Book } from './Book'
import { ProjectDetail } from './ProjectDetail'
import { SkillsDashboard } from './SkillsDashboard'
import { PopupShell } from './PopupShell'

const title = (k: keyof typeof content.sections) => content.sections[k].label

export function AboutPopup() {
  const a = content.about
  return (
    <PopupShell title={title('about')} variant="side">
      <div className={`about${safeHref(a.photo ?? '') ? ' has-photo' : ''}`}>
        <AboutPhoto />
        <div className="about-text">
          {a.greeting?.trim() && <p className="lead">{a.greeting}</p>}
          {a.headline.trim() && <p className="muted about-headline">{a.headline}</p>}
          {a.paragraphs?.map((t, n) => t.trim() && <p key={n} className="about-p">{t}</p>)}
          {a.currentChips && a.currentChips.length > 0 && (
            <>
              {a.currentLabel?.trim() && <h3>{a.currentLabel}</h3>}
              <ul className="bk-tags about-chips">{a.currentChips.map((c) => <li key={c}>{c}</li>)}</ul>
            </>
          )}
          <button type="button" className="btn" onClick={() => focus('resume')}>{title('resume')}</button>
        </div>
      </div>
    </PopupShell>
  )
}

export function ExperiencePopup() {
  return (
    <PopupShell title={title('experience')} variant="book-full">
      <Book />
    </PopupShell>
  )
}

export function NowPopup() {
  const { heading, items, tagline } = content.now
  const list = items.map((i) => i.trim()).filter(Boolean)
  return (
    <PopupShell title={heading.trim() || title('now')} variant="side">
      {list.length > 0 && <ul className="now-list">{list.map((i, n) => <li key={n}>{i}</li>)}</ul>}
      {tagline.trim() && <p className="muted">{tagline}</p>}
      {list.length === 0 && !tagline.trim() && <Empty />}
    </PopupShell>
  )
}

export function SkillsPopup() {
  const groups = techsByCategory()
  const [cat, setCat] = useState<string | null>(null)
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (cat !== null || !last.current) return
    document.querySelector<HTMLElement>(`[data-skillcat="${CSS.escape(last.current)}"]`)?.focus({ preventScroll: true })
  }, [cat])
  if (cat !== null) return <SkillsDashboard initialCategory={cat} returnable={false} onClose={() => setCat(null)} />
  return (
    <PopupShell title={title('skills')} variant="wide">
      {groups.length === 0 ? <Empty /> : (
        <div className="ptile-wrap">
          <ul className="skillcat-grid">
            {groups.map((g) => (
              <li key={g.category}>
                <button type="button" className="skillcat" data-skillcat={g.category} aria-label={`${g.category}, ${g.technologies.length} technologies. Open skills`} onClick={() => { last.current = g.category; setCat(g.category) }}>
                  <i className="bk-dot" aria-hidden="true" style={{ background: categoryColor(g.category) }} />
                  <span className="skillcat-name">{g.category}</span>
                  <span className="skillcat-count">{g.technologies.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PopupShell>
  )
}

export function SkillsDashboardPopup({ category }: { category: string }) {
  return <SkillsDashboard initialCategory={category} returnable onClose={back} />
}

export function ProjectsPopup() {
  const list = content.projects
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const lastId = useRef<string | null>(null)
  useEffect(() => {
    if (openIndex !== null || !lastId.current) return
    document.querySelector<HTMLElement>(`[data-ptile="${CSS.escape(lastId.current)}"]`)?.focus({ preventScroll: true })
  }, [openIndex])
  if (openIndex !== null) return <ProjectDetail startIndex={openIndex} onClose={() => setOpenIndex(null)} />
  return (
    <PopupShell title={title('projects')} variant="wide">
      {list.length === 0 ? <Empty /> : (
        <div className="ptile-wrap">
          <ul className="ptile-grid">
            {list.map((pr, i) => {
              const id = projectItemId(pr, i)
              return (
                <li key={id}>
                  <ProjectTile p={pr} id={id} onOpen={() => { lastId.current = id; setOpenIndex(i) }} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </PopupShell>
  )
}

export function ProjectDetailPopup({ id }: { id: string }) {
  const index = content.projects.findIndex((pr, i) => projectItemId(pr, i) === id)
  if (index < 0) return null
  return <ProjectDetail startIndex={index} onClose={back} />
}

const PREVIEW_MIN_POPUP_PX = 640

export function ResumePopup() {
  const pdf = safeHref(content.resume.pdf)
  const [preview, setPreview] = useState(
    () => !!pdf && !!navigator.pdfViewerEnabled && !window.matchMedia('(pointer: coarse)').matches,
  )
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const w = box.current?.closest<HTMLElement>('.popup')?.offsetWidth ?? 0
    if (preview && w < PREVIEW_MIN_POPUP_PX) setPreview(false)
  }, [preview])
  return (
    <PopupShell title={title('resume')} variant="side">
      <div ref={box}>
        {pdf && preview && <div className="doc"><iframe src={pdf} title="Resume preview" /></div>}
        <DownloadPdf />
      </div>
    </PopupShell>
  )
}

export { CurrentReadPopup, ReadingPopup, TravelPopup } from './Sketch'
