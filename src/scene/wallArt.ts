const ART_IDS = ['leaf', 'sunrise', 'wildflowers', 'moon'] as const
export type ArtId = (typeof ART_IDS)[number]
export const ATLAS_SIZE = 1024
const ART_CELL = 512
const CELLS: Record<ArtId, [number, number]> = { leaf: [0, 0], sunrise: [512, 0], wildflowers: [0, 512], moon: [512, 512] }
const UV_INSET = 3

const ART_COLORS = {
  peach: '#F4C7A6',
  peachD: '#EBAB86',
  sage: '#A8C3A0',
  sageD: '#7FA68A',
  lav: '#C8B8E6',
  lavL: '#E6DDF4',
  lavD: '#A793D6',
  cream: '#FFF1D6',
  pink: '#E7A5B4',
  pinkL: '#F3CFD3',
  pinkD: '#D98B9E',
}
const C = ART_COLORS

export function artUV(id: ArtId): [number, number, number, number] {
  const [x, y] = CELLS[id]
  return [(x + UV_INSET) / ATLAS_SIZE, 1 - (y + ART_CELL - UV_INSET) / ATLAS_SIZE, (x + ART_CELL - UV_INSET) / ATLAS_SIZE, 1 - (y + UV_INSET) / ATLAS_SIZE]
}

type Ctx = CanvasRenderingContext2D

function leaf(c: Ctx, x: number, y: number, angle: number, len: number, wid: number, fill: string) {
  c.save()
  c.translate(x, y)
  c.rotate(angle)
  c.fillStyle = fill
  c.beginPath()
  c.moveTo(0, 0)
  c.quadraticCurveTo(len * 0.45, -wid, len, 0)
  c.quadraticCurveTo(len * 0.45, wid, 0, 0)
  c.fill()
  c.restore()
}

function disc(c: Ctx, x: number, y: number, r: number, fill: string) {
  c.fillStyle = fill
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
}

function poly(c: Ctx, pts: [number, number][], fill: string) {
  c.fillStyle = fill
  c.beginPath()
  c.moveTo(pts[0][0], pts[0][1])
  for (const p of pts.slice(1)) c.lineTo(p[0], p[1])
  c.closePath()
  c.lineJoin = 'round'
  c.fill()
}

function star(c: Ctx, x: number, y: number, r: number, fill: string) {
  c.fillStyle = fill
  c.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.32
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}

function drawLeaf(c: Ctx) {
  c.fillStyle = C.cream
  c.fillRect(0, 0, 512, 512)
  disc(c, 256, 250, 168, C.pinkL)
  disc(c, 256, 250, 128, C.peach)
  const p = [[250, 478], [226, 340], [292, 236], [258, 86]] as const
  const at = (t: number): [number, number] => {
    const u = 1 - t
    return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]
  }
  c.strokeStyle = C.sageD
  c.lineWidth = 9
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(...at(0))
  c.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1])
  c.stroke()
  for (let i = 0; i < 7; i++) {
    const t = 0.16 + i * 0.115
    const [x, y] = at(t)
    const [x2, y2] = at(t + 0.02)
    const tangent = Math.atan2(y2 - y, x2 - x)
    const side = i % 2 === 0 ? -1 : 1
    const len = 112 - i * 8
    leaf(c, x, y, tangent + side * 0.95, len, 25 - i, i % 2 === 0 ? C.sage : C.sageD)
  }
  const [tx, ty] = at(1)
  leaf(c, tx, ty, -Math.PI / 2 + 0.15, 70, 20, C.sage)
}

function drawSunrise(c: Ctx) {
  c.fillStyle = C.peach
  c.fillRect(0, 0, 512, 512)
  c.fillStyle = C.pinkL
  c.fillRect(0, 150, 512, 90)
  disc(c, 256, 292, 128, C.pinkL)
  disc(c, 256, 292, 92, C.cream)
  for (const [x, y, w] of [[96, 142, 90], [372, 118, 110], [330, 196, 70]] as const) {
    c.fillStyle = C.cream
    c.beginPath()
    c.roundRect(x, y, w, 20, 10)
    c.fill()
  }
  poly(c, [[0, 330], [96, 252], [176, 312], [296, 214], [412, 316], [512, 268], [512, 512], [0, 512]], C.lav)
  poly(c, [[0, 392], [92, 332], [206, 402], [330, 318], [452, 404], [512, 372], [512, 512], [0, 512]], C.pink)
  poly(c, [[0, 452], [128, 392], [262, 458], [392, 400], [512, 452], [512, 512], [0, 512]], C.sage)
}

