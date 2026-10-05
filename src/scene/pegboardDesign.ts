import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BOOK_PALETTE } from './bookGen'
import { bunnyParts } from './bunny'
import { GROUP_LEFT } from './signLayout'
import { BOARD_FONT } from './fonts'
import { WOOD } from './woodPalette'

export const BOARD = { x0: 0.28, yBottom: 2.28, h: 1.05, depth: 0.025, backZ: -3.985, pitch: 0.05, hole: 0.0065, frame: 0.02, frameProud: 0.01, gapToSign: 0.15 }
export const BOARD_W = GROUP_LEFT - BOARD.gapToSign - BOARD.x0
const faceZ = BOARD.backZ + BOARD.depth
const C = BOOK_PALETTE
const DARK_GREY = '#5B4F6B'
const ITEM_SCALE: Record<string, number> = { headphones: 1.1, camera: 1.25, note: 1.2, polaroid: 1.1, sketch: 1.2, pink: 1.2, pin: 1.5, bunny: 1.3 }

const PEGBOARD_NOTE = ['Build', 'Explore', 'Create']

const snap = (x: number) => Math.round((x - BOARD.pitch / 2) / BOARD.pitch) * BOARD.pitch + BOARD.pitch / 2
const n = (un: number, vn: number): [number, number] => [un * BOARD_W, BOARD.h - vn * BOARD.h]

const place = (u: number, v: number, rot = 0, out = 0) => new THREE.Matrix4().makeTranslation(BOARD.x0 + u, BOARD.yBottom + v, faceZ + out).multiply(new THREE.Matrix4().makeRotationZ(rot))

interface Slot { id: string; u: number; v: number; hw: number; hh: number }
const [uTR, vTR] = n(0.83, 0.265)
const [uC, vC] = n(0.565, 0.52)
const [, vLR] = n(0.89, 0.83)
const uLR = BOARD_W - 0.035 - 0.11
const SLOTS: Slot[] = [
  { id: 'shelf-tr', u: uTR, v: vTR, hw: 0.16, hh: 0.015 },
  { id: 'shelf-l', u: 0.245, v: n(0.17, 0.5)[1], hw: 0.225, hh: 0.015 },
  { id: 'shelf-c', u: uC, v: vC, hw: 0.135, hh: 0.015 },
  { id: 'shelf-lr', u: uLR, v: vLR, hw: 0.11, hh: 0.015 },
  { id: 'pic1', u: n(0.41, 0.21)[0], v: n(0.41, 0.21)[1], hw: 0.13, hh: 0.16 },
  { id: 'pic2', u: n(0.8, 0.455)[0], v: n(0.8, 0.455)[1], hw: 0.125, hh: 0.1 },
  { id: 'sketch', u: n(0.82, 0.64)[0], v: n(0.82, 0.64)[1], hw: 0.08, hh: 0.04 },
  { id: 'polaroid', u: 0.334, v: n(0.205, 0.83)[1], hw: 0.06, hh: 0.075 },
  { id: 'note', u: 0.542, v: n(0.36, 0.75)[1], hw: 0.1, hh: 0.12 },
  { id: 'pink', u: 1.04, v: n(0.73, 0.84)[1], hw: 0.06, hh: 0.08 },
  { id: 'headphones', u: 0.825, v: n(0.565, 0.75)[1], hw: 0.114, hh: 0.085 },
]
const slot = (id: string) => SLOTS.find((s) => s.id === id)!

