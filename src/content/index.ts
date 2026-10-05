import raw from './content.json'
import { TECH_CATEGORIES, TECH_CATEGORY_COLORS, type Company, type Content, type ExperienceRole, type Project, type Technology } from './types'

export { TECH_CATEGORY_COLORS } from './types'
export type { Company, Content, ExperienceRole, Project, Technology } from './types'

type RawRole = Omit<ExperienceRole, 'companyId' | 'techIds'> & { companyId?: string; techIds?: string[]; org?: string; tech?: string[] }
type RawProject = Omit<Project, 'techIds' | 'bullets'> & { techIds?: string[]; bullets?: string[]; tech?: string[] }
type RawContent = Omit<Content, 'companies' | 'technologies' | 'experience' | 'projects'> & {
  skills?: unknown
  companies?: Company[]; technologies?: Technology[]; experience: RawRole[]; projects: RawProject[] }

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function normalise(r: RawContent): Content {
  const companies = [...(r.companies ?? [])]
  const technologies = [...(r.technologies ?? [])]
  const idsFromNames = (names: string[] = []) =>
    names.map((name) => {
      const found = technologies.find((t) => t.name.trim().toLowerCase() === name.trim().toLowerCase())
      if (found) return found.id
      const id = slug(name) || `tech-${technologies.length + 1}`
      if (!technologies.some((t) => t.id === id)) technologies.push({ id, name: name.trim(), category: 'Other' })
      return id
    })
  const experience: ExperienceRole[] = r.experience.map((e) => {
    let companyId = e.companyId ?? ''
    if (!companyId && e.org !== undefined) {
      const name = e.org.trim()
      companyId = slug(name) || `company-${companies.length + 1}`
      if (!companies.some((c) => c.id === companyId)) companies.push({ id: companyId, name })
    }
    const techIds = e.techIds ?? idsFromNames(e.tech)
    const { org: _org, tech: _tech, ...rest } = e
    void _org
    void _tech
    return { ...rest, companyId, techIds }
  })
  const projects: Project[] = r.projects.map((p) => {
    const { tech: _tech, ...rest } = p
    void _tech
    return { ...rest, bullets: p.bullets ?? [], techIds: p.techIds ?? idsFromNames(p.tech) }
  })
  const { skills: _skills, ...rest } = r
  void _skills
  return { ...rest, companies, technologies, experience, projects } as Content
}

const txt = (s?: string) => s?.trim() || undefined
function cleanReading(r: Content['reading']): Content['reading'] {
  if (!r) return undefined
  const top5 = (r.top5 ?? []).filter((b) => b.title?.trim()).map((b) => ({ title: b.title.trim(), author: txt(b.author), cover: txt(b.cover) }))
  const n = r.number1?.title?.trim() ? { title: r.number1.title.trim(), author: txt(r.number1.author), reason: txt(r.number1.reason), cover: txt(r.number1.cover) } : undefined
  const f = r.favoriteThisYear?.title?.trim() ? { title: r.favoriteThisYear.title.trim(), author: txt(r.favoriteThisYear.author), year: txt(r.favoriteThisYear.year), note: txt(r.favoriteThisYear.note), cover: txt(r.favoriteThisYear.cover) } : undefined
  return { top5: top5.length ? top5 : undefined, number1: n, favoriteThisYear: f, favoriteGenre: txt(r.favoriteGenre) }
}
function cleanCurrentRead(r: Content['currentRead']): Content['currentRead'] {
  return r?.title?.trim() ? { title: r.title.trim(), author: txt(r.author), note: txt(r.note), cover: txt(r.cover) } : undefined
}
function cleanTravel(r: Content['travel']): Content['travel'] {
  if (!r) return undefined
  const places = (r.places ?? []).filter((p) => p.name?.trim()).map((p) => ({ id: txt(p.id), name: p.name.trim(), region: txt(p.region), note: txt(p.note) }))
  const num = (v: unknown) => (typeof v === 'number' && v > 0 ? v : undefined)
  const credit = (c: NonNullable<NonNullable<Content['travel']>['photos']>[number]['credit']) => (c?.author?.trim() && c.license?.trim() && c.source?.trim() ? { author: c.author.trim(), license: c.license.trim(), licenseUrl: txt(c.licenseUrl), source: c.source.trim() } : undefined)
  const photos = (r.photos ?? []).filter((p) => p.path?.trim()).map((p) => ({ path: p.path.trim(), thumb: txt(p.thumb), alt: p.alt?.trim() ?? '', caption: txt(p.caption), place: txt(p.place), width: num(p.width), height: num(p.height), credit: credit(p.credit) }))
  return { places: places.length ? places : undefined, photos: photos.length ? photos : undefined }
}

