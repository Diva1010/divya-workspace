import * as THREE from 'three'
import { CASE, CASE_CANDLES, EGG_PLACE, LEVELS, ORBS, ORB_PLACES, SURFACES, inside, type CaseSpec } from './bookcaseLayout'
import { BOOK_MAIN, CREAM_BAND, GOLD_BAND, assignColors, leanOffset, makeBook, seeded, type BookParams, type Placed } from './bookGen'
import { SAUCER_EXTRA, type CandleSpec } from './candle'
import { PLANT_BOUNDS, PLANT_MODEL_INFO } from './plantFootprint'
import type { PlantPlacement } from '../zones/types'

const BOOKS = {
  thickness: [0.022, 0.048] as [number, number],
  thicknessBias: 0.4,
  featureThickness: [0.06, 0.08] as [number, number],
  height: [0.2, 0.3] as [number, number],
  featureHeight: [0.27, 0.3] as [number, number],
  leanHeight: [0.22, 0.27] as [number, number],
  leanDeg: [8, 12] as [number, number],
  depth: [0.18, 0.25] as [number, number],
  inset: [0.021, 0.05] as [number, number],
  gap: 0.0025,
  fill: [0.6, 0.78] as [number, number],
  pullChance: 0.022,
  pull: [0.01, 0.015] as [number, number],
  flatThickness: [0.03, 0.044] as [number, number],
  flatLength: [0.2, 0.26] as [number, number],
  keepMargin: 0.012,
  endMargin: 0.006,
  minSegment: 0.07,
  minAir: 0.03,
}

const PLAN: Record<'A' | 'B', { leans: number[]; stacks: Record<number, number>; features: number[]; icon: number; pulls: number[] }> = {
  A: { leans: [1, 2, 1, 1, 2, 1, 1], stacks: { 0: 3, 3: 2, 5: 2 }, features: [1, 4], icon: 1, pulls: [0, 2, 5] },
  B: { leans: [2, 1, 1, 2, 1, 2, 1], stacks: { 1: 3, 2: 3, 5: 2 }, features: [5, 0, 3], icon: 5, pulls: [1, 3, 6] },
}

const CANDLE_X = (CASE.xBack + CASE.xFront) / 2 + 0.05

interface KeepOut { kind: 'plant' | 'candle' | 'egg' | 'stack' | 'orb'; id: string; case: 'A' | 'B'; level: number; z0: number; z1: number }
interface BookItem extends Placed {
  case: 'A' | 'B'
  level: number
  pulled: boolean
  icon?: { position: [number, number, number]; size: number; band: string }
}
interface LevelStat { level: number; free: number; used: number; fill: number; books: number; segments: number }
export interface CaseLayout { items: BookItem[]; levels: LevelStat[]; counts: Record<string, number> }
export interface BookcaseLayout {
  cases: Record<'A' | 'B', CaseLayout>
  candles: CandleSpec[]
  keepOuts: KeepOut[]
  total: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const SPINE_ICON_MAX = 0.04

function plantKeepOuts(plants: PlantPlacement[], cases: CaseSpec[]): KeepOut[] {
  const out: KeepOut[] = []
  for (const p of plants) {
    if (p.group !== 'left') continue
    const c = cases.find((k) => p.position[2] >= k.zMin && p.position[2] <= k.zMax && p.position[0] >= CASE.xBack && p.position[0] <= CASE.xFront)
    const level = SURFACES.findIndex((s) => Math.abs(p.position[1] - s) < 0.03)
    const b = PLANT_BOUNDS[p.model]
    const info = PLANT_MODEL_INFO[p.model]
    if (!c || level < 0 || !b || !info) continue
    const s = p.size / info.pot
    const cos = Math.cos(p.rotationY)
    const sin = Math.sin(p.rotationY)
    const zs = [b[0], b[1]].flatMap((x) => [b[2], b[3]].map((z) => p.position[2] + (-x * sin + z * cos) * s))
    out.push({ kind: 'plant', id: p.id, case: c.id, level, z0: Math.min(...zs) - BOOKS.keepMargin, z1: Math.max(...zs) + BOOKS.keepMargin })
  }
  return out
}

function mergeIntervals(iv: [number, number][]): [number, number][] {
  const s = iv.slice().sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  for (const x of s) {
    const last = out[out.length - 1]
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1])
    else out.push([x[0], x[1]])
  }
  return out
}

