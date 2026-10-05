import { BOARD_T, CASE, CASES, CASE_CANDLES, FAIRY, ORBS, ORB_PLACES, SIDE_T, SURFACES, type CaseSpec } from './bookcaseLayout.ts'

export type P = [number, number, number]
export interface Obstacle { id: string; kind: 'poly' | 'box'; pts?: P[]; box?: [number, number, number, number, number, number]; r: number }
interface Run { id: string; pts: P[] }
interface Segment { id: string; pts: P[] }
export interface FairyLayout { segments: Segment[]; bulbs: P[]; skipped: string[] }

export const STRINGS = {
  step: 0.02,
  clear: 0.06,
  minSegment: 0.1,
  bulbGap: 0.07,
  front: 0.02,
  lipSag: 0.05,
  lipMargin: 0.06,
  lipLevels: [1, 2, 3, 4, 5, 6],
  maxBulbs: 150,
  drapes: [
    { id: 'drape-A-top', z0: -3.62, z1: -2.98, y: 2.6, sag: 0.22 },
    { id: 'drape-join', z0: -2.62, z1: -2.28, y: 2.58, sag: 0.16 },
    { id: 'drape-B-upper', z0: -1.95, z1: -1.5, y: 2.27, sag: 0.15 },
  ],
}
const XF = () => CASE.xFront + STRINGS.front

const dense = (pts: P[], step = STRINGS.step): P[] => {
  const out: P[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step))
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n])
  }
  return out
}
const swag = (z0: number, z1: number, y: number, sag: number, x = XF()): P[] => {
  const n = Math.max(2, Math.round(Math.abs(z1 - z0) / STRINGS.step))
  return Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [x, y - sag * 4 * u * (1 - u), z0 + (z1 - z0) * u] as P })
}

function runs(cases: CaseSpec[] = CASES): Run[] {
  const out: Run[] = []
  const f = FAIRY
  const z0 = cases[0].zMin + 0.03, z1 = cases[cases.length - 1].zMax - 0.03
  const swags = Math.round((z1 - z0) / f.swagLength)
  const top: P[] = []
  for (let s = 0; s < swags; s++) {
    const a = z0 + (s / swags) * (z1 - z0), b = z0 + ((s + 1) / swags) * (z1 - z0)
    top.push(...swag(a, b, f.topY, f.dip).slice(s ? 1 : 0))
  }
  out.push({ id: 'top-edge', pts: top })
  const zs = cases[cases.length - 1].zMax + f.outset
  out.push({ id: 'end-far', pts: dense(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [CASE.xFront - 0.035 + 0.025 * Math.sin(t * Math.PI * 2 * f.sideWaves), f.topY - f.sideDrop * t, zs] as P })) })
  out.push({ id: 'end-near', pts: dense(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [XF() + 0.004, f.topY - f.sideDrop * t, cases[0].zMin + SIDE_T / 2 + 0.004 * Math.sin(t * Math.PI * 2 * 2)] as P })) })
  for (const c of cases) for (const level of STRINGS.lipLevels) {
    const y = SURFACES[level] - BOARD_T / 2
    const a = c.zMin + SIDE_T + STRINGS.lipMargin, b = c.zMax - SIDE_T - STRINGS.lipMargin, m = (a + b) / 2
    out.push({ id: `lip-${c.id}-${level + 1}`, pts: [...swag(a, m, y, STRINGS.lipSag), ...swag(m, b, y, STRINGS.lipSag).slice(1)] })
  }
  for (const d of STRINGS.drapes) out.push({ id: d.id, pts: swag(d.z0, d.z1, d.y, d.sag) })
  return out
}

const segDist = (p: P, a: P, b: P) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]
  const l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]
  const t = l2 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2)) : 0
  return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t)
}
function obstacleDistance(p: P, o: Obstacle): number {
  if (o.kind === 'box') {
    const b = o.box!
    const d = [Math.max(b[0] - p[0], 0, p[0] - b[3]), Math.max(b[1] - p[1], 0, p[1] - b[4]), Math.max(b[2] - p[2], 0, p[2] - b[5])]
    return Math.hypot(d[0], d[1], d[2])
  }
  const q = o.pts!
  let m = Infinity
  if (q.length === 1) m = Math.hypot(p[0] - q[0][0], p[1] - q[0][1], p[2] - q[0][2])
  for (let i = 1; i < q.length; i++) m = Math.min(m, segDist(p, q[i - 1], q[i]))
  return m - o.r
}
export const nearest = (p: P, obstacles: Obstacle[]) => obstacles.reduce((m, o) => Math.min(m, obstacleDistance(p, o)), Infinity)