const BUNNY_U = 0.71
const PLANK_T = 0.02
const PLANK_D = 0.1
const PLANKS: { id: string; len: number }[] = [
  { id: 'shelf-tr', len: 0.32 },
  { id: 'shelf-l', len: 0.45 },
  { id: 'shelf-c', len: 0.27 },
  { id: 'shelf-lr', len: 0.22 },
]
interface PlankInfo { id: string; u0: number; u1: number; top: number; topV: number; x0: number; x1: number; z0: number; z1: number }
function plankInfo(id: string): PlankInfo {
  const s = slot(id)
  const len = PLANKS.find((p) => p.id === id)!.len
  const topV = s.v + PLANK_T / 2
  return { id, u0: s.u - len / 2, u1: s.u + len / 2, topV, top: BOARD.yBottom + topV, x0: BOARD.x0 + s.u - len / 2, x1: BOARD.x0 + s.u + len / 2, z0: faceZ, z1: faceZ + PLANK_D }
}

const PEGS: { id: string; u: number; v: number; len: number; tip: string }[] = (() => {
  const out: { id: string; u: number; v: number; len: number; tip: string }[] = []
  const tips = [C.CORAL, C.TEAL, C.MUSTARD]
  PLANKS.forEach((p, i) => {
    const s = slot(p.id)
    for (const side of [-1, 1]) out.push({ id: `${p.id}-${side < 0 ? 'l' : 'r'}`, u: snap(s.u + side * (p.len / 2 - 0.05)), v: snap(s.v - 0.05), len: 0.1, tip: tips[(i + (side < 0 ? 0 : 1)) % 3] })
  })
  const hp = slot('headphones')
  out.push({ id: 'headphones', u: snap(hp.u), v: snap(hp.v + 0.095), len: 0.07, tip: C.CORAL })
  const p1 = slot('pic1')
  out.push({ id: 'clip', u: snap(p1.u), v: snap(p1.v + 0.16), len: 0.03, tip: C.MUSTARD })
  out.push({ id: 'free-1', u: snap(n(0.62, 0.07)[0]), v: snap(n(0.62, 0.07)[1]), len: 0.055, tip: DARK_GREY })
  out.push({ id: 'free-2', u: snap(n(0.93, 0.5)[0]), v: snap(n(0.93, 0.5)[1]), len: 0.05, tip: C.TEAL })
  return out
})()

