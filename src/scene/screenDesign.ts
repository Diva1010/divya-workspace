import * as THREE from 'three'
import { mulberry } from './geometry'
import { categoryColor, content, getMailto, techsByCategory } from '../content'
import { safeHref } from '../ui/parts'
import { SECTION_ICON, strokeIcon } from '../icons'

export const SCREEN_W = 960
const SCREEN_H = 549
const WALL = ['#2B2F77', '#6A3FB5', '#1FA3A8']
const BAR_H = 28
const WINDOW = { x: 120, y: 64, w: 720, h: 372, title: 34 }
const ICON_COLORS = [['#8E78D8', '#5B9FD6'], ['#EF8FB1', '#F0BC4A'], ['#4FB3A9', '#6FBF73'], ['#5B9FD6', '#8E78D8']]
const DOCK_COLORS = ['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#B388EB']

const TEX_W = 1024
const TEX_H = 585
const S = TEX_W / SCREEN_W

function canvas() {
  const cv = document.createElement('canvas')
  cv.width = TEX_W
  cv.height = TEX_H
  return { cv, c: cv.getContext('2d')! }
}
function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}
function texture(cv: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

let desktop: THREE.CanvasTexture | null = null
let desktopClean: THREE.CanvasTexture | null = null
const SCREEN_ICON_SIZE = 0.4
const SCREEN_ICON_ALPHA = 0.3
const MONITOR_SCREEN_WIDTH = 0.9777
const LAPTOP_SCREEN_WIDTH = 0.8

function desktopTexture(clean = false) {
  if (clean ? desktopClean : desktop) return (clean ? desktopClean : desktop)!
  const { cv, c } = canvas()
  const g = c.createLinearGradient(0, 0, TEX_W, TEX_H)
  g.addColorStop(0, WALL[0])
  g.addColorStop(0.55, WALL[1])
  g.addColorStop(1, WALL[2])
  c.fillStyle = g
  c.fillRect(0, 0, TEX_W, TEX_H)
  c.fillStyle = 'rgba(12,12,32,0.55)'
  c.fillRect(0, 0, TEX_W, BAR_H * S)
  const lg = c.createLinearGradient(14 * S, 7 * S, 28 * S, 21 * S)
  lg.addColorStop(0, '#FFD166')
  lg.addColorStop(1, '#EF476F')
  c.fillStyle = lg
  c.beginPath(); c.arc(21 * S, BAR_H * S / 2, 7 * S, 0, Math.PI * 2); c.fill()
  c.fillStyle = 'rgba(242,240,255,0.85)'
  rrect(c, 38 * S, (BAR_H / 2 - 4) * S, 70 * S, 8 * S, 4 * S); c.fill()
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc((SCREEN_W - 24 - i * 16) * S, BAR_H * S / 2, 4 * S, 0, Math.PI * 2); c.fill() }
  const w = WINDOW
  c.save(); c.shadowColor = 'rgba(8,6,30,0.45)'; c.shadowBlur = 40 * S; c.shadowOffsetY = 16 * S
  c.fillStyle = '#F4F2FB'; rrect(c, w.x * S, w.y * S, w.w * S, w.h * S, 12 * S); c.fill(); c.restore()
  c.save(); rrect(c, w.x * S, w.y * S, w.w * S, w.h * S, 12 * S); c.clip()
  c.fillStyle = '#DCD8EF'; c.fillRect(w.x * S, w.y * S, w.w * S, w.title * S)
  ;['#EF476F', '#FFD166', '#06D6A0'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc((w.x + 20 + i * 19) * S, (w.y + w.title / 2) * S, 5.5 * S, 0, Math.PI * 2); c.fill() })
  c.strokeStyle = '#6A3FB5'; strokeIcon(c, 'folder', (w.x + 89 + 8) * S, (w.y + w.title / 2) * S, 16 * S)
  c.fillStyle = '#2A2750'; rrect(c, (w.x + 113) * S, (w.y + w.title / 2 - 4) * S, 90 * S, 8 * S, 4 * S); c.fill()
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    const cx = w.x + 18 + (col + 0.5) * ((w.w - 36) / 4), cy = w.y + w.title + 18 + row * 130 + 36
    const [a, b] = ICON_COLORS[i % ICON_COLORS.length]
    const ig = c.createLinearGradient((cx - 32) * S, (cy - 32) * S, (cx + 32) * S, (cy + 32) * S)
    ig.addColorStop(0, a); ig.addColorStop(1, b)
    c.fillStyle = ig; rrect(c, (cx - 32) * S, (cy - 32) * S, 64 * S, 64 * S, 14 * S); c.fill()
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 3 * S; rrect(c, (cx - 15) * S, (cy - 8) * S, 30 * S, 22 * S, 5 * S); c.stroke()
    c.fillStyle = '#FFFFFF'; c.fillRect((cx - 15) * S, (cy - 8) * S, 30 * S, 7 * S)
    c.fillStyle = '#9A96B8'; rrect(c, (cx - 30) * S, (cy + 44) * S, 60 * S, 8 * S, 4 * S); c.fill()
  }
  c.restore()
  const dw = DOCK_COLORS.length * 36 + (DOCK_COLORS.length - 1) * 12 + 28
  c.fillStyle = 'rgba(255,255,255,0.22)'; rrect(c, ((SCREEN_W - dw) / 2) * S, (SCREEN_H - 12 - 52) * S, dw * S, 52 * S, 18 * S); c.fill()
  DOCK_COLORS.forEach((col, i) => { c.fillStyle = col; rrect(c, ((SCREEN_W - dw) / 2 + 14 + i * 48) * S, (SCREEN_H - 12 - 44) * S, 36 * S, 36 * S, 10 * S); c.fill() })
  if (!clean) {
    c.save(); c.globalAlpha = SCREEN_ICON_ALPHA; c.strokeStyle = '#FFFFFF'
    strokeIcon(c, SECTION_ICON.projects, TEX_W / 2, TEX_H / 2, (SCREEN_ICON_SIZE / MONITOR_SCREEN_WIDTH) * TEX_W, 1.1)
    c.restore()
  }
  const t = texture(cv)
  if (clean) desktopClean = t; else desktop = t
  return t
}