function drawWildflowers(c: Ctx) {
  c.fillStyle = C.lavL
  c.fillRect(0, 0, 512, 512)
  c.fillStyle = C.cream
  c.fillRect(0, 400, 512, 112)
  c.strokeStyle = C.sageD
  c.lineWidth = 7
  c.lineCap = 'round'
  const stems: [number, number, number, number, string, number][] = [
    [190, 150, 150, 40, C.pink, 6],
    [236, 232, 108, 34, C.cream, 5],
    [272, 318, 178, 38, C.peach, 6],
    [316, 370, 252, 32, C.lavD, 5],
    [214, 186, 268, 30, C.pinkD, 5],
  ]
  for (const [bx, hx, hy] of stems) {
    c.beginPath()
    c.moveTo(bx, 512)
    c.quadraticCurveTo((bx + hx) / 2 + (hx < bx ? -26 : 26), (512 + hy) / 2, hx, hy)
    c.stroke()
  }
  for (const [bx, , hy] of stems) leaf(c, bx, 512 - (512 - hy) * 0.3, bx < 250 ? -2.5 : -0.65, 64, 16, C.sage)
  leaf(c, 250, 440, -1.9, 70, 18, C.sageD)
  leaf(c, 258, 420, -1.2, 66, 17, C.sage)
  for (const [, hx, hy, r, col, n] of stems) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      disc(c, hx + Math.cos(a) * r * 0.62, hy + Math.sin(a) * r * 0.62, r * 0.46, col)
    }
    disc(c, hx, hy, r * 0.36, col === C.cream ? C.peachD : C.cream)
  }
}

function drawMoon(c: Ctx) {
  c.fillStyle = C.lav
  c.fillRect(0, 0, 512, 512)
  disc(c, 236, 262, 176, '#CFC1EA')
  disc(c, 236, 262, 122, C.cream)
  disc(c, 296, 224, 108, '#CFC1EA')
  for (const [x, y, r, col] of [[376, 130, 26, C.cream], [120, 124, 18, C.peach], [400, 340, 20, C.pinkL], [110, 372, 24, C.cream], [330, 418, 14, C.peach], [196, 76, 12, C.cream], [440, 238, 12, C.pinkL]] as const) star(c, x, y, r, col)
}

export function drawAtlas(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const draw: Record<ArtId, (c: Ctx) => void> = { leaf: drawLeaf, sunrise: drawSunrise, wildflowers: drawWildflowers, moon: drawMoon }
  for (const id of ART_IDS) {
    const [x, y] = CELLS[id]
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.rect(0, 0, ART_CELL, ART_CELL)
    ctx.clip()
    draw[id](ctx)
    ctx.restore()
  }
}

export function loadCellOverrides(cv: HTMLCanvasElement, base: string, listed: Partial<Record<string, string>> | undefined, cells: Record<string, [number, number]>, size: number, onDraw: () => void): () => void {
  let alive = true
  for (const id of Object.keys(cells)) {
    const path = listed?.[id]
    if (!path) continue
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (!alive || !img.naturalWidth) return
      const ctx = cv.getContext('2d')
      if (!ctx) return
      const [x, y] = cells[id]
      const k = Math.max(size / img.naturalWidth, size / img.naturalHeight)
      const w = img.naturalWidth * k
      const h = img.naturalHeight * k
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, y, size, size)
      ctx.clip()
      ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h)
      ctx.restore()
      onDraw()
    }
    img.onerror = () => {}
    img.src = `${base}${path.replace(/^\/+/, "")}`
  }
  return () => {
    alive = false
  }
}

export const loadArtOverrides = (cv: HTMLCanvasElement, base: string, listed: Partial<Record<string, string>> | undefined, onDraw: () => void) => loadCellOverrides(cv, base, listed, CELLS, ART_CELL, onDraw)