export const HOLE_TILE_PX = 128
export function drawHoleTile(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')
  if (!c) return
  const nn = HOLE_TILE_PX
  const r = (BOARD.hole / BOARD.pitch) * nn
  c.fillStyle = WOOD.pegboard
  c.fillRect(0, 0, nn, nn)
  const ring = c.createRadialGradient(nn / 2, nn / 2, r * 0.95, nn / 2, nn / 2, r * 1.9)
  ring.addColorStop(0, WOOD.pegboardHoles + 'cc')
  ring.addColorStop(1, WOOD.pegboardHoles + '00')
  c.fillStyle = ring
  c.beginPath(); c.arc(nn / 2, nn / 2, r * 1.9, 0, Math.PI * 2); c.fill()
  c.fillStyle = WOOD.pegboardHoles
  c.beginPath(); c.arc(nn / 2, nn / 2, r * 1.12, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#4a2e18'
  c.beginPath(); c.arc(nn / 2, nn / 2, r * 0.85, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#7d5430'
  c.beginPath()
  c.arc(nn / 2, nn / 2, r * 0.85, Math.PI * 0.05, Math.PI * 0.55)
  c.arc(nn / 2 - r * 0.2, nn / 2 - r * 0.2, r * 0.8, Math.PI * 0.55, Math.PI * 0.05, true)
  c.fill()
}

export const ATLAS_PX = 1024
const REGIONS = {
  sunset: [0, 0, 512, 512],
  castle: [512, 0, 512, 512],
  flowers: [0, 512, 512, 512],
  lined: [512, 512, 256, 256],
  note: [768, 512, 256, 256],
  pink: [512, 768, 256, 256],
  white: [768, 768, 256, 256],
} as const
export type Region = keyof typeof REGIONS
export type PhotoId = 'photo1' | 'photo2' | 'photo3'
export const PHOTO_CELLS: Record<PhotoId, [number, number]> = { photo1: [0, 0], photo2: [512, 0], photo3: [0, 512] }
export const PHOTO_CELL_PX = 512

function regionUV(id: Region, crop: [number, number, number, number] = [0, 0, 1, 1]): [number, number, number, number] {
  const [x, y, w, h] = REGIONS[id]
  const S = ATLAS_PX
  const inset = 2
  const l = x + inset + (w - 2 * inset) * crop[0]
  const t = y + inset + (h - 2 * inset) * crop[1]
  const r = x + inset + (w - 2 * inset) * crop[2]
  const b = y + inset + (h - 2 * inset) * crop[3]
  return [l / S, 1 - b / S, r / S, 1 - t / S]
}

const P = { cream: '#FFF1D6', peach: '#F4C7A6', peachD: '#EBAB86', sage: '#A8C3A0', sageD: '#7FA68A', lav: '#C8B8E6', lavL: '#E6DDF4', lavD: '#A793D6', pink: '#E7A5B4', pinkL: '#F3CFD3', pinkD: '#D98B9E', sky: '#BFD3EE', brick: '#E2A58F' }
export function drawPegAtlas(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')
  if (!c) return
  const region = (id: Region, f: (w: number, h: number) => void) => {
    const [x, y, w, h] = REGIONS[id]
    c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, w, h); c.clip(); f(w, h); c.restore()
  }
  const poly = (pts: [number, number][], fill: string) => { c.fillStyle = fill; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill() }
  region('sunset', () => {
    const g = c.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, P.lav); g.addColorStop(0.55, P.pinkL); g.addColorStop(1, P.peach)
    c.fillStyle = g; c.fillRect(0, 0, 512, 512)
    c.fillStyle = P.cream; c.beginPath(); c.arc(300, 270, 70, 0, Math.PI * 2); c.fill()
    poly([[0, 330], [90, 230], [170, 300], [270, 200], [380, 310], [450, 250], [512, 320], [512, 512], [0, 512]], P.lavD)
    poly([[0, 380], [120, 310], [230, 370], [350, 300], [512, 390], [512, 512], [0, 512]], P.pinkD)
    poly([[0, 440], [150, 400], [300, 450], [512, 410], [512, 512], [0, 512]], P.sageD)
    poly([[220, 512], [262, 512], [300, 410], [275, 410]], P.cream)
    c.strokeStyle = P.peachD; c.lineWidth = 3; c.setLineDash([14, 14]); c.beginPath(); c.moveTo(241, 512); c.lineTo(288, 412); c.stroke(); c.setLineDash([])
  })
  region('castle', () => {
    const g = c.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, P.sky); g.addColorStop(1, P.cream)
    c.fillStyle = g; c.fillRect(0, 0, 512, 512)
    c.fillStyle = P.cream; for (const [x, y, w] of [[60, 80, 110], [330, 60, 130]] as const) { c.beginPath(); c.roundRect(x, y, w, 24, 12); c.fill() }
    poly([[0, 300], [140, 230], [280, 280], [420, 220], [512, 270], [512, 512], [0, 512]], P.sage)
    c.fillStyle = P.pinkL; c.fillRect(300, 150, 120, 85)
    for (let i = 0; i < 5; i++) c.fillRect(300 + i * 26, 138, 16, 14)
    for (const x of [286, 408]) { c.fillStyle = P.pink; c.fillRect(x, 110, 34, 125); poly([[x - 4, 110], [x + 17, 76], [x + 38, 110]], P.lavD) }
    poly([[0, 512], [0, 380], [512, 360], [512, 512]], P.sageD)
    for (let i = 0; i < 6; i++) { const x = 20 + i * 82, h = 55 + ((i * 37) % 30); c.fillStyle = [P.brick, P.peach, P.cream][i % 3]; c.fillRect(x, 440 - h, 66, h + 20); poly([[x - 4, 440 - h], [x + 33, 405 - h], [x + 70, 440 - h]], P.pinkD) }
  })
  region('flowers', () => {
    c.fillStyle = P.lavL; c.fillRect(0, 0, 512, 512)
    c.fillStyle = P.cream; c.fillRect(0, 410, 512, 102)
    c.strokeStyle = P.sageD; c.lineWidth = 9; c.lineCap = 'round'
    const heads: [number, number, number, string][] = [[190, 200, 52, P.pink], [290, 140, 44, P.cream], [360, 245, 48, P.peach], [130, 300, 36, P.lavD]]
    heads.forEach(([hx, hy], i) => { c.beginPath(); c.moveTo(150 + i * 70, 512); c.quadraticCurveTo(150 + i * 70 + (hx - 150 - i * 70) * 0.3, 360, hx, hy); c.stroke() })
    heads.forEach(([hx, hy, r, col]) => { for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; c.fillStyle = col; c.beginPath(); c.arc(hx + Math.cos(a) * r * 0.62, hy + Math.sin(a) * r * 0.62, r * 0.46, 0, Math.PI * 2); c.fill() } c.fillStyle = col === P.cream ? P.peachD : P.cream; c.beginPath(); c.arc(hx, hy, r * 0.36, 0, Math.PI * 2); c.fill() })
    c.fillStyle = P.sage; for (const [x, y, a] of [[150, 440, -2.4], [260, 430, -0.8], [380, 445, -2.2]] as const) { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(46, -28, 96, 0); c.quadraticCurveTo(46, 28, 0, 0); c.fill(); c.restore() }
  })
  region('lined', (w, h) => {
    c.fillStyle = '#FBF8EE'; c.fillRect(0, 0, w, h)
    c.strokeStyle = 'rgba(150,170,200,0.3)'; c.lineWidth = 1.2
    for (let y = 30; y < h; y += 19) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke() }
  })
  region('note', (w, h) => { c.fillStyle = '#FBF8EE'; c.fillRect(0, 0, w, h) })
  region('pink', (w, h) => {
    c.fillStyle = '#F6D7DE'; c.fillRect(0, 0, w, h)
    c.strokeStyle = P.sageD; c.lineWidth = 3; c.lineCap = 'round'
    c.beginPath(); c.moveTo(70, 200); c.quadraticCurveTo(80, 150, 100, 105); c.stroke()
    c.fillStyle = P.sage
    for (const [x, y, a, s] of [[82, 160, -0.5, 1], [88, 135, 0.7, 0.9], [96, 112, -0.3, 0.8]] as const) { c.save(); c.translate(x, y); c.rotate(a - Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(14 * s, -9 * s, 30 * s, 0); c.quadraticCurveTo(14 * s, 9 * s, 0, 0); c.fill(); c.restore() }
  })
  region('white', (w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h) })
  drawNote(cv)
}