let editor: THREE.CanvasTexture | null = null
export function editorTexture() {
  if (editor) return editor
  const { cv, c } = canvas()
  c.fillStyle = '#1E2030'; c.fillRect(0, 0, TEX_W, TEX_H)
  c.fillStyle = '#181A27'; c.fillRect(0, 0, 54 * S, TEX_H)
  for (let i = 0; i < 5; i++) { c.fillStyle = i === 0 ? '#8E78D8' : '#3A3D55'; rrect(c, 13 * S, (18 + i * 44) * S, 28 * S, 28 * S, 7 * S); c.fill() }
  c.fillStyle = '#232536'; c.fillRect(54 * S, 0, TEX_W, 32 * S)
  c.fillStyle = '#1E2030'; rrect(c, 66 * S, 6 * S, 120 * S, 26 * S, 6 * S); c.fill()
  c.fillStyle = '#9A96B8'; rrect(c, 80 * S, 15 * S, 70 * S, 8 * S, 4 * S); c.fill()
  c.fillStyle = '#3A3D55'; rrect(c, 198 * S, 12 * S, 90 * S, 8 * S, 4 * S); c.fill()
  const colors = ['#C792EA', '#82AAFF', '#C3E88D', '#F78C6C', '#89DDFF', '#B2CCD6']
  const rnd = mulberry(7)
  for (let line = 0; line < 22; line++) {
    const y = (50 + line * 21) * S
    c.fillStyle = '#4A4E6A'; rrect(c, 72 * S, y, 16 * S, 7 * S, 3 * S); c.fill()
    const indent = [0, 1, 1, 2, 2, 1, 0, 1, 2, 3, 2, 1][line % 12]
    let x = (108 + indent * 26) * S
    const parts = 2 + Math.floor(rnd() * 3)
    for (let p = 0; p < parts; p++) {
      const len = (30 + rnd() * 90) * S
      c.fillStyle = colors[Math.floor(rnd() * colors.length)]
      rrect(c, x, y, len, 7 * S, 3 * S); c.fill()
      x += len + 10 * S
    }
  }
  c.fillStyle = '#6A3FB5'; c.fillRect(0, (SCREEN_H - 22) * S, TEX_W, 22 * S)
  c.fillStyle = 'rgba(255,255,255,0.8)'; rrect(c, 14 * S, (SCREEN_H - 15) * S, 60 * S, 8 * S, 4 * S); c.fill()
  editor = texture(cv)
  return editor
}

