import { CERT_FONT } from './fonts'
import { WALNUT } from './frame'
import { strokeIcon } from '../icons'
import { content, educationStatus } from '../content'

export const WALL_SEED = 11
export const SLAT_W = 0.0672
export const SLAT_BASE = '#C8B8B0'
export const SLAT_TINT = 0.025
export const SLAT_BACKING = '#A0938D'
export const FRAME_COLOR = WALNUT
export const BRASS = '#B88A34'
export const ARCH = { w: 1.45, line: 0.022, y0: 2.4, y1: 3.46, trim: '#E3C6B2', fill: '#F7ECE1' }
const TITLE_INK = '#241322'
const SUBTITLE_INK = '#2E1B2C'
const TITLE_HALO = 'rgba(246,235,221,.95)'
export const SLAT_EMISSIVE_COLOR = '#C8B8B0'
export const SLAT_EMISSIVE: [number, number, number] = [0.1, 0.07, 0.02]
export const PAPER_GLOW: [number, number, number] = [0.8, 0.55, 0.3]
export const TITLE_NIGHT = 0.75
export const byTone = (v: [number, number, number], tone: number) => (tone <= 0.55 ? v[0] + (v[1] - v[0]) * (tone / 0.55) : v[1] + (v[2] - v[1]) * Math.min(1, (tone - 0.55) / 0.45))
export const CEILING_Y = 4.18
const SPARKLE = '#EBC15A'
const MEDAL_RING = '#F3E3D3'
const MEDAL_CAP = '#D9C4E8'
export const MEDAL_HALO = '#FFD9A8'
export const MEDAL_HALO_K = 0.5
export const LIGHT_BAR = '#FFD27A'
export const LIGHT_BAR_INTENSITY = 2.7
export const SPILL = 0.55
export const LED_COLOR = '#FFC98A'
export const LED_W = 0.012
export const STUD_R = 0.011
export const STUD_T = 0.008
export const SHADOW_REACH = 0.07
export const SHADOW_DROP = 0.015
export const SHADOW_OPACITY = 0.22
export const GOLD = '#E8B84B'
export const DISC = '#A78CB0'
const PAPER = '#F6EBDD'
const MUTED = '#5E5444'
const DIPLOMA_INK = '#3A2A33'
const RULE = '#C09A52'
const SEAL = '#E3B352'
export const LIGHT_COLOR = '#FFC37A'
export const LIGHT_BASE = { day: 0.1, dusk: 0.25, night: 0.4 }
export const LIGHT_FOCUS = 1
export const LIGHT_RATE = 4
export const FRAME_HALO_STRENGTH = 0.35
export const FRAME_HALO_REACH = 0.12
export const PAPER_LIFT = 0.35
export const GLOW_HALO_BASE = [0.4, 0.25]
export const HALO_SCALE = 0.25
export const HALO_BLUR = [3, 9]
export const EMISSIVE_PX_PER_M = 700

export const DIPLOMA_PX_PER_M = 1280
const DEGREE_M = 0.0706
const DEGREE_MIN_M = 0.05
const INSTITUTION_M = 0.04
const LOCATION_M = 0.037
const YEARS_M = 0.037
const STATUS_M = 0.037
const BLOCK_GAP_M = 0.022
const DETAILS_M = 0.03
const DETAILS_MIN_M = 0.025
const MARGIN_M = 0.08
const SEAL_R_M = 0.066

type Ctx = CanvasRenderingContext2D
export interface Rect { x: number; y: number; w: number; h: number }
type Item = (typeof content.education.items)[number]

function ellipsize(c: Ctx, text: string, maxW: number): string {
  if (c.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && c.measureText(`${t}…`).width > maxW) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

function wrap(c: Ctx, text: string, maxW: number, maxLines: number): { lines: string[]; cut: boolean } {
  const lines: string[] = []
  let line = ''
  const words = text.split(/\s+/).filter(Boolean)
  let i = 0
  for (; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]
    if (line && c.measureText(next).width > maxW) {
      lines.push(line)
      if (lines.length === maxLines) break
      line = words[i]
    } else line = next
  }
  if (lines.length < maxLines) {
    lines.push(line)
    return { lines: lines.map((l) => ellipsize(c, l, maxW)), cut: false }
  }
  const rest = [lines[maxLines - 1]].concat(words.slice(i)).join(' ')
  lines[maxLines - 1] = ellipsize(c, rest, maxW)
  return { lines: lines.map((l) => ellipsize(c, l, maxW)), cut: true }
}