export function drawNote(cv: HTMLCanvasElement, lines: string[] = PEGBOARD_NOTE) {
  const c = cv.getContext('2d')
  if (!c) return
  const [x, y, w, h] = REGIONS.note
  c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, w, h); c.clip()
  c.fillStyle = '#FBF8EE'; c.fillRect(0, 0, w, h)
  c.rotate(-2 * Math.PI / 180)
  c.fillStyle = '#4A3322'
  c.font = `700 52px ${BOARD_FONT}`
  c.textBaseline = 'alphabetic'
  lines.forEach((t, i) => c.fillText(t, 22, 62 + i * 56))
  const sx = 150, sy = 62 + (lines.length - 1) * 56 - 22
  c.strokeStyle = '#4A3322'; c.lineWidth = 3; c.lineCap = 'round'
  c.beginPath(); c.moveTo(sx - 9, sy); c.lineTo(sx + 9, sy); c.moveTo(sx, sy - 9); c.lineTo(sx, sy + 9); c.stroke()
  c.lineWidth = 2
  c.beginPath(); c.moveTo(sx + 16, sy - 16); c.lineTo(sx + 16, sy - 8); c.moveTo(sx + 12, sy - 12); c.lineTo(sx + 20, sy - 12); c.stroke()
  c.restore()
}

