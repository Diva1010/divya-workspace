import * as THREE from 'three'
import { mulberry } from './geometry'
import { WIN } from './constants'

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
function makeTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

let blob: THREE.CanvasTexture | null = null
export function blobTexture() {
  if (blob) return blob
  const c = canvas(128, 128)
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62)
  g.addColorStop(0, 'rgba(45,25,70,.55)')
  g.addColorStop(1, 'rgba(45,25,70,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  return (blob = makeTexture(c))
}

let edge: THREE.CanvasTexture | null = null
export function edgeTexture() {
  if (edge) return edge
  const c = canvas(8, 64)
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, 'rgba(45,25,70,.34)')
  g.addColorStop(1, 'rgba(45,25,70,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 8, 64)
  return (edge = makeTexture(c))
}

const skies: Record<string, THREE.CanvasTexture> = {}
export function skyTexture(night: boolean) {
  const key = night ? 'n' : 'd'
  if (skies[key]) return skies[key]
  const w = 520
  const h = 400
  const c = canvas(w, h)
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, h)
  const r = mulberry(night ? 11 : 5)
  if (night) {
    g.addColorStop(0, '#1A1350')
    g.addColorStop(0.6, '#5B3FA8')
    g.addColorStop(1, '#B57BD0')
  } else {
    g.addColorStop(0, '#6FA8EE')
    g.addColorStop(0.7, '#CFE4FF')
    g.addColorStop(1, '#FFEBD2')
  }
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
  if (night) {
    x.fillStyle = 'rgba(255,255,255,.9)'
    for (let i = 0; i < 46; i++) {
      x.beginPath()
      x.arc(r() * w, r() * h * 0.6, 0.7 + r() * 1.6, 0, 7)
      x.fill()
    }
    x.fillStyle = '#FFF6D8'
    x.beginPath()
    x.arc(420, 90, 26, 0, 7)
    x.fill()
    x.fillStyle = '#5B3FA8'
    x.beginPath()
    x.arc(432, 84, 24, 0, 7)
    x.fill()
  }
  if (!night) {
    const glow = x.createRadialGradient(400, 150, 6, 400, 150, 190)
    glow.addColorStop(0, 'rgba(255,236,190,.85)')
    glow.addColorStop(0.25, 'rgba(255,225,165,.45)')
    glow.addColorStop(1, 'rgba(255,225,165,0)')
    x.fillStyle = glow
    x.fillRect(0, 0, w, h)
    x.fillStyle = 'rgba(255,250,232,.95)'
    x.beginPath()
    x.arc(400, 150, 22, 0, 7)
    x.fill()
  }
  let bx = 0
  let building = 0
  x.fillStyle = night ? '#1B1446' : '#B7C4E6'
  while (bx < w) {
    const bw = 34 + r() * 40
    const bh = 70 + r() * 130
    x.fillRect(bx, h - bh, bw, bh)
    if (night) {
      for (let wy = h - bh + 10; wy < h - 10; wy += 18)
        for (let wx = bx + 6; wx < bx + bw - 8; wx += 14) nightCells.push({ x: wx, y: wy, w: 5, h: 7, building: building, lit: r() > 0.55 })
      building++
    }
    bx += bw + 4
  }
  return (skies[key] = makeTexture(c))
}

export interface SkyCell { x: number; y: number; w: number; h: number; building: number; lit: boolean }
const SKY_TEX_W = 520
const SKY_TEX_H = 400
const nightCells: SkyCell[] = []
export function skyCells(): SkyCell[] {
  skyTexture(true)
  return nightCells
}

export function litWindowsTexture() {
  const cv = canvas(SKY_TEX_W, SKY_TEX_H)
  return { cv, tex: makeTexture(cv) }
}
export function paintLitWindows(cv: HTMLCanvasElement, cells: SkyCell[], lit: boolean[], color: string) {
  const x = cv.getContext('2d')!
  x.clearRect(0, 0, cv.width, cv.height)
  x.fillStyle = color
  for (let i = 0; i < cells.length; i++) if (lit[i]) x.fillRect(cells[i].x, cells[i].y, cells[i].w, cells[i].h)
}

export const SKY_PLANE_W = WIN.w + 0.3
export const SKY_PLANE_H = WIN.h + 0.3

let cloudTex: THREE.CanvasTexture | null = null
export function cloudTexture(repeatX: number) {
  if (cloudTex) return cloudTex
  const w = 1024
  const h = 256
  const c = canvas(w, h)
  const x = c.getContext('2d')!
  const pxPerMX = (repeatX * w) / SKY_PLANE_W
  const pxPerMY = h / SKY_PLANE_H
  const r = mulberry(21)
  const puff = (cx: number, cy: number, rx: number, ry: number) => {
    x.save()
    x.translate(cx, cy)
    x.scale(rx, ry)
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 1)
    g.addColorStop(0, 'rgba(255,255,255,.95)')
    g.addColorStop(0.55, 'rgba(255,255,255,.82)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.beginPath()
    x.arc(0, 0, 1, 0, Math.PI * 2)
    x.fill()
    x.restore()
  }
  const N = 6
  for (let i = 0; i < N; i++) {
    const cx = ((i + 0.5) * w) / N + (r() - 0.5) * 50
    const wm = 0.55 + r() * 0.4
    const hm = 0.17 + r() * 0.1
    const cy = 36 + r() * 44
    const parts: [number, number, number, number][] = [[0, 0.1, 0.5, 0.42]]
    const puffs = 3 + Math.floor(r() * 3)
    for (let k = 0; k < puffs; k++) parts.push([(k / (puffs - 1) - 0.5) * 0.6 + (r() - 0.5) * 0.06, -0.12 - r() * 0.22, 0.18 + r() * 0.12, 0.45 + r() * 0.25])
    for (const dx of [-w, 0, w]) {
      for (const p of parts) puff(cx + dx + p[0] * wm * pxPerMX, cy + p[1] * hm * pxPerMY, p[2] * wm * pxPerMX, p[3] * hm * pxPerMY)
    }
  }
  const t = makeTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.repeat.set(repeatX, 1)
  return (cloudTex = t)
}

let sunsetTex: THREE.CanvasTexture | null = null
export function sunsetTexture(repeatY: number) {
  if (sunsetTex) return sunsetTex
  const w = 4
  const h = 1024
  const c = canvas(w, h)
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(150,100,210,0)')
  g.addColorStop(0.2, 'rgba(150,100,210,0)')
  g.addColorStop(0.3, 'rgba(170,105,205,.45)')
  g.addColorStop(0.4, 'rgba(235,120,175,.6)')
  g.addColorStop(0.52, 'rgba(255,145,110,.72)')
  g.addColorStop(0.62, 'rgba(255,170,90,.8)')
  g.addColorStop(0.74, 'rgba(255,205,150,.85)')
  g.addColorStop(1, 'rgba(255,215,170,.85)')
  x.fillStyle = g
  x.fillRect(0, 0, w, h)
  const s = x.createLinearGradient(0, h * 0.44, 0, h * 0.5)
  s.addColorStop(0, 'rgba(255,225,170,0)')
  s.addColorStop(0.5, 'rgba(255,225,170,.5)')
  s.addColorStop(1, 'rgba(255,225,170,0)')
  x.fillStyle = s
  x.fillRect(0, h * 0.44, w, h * 0.06)
  const t = makeTexture(c)
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1, repeatY)
  return (sunsetTex = t)
}