function freeSegments(z0: number, z1: number, blocked: [number, number][]): [number, number][] {
  const segs: [number, number][] = []
  let cur = z0
  for (const [a, b] of mergeIntervals(blocked)) {
    if (a > cur) segs.push([cur, Math.min(a, z1)])
    cur = Math.max(cur, b)
  }
  if (cur < z1) segs.push([cur, z1])
  return segs.filter(([a, b]) => b - a >= BOOKS.minSegment)
}

type Run = {
  books: { t: number; h: number; depth: number; color: string; band: string; title: BookParams['title']; feature: boolean; inset: number; pull: number }[]
  leans: { t: number; h: number; depth: number; color: string; band: string; title: BookParams['title']; inset: number }[]
}

function layoutLevel(c: CaseSpec, level: number, keeps: KeepOut[], candles: CandleSpec[], pinned: { z: number; n: number; candle: string } | null, attempt: number): { items: BookItem[]; stat: LevelStat; candleY?: number; candleX?: number } {
  const plan = PLAN[c.id]
  const IN = inside(c)
  const r = seeded(c.seed + level * 7919 + attempt * 104729)
  const uni = (lo: number, hi: number) => lerp(lo, hi, r())
  const y = SURFACES[level]
  const frontX = CASE.xFront
  const items: BookItem[] = []
  const color = () => (r(), BOOK_MAIN[0])
  const blocked: [number, number][] = keeps.filter((k) => k.case === c.id && k.level === level).map((k) => [k.z0, k.z1])
  const out: { candleY?: number; candleX?: number } = {}

  if (pinned) {
    const len = uni(0.22, 0.26)
    const w = len + 0.012
    const depth = uni(0.21, 0.25)
    const spineX = frontX - uni(0.03, 0.05)
    let yy = y + 0.001
    for (let i = 0; i < pinned.n; i++) {
      const t = uni(...BOOKS.flatThickness)
      const params: BookParams = { thickness: t, height: len - i * 0.004, depth, color: color(), band: r() < 0.6 ? GOLD_BAND : CREAM_BAND, title: { at: 0.5, h: 0.03 } }
      items.push({ case: c.id, level, pulled: false, kind: 'flat', params, matrix: flatMatrix(spineX, depth, yy, pinned.z, t, params.height, 0) })
      yy += t
    }
    blocked.push([pinned.z - w / 2, pinned.z + w / 2])
    out.candleY = yy
    out.candleX = spineX - depth / 2
  }
  const z0 = IN.z0 + BOOKS.endMargin
  const z1 = IN.z1 - BOOKS.endMargin
  const segs = freeSegments(z0, z1, blocked)
  const total = segs.reduce((s, [a, b]) => s + (b - a), 0)
  const stat: LevelStat = { level, free: total, used: 0, fill: 0, books: 0, segments: segs.length }
  if (!total) return { items, stat, ...out }
  let target = lerp(BOOKS.fill[0], BOOKS.fill[1], r()) * total
  const flatStackN = pinned ? 0 : plan.stacks[level] ?? 0
  const isFeatureLevel = plan.features.includes(level)

  type Group = { w: number; place: (z: number) => BookItem[]; run?: Run }
  const mkBook = (): Run['books'][number] => ({ t: BOOKS.thickness[0] + (BOOKS.thickness[1] - BOOKS.thickness[0]) * Math.pow(r(), BOOKS.thicknessBias), h: 0, depth: uni(...BOOKS.depth), color: color(), band: r() < 0.6 ? GOLD_BAND : CREAM_BAND, title: { at: uni(0.5, 0.64), h: uni(0.026, 0.04) }, feature: false, inset: uni(...BOOKS.inset), pull: 0 })
  const groups: Group[] = []
  let stackW = 0
  if (flatStackN) {
    const len = uni(...BOOKS.flatLength)
    stackW = len + 0.014
    target = Math.max(0, target - stackW)
    groups.push({
      w: stackW,
      place: (z) => {
        const out2: BookItem[] = []
        const spineX = frontX - uni(0.03, 0.05)
        let yy = y + 0.001
        for (let i = 0; i < flatStackN; i++) {
          const t = uni(...BOOKS.flatThickness)
          const depth = uni(0.2, 0.25)
          const params: BookParams = { thickness: t, height: len - uni(0, 0.03), depth, color: color(), band: r() < 0.6 ? GOLD_BAND : CREAM_BAND, title: { at: 0.5, h: 0.03 } }
          out2.push({ case: c.id, level, pulled: false, kind: 'flat', params, matrix: flatMatrix(spineX + uni(-0.008, 0.008), depth, yy, z + stackW / 2 + uni(-0.004, 0.004), t, params.height, (r() - 0.5) * 0.12) })
          yy += t
        }
        return out2
      },
    })
  }
  const standing: Run['books'] = []
  let len = 0
  while (len < target) {
    const b = mkBook()
    standing.push(b)
    len += b.t + BOOKS.gap
  }
  if (isFeatureLevel && standing.length > 3) {
    const f = standing[Math.floor(uni(1, standing.length - 1))]
    f.t = uni(...BOOKS.featureThickness)
    f.feature = true
  }
  const nRuns = Math.max(1, Math.min(standing.length, Math.round(target / uni(0.22, 0.42))))
  const cuts = new Set<number>()
  while (cuts.size < nRuns - 1 && standing.length > nRuns) cuts.add(Math.floor(uni(2, standing.length - 1)))
  const bounds = [0, ...[...cuts].sort((a, b) => a - b), standing.length]
  const runs: Run[] = []
  for (let i = 0; i < bounds.length - 1; i++) runs.push({ books: standing.slice(bounds[i], bounds[i + 1]), leans: [] })
  let leanBooks = plan.leans[level]
  while (leanBooks > 0 && runs.length) {
    const k = Math.min(leanBooks, 1 + Math.floor(r() * 2))
    const run = runs[Math.floor(uni(0, runs.length))]
    for (let i = 0; i < k; i++) run.leans.push({ t: uni(0.026, 0.036), h: uni(...BOOKS.leanHeight), depth: uni(...BOOKS.depth), color: color(), band: r() < 0.6 ? GOLD_BAND : CREAM_BAND, title: { at: uni(0.5, 0.64), h: uni(0.026, 0.04) }, inset: uni(...BOOKS.inset) })
    leanBooks -= k
  }
  let hh = uni(...BOOKS.height)
  for (const run of runs) for (const b of run.books) {
    hh = Math.min(BOOKS.height[1], Math.max(BOOKS.height[0], hh + (r() - 0.5) * 0.1))
    b.h = b.feature ? uni(...BOOKS.featureHeight) : hh
    if (!b.feature && r() < BOOKS.pullChance) b.pull = uni(...BOOKS.pull)
  }
  if (plan.pulls.includes(level)) {
    const run = runs.reduce((a, c) => (c.books.length > a.books.length ? c : a), runs[0])
    if (run && run.books.length > 3) {
      const cand = run.books.slice(1, -1).filter((q) => !q.feature)
      if (cand.length) cand[Math.floor(r() * cand.length)].pull = uni(...BOOKS.pull)
    }
  }
  const lean = (deg: number) => (deg * Math.PI) / 180
  const HC = BOOKS.height[1] - 0.02
  for (const run of runs) {
    const phi = lean(uni(...BOOKS.leanDeg))
    const standW = run.books.reduce((s, b) => s + b.t + BOOKS.gap, 0)
    const leanSpan = run.leans.length ? HC * Math.tan(phi) + run.leans.reduce((s, b) => s + (b.t + BOOKS.gap) / Math.cos(phi), 0) : 0
    groups.push({
      w: standW + leanSpan,
      run,
      place: (z) => {
        const res: BookItem[] = []
        let zz = z
        for (const b of run.books) {
          const params: BookParams = { thickness: b.t, height: b.h, depth: b.depth, color: b.color, band: b.band, title: b.feature ? { at: 0.62, h: 0.06 } : b.title }
          const inset = b.pull ? Math.max(b.inset, BOOKS.inset[0] + b.pull) : b.inset
          const spineX = frontX - inset + b.pull
          res.push({ case: c.id, level, pulled: b.pull > 0, kind: b.feature ? 'feature' : 'standing', params, matrix: new THREE.Matrix4().makeTranslation(spineX - b.depth / 2, y, zz + b.t / 2) })
          zz += b.t + BOOKS.gap
        }
        const nb = run.books[run.books.length - 1]
        let zp = zz - BOOKS.gap + leanOffset(nb.h, run.leans[0]?.h ?? 0.2, phi) + BOOKS.gap
        for (const b of run.leans) {
          const params: BookParams = { thickness: b.t, height: b.h, depth: b.depth, color: b.color, band: b.band, title: b.title }
          res.push({
            case: c.id, level, pulled: false, kind: 'lean', params,
            matrix: new THREE.Matrix4().makeTranslation(frontX - b.inset - b.depth / 2, y, zp).multiply(new THREE.Matrix4().makeRotationX(-phi)).multiply(new THREE.Matrix4().makeTranslation(0, 0, b.t / 2)),
          })
          zp += (b.t + BOOKS.gap) / Math.cos(phi)
        }
        return res
      },
    })
  }
  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[groups[i], groups[j]] = [groups[j], groups[i]]
  }
  const placedBySeg: { z0: number; z1: number; gs: Group[]; used: number }[] = segs.map(([a, b]) => ({ z0: a, z1: b, gs: [], used: 0 }))
  let si = 0
  for (const g of groups) {
    for (;;) {
      while (si < placedBySeg.length && placedBySeg[si].z1 - placedBySeg[si].z0 - placedBySeg[si].used < g.w) {
        if (g.run && g.run.books.length > 2 && placedBySeg[si].z1 - placedBySeg[si].z0 - placedBySeg[si].used > 0.12) {
          const last = g.run.books[g.run.books.length - 1]
          if (last.feature) break
          g.run.books.pop()
          g.w -= last.t + BOOKS.gap
          continue
        }
        si++
      }
      break
    }
    if (si >= placedBySeg.length) break
    if (placedBySeg[si].z1 - placedBySeg[si].z0 - placedBySeg[si].used < g.w) continue
    placedBySeg[si].gs.push(g)
    placedBySeg[si].used += g.w
  }
  for (const seg of placedBySeg) {
    const spare = seg.z1 - seg.z0 - seg.used
    const w = Array.from({ length: seg.gs.length + 1 }, () => 0.2 + r())
    const ws = w.reduce((a, b) => a + b, 0)
    const air = w.map((x) => (spare * x) / ws)
    let freed = 0
    for (let i = 1; i < air.length - 1; i++) if (air[i] < BOOKS.minAir) { freed += air[i] - BOOKS.gap; air[i] = BOOKS.gap }
    air[air.indexOf(Math.max(...air))] += freed
    let z = seg.z0 + air[0]
    seg.gs.forEach((g, i) => {
      items.push(...g.place(z))
      z += g.w + air[i + 1]
    })
    stat.used += seg.used
  }
  stat.books = items.length
  const order = items.map((it) => ({ it, z: it.matrix.elements[14], y: it.matrix.elements[13] })).sort((p, q) => p.z - q.z || p.y - q.y)
  assignColors(order.map((e) => e.it.params), c.seed + level * 131 + 17)
  stat.fill = stat.used / total
  return { items, stat, ...out }
}