function paint(g: THREE.BufferGeometry, hex: string, region: Region = 'white'): THREE.BufferGeometry {
  const col = new THREE.Color(hex)
  const cnt = g.attributes.position.count
  const colors = new Float32Array(cnt * 3)
  const uvs = new Float32Array(cnt * 2)
  const [u0, v0, u1, v1] = regionUV(region)
  for (let i = 0; i < cnt; i++) {
    colors.set([col.r, col.g, col.b], i * 3)
    if (!g.attributes.uv) uvs.set([(u0 + u1) / 2, (v0 + v1) / 2], i * 2)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  return g
}
const solid = (g: THREE.BufferGeometry, hex: string) => paint(g.index ? g.toNonIndexed() : g, hex)
const box = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string) => solid(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex)
const rod = (r: number, z0: number, z1: number, x: number, y: number, hex: string, seg = 6) => solid(new THREE.CylinderGeometry(r, r, z1 - z0, seg).rotateX(Math.PI / 2).translate(x, y, (z0 + z1) / 2), hex)
const rodX = (r: number, x0: number, x1: number, y: number, z: number, hex: string, seg = 10) => solid(new THREE.CylinderGeometry(r, r, x1 - x0, seg).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, y, z), hex)

function quad(w: number, h: number, x: number, y: number, z: number, region: Region, hex = '#ffffff', crop?: [number, number, number, number]) {
  const g = new THREE.PlaneGeometry(w, h).translate(x, y, z)
  const [u0, v0, u1, v1] = regionUV(region, crop)
  const uv = g.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i))
  const cnt = g.attributes.position.count
  const colors = new Float32Array(cnt * 3)
  const col = new THREE.Color(hex)
  for (let i = 0; i < cnt; i++) colors.set([col.r, col.g, col.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g.toNonIndexed()
}
const cover = (src: number, dst: number): [number, number, number, number] => (dst < src ? [(1 - dst / src) / 2, 0, 1 - (1 - dst / src) / 2, 1] : [0, (1 - src / dst) / 2, 1, 1 - (1 - src / dst) / 2])

const HEADPHONES = { band: 0.085, tube: 0.008, cup: 0.045, cupDepth: 0.03, z: 0.045 }
function headphoneParts(): THREE.BufferGeometry[] {
  const k = HEADPHONES
  const parts: THREE.BufferGeometry[] = []
  const body = '#CDB8E8'
  parts.push(solid(new THREE.TorusGeometry(k.band, k.tube, 5, 14, Math.PI).translate(0, -k.band, k.z), '#F0C4D4'))
  for (const s of [-1, 1]) {
    const x = s * (k.band + 0.005)
    const y = -k.band - 0.03
    parts.push(rodX(k.cup, x - k.cupDepth / 2, x + k.cupDepth / 2, y, k.z, body, 10))
    const inner = x - s * (k.cupDepth / 2 + 0.003)
    parts.push(solid(new THREE.TorusGeometry(0.031, 0.009, 5, 10).rotateY(Math.PI / 2).translate(inner, y, k.z), '#F6EBDD'))
    parts.push(rodX(0.027, x + s * (k.cupDepth / 2), x + s * (k.cupDepth / 2 + 0.003), y, k.z, '#F7CDB4', 12))
  }
  return parts
}

const CAMERA = { w: 0.13, h: 0.08, d: 0.06, out: 0.0 }
function cameraParts(): THREE.BufferGeometry[] {
  const k = CAMERA
  const z = k.d / 2
  const f = k.d
  const parts: THREE.BufferGeometry[] = []
  parts.push(box(k.w, k.h / 2, k.d, 0, k.h / 4, z, '#F1E6CF'))
  parts.push(box(k.w + 0.002, k.h / 2, k.d + 0.002, 0, -k.h / 4, z, '#F0C4D4'))
  parts.push(rod(0.026, f, f + 0.012, 0.008, -0.002, '#B8BCC4', 14))
  parts.push(rod(0.017, f + 0.012, f + 0.016, 0.008, -0.002, '#5B4F6B', 12))
  parts.push(box(0.006, 0.006, 0.002, 0.003, 0.004, f + 0.0165, '#FFFFFF'))
  parts.push(box(0.03, 0.012, 0.004, -0.036, 0.024, f + 0.002, '#5B4F6B'))
  parts.push(box(0.026, 0.014, 0.012, 0.043, k.h / 2 + 0.007, z + 0.012, '#E7E1D3'))
  parts.push(solid(new THREE.CylinderGeometry(0.0065, 0.0065, 0.006, 8).translate(-0.03, k.h / 2 + 0.003, z), '#F6E3A8'))
  return parts
}

interface Box3 { name: string; min: [number, number, number]; max: [number, number, number] }
export interface PegBuild {
  panel: THREE.BufferGeometry
  items: THREE.BufferGeometry
  boxes: Box3[]
  triangles: { panel: number; items: number; headphones: number; camera: number }
  planks: PlankInfo[]
}

export function buildPegboard(): PegBuild {
  const parts: THREE.BufferGeometry[] = []
  const boxes: Box3[] = []
  const addItem = (name: string, gs: THREE.BufferGeometry[], m0: THREE.Matrix4) => {
    const k = ITEM_SCALE[name.split('-')[0]] ?? 1
    const m = k === 1 ? m0 : m0.clone().multiply(new THREE.Matrix4().makeScale(k, k, k))
    const placed = gs.map((g) => g.clone().applyMatrix4(m))
    const b = new THREE.Box3()
    placed.forEach((g) => { g.computeBoundingBox(); b.union(g.boundingBox!) })
    boxes.push({ name, min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] })
    parts.push(...placed)
    return placed.reduce((s, g) => s + g.attributes.position.count / 3, 0)
  }
  const panel = new THREE.PlaneGeometry(BOARD_W, BOARD.h).applyMatrix4(place(BOARD_W / 2, BOARD.h / 2))
  const fz = -BOARD.depth / 2 + BOARD.frameProud / 2
  const bar = (w: number, h: number, u: number, v: number) => box(w, h, BOARD.depth + BOARD.frameProud, u - BOARD_W / 2, v - BOARD.h / 2, fz, WOOD.edges)
  const F = BOARD.frame
  addItem('frame', [bar(BOARD_W, F, BOARD_W / 2, F / 2), bar(BOARD_W, F, BOARD_W / 2, BOARD.h - F / 2), bar(F, BOARD.h - 2 * F, F / 2, BOARD.h / 2), bar(F, BOARD.h - 2 * F, BOARD_W - F / 2, BOARD.h / 2)], place(BOARD_W / 2, BOARD.h / 2))
  for (const p of PEGS) addItem('peg-' + p.id, [rod(0.004, 0, p.len - 0.012, 0, 0, DARK_GREY), rod(0.0046, p.len - 0.012, p.len, 0, 0, p.tip)], place(p.u, p.v))
  const planks = PLANKS.map((p) => plankInfo(p.id))
  for (const pl of planks) {
    const s = slot(pl.id)
    const len = PLANKS.find((q) => q.id === pl.id)!.len
    addItem('plank-' + pl.id, [box(len, PLANK_T, PLANK_D, 0, 0, PLANK_D / 2, WOOD.pegboardShelves)], place(s.u, s.v))
    for (const side of ['l', 'r']) {
      const peg = PEGS.find((q) => q.id === `${pl.id}-${side}`)!
      const up = s.v - PLANK_T / 2 - peg.v
      addItem(`bracket-${pl.id}-${side}`, [box(0.008, up, 0.008, 0, up / 2, 0.096, DARK_GREY)], place(peg.u, peg.v))
    }
  }
  const hp = PEGS.find((p) => p.id === 'headphones')!
  const hpTris = addItem('headphones', headphoneParts(), place(hp.u, hp.v))
  const pl = planks.find((p) => p.id === 'shelf-l')!
  const camU = pl.u0 + 0.33
  const camTris = addItem('camera', cameraParts(), place(camU, pl.topV + (CAMERA.h * ITEM_SCALE.camera) / 2 + 0.0005, -0.012, 0.012))
  const mid = planks.find((p) => p.id === 'shelf-c')!
  const white = regionUV('white')
  const bunnyParts3 = bunnyParts().map((g) => {
    const uv = new Float32Array(g.attributes.position.count * 2)
    for (let i = 0; i < g.attributes.position.count; i++) uv.set([(white[0] + white[2]) / 2, (white[1] + white[3]) / 2], i * 2)
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    return g
  })
  addItem('bunny', bunnyParts3, place(BUNNY_U, mid.topV + 0.0003, 0, PLANK_D / 2).multiply(new THREE.Matrix4().makeRotationY(0.35)))
  const pin = (u: number, v: number, z: number, hex: string) => addItem('pin', [solid(new THREE.SphereGeometry(0.006, 6, 4), hex)], place(u, v, 0, z))
  const deg = (d: number) => (d * Math.PI) / 180
  const p1 = slot('pic1')
  addItem('pic1', [quad(0.26, 0.32, 0, 0, 0.004, 'white', '#FBF8F0'), quad(0.22, 0.28, 0, -0.005, 0.0052, 'sunset', '#ffffff', cover(1, 0.22 / 0.28))], place(p1.u, p1.v, deg(1.5)))
  addItem('pic1-clip', [box(0.03, 0.012, 0.012, 0, 0, 0.012, C.MUSTARD)], place(p1.u, p1.v + 0.158, deg(1.5)))
  const p2 = slot('pic2')
  addItem('pic2', [quad(0.25, 0.2, 0, 0, 0.004, 'white', '#FBF8F0'), quad(0.21, 0.16, 0, 0, 0.0052, 'castle', '#ffffff', cover(1, 0.21 / 0.16))], place(p2.u, p2.v, deg(-1.5)))
  pin(p2.u - 0.11, p2.v + 0.085, 0.009, C.TEAL)
  const sk = slot('sketch')
  addItem('sketch', [quad(0.16, 0.08, 0, 0, 0.004, 'lined', '#ffffff', cover(1, 2))], place(sk.u, sk.v, deg(2)))
  pin(sk.u, sk.v + 0.03, 0.0085, C.CORAL)
  const po = slot('polaroid')
  addItem('polaroid', [quad(0.12, 0.15, 0, 0, 0.004, 'white', '#FBF8F0'), quad(0.1, 0.1, 0, 0.012, 0.0052, 'flowers')], place(po.u, po.v, deg(3)))
  pin(po.u, po.v + 0.065, 0.0085, C.LAVENDER)
  const nt = slot('note')
  addItem('note', [quad(0.2, 0.24, 0, 0, 0.004, 'note', '#ffffff', [0, 0, 0.833, 1])], place(nt.u, nt.v, deg(-2)))
  pin(nt.u, nt.v + 0.105, 0.0085, C.MUSTARD)
  const pk = slot('pink')
  addItem('pink', [quad(0.12, 0.16, 0, 0, 0.004, 'pink', '#ffffff', [0, 0, 0.75, 1])], place(pk.u, pk.v, deg(4)))
  pin(pk.u, pk.v + 0.068, 0.0085, C.TEAL)
  const items = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!
  parts.forEach((g) => g.dispose())
  return { panel, items, boxes, triangles: { panel: 2, items: items.attributes.position.count / 3, headphones: hpTris, camera: camTris }, planks }
}
