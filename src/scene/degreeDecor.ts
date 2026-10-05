import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ARCH } from './degreeDesign'
import { BOARD_FONT, CERT_FONT } from './fonts'

export const ATLAS = 1024
const NOTE_PX = 200
const NOTE_SIZE = 0.13
export const NOTE_SLOTS: [number, number, number][] = [
  [-0.95, 2.685, -4], [-0.1, 2.69, 3], [0.45, 2.68, -2], [0.86, 2.35, -5], [0.87, 2.12, 3], [0.86, 1.88, -2], [0.86, 1.64, 3], [-1.45, 2.0, -3],
]
const NOTE_COLORS = ['#FFF3A8', '#FFC9DC', '#C9F0DC', '#DCCFF5']
const NOTE_INK = '#4A3A5C'
export const NOTE_FONT = BOARD_FONT
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
export const DECOR_Z = 0.003

interface Poster { id: 'code' | 'type' | 'keys'; x: number; y: number; w: number; h: number; tilt: number; cell: [number, number, number, number] }
const POSTERS: Poster[] = [
  { id: 'code', x: -0.909, y: 3.06, w: 0.702, h: 0.54, tilt: 1.5, cell: [0, 420, 400, 308] },
  { id: 'type', x: -0.1925, y: 3.12, w: 0.391, h: 0.5474, tilt: -2, cell: [410, 420, 300, 420] },
  { id: 'keys', x: 0.4145, y: 3.04, w: 0.483, h: 0.483, tilt: 1, cell: [720, 420, 300, 300] },
]
const noteCell = (i: number): [number, number, number, number] => [(i % 4) * NOTE_PX, Math.floor(i / 4) * NOTE_PX, NOTE_PX, NOTE_PX]

type Ctx = CanvasRenderingContext2D

function wrapLines(c: Ctx, text: string, maxW: number): string[] {
  const out: string[] = []
  let line = ''
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w
    if (line && c.measureText(next).width > maxW) { out.push(line); line = w } else line = next
  }
  if (line) out.push(line)
  return out
}

function drawNote(c: Ctx, cell: [number, number, number, number], color: string, text: string) {
  const [x, y, w, h] = cell
  c.save()
  c.translate(x, y)
  c.fillStyle = color
  c.fillRect(0, 0, w, h)
  const g = c.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(0,0,0,.10)')
  g.addColorStop(0.12, 'rgba(0,0,0,0)')
  g.addColorStop(0.9, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,.10)')
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  c.fillStyle = NOTE_INK
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  const maxW = w * 0.82
  let size = 44
  let lines: string[] = []
  for (; size > 20; size -= 2) {
    c.font = `700 ${size}px ${NOTE_FONT}`
    lines = wrapLines(c, text, maxW)
    if (lines.length * size * 1.05 <= h * 0.72 && lines.every((l) => c.measureText(l).width <= maxW)) break
  }
  const lh = size * 1.05
  lines.forEach((l, i) => c.fillText(l, w / 2, h * 0.54 + (i - (lines.length - 1) / 2) * lh))
  c.restore()
}

function frame(c: Ctx, w: number, h: number, bg: string) {
  c.fillStyle = bg
  c.fillRect(0, 0, w, h)
  c.strokeStyle = '#F7EFE2'
  c.lineWidth = 14
  c.strokeRect(7, 7, w - 14, h - 14)
  c.strokeStyle = 'rgba(120,90,60,.25)'
  c.lineWidth = 2
  c.strokeRect(14, 14, w - 28, h - 28)
}

function washi(c: Ctx, x: number, y: number, w: number, color: string) {
  c.save()
  c.translate(x, y)
  c.rotate(-0.04)
  c.fillStyle = color
  c.globalAlpha = 0.85
  c.fillRect(-w / 2, -14, w, 28)
  c.globalAlpha = 0.5
  c.fillStyle = '#fff'
  for (let i = -w / 2; i < w / 2; i += 14) c.fillRect(i, -14, 5, 28)
  c.restore()
}

function drawCode(c: Ctx, p: Poster) {
  const [x, y, w, h] = p.cell
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  c.translate(x, y)
  frame(c, w, h, '#E6EFFD')
  ;['#F5A3B5', '#F8D98B', '#A8DDB9'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(w * 0.1 + i * 22, 44, 7, 0, Math.PI * 2); c.fill() })
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  const lines: { indent: number; parts: [string, string][] }[] = [
    { indent: 0, parts: [['console', '#7A5AC9'], ['.', '#6B5F86'], ['log', '#C0568B'], ['(', '#6B5F86']] },
    { indent: 2, parts: [['"hello, world"', '#2E9E7D']] },
    { indent: 0, parts: [[')', '#6B5F86'], [';', '#6B5F86']] },
  ]
  const inner = w * 0.84
  let size = 44
  const widthOf = (l: (typeof lines)[number]) => c.measureText(' '.repeat(l.indent) + l.parts.map((q) => q[0]).join('')).width
  for (; size > 12; size -= 1) {
    c.font = `700 ${size}px ${MONO}`
    if (Math.max(...lines.map(widthOf)) <= inner) break
  }
  const lh = size * 1.45
  const top = h * 0.5 - (lh * (lines.length - 1)) / 2 + 14
  lines.forEach((l, i) => {
    let px = w * 0.08 + c.measureText(' '.repeat(l.indent)).width
    for (const [t, col] of l.parts) { c.fillStyle = col; c.fillText(t, px, top + i * lh); px += c.measureText(t).width }
  })
  c.restore()
}

