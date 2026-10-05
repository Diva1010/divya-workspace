import { companyOf, content, roleDates } from '../content'
import type { ExperienceRole } from '../content/types'

export const EXP = {
  freeX0: 0.24, freeX1: 1.88, d: 0.26, gapWant: 0.5, dMin: 0.22, cardMax: 0.42,
  y: 2.88,
  sag: 0.03,
  labelH: 0.44, labelDy: 0.035,
  domeDy: 0.2, domeR: 0.034,
  headingY: 3.4, headingW: 1.25, headingH: 0.43,
  wallZ: -3.985, z: -3.972, 
}
export const EXP_POSE = 'experience'
const PASTELS = ['#F0C4D4', '#CDB8E8', '#BFE3D0', '#F6E3A8', '#F7CDB4']

export interface JobSpec {
  id: string
  name: string
  role: string
  dates: string
  logo?: string
  logoSize?: [number, number]
  x: number
  y: number
  d: number
  tile: string
}

const rolesChronological = (): ExperienceRole[] => [...content.experience].sort((a, b) => a.start.localeCompare(b.start))

export function layoutJobs(): { jobs: JobSpec[]; cx: number; d: number; gap: number; cardW: number } {
  const roles = rolesChronological()
  const n = Math.max(1, roles.length)
  const free = EXP.freeX1 - EXP.freeX0
  const d = Math.max(EXP.dMin, EXP.d - 0.02 * Math.max(0, n - 5))
  const gap = n > 1 ? Math.min(EXP.gapWant, (free + 0.05) / n) : EXP.gapWant
  const cardW = Math.min(EXP.cardMax, gap - 0.05)
  const cx = (EXP.freeX0 + EXP.freeX1) / 2
  const x0 = cx - ((n - 1) * gap) / 2
  const jobs = roles.map((r, i): JobSpec => {
    const c = companyOf(r)
    return { id: r.id, name: c?.name ?? r.companyId, role: r.role, dates: roleDates(r), logo: c?.logo, logoSize: c?.logoSize as [number, number] | undefined, x: x0 + i * gap, y: EXP.y, d, tile: PASTELS[i % PASTELS.length] }
  })
  return { jobs, cx, d, gap, cardW }
}
