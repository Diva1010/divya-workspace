import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const PAGE_INSET = 0.003
const COVER_T = 0.004
const PAGE_COLOR = '#F7EFD9'
export const GOLD_BAND = '#D9B56A'
export const CREAM_BAND = '#F4E8CC'

export const BOOK_PALETTE = { TEAL: '#4FA6A0', MUSTARD: '#E2B54B', CORAL: '#E5806F', DUSTY_BLUE: '#6E9BCB', LAVENDER: '#A892D8', SAGE: '#8FB988', ROSE: '#E59BB3', PEACH: '#F2B98D', CREAM: '#F4E8CC', NAVY: '#4F63A3', PLUM: '#9261AC' }
const ACCENT_NAMES = ['NAVY', 'PLUM'] as const
const ACCENT_SHARE = 0.12
const MIN_LIGHTNESS = 0.38
const MIN_SATURATION = 0.25
const MIN_HUE_GAP = 15

function hsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
const acceptable = (hex: string) => { const [, s, l] = hsl(hex); return l >= MIN_LIGHTNESS && s >= MIN_SATURATION }
export const BOOK_MAIN: string[] = Object.entries(BOOK_PALETTE).filter(([k, v]) => !(ACCENT_NAMES as readonly string[]).includes(k) && acceptable(v)).map(([, v]) => v)
const BOOK_ACCENT: string[] = ACCENT_NAMES.map((k) => BOOK_PALETTE[k]).filter(acceptable)
const hueGap = (a: string, b: string) => { const d = Math.abs(hsl(a)[0] - hsl(b)[0]); return Math.min(d, 360 - d) }

export function assignColors(row: { color: string; band?: string }[], seed: number): void {
  const r = seeded(seed)
  const maxAccent = Math.floor(row.length * ACCENT_SHARE)
  let accents = 0
  let prev = ''
  for (const p of row) {
    const wantAccent = accents < maxAccent && r() < 0.1
    const pool = (wantAccent ? BOOK_ACCENT : BOOK_MAIN).filter((c) => !prev || (c !== prev && hueGap(c, prev) >= MIN_HUE_GAP))
    const list = pool.length ? pool : BOOK_MAIN.filter((c) => c !== prev)
    const c = list[Math.floor(r() * list.length)]
    if (BOOK_ACCENT.includes(c)) accents++
    p.color = c
    p.band = hsl(c)[2] > 0.8 || r() < 0.5 ? GOLD_BAND : CREAM_BAND
    prev = c
  }
}

export interface BookParams {
  thickness: number
  height: number
  depth: number
  color: string
  band: string
  title: { at: number; h: number }
}

export interface Book {
  geometry: THREE.BufferGeometry
  spine: { flat: number; titleY: number }
  titleColor: string
  triangles: number
}

type P = [number, number]
const cornerRadius = (T: number) => Math.min(0.009, T * 0.28)

function tinted(g: THREE.BufferGeometry, hex: string | THREE.Color) {
  const c = new THREE.Color(hex)
  const n = g.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  if (g.attributes.uv) g.deleteAttribute('uv')
  return g
}

function spinePath(xs: number, T: number, r: number, e: number): P[] {
  const R = r + e
  const a = (i: number) => (i / 2) * (Math.PI / 2)
  const back = [0, 1, 2].map((i): P => [xs + R * Math.sin(a(i)), -T / 2 + r - R * Math.cos(a(i))])
  const front = [0, 1, 2].map((i): P => [xs + R * Math.cos(a(i)), T / 2 - r + R * Math.sin(a(i))])
  return [...back, ...front]
}