export const LAPTOP_W = 960
const LAPTOP_H = 600
const LAPTOP_COLORS = { bg: '#14152A', bar: '#0E0F20', panel: '#1D1F3A', text: '#E7E4FA', dim: '#9A96B8', accent: '#8E78D8', chip: '#2A2D52' }
const FONT = '"Nunito","Trebuchet MS",ui-rounded,system-ui,sans-serif'

let laptop: THREE.CanvasTexture | null = null
let laptopClean: THREE.CanvasTexture | null = null
const LAPTOP_CAT = { cols: 4, w: 200, h: 64, gap: 20 }
function laptopTexture(clean = false) {
  if (clean ? laptopClean : laptop) return (clean ? laptopClean : laptop)!
  const W = 1024
  const H = 640
  const k = W / LAPTOP_W
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!
  const C = LAPTOP_COLORS
  c.fillStyle = C.bg; c.fillRect(0, 0, W, H)
  c.fillStyle = C.bar; c.fillRect(0, 0, W, 38 * k)
  ;['#EF476F', '#FFD166', '#06D6A0'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc((20 + i * 19) * k, 19 * k, 5.5 * k, 0, Math.PI * 2); c.fill() })
  c.fillStyle = C.dim; c.font = `800 ${14 * k}px ${FONT}`; c.textBaseline = 'middle'
  c.strokeStyle = LAPTOP_COLORS.accent; strokeIcon(c, 'gear', 103 * k, 19 * k, 16 * k)
  c.fillText(content.sections.skills.label, 119 * k, 19 * k)
  const cats = techsByCategory()
  const rows = Math.ceil(cats.length / LAPTOP_CAT.cols)
  const gridW = LAPTOP_CAT.cols * LAPTOP_CAT.w + (LAPTOP_CAT.cols - 1) * LAPTOP_CAT.gap
  const gridH = rows * LAPTOP_CAT.h + (rows - 1) * LAPTOP_CAT.gap
  const gx = (LAPTOP_W - gridW) / 2
  const gy = 38 + (LAPTOP_H - 38 - gridH) / 2
  c.textBaseline = 'middle'
  cats.forEach((g, i) => {
    const x = gx + (i % LAPTOP_CAT.cols) * (LAPTOP_CAT.w + LAPTOP_CAT.gap)
    const y = gy + Math.floor(i / LAPTOP_CAT.cols) * (LAPTOP_CAT.h + LAPTOP_CAT.gap)
    c.fillStyle = C.chip; c.beginPath(); c.roundRect(x * k, y * k, LAPTOP_CAT.w * k, LAPTOP_CAT.h * k, 12 * k); c.fill()
    c.fillStyle = categoryColor(g.category); c.beginPath(); c.arc((x + 16 + 5) * k, (y + LAPTOP_CAT.h / 2) * k, 5 * k, 0, Math.PI * 2); c.fill()
    c.fillStyle = C.dim; c.font = `700 ${13 * k}px ${FONT}`; c.textAlign = 'right'
    c.fillText(String(g.technologies.length), (x + LAPTOP_CAT.w - 16) * k, (y + LAPTOP_CAT.h / 2) * k)
    c.fillStyle = C.text; c.font = `700 ${15 * k}px ${FONT}`; c.textAlign = 'left'
    c.fillText(g.category, (x + 16 + 10 + 10) * k, (y + LAPTOP_CAT.h / 2) * k, (LAPTOP_CAT.w - 16 - 20 - 16 - 22) * k)
  })
  c.textAlign = 'left'
  if (!clean) {
    c.save(); c.globalAlpha = SCREEN_ICON_ALPHA; c.strokeStyle = '#FFFFFF'
    strokeIcon(c, SECTION_ICON.skills, W / 2, H / 2, (SCREEN_ICON_SIZE / LAPTOP_SCREEN_WIDTH) * W, 1.1)
    c.restore()
  }
  const t = texture(cv)
  if (clean) laptopClean = t; else laptop = t
  return t
}

