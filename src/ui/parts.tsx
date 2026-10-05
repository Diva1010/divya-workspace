import { useState, type ReactNode } from 'react'
import { companyOf, content, getMailto, projectTech, roleDates, TECH_CATEGORY_COLORS, techOf, type Content, type Project } from '../content'
import { Icon } from './Icon'
import { PHOTO_FOCUS_X, PHOTO_FOCUS_Y } from '../scene/photoCrop'

export function safeHref(url: string): string | undefined {
  const u = url.trim()
  if (!u) return undefined
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return /^(https?:|mailto:)/i.test(u) ? u : undefined
  return u.startsWith('//') ? undefined : u
}

const clean = (items: string[]) => items.map((i) => i.trim()).filter(Boolean)

export function Empty({ children = 'Nothing added yet.' }: { children?: ReactNode }) {
  return <p className="muted">{children}</p>
}

function Tags({ items }: { items: string[] }) {
  const list = clean(items)
  if (!list.length) return null
  return (
    <ul className="tags" aria-label="Tech">
      {list.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  )
}

function LinkItem({ label, url, external = true }: { label: string; url: string; external?: boolean }) {
  const href = safeHref(url)
  if (!href) return <span className="link off">{label}<em> (link not added yet)</em></span>
  return <a className="link" href={href} {...(external && !href.startsWith('mailto:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</a>
}

export function DownloadPdf() {
  const href = safeHref(content.resume.pdf)
  if (!href) return null
  return (
    <div className="dl">
      <a className="btn" href={href} target="_blank" rel="noopener noreferrer"><Icon name="externalLink" size={16} />Open in new tab</a>
      <a className="btn" href={href} download="Divya_Kaushik_Resume.pdf"><Icon name="download" size={16} />Download PDF</a>
    </div>
  )
}

export function ExperienceEntry({ e, heading: H = 'h3' }: { e: Content['experience'][number]; heading?: 'h2' | 'h3' }) {
  const dates = roleDates(e)
  const highlights = clean(e.highlights)
  return (
    <article className="entry">
      <H>{e.role}</H>
      <p className="meta">{[companyOf(e)?.name.trim(), dates, e.location?.trim()].filter(Boolean).join(' · ')}</p>
      {highlights.length > 0 && <ul>{highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
      <Tags items={techOf(e).map((t) => t.name)} />
    </article>
  )
}

export const projectItemId = (p: Project, i: number) => p.id.trim() || String(i)

export const KIND_LABEL: Record<Project['kind'], string> = { game: 'Game', web: 'Web', ml: 'Machine learning' }
const KIND_COLOR: Record<Project['kind'], string> = { game: TECH_CATEGORY_COLORS['Game & AR'], web: TECH_CATEGORY_COLORS.Frontend, ml: TECH_CATEGORY_COLORS['Data & ML'] }

export function ProjectArt({ p, variant }: { p: Project; variant: 'card' | 'tile' }) {
  const src = p.image?.trim() ? safeHref(p.image) : undefined
  const [failed, setFailed] = useState(false)
  const img = src && !failed
  if (variant === 'tile') {
    return img ? (
      <div className="proj-art">
        <img src={src} alt="" width={p.imageSize?.[0]} height={p.imageSize?.[1]} loading="lazy" onError={() => setFailed(true)} />
      </div>
    ) : (
      <div className="proj-art fallback" style={{ '--art': KIND_COLOR[p.kind] } as React.CSSProperties} aria-hidden="true">
        <Icon name={p.kind === 'game' ? 'rocket' : 'folder'} size={48} />
      </div>
    )
  }
  return img ? (
    <div className="proj-art">
      <img src={src} alt={`${p.title} promotional artwork`} width={p.imageSize?.[0]} height={p.imageSize?.[1]} loading="lazy" onError={() => setFailed(true)} />
    </div>
  ) : (
    <div className="proj-art fallback" style={{ '--art': KIND_COLOR[p.kind] } as React.CSSProperties} aria-hidden="true">
      <Icon name={p.kind === 'game' ? 'rocket' : 'folder'} size={40} />
      <span>{p.title}</span>
    </div>
  )
}

export function ProjectTile({ p, id, onOpen, screenItem }: { p: Project; id: string; onOpen: () => void; screenItem?: boolean }) {
  return (
    <button
      type="button"
      className="ptile"
      data-ptile={id}
      {...(screenItem ? { 'data-screen-item': id } : {})}
      aria-label={`${p.title}, ${KIND_LABEL[p.kind]}. Open details`}
      onClick={onOpen}
    >
      <ProjectArt p={p} variant="tile" />
      <span className="ptile-title">{p.title}</span>
      <span className="ptile-kind">{KIND_LABEL[p.kind]}</span>
    </button>
  )
}

export function ProjectCard({ p }: { p: Project }) {
  const bullets = clean(p.bullets)
  const links = p.links.filter((l) => safeHref(l.url))
  return (
    <div className="project">
      <ProjectArt p={p} variant="card" />
      <p className="meta">{KIND_LABEL[p.kind]}</p>
      {p.summary.trim() && <p>{p.summary}</p>}
      {bullets.length > 0 && <ul className="proj-bullets">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
      <Tags items={projectTech(p).map((t) => t.name)} />
      {links.length > 0 && (
        <ul className="links">{links.map((l, i) => <li key={i}><LinkItem label={l.label} url={l.url} /></li>)}</ul>
      )}
    </div>
  )
}

export function ContactList() {
  const c = content.contact
  const rows: { label: string; url: string }[] = [
    { label: 'Email', url: getMailto() ?? '' },
    { label: 'LinkedIn', url: c.linkedin },
    { label: 'GitHub', url: c.github },
  ]
  return (
    <ul className="links contact">
      {rows.map((r) => (
        <li key={r.label}>
          <LinkItem label={r.label} url={r.url} external />
        </li>
      ))}
    </ul>
  )
}

export function AboutPhoto() {
  const src = safeHref(content.about.photo ?? '')
  if (!src) return null
  return (
    <img
      className="about-photo"
      src={src}
      alt={content.about.photoAlt ?? ''}
      loading="lazy"
      decoding="async"
      style={{ objectPosition: `${PHOTO_FOCUS_X * 100}% ${PHOTO_FOCUS_Y * 100}%` }}
    />
  )
}