function band(path: P[], y0: number, y1: number): THREE.BufferGeometry {
  const pos: number[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, z0] = path[i]
    const [x1, z1] = path[i + 1]
    pos.push(x0, y0, z0, x1, y1, z1, x1, y0, z1, x0, y0, z0, x0, y1, z0, x1, y1, z1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

export function makeBook(p: BookParams): Book {
  const { thickness: T, height: H, depth: D } = p
  const c = Math.min(COVER_T, T * 0.22)
  const r = cornerRadius(T)
  const ri = r - c
  const xs = D / 2 - r
  const sp = spinePath(xs, T, r, 0)
  const outer: P[] = [[-D / 2, -T / 2], ...sp, [-D / 2, T / 2]]
  const q = Math.SQRT1_2
  const inner: P[] = [
    [-D / 2, -T / 2 + c], [xs, -T / 2 + c], [xs + ri * q, -T / 2 + r - ri * q], [xs + ri, -T / 2 + r],
    [xs + ri, T / 2 - r], [xs + ri * q, T / 2 - r + ri * q], [xs, T / 2 - c], [-D / 2, T / 2 - c],
  ]
  const ring = [...outer, ...inner.slice().reverse()]
  const shape = new THREE.Shape()
  shape.moveTo(ring[0][0], ring[0][1])
  for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1])
  shape.closePath()
  const shell = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false, steps: 1 })
  shell.rotateX(-Math.PI / 2)
  tinted(shell, p.color)

  const xa = -D / 2 + PAGE_INSET
  const xb = xs + ri - 0.0005
  const pages = new THREE.BoxGeometry(xb - xa, H - 2 * PAGE_INSET, T - 2 * c - 0.0008).toNonIndexed()
  pages.translate((xa + xb) / 2, H / 2, 0)
  tinted(pages, PAGE_COLOR)

  const bandH = 0.005
  const edge = 0.016
  const accent = spinePath(xs, T, r, 0.0006)
  const parts = [shell, pages, tinted(band(accent, edge, edge + bandH), p.band), tinted(band(accent, H - edge - bandH, H - edge), p.band)]
  const titleCol = new THREE.Color(p.color).lerp(new THREE.Color(CREAM_BAND), 0.62)
  const ty = Math.min(Math.max(p.title.at * H - p.title.h / 2, edge + bandH + 0.008), H - edge - bandH - 0.008 - p.title.h)
  parts.push(tinted(band(spinePath(xs, T, r, 0.0009), ty, ty + p.title.h), titleCol))
  const geometry = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return { geometry, spine: { flat: T - 2 * r, titleY: ty + p.title.h / 2 }, titleColor: '#' + titleCol.getHexString(), triangles: geometry.attributes.position.count / 3 }
}


export function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface RowOptions {
  seed: number
  z0: number
  z1: number
  frontX: number
  top: number
  thickness: [number, number]
  featureThickness: [number, number]
  height: [number, number]
  featureHeight: [number, number]
  depth: [number, number]
  inset: [number, number]
  gap: number
  minBooks: number
  maxBooks: number
}

export const SHELF_ROW: Omit<RowOptions, 'z0' | 'z1' | 'frontX' | 'top'> = {
  seed: 20261004,
  thickness: [0.022, 0.048],
  featureThickness: [0.06, 0.08],
  height: [0.2, 0.32],
  featureHeight: [0.29, 0.32],
  depth: [0.18, 0.25],
  inset: [0.02, 0.04],
  gap: 0.003,
  minBooks: 26,
  maxBooks: 30,
}