const refHeight = (id: string, b: number[]) => (id.startsWith('ivy/ivy_') || id === 'planter_hang' ? b[5] - b[4] : b[5])
type PlantLike = { id: string; model: string; position: number[]; rotationY: number; size: number }
type DataLike = Record<string, { bounds: number[]; curve?: number[][]; rim?: number; rimRadius?: number }>

export function fairyObstacles(plants: PlantLike[], data: DataLike): Obstacle[] {
  const out: Obstacle[] = []
  for (const p of plants) {
    const d = data[p.model]
    if (!d) continue
    const s = p.size / refHeight(p.model, d.bounds), c = Math.cos(p.rotationY), sn = Math.sin(p.rotationY)
    const w = (q: number[]): P => [p.position[0] + (q[0] * c + q[2] * sn) * s, p.position[1] + q[1] * s, p.position[2] + (-q[0] * sn + q[2] * c) * s]
    if (p.model.startsWith('ivy/ivy_') && d.curve) out.push({ id: p.id, kind: 'poly', pts: d.curve.map(w), r: 0 })
    else if (p.model.startsWith('ivy/pot_') || p.model.startsWith('ivy/pearls_')) out.push({ id: p.id, kind: 'poly', pts: [w([0, 0, 0]), w([0, d.rim ?? 0.09, 0])], r: (d.rimRadius ?? 0.05) * s })
    else if (p.model === 'planter_hang') {
      const xs = [d.bounds[0], d.bounds[1]].flatMap((x) => [d.bounds[2], d.bounds[3]].map((z) => w([x, 0, z])))
      out.push({ id: p.id, kind: 'box', box: [Math.min(...xs.map((q) => q[0])), p.position[1] + d.bounds[4] * s, Math.min(...xs.map((q) => q[2])), Math.max(...xs.map((q) => q[0])), p.position[1] + d.bounds[5] * s, Math.max(...xs.map((q) => q[2]))], r: 0 })
    }
  }
  for (const k of CASE_CANDLES) out.push({ id: k.id, kind: 'poly', pts: [[(CASE.xBack + CASE.xFront) / 2 + 0.05, SURFACES[k.level], k.z], [(CASE.xBack + CASE.xFront) / 2 + 0.05, SURFACES[k.level] + 0.32, k.z]], r: k.radius + 0.012 })
  for (const o of ORB_PLACES) out.push({ id: o.id, kind: 'poly', pts: [[o.x, o.y, o.z], [o.x, o.y + ORBS.baseHeight + ORBS.radius * 2, o.z]], r: ORBS.radius })
  return out
}

export function buildFairy(obstacles: Obstacle[], cases: CaseSpec[] = CASES): FairyLayout {
  const segments: Segment[] = []
  const skipped: string[] = []
  for (const run of runs(cases)) {
    let cur: P[] = []
    let cut = false
    const flush = () => {
      if (cur.length > 1 && (cur.length - 1) * STRINGS.step >= STRINGS.minSegment) segments.push({ id: run.id, pts: cur })
      else if (cur.length) skipped.push(`${run.id}: a stretch under ${STRINGS.minSegment} m dropped`)
      cur = []
    }
    for (const p of run.pts) {
      if (nearest(p, obstacles) < STRINGS.clear) { if (cur.length) flush(); cut = true } else cur.push(p)
    }
    flush()
    if (cut) skipped.push(`${run.id}: cut for clearance`)
  }
  const bulbs: P[] = []
  for (const seg of segments) {
    let len = 0
    const cum = seg.pts.map((p, i) => (i ? (len += Math.hypot(p[0] - seg.pts[i - 1][0], p[1] - seg.pts[i - 1][1], p[2] - seg.pts[i - 1][2])) : 0))
    const n = Math.max(1, Math.round(len / FAIRY.beadSpacing))
    for (let k = 0; k < n; k++) {
      const at = ((k + 0.5) * len) / n
      let i = 1
      while (i < cum.length - 1 && cum[i] < at) i++
      const t = (at - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1])
      const a = seg.pts[i - 1], b = seg.pts[i]
      const p: P = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
      if (bulbs.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) >= STRINGS.bulbGap)) bulbs.push(p)
    }
  }
  return { segments, bulbs, skipped: [...new Set(skipped)] }
}
