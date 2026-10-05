import { SIGN_FONT } from './fonts'
import { strokeIcon } from '../icons'
import { content } from '../content'

export const STANDEE_TEX = [896, 1267] as const
const STANDEE_COLORS = { paper: '#FBFAF7', ink: '#27303F', muted: '#6B6F7A', bar: '#D9D5CC', accent: '#B8704A', placeholder: '#E6E1D8' }
const SECTIONS = ['experience', 'education', 'skills'] as const

function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && c.measureText(next).width > maxW) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function drawStandee(cv: HTMLCanvasElement, photo: HTMLImageElement | null) {
  const c = cv.getContext('2d')
  if (!c) return
  const { width: w, height: h } = cv
  const C = STANDEE_COLORS
  c.fillStyle = C.paper
  c.fillRect(0, 0, w, h)
  c.fillStyle = C.accent
  c.fillRect(0, 0, w, 14)
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  let y = 110
  const name = content.identity.name.trim().toUpperCase()
  if (name) {
    let px = 78
    c.font = `600 ${px}px ${SIGN_FONT}`
    const tw = c.measureText(name).width
    if (tw > w * 0.84) { px *= (w * 0.84) / tw; c.font = `600 ${px}px ${SIGN_FONT}` }
    c.fillStyle = C.ink
    c.fillText(name, w / 2, y)
    y += 24
  }
  const summary = content.resume.summary.trim()
  if (summary) {
    c.font = `600 36px ${SIGN_FONT}`
    c.fillStyle = C.muted
    for (const l of wrap(c, summary, w * 0.78)) {
      y += 50
      c.fillText(l, w / 2, y)
    }
  }
  const r = 118
  const cy = y + 40 + r
  c.save()
  c.beginPath()
  c.arc(w / 2, cy, r, 0, Math.PI * 2)
  c.clip()
  if (photo && photo.naturalWidth) {
    const s = Math.max((2 * r) / photo.naturalWidth, (2 * r) / photo.naturalHeight)
    const dw = photo.naturalWidth * s
    const dh = photo.naturalHeight * s
    c.drawImage(photo, w / 2 - dw / 2, cy - r - (dh - 2 * r) * 0.33, dw, dh)
  } else {
    c.fillStyle = C.placeholder
    c.fillRect(w / 2 - r, cy - r, 2 * r, 2 * r)
    c.strokeStyle = C.muted
    strokeIcon(c, 'user', w / 2, cy, r * 1.1, 1.6)
  }
  c.restore()
  c.strokeStyle = C.accent
  c.lineWidth = 5
  c.beginPath()
  c.arc(w / 2, cy, r + 4, 0, Math.PI * 2)
  c.stroke()
  let sy = cy + r + 90
  c.textAlign = 'left'
  for (const key of SECTIONS) {
    const label = content.sections[key].label.trim()
    if (!label) continue
    c.font = `600 38px ${SIGN_FONT}`
    c.fillStyle = C.ink
    c.fillText(label, 90, sy)
    c.fillStyle = C.bar
    c.beginPath(); c.roundRect(90, sy + 20, w - 180, 14, 7); c.fill()
    c.beginPath(); c.roundRect(90, sy + 48, (w - 180) * 0.7, 14, 7); c.fill()
    sy += 128
  }
}