type PlacedKind = 'standing' | 'feature' | 'lean' | 'flat'
export interface Placed {
  kind: PlacedKind
  params: BookParams
  matrix: THREE.Matrix4
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const leanOffset = (hn: number, hl: number, phi: number) => (hl * Math.cos(phi) <= hn ? hl * Math.sin(phi) : hn * Math.tan(phi)) + 0.001
const PULL = 0.01
const LEAN = (8 * Math.PI) / 180
const FEATURE_AT = [0.28, 0.66]
const PULLED = [7, 15]

export function layoutRow(o: RowOptions): Placed[] {
  for (let pw = 1.5; pw < 12; pw += 0.25) {
    const r = seeded(o.seed)
    const uni = (lo: number, hi: number) => lerp(lo, hi, r())
    const colorAt = () => (r(), BOOK_MAIN[0])
    const paramsFor = (t: number, h: number, feature: boolean): BookParams => ({
      thickness: t,
      height: h,
      depth: uni(o.depth[0], o.depth[1]),
      color: colorAt(),
      band: r() < 0.6 ? GOLD_BAND : CREAM_BAND,
      title: feature ? { at: 0.62, h: 0.06 } : { at: uni(0.5, 0.64), h: uni(0.026, 0.04) },
    })
    const stackLen = uni(0.2, 0.22)
    const leaned = [0, 1].map(() => ({ t: uni(0.026, 0.034), h: uni(0.24, 0.28) }))
    const hcMax = o.height[1] - 0.02
    const leanSpan = hcMax * Math.tan(LEAN) + leaned.reduce((s, b) => s + (b.t + o.gap) / Math.cos(LEAN), 0)
    const zStandEnd = o.z1 - stackLen - 0.012 - leanSpan

    const out: Placed[] = []
    let z = o.z0
    let h = uni(o.height[0], o.height[1])
    let features = 0
    let count = 0
    for (;;) {
      const frac = (z - o.z0) / (zStandEnd - o.z0)
      const feature = features < FEATURE_AT.length && frac >= FEATURE_AT[features]
      const t = feature ? uni(o.featureThickness[0], o.featureThickness[1]) : o.thickness[0] + (o.thickness[1] - o.thickness[0]) * Math.pow(r(), pw)
      if (z + t > zStandEnd) break
      h = feature ? uni(o.featureHeight[0], o.featureHeight[1]) : Math.min(o.height[1], Math.max(o.height[0], h + (r() - 0.5) * 0.12))
      const params = paramsFor(t, h, feature)
      const pulled = !feature && PULLED.includes(count)
      const inset = pulled ? Math.max(uni(o.inset[0], o.inset[1]), o.inset[0] + PULL) : uni(o.inset[0], o.inset[1])
      const spineX = o.frontX - inset + (pulled ? PULL : 0)
      out.push({ kind: feature ? 'feature' : 'standing', params, matrix: new THREE.Matrix4().makeTranslation(spineX - params.depth / 2, o.top, z + t / 2) })
      if (feature) features++
      else count++
      z += t + o.gap
    }
    const lastH = out.length ? out[out.length - 1].params.height : o.height[0]
    let zp = z - o.gap + leanOffset(lastH, leaned[0].h, LEAN) + o.gap
    for (const b of leaned) {
      const params = paramsFor(b.t, b.h, false)
      const spineX = o.frontX - uni(o.inset[0], o.inset[1])
      out.push({
        kind: 'lean',
        params,
        matrix: new THREE.Matrix4()
          .makeTranslation(spineX - params.depth / 2, o.top, zp)
          .multiply(new THREE.Matrix4().makeRotationX(-LEAN))
          .multiply(new THREE.Matrix4().makeTranslation(0, 0, b.t / 2)),
      })
      zp += (b.t + o.gap) / Math.cos(LEAN)
    }
    let y = o.top + 0.001
    const zc = o.z1 - stackLen / 2
    for (let i = 0; i < 3; i++) {
      const t = uni(0.03, 0.044)
      const params = paramsFor(t, uni(stackLen - 0.02, stackLen), false)
      const spineX = o.frontX - uni(Math.max(o.inset[0], 0.03), o.inset[1])
      out.push({
        kind: 'flat',
        params,
        matrix: new THREE.Matrix4()
          .makeTranslation(spineX - params.depth / 2, y, zc + (r() - 0.5) * 0.01)
          .multiply(new THREE.Matrix4().makeRotationY((r() - 0.5) * 0.12))
          .multiply(new THREE.Matrix4().makeTranslation(0, t / 2, 0))
          .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
          .multiply(new THREE.Matrix4().makeTranslation(0, -params.height / 2, 0)),
      })
      y += t
    }
    if (out.length >= o.minBooks && out.length <= o.maxBooks) {
      const order = out.map((p) => ({ p, z: p.matrix.elements[14], y: p.matrix.elements[13] })).sort((a, b) => a.z - b.z || a.y - b.y)
      assignColors(order.map((e) => e.p.params), o.seed + 991)
      return out
    }
    if (out.length > o.maxBooks) break
  }
  throw new Error('layoutRow: no layout fits the row')
}