export function drawEmblem(c: Ctx, r: Rect) {
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  c.strokeStyle = MEDAL_RING
  c.lineWidth = r.w * 0.04
  c.beginPath()
  c.arc(cx, cy, r.w * 0.47, 0, Math.PI * 2)
  c.stroke()
  c.lineWidth = r.w * 0.012
  c.beginPath()
  c.arc(cx, cy, r.w * 0.4, 0, Math.PI * 2)
  c.stroke()
  c.strokeStyle = MEDAL_CAP
  strokeIcon(c, 'cap', cx, cy, r.w * 0.46, 2.6)
}

function inked(c: Ctx, text: string, x: number, y: number, color: string, heavy = false) {
  const px = parseFloat(c.font.match(/(\d+(\.\d+)?)px/)?.[1] ?? '20')
  c.save()
  c.shadowColor = TITLE_HALO
  c.shadowBlur = 6
  c.shadowOffsetX = 0
  c.shadowOffsetY = 0
  c.fillStyle = color
  c.fillText(text, x, y)
  c.fillText(text, x, y)
  c.restore()
  c.fillStyle = color
  c.fillText(text, x, y)
  if (heavy) {
    c.strokeStyle = color
    c.lineJoin = 'round'
    c.lineWidth = px * 0.03
    c.strokeText(text, x, y)
  }
}

function sparkle(c: Ctx, x: number, y: number, r: number) {
  c.beginPath()
  c.moveTo(x, y - r)
  c.quadraticCurveTo(x, y, x + r, y)
  c.quadraticCurveTo(x, y, x, y + r)
  c.quadraticCurveTo(x, y, x - r, y)
  c.quadraticCurveTo(x, y, x, y - r)
  c.fill()
}

export function drawPlate(c: Ctx, r: Rect) {
  const heading = content.education.heading.trim()
  const tagline = content.education.tagline.trim()
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  const fit = (text: string, px: number, maxW: number) => {
    c.font = `700 ${px}px ${CERT_FONT}`
    const w = c.measureText(text).width
    if (w > maxW) c.font = `700 ${px * (maxW / w)}px ${CERT_FONT}`
    return c.measureText(text).width
  }
  const cx = r.x + r.w / 2
  let hw = r.w * 0.5
  if (heading) {
    hw = fit(heading, r.h * 0.46, r.w * 0.74)
    inked(c, heading, cx, r.y + r.h * (tagline ? 0.4 : 0.52), TITLE_INK, true)
  }
  if (tagline) {
    c.letterSpacing = '0.06em'
    fit(tagline, r.h * 0.2365, r.w * 0.8)
    inked(c, tagline, cx, r.y + r.h * (heading ? 0.78 : 0.52), SUBTITLE_INK)
    c.letterSpacing = '0px'
  }
  const hy = r.y + r.h * (tagline ? 0.4 : 0.52)
  c.fillStyle = SPARKLE
  for (const side of [-1, 1]) {
    const x = cx + side * (hw / 2 + r.h * 0.22)
    sparkle(c, x, hy - r.h * 0.04, r.h * 0.11)
    sparkle(c, x + side * r.h * 0.2, hy + r.h * 0.12, r.h * 0.06)
    sparkle(c, x + side * r.h * 0.08, hy - r.h * 0.26, r.h * 0.05)
  }
}

