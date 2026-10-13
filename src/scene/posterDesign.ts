import { BOARD_FONT, SIGN_FONT } from './fonts'

// Aspect matches the print area: 8% margin inside the frame opening below the ribbon (see PRINT_MARGIN in leftWall.ts).
export const POSTER_TEX = [768, 1108] as const
export const POSTER_LINES = ['modern', 'family']
export const BANNER_TEX = [768, 256] as const
export const BANNER_LINES = ['Favorite Show', 'of All Time']
// Share of the band's canvas height (from the top); the strip below it is the folded-tail colour.
export const BANNER_BAND_PX = 224
export const POSTER_TEXT_WIDTH = 0.66
const C = { paper: '#FFFDFB', border: '#CDB8E8', ink: '#3E2A4A', blush: '#F0C4D4', peachTop: '#F9D9C0', peachBottom: '#F2C3A4', tail: '#E9B898', fold: '#D9A584' }

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, outline: string) {
  c.beginPath()
  c.moveTo(x, y + s * 0.35)
  c.bezierCurveTo(x - s * 0.1, y - s * 0.1, x - s * 0.7, y - s * 0.05, x - s * 0.5, y + s * 0.35)
  c.bezierCurveTo(x - s * 0.35, y + s * 0.65, x - s * 0.05, y + s * 0.8, x, y + s * 0.95)
  c.bezierCurveTo(x + s * 0.05, y + s * 0.8, x + s * 0.35, y + s * 0.65, x + s * 0.5, y + s * 0.35)
  c.bezierCurveTo(x + s * 0.7, y - s * 0.05, x + s * 0.1, y - s * 0.1, x, y + s * 0.35)
  c.closePath()
  c.fillStyle = C.blush
  c.fill()
  c.strokeStyle = outline
  c.lineWidth = 3
  c.lineJoin = 'round'
  c.stroke()
}

export function drawPoster(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')
  if (!c) return
  const { width: w, height: h } = cv
  c.fillStyle = C.paper
  c.fillRect(0, 0, w, h)
  c.strokeStyle = C.border
  c.lineWidth = 3
  c.beginPath()
  c.roundRect(30, 30, w - 60, h - 60, 24)
  c.stroke()
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  c.fillStyle = C.ink
  c.font = `600 120px ${SIGN_FONT}`
  const widest = Math.max(...POSTER_LINES.map((t) => c.measureText(t).width))
  const size = (120 * w * POSTER_TEXT_WIDTH) / widest
  c.font = `600 ${size}px ${SIGN_FONT}`
  const y0 = h * 0.44
  c.fillText(POSTER_LINES[0], w / 2, y0)
  c.fillText(POSTER_LINES[1], w / 2, y0 + size * 1.08)
  heart(c, w / 2, y0 + size * 1.08 + 46, 40, 'rgba(62,42,74,0.5)')
}

export function drawBanner(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')
  if (!c) return
  const { width: w } = cv
  c.fillStyle = C.tail
  c.fillRect(0, 0, w / 2, cv.height)
  c.fillStyle = C.fold
  c.fillRect(w / 2, 0, w / 2, cv.height)
  const g = c.createLinearGradient(0, 0, 0, BANNER_BAND_PX)
  g.addColorStop(0, C.peachTop)
  g.addColorStop(1, C.peachBottom)
  c.fillStyle = g
  c.fillRect(0, 0, w, BANNER_BAND_PX)
  // dashed stitch line about 0.006 m in from the top and bottom edges, round-capped
  c.strokeStyle = C.tail
  c.lineWidth = 4
  c.lineCap = 'round'
  c.setLineDash([1, 16])
  for (const y of [9, BANNER_BAND_PX - 9]) {
    c.beginPath()
    c.moveTo(70, y)
    c.lineTo(w - 70, y)
    c.stroke()
  }
  c.setLineDash([])
  heart(c, 62, 84, 40, 'rgba(62,42,74,0.5)')
  heart(c, w - 62, 84, 40, 'rgba(62,42,74,0.5)')
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  c.fillStyle = C.ink
  let size = 100
  c.font = `700 ${size}px ${BOARD_FONT}`
  const widest = Math.max(...BANNER_LINES.map((t) => c.measureText(t).width))
  if (widest > w * 0.68) {
    size = (size * w * 0.68) / widest
    c.font = `700 ${size}px ${BOARD_FONT}`
  }
  c.fillText(BANNER_LINES[0], w / 2, 96)
  c.fillText(BANNER_LINES[1], w / 2, 96 + size * 0.92)
}
