import * as THREE from 'three'
import { THEMES, type Theme, type ThemeName } from './themes'
import { WOOD } from './woodPalette'

const SIZE = 512
const CELL = SIZE / 8

const WOOD_LIGHTNESS_FLOOR = 0.92
const ROLE_LIGHTNESS_FLOOR = 0.7

const SOIL = '#EBCDA0'
const GREEN = '#6FBF73'
const CREAM = '#FFF0D2'
const DARK_GREY = '#4A4D57'
export const NEAR_WHITE = '#F7F3F0'
const BOOK_CORAL = '#E5707C'
const BOOK_MUSTARD = '#F0BC4A'
const BOOK_BLUE = '#5B9FD6'

type Role = 'deskBody' | 'deskInset' | 'caseBoards' | 'soil' | 'green' | 'cream' | 'dark' | 'darkSoft' | 'white' | 'whiteFurn' | 'coral' | 'mustard' | 'blue' | 'alt' | 'keep'

const CELL_ROLES: Role[][] = [
  ['deskBody', 'deskBody', 'deskBody', 'caseBoards', 'deskInset', 'deskInset', 'dark', 'white'],
  ['deskBody', 'deskBody', 'deskBody', 'caseBoards', 'deskInset', 'deskInset', 'dark', 'white'],
  ['mustard', 'cream', 'blue', 'cream', 'alt', 'keep', 'dark', 'coral'],
  ['mustard', 'cream', 'blue', 'cream', 'alt', 'keep', 'dark', 'coral'],
  ['white', 'whiteFurn', 'dark', 'alt', 'keep', 'soil', 'green', 'green'],
  ['white', 'whiteFurn', 'dark', 'alt', 'keep', 'soil', 'green', 'green'],
  ['keep', 'keep', 'whiteFurn', 'whiteFurn', 'whiteFurn', 'whiteFurn', 'whiteFurn', 'darkSoft'],
  ['keep', 'keep', 'whiteFurn', 'whiteFurn', 'whiteFurn', 'whiteFurn', 'whiteFurn', 'darkSoft'],
]

const COPIES: [string, string][] = [
  ['r2c4', 'r2c0'], ['r3c4', 'r3c0'],
  ['r4c1', 'r2c7'], ['r5c1', 'r3c7'],
  ['r6c2', 'r0c1'], ['r6c3', 'r0c2'], ['r6c4', 'r0c4'], ['r6c5', 'r0c5'],
  ['r7c2', 'r1c0'], ['r7c3', 'r1c2'], ['r7c4', 'r1c4'], ['r7c5', 'r1c5'],
  ['r6c6', 'r0c3'], ['r7c6', 'r1c3'],
  ['r6c7', 'r4c3'], ['r7c7', 'r5c3'],
]

type RGB = [number, number, number]
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function roleColor(role: Role, T: Theme): RGB {
  switch (role) {
    case 'deskBody': return hex(WOOD.deskBody)
    case 'deskInset': return hex(WOOD.deskInset)
    case 'caseBoards': return hex(WOOD.boards)
    case 'soil': return hex(SOIL)
    case 'green': return hex(GREEN)
    case 'cream': return hex(CREAM)
    case 'dark':
    case 'darkSoft': return hex(DARK_GREY)
    case 'white':
    case 'whiteFurn': return hex(NEAR_WHITE)
    case 'coral': return hex(BOOK_CORAL)
    case 'mustard': return hex(BOOK_MUSTARD)
    case 'blue': return hex(BOOK_BLUE)
    case 'alt': return hex(T.alt)
    default: return [0, 0, 0]
  }
}

function repaint(img: CanvasImageSource, T: Theme): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = cv.height = SIZE
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  for (const [to, from] of COPIES) {
    ctx.drawImage(cv, Number(from[3]) * CELL, Number(from[1]) * CELL, CELL, CELL, Number(to[3]) * CELL, Number(to[1]) * CELL, CELL, CELL)
  }
  const data = ctx.getImageData(0, 0, SIZE, SIZE)
  const d = data.data
  const lightness = (i: number) => (Math.max(d[i], d[i + 1], d[i + 2]) + Math.min(d[i], d[i + 1], d[i + 2])) / 510

  const sum = new Map<Role, { n: number; l: number }>()
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const role = CELL_ROLES[r][c]
      if (role === 'keep') continue
      let l = 0
      for (let k = 0; k < 8; k++) l += lightness(((r * CELL + Math.floor(((k + 0.5) * CELL) / 8)) * SIZE + c * CELL + CELL / 2) * 4)
      const e = sum.get(role) ?? { n: 0, l: 0 }
      e.n += 8
      e.l += l
      sum.set(role, e)
    }
  }
  const ref = (role: Role) => Math.max(0.05, sum.get(role)!.l / sum.get(role)!.n)
  const colors = new Map<Role, RGB>()
  const refs = new Map<Role, number>()
  for (const role of sum.keys()) {
    colors.set(role, roleColor(role, T))
    refs.set(role, ref(role))
  }

  for (let y = 0; y < SIZE; y++) {
    const row = CELL_ROLES[Math.floor(y / CELL)]
    for (let x = 0; x < SIZE; x++) {
      const role = row[Math.floor(x / CELL)]
      if (role === 'keep') continue
      const i = (y * SIZE + x) * 4
      const lo = role === 'deskBody' || role === 'deskInset' || role === 'caseBoards' || role === 'soil' ? WOOD_LIGHTNESS_FLOOR : ROLE_LIGHTNESS_FLOOR
      const k = clamp(lightness(i) / refs.get(role)!, lo, 1.12)
      const c = colors.get(role)!
      d[i] = clamp(c[0] * k, 0, 255)
      d[i + 1] = clamp(c[1] * k, 0, 255)
      d[i + 2] = clamp(c[2] * k, 0, 255)
    }
  }
  ctx.putImageData(data, 0, 0)
  return cv
}

const cache = new Map<ThemeName, THREE.CanvasTexture>()

export function atlasTexture(img: CanvasImageSource, name: ThemeName): THREE.CanvasTexture {
  let t = cache.get(name)
  if (!t) {
    t = new THREE.CanvasTexture(repaint(img, THEMES[name]))
    t.flipY = false
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    cache.set(name, t)
  }
  return t
}

export function prewarmAtlases(img: CanvasImageSource, current: ThemeName) {
  const rest = (Object.keys(THEMES) as ThemeName[]).filter((n) => n !== current)
  const idle = (cb: () => void) =>
    typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 200)
  const next = () => {
    const n = rest.shift()
    if (!n) return
    atlasTexture(img, n)
    idle(next)
  }
  idle(next)
}