export const content = normalise(raw as unknown as RawContent)
content.reading = cleanReading(content.reading)
content.currentRead = cleanCurrentRead(content.currentRead)
content.travel = cleanTravel(content.travel)

export function getReading(): NonNullable<Content['reading']> | null {
  const r = content.reading
  return r && (r.top5 || r.number1 || r.favoriteThisYear || r.favoriteGenre) ? r : null
}
export function getCurrentRead(): NonNullable<Content['currentRead']> | null {
  return content.currentRead ?? null
}
export function getTravel(): NonNullable<Content['travel']> | null {
  const t = content.travel
  return t && (t.places || t.photos) ? t : null
}

function getEmail(): string | null {
  const { emailUser, emailDomain, email } = content.contact
  const u = emailUser?.trim()
  const d = emailDomain?.trim()
  if (u && d) return `${u}@${d}`
  return email?.trim() || null
}
export function getMailto(): string | null {
  const e = getEmail()
  return e ? `mailto:${e}` : null
}
const WORKSPACE_SUFFIX = 'Workspace'
export const siteTitle = () => {
  const name = content.identity.name.trim()
  return name ? `${name}'s ${WORKSPACE_SUFFIX}` : WORKSPACE_SUFFIX
}
export const educationStatus = (status: string): string => {
  const s = status.trim()
  return s === 'completed' ? 'Completed' : s === 'in-progress' ? 'In progress' : s
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const isPresent = (s: string) => s.trim().toLowerCase() === 'present'
function parseMonth(s: string): number | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s.trim())
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null
}
const currentMonth = () => {
  const d = new Date()
  return d.getFullYear() * 12 + d.getMonth()
}
const monthIndexOf = (s: string) => (isPresent(s) ? currentMonth() : parseMonth(s))
const monthLabel = (idx: number) => `${MONTH_NAMES[idx % 12]} ${Math.floor(idx / 12)}`
export function roleInterval(r: ExperienceRole) {
  return interval(r)
}
function interval(r: ExperienceRole): [number, number] | null {
  const a = parseMonth(r.start)
  const b = monthIndexOf(r.end)
  return a === null || b === null || b < a ? null : [a, b]
}
function unionMonths(list: ([number, number] | null)[]): number {
  const iv = list.filter((x): x is [number, number] => x !== null).sort((x, y) => x[0] - y[0])
  let total = 0
  let cur: [number, number] | null = null
  for (const [a, b] of iv) {
    if (cur && a <= cur[1]) cur[1] = Math.max(cur[1], b)
    else {
      if (cur) total += cur[1] - cur[0] + 1
      cur = [a, b]
    }
  }
  return cur ? total + cur[1] - cur[0] + 1 : total
}

const companyById = new Map(content.companies.map((c) => [c.id, c]))
const techById = new Map(content.technologies.map((t) => [t.id, t]))
export const categoryColor = (category: string): string => (TECH_CATEGORY_COLORS as Record<string, string>)[category] ?? '#6E604A'
export const companyOf = (r: ExperienceRole): Company | undefined => companyById.get(r.companyId)
export const techOf = (r: ExperienceRole): Technology[] => r.techIds.map((id) => techById.get(id)).filter((t): t is Technology => !!t)