function drawType(c: Ctx, p: Poster) {
  const [x, y, w, h] = p.cell
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  c.translate(x, y)
  frame(c, w, h, '#FCE4EC')
  washi(c, w / 2, 20, 120, '#B7D6F0')
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillStyle = '#8A5A7A'
  c.font = `700 62px ${CERT_FONT}`
  c.fillText('KEEP', w / 2, 100)
  c.fillText('CALM', w / 2, 166)
  c.font = `700 34px ${CERT_FONT}`
  c.fillText('AND', w / 2, 224)
  c.fillStyle = '#5B45C4'
  c.font = `700 52px ${MONO}`
  c.fillText('git', w / 2, 296)
  c.fillText('push', w / 2, 352)
  c.restore()
}

function drawKeys(c: Ctx, p: Poster) {
  const [x, y, w, h] = p.cell
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  c.translate(x, y)
  frame(c, w, h, '#E1F4EA')
  c.fillStyle = '#6B8F7C'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.font = `700 130px ${CERT_FONT}`
  c.fillText('{', w * 0.28, h * 0.3)
  c.fillText('}', w * 0.72, h * 0.3)
  c.fillStyle = '#C7B7EA'
  c.beginPath(); c.roundRect(40, h * 0.52, w - 80, h * 0.34, 14); c.fill()
  c.fillStyle = '#F7F1FF'
  const kw = (w - 110) / 7
  for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) { c.beginPath(); c.roundRect(55 + k * kw, h * 0.55 + r * 28, kw - 6, 22, 5); c.fill() }
  c.beginPath(); c.roundRect(55 + kw * 1.5, h * 0.55 + 56, kw * 4, 22, 5); c.fill()
  c.restore()
}

export function drawDecorAtlas(cv: HTMLCanvasElement, notes: string[]) {
  const c = cv.getContext('2d')
  if (!c) return
  c.clearRect(0, 0, cv.width, cv.height)
  notes.slice(0, NOTE_SLOTS.length).forEach((t, i) => drawNote(c, noteCell(i), NOTE_COLORS[i % NOTE_COLORS.length], t))
  drawCode(c, POSTERS[0])
  drawType(c, POSTERS[1])
  drawKeys(c, POSTERS[2])
}

export function buildDecorGeometry(count: number, z: number): THREE.BufferGeometry {
  const quad = (cx: number, cy: number, w: number, h: number, tilt: number, cell: [number, number, number, number], lift: number) => {
    const g = new THREE.PlaneGeometry(w, h)
    const [px, py, pw, ph] = cell
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * pw) / ATLAS, 1 - (py + (1 - uv.getY(i)) * ph) / ATLAS)
    g.rotateZ((tilt * Math.PI) / 180)
    g.translate(cx, cy, z + lift)
    return g.toNonIndexed()
  }
  const parts = [
    ...NOTE_SLOTS.slice(0, count).map(([x, y, t], i) => quad(x, y, NOTE_SIZE, NOTE_SIZE, t, noteCell(i), 0.002)),
    ...POSTERS.map((p) => quad(p.x, p.y, p.w, p.h, p.tilt, p.cell, 0)),
  ]
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

export function archPieces(cx: number, z: number): { geometry: THREE.BufferGeometry; color: string }[] {
  const path = (inset: number) => {
    const r = ARCH.w / 2 - inset
    const spring = ARCH.y1 - ARCH.w / 2
    const p = new THREE.Path()
    p.moveTo(cx - r, ARCH.y0 + inset)
    p.lineTo(cx + r, ARCH.y0 + inset)
    p.lineTo(cx + r, spring)
    p.absarc(cx, spring, r, 0, Math.PI, false)
    p.lineTo(cx - r, ARCH.y0 + inset)
    return p
  }
  const outline = new THREE.Shape(path(0).getPoints(24))
  outline.holes.push(new THREE.Path(path(ARCH.line).getPoints(24).reverse()))
  const ring = new THREE.ExtrudeGeometry(outline, { depth: 0.004, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, z + 0.001)
  const fill = new THREE.ExtrudeGeometry(new THREE.Shape(path(ARCH.line).getPoints(24)), { depth: 0.002, bevelEnabled: false, curveSegments: 24 }).translate(0, 0, z)
  return [{ geometry: fill, color: ARCH.fill }, { geometry: ring, color: ARCH.trim }]
}