function flatMatrix(spineX: number, depth: number, yy: number, zc: number, t: number, length: number, yaw: number) {
  return new THREE.Matrix4()
    .makeTranslation(spineX - depth / 2, yy, zc)
    .multiply(new THREE.Matrix4().makeRotationY(yaw))
    .multiply(new THREE.Matrix4().makeTranslation(0, t / 2, 0))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeTranslation(0, -length / 2, 0))
}

export function layoutBookcases(plants: PlantPlacement[], cases: CaseSpec[]): BookcaseLayout {
  const keepOuts: KeepOut[] = plantKeepOuts(plants, cases)
  const eggCase = cases.find((k) => EGG_PLACE.z >= k.zMin && EGG_PLACE.z <= k.zMax)!
  keepOuts.push({ kind: 'egg', id: 'dragon-egg', case: eggCase.id, level: SURFACES.findIndex((s) => Math.abs(s - EGG_PLACE.y) < 0.01), z0: EGG_PLACE.z - 0.09, z1: EGG_PLACE.z + 0.09 })
  for (const o of ORB_PLACES) if (o.where !== 'top') keepOuts.push({ kind: 'orb', id: o.id, case: o.where, level: o.level, z0: o.z - ORBS.radius - 0.02, z1: o.z + ORBS.radius + 0.02 })
  const candles: CandleSpec[] = []
  for (const cc of CASE_CANDLES) {
    const spec: CandleSpec = { id: cc.id, where: cc.where, level: cc.level, x: CANDLE_X, y: SURFACES[cc.level], z: cc.z, radius: cc.radius, height: cc.height, saucer: cc.saucer, seed: 7000 + candles.length * 31 }
    candles.push(spec)
    if (!cc.onStack) keepOuts.push({ kind: 'candle', id: cc.id, case: cc.where, level: cc.level, z0: cc.z - cc.radius - SAUCER_EXTRA - 0.02, z1: cc.z + cc.radius + SAUCER_EXTRA + 0.02 })
  }
  const res: BookcaseLayout = { cases: {} as BookcaseLayout['cases'], candles, keepOuts, total: 0 }
  for (const c of cases) {
    const items: BookItem[] = []
    const levels: LevelStat[] = []
    for (let level = 0; level < LEVELS; level++) {
      const cc = CASE_CANDLES.find((k) => k.where === c.id && k.level === level && k.onStack)
      const pinned = cc ? { z: cc.z, n: cc.onStack, candle: cc.id } : null
      let best: ReturnType<typeof layoutLevel> | null = null
      for (let attempt = 0; attempt < 40; attempt++) {
        const l = layoutLevel(c, level, keepOutsFor(keepOuts), candles, pinned, attempt)
        const inRange = l.stat.fill >= 0.6 && l.stat.fill <= 0.88
        if (!best || (inRange && !(best.stat.fill >= 0.6 && best.stat.fill <= 0.88))) best = l
        if (inRange) break
      }
      const l = best!
      items.push(...l.items)
      levels.push(l.stat)
      if (cc) {
        const spec = candles.find((k) => k.id === cc.id)!
        spec.y = l.candleY!
        spec.x = l.candleX!
        keepOuts.push({ kind: 'stack', id: cc.id + '-stack', case: c.id, level, z0: cc.z - 0.13, z1: cc.z + 0.13 })
      }
    }
    const counts: Record<string, number> = { total: items.length, standing: 0, lean: 0, flat: 0, feature: 0, pulled: 0 }
    for (const it of items) {
      counts[it.kind]++
      if (it.pulled) counts.pulled++
    }
    const plan = PLAN[c.id]
    const f = items.find((it) => it.kind === 'feature' && it.level === plan.icon)
    if (f) {
      const b = makeBook(f.params)
      const at = new THREE.Vector3(f.params.depth / 2 + 0.0016, b.spine.titleY, 0).applyMatrix4(f.matrix)
      f.icon = { position: at.toArray() as [number, number, number], size: Math.min(SPINE_ICON_MAX, b.spine.flat * 0.85), band: b.titleColor }
      b.geometry.dispose()
    }
    res.cases[c.id] = { items, levels, counts }
    res.total += items.length
  }
  return res
}
const keepOutsFor = (k: KeepOut[]) => k