export function drawDiploma(cv: HTMLCanvasElement, item: Item | undefined, logo?: HTMLImageElement | null) {
  const c = cv.getContext('2d')
  if (!c) return
  const { width: w, height: h } = cv
  const m = DIPLOMA_PX_PER_M
  c.fillStyle = PAPER
  c.fillRect(0, 0, w, h)
  c.strokeStyle = BRASS
  c.lineWidth = 0.008 * m
  c.strokeRect(0, 0, w, h)
  c.strokeStyle = RULE
  c.lineWidth = 0.004 * m
  c.strokeRect(0.02 * m, 0.02 * m, w - 0.04 * m, h - 0.04 * m)
  c.lineWidth = 0.0015 * m
  c.strokeRect(0.03 * m, 0.03 * m, w - 0.06 * m, h - 0.06 * m)
  const cx = w / 2
  const sy = h - 0.105 * m
  const lr = SEAL_R_M * m
  c.fillStyle = '#FFF8EA'
  c.beginPath()
  c.arc(cx, sy, lr, 0, Math.PI * 2)
  c.fill()
  if (logo && logo.naturalWidth > 0) {
    const side = 2 * lr * 0.74
    c.save()
    c.beginPath()
    c.roundRect(cx - side / 2, sy - side / 2, side, side, side * 0.12)
    c.clip()
    c.fillStyle = '#FFFFFF'
    c.fillRect(cx - side / 2, sy - side / 2, side, side)
    const k = Math.min(side / logo.naturalWidth, side / logo.naturalHeight)
    c.drawImage(logo, cx - (logo.naturalWidth * k) / 2, sy - (logo.naturalHeight * k) / 2, logo.naturalWidth * k, logo.naturalHeight * k)
    c.restore()
  } else {
    c.fillStyle = 'rgba(140,110,60,.4)'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.font = `700 ${0.026 * m}px ${CERT_FONT}`
    c.fillText('LOGO', cx, sy + 0.002 * m)
  }
  c.strokeStyle = SEAL
  c.lineWidth = 0.004 * m
  c.beginPath()
  c.arc(cx, sy, lr, 0, Math.PI * 2)
  c.stroke()
  if (!item) return

  const maxW = w - 2 * MARGIN_M * m
  const bottom = sy - (SEAL_R_M + 0.02) * m
  c.textAlign = 'center'
  c.textBaseline = 'top'
  let y = 0.12 * m
  const font = (size: number) => `700 ${size * m}px ${CERT_FONT}`
  const block = (text: string, size: number, color: string, maxLines: number, shrinkTo = size) => {
    const t = text.trim()
    if (!t) return
    let s = size
    let lines: string[] = []
    for (;; s -= 0.002) {
      c.font = font(s)
      const r = wrap(c, t, maxW, maxLines)
      lines = r.lines
      if (!r.cut || s - 0.002 < shrinkTo - 1e-9) break
    }
    const lh = s * 1.12 * m
    const fit = Math.max(1, Math.floor((bottom - y) / lh))
    if (lines.length > fit) {
      lines = lines.slice(0, fit)
      lines[fit - 1] = ellipsize(c, `${lines[fit - 1].replace(/…$/, '')}…`, maxW)
    }
    c.fillStyle = color
    for (const l of lines) {
      if (y + lh > bottom) break
      c.fillText(l, cx, y)
      y += lh
    }
    y += BLOCK_GAP_M * m
  }
  block(item.degree, DEGREE_M, DIPLOMA_INK, 3, DEGREE_MIN_M)
  if (item.degree.trim()) {
    y += 0.008 * m
    c.strokeStyle = RULE
    c.fillStyle = RULE
    c.lineWidth = 0.003 * m
    c.beginPath()
    c.moveTo(cx - 0.13 * m, y); c.lineTo(cx - 0.02 * m, y)
    c.moveTo(cx + 0.02 * m, y); c.lineTo(cx + 0.13 * m, y)
    c.stroke()
    c.beginPath()
    c.moveTo(cx, y - 0.009 * m); c.lineTo(cx + 0.009 * m, y); c.lineTo(cx, y + 0.009 * m); c.lineTo(cx - 0.009 * m, y)
    c.closePath()
    c.fill()
    y += 0.03 * m
  }
  block(item.institution, INSTITUTION_M, DIPLOMA_INK, 2)
  block(item.location ?? '', LOCATION_M, DIPLOMA_INK, 1)
  block(item.years, YEARS_M, DIPLOMA_INK, 1)
  block(educationStatus(item.status), STATUS_M, DIPLOMA_INK, 2)
  block(item.details ?? '', DETAILS_M, MUTED, 4, DETAILS_MIN_M)
}