export function screenPicture(kind: 'projects' | 'skills', mounted: boolean): THREE.CanvasTexture {
  const make = kind === 'projects' ? desktopTexture : laptopTexture
  if (!mounted) return make(false)
  try {
    return make(true)
  } catch {
    return make(false)
  }
}

export function disposeScreenPictures() {
  for (const t of [desktop, desktopClean, laptop, laptopClean]) t?.dispose()
}

export const PHONE_TEX_W = 512
const PHONE_TEX_H = 1063
export const PHONE_W = 360
export const PHONE_TILE = 140
export const PHONE_ENVELOPE = { size: 91, stroke: 9 }
export const PHONE_TILES = [
  { field: 'email', label: 'Email', cy: 250, colors: ['#5B9FD6', '#8E78D8'] },
  { field: 'linkedin', label: 'LinkedIn', cy: 520, colors: ['#6FBF73', '#4FB3A9'] },
  { field: 'github', label: 'GitHub', cy: 790, colors: ['#EF8FB1', '#F0BC4A'] },
] as const
export type PhoneField = (typeof PHONE_TILES)[number]['field']

export function contactHref(field: PhoneField): string | undefined {
  if (field === 'email') {
    const m = getMailto()
    return m ? safeHref(m) : undefined
  }
  return safeHref(content.contact[field])
}

let phone: THREE.CanvasTexture | null = null
export function phoneTexture() {
  if (phone) return phone
  const W = PHONE_TEX_W
  const H = PHONE_TEX_H
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')!
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#3A2F8F'); g.addColorStop(0.55, '#8E5BC9'); g.addColorStop(1, '#E58BB2')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.fillStyle = 'rgba(255,255,255,0.8)'
  ;[0, 1, 2].forEach((i) => { c.beginPath(); c.arc(W - 40 - i * 22, 30, 6, 0, Math.PI * 2); c.fill() })
  c.beginPath(); c.roundRect(34, 24, 60, 12, 6); c.fill()
  c.fillStyle = 'rgba(8,6,30,0.85)'; c.beginPath(); c.roundRect(W / 2 - 60, 12, 120, 26, 13); c.fill()
  const glyphs: Record<PhoneField, (x: CanvasRenderingContext2D) => void> = {
    email: (x) => strokeIcon(x, 'envelope', 0, 0, PHONE_ENVELOPE.size, (PHONE_ENVELOPE.stroke * 24) / PHONE_ENVELOPE.size),
    linkedin: (x) => { x.rotate(-Math.PI / 4); x.beginPath(); x.roundRect(-46, -17, 56, 34, 17); x.stroke(); x.beginPath(); x.roundRect(-10, -17, 56, 34, 17); x.stroke() },
    github: (x) => { x.beginPath(); x.moveTo(-14, -34); x.lineTo(-44, 0); x.lineTo(-14, 34); x.stroke(); x.beginPath(); x.moveTo(14, -34); x.lineTo(44, 0); x.lineTo(14, 34); x.stroke(); x.beginPath(); x.moveTo(6, -40); x.lineTo(-6, 40); x.stroke() },
  }
  for (const t of PHONE_TILES) {
    c.globalAlpha = contactHref(t.field) ? 1 : 0.45
    const cx = W / 2
    const h = PHONE_TILE / 2
    const tg = c.createLinearGradient(cx - h, t.cy - h, cx + h, t.cy + h)
    tg.addColorStop(0, t.colors[0]); tg.addColorStop(1, t.colors[1])
    c.fillStyle = tg; c.beginPath(); c.roundRect(cx - h, t.cy - h, PHONE_TILE, PHONE_TILE, 32); c.fill()
    c.save(); c.translate(cx, t.cy); c.strokeStyle = '#FFFFFF'; c.fillStyle = '#FFFFFF'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round'; glyphs[t.field](c); c.restore()
    c.fillStyle = '#FFFFFF'; c.font = `800 26px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'
    c.fillText(t.label, cx, t.cy + 112)
    c.globalAlpha = 1
  }
  c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.roundRect(W / 2 - 70, H - 28, 140, 8, 4); c.fill()
  phone = texture(cv)
  return phone
}