export function roleDates(r: ExperienceRole): string {
  const f = (s: string) => (isPresent(s) ? 'Present' : parseMonth(s) === null ? s.trim() : monthLabel(parseMonth(s)!))
  return [f(r.start), f(r.end)].filter(Boolean).join(' – ')
}
export function roleChapter(r: ExperienceRole): string {
  if (r.chapter?.trim()) return r.chapter.trim()
  const year = (s: string) => (isPresent(s) ? 'Present' : parseMonth(s) === null ? s.trim() : String(Math.floor(parseMonth(s)! / 12)))
  const a = year(r.start)
  const b = year(r.end)
  return !b || a === b ? a : `${a}–${b}`
}

export interface TechUsage { roles: ExperienceRole[]; companies: Company[] }
let usage: Map<string, TechUsage> | null = null
export function techUsage(): Map<string, TechUsage> {
  if (usage) return usage
  usage = new Map()
  for (const r of content.experience) {
    const c = companyOf(r)
    for (const id of r.techIds) {
      const u = usage.get(id) ?? { roles: [], companies: [] }
      u.roles.push(r)
      if (c && !u.companies.includes(c)) u.companies.push(c)
      usage.set(id, u)
    }
  }
  return usage
}
const monthsCache = new Map<string, number | null>()
export function techMonths(id: string): number | null {
  if (monthsCache.has(id)) return monthsCache.get(id)!
  const u = techUsage().get(id)
  const m = u ? unionMonths(u.roles.map(interval)) : null
  monthsCache.set(id, m)
  return m
}
let career: number | null = null
const careerMonths = (): number => (career ??= unionMonths(content.experience.map(interval)))

export const projectTech = (p: Project): Technology[] => p.techIds.map((id) => techById.get(id)).filter((t): t is Technology => !!t)

let projectsByTech: Map<string, Project[]> | null = null
export function techProjects(id: string): Project[] {
  if (!projectsByTech) {
    projectsByTech = new Map()
    for (const p of content.projects) for (const t of p.techIds) projectsByTech.set(t, [...(projectsByTech.get(t) ?? []), p])
  }
  return projectsByTech.get(id) ?? []
}


const relatedCache = new Map<string, { tech: Technology; shared: number }[]>()
const RELATED_MAX = 6
export function relatedTech(id: string): { tech: Technology; shared: number }[] {
  const hit = relatedCache.get(id)
  if (hit) return hit
  const counts = new Map<string, number>()
  for (const ids of [...content.experience.map((r) => r.techIds), ...content.projects.map((p) => p.techIds)]) {
    if (!ids.includes(id)) continue
    for (const o of new Set(ids)) if (o !== id) counts.set(o, (counts.get(o) ?? 0) + 1)
  }
  const out = [...counts]
    .map(([o, shared]) => ({ tech: techById.get(o)!, shared }))
    .filter((x) => x.tech)
    .sort((a, b) => b.shared - a.shared || a.tech.name.localeCompare(b.tech.name))
    .slice(0, RELATED_MAX)
  relatedCache.set(id, out)
  return out
}

let grouped: { category: string; technologies: Technology[] }[] | null = null
export function techsByCategory() {
  if (grouped) return grouped
  const order: string[] = [...TECH_CATEGORIES]
  for (const t of content.technologies) if (!order.includes(t.category)) order.push(t.category)
  grouped = order.map((category) => ({ category, technologies: content.technologies.filter((t) => t.category === category) })).filter((g) => g.technologies.length > 0)
  return grouped
}

export function formatExperience(months: number | null): string | null {
  if (months === null) return null
  return months >= 12 ? `${(Math.round((months / 12) * 10) / 10).toFixed(1)} yrs` : `${months} month${months === 1 ? '' : 's'}`
}
export const careerYearsText = (): string => (Math.round((careerMonths() / 12) * 10) / 10).toFixed(1)
export const barFraction = (months: number | null): number | null => (months === null ? null : Math.min(1, months / careerMonths()))
export function sortedTechs(category: string): Technology[] {
  return content.technologies
    .filter((t) => t.category === category)
    .map((t) => ({ t, m: techMonths(t.id) }))
    .sort((a, b) => (a.m === null ? 1 : 0) - (b.m === null ? 1 : 0) || (b.m ?? 0) - (a.m ?? 0) || a.t.name.localeCompare(b.t.name))
    .map((x) => x.t)
}
