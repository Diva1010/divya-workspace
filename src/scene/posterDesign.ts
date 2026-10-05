import { SIGN_FONT } from './fonts'

export const POSTER_TEX = [512, 710] as const
export const POSTER_TEXT = ['modern', 'family']
const POSTER_COLORS = { paper: '#FFF1D6', border: '#D9B97E', ink: '#3A2E33', accent: '#E5707C' }

export function drawPoster(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')
  if (!c) return
  const { width: w, height: h } = cv
  const C = POSTER_COLORS
  c.fillStyle = C.paper
  c.fillRect(0, 0, w, h)
  c.strokeStyle = C.border
  c.lineWidth = 6
  c.beginPath()
  c.roundRect(24, 24, w - 48, h - 48, 28)
  c.stroke()
  c.textAlign = 'center'
  c.textBaseline = 'alphabetic'
  c.fillStyle = C.ink
  c.font = `600 120px ${SIGN_FONT}`
  const widest = Math.max(...POSTER_TEXT.map((t) => c.measureText(t).width))
  if (widest > w * 0.78) c.font = `600 ${(120 * w * 0.78) / widest}px ${SIGN_FONT}`
  c.fillText(POSTER_TEXT[0], w / 2, h * 0.43)
  c.fillText(POSTER_TEXT[1], w / 2, h * 0.43 + 128)
  c.fillStyle = C.accent
  c.fillRect(w / 2 - 44, h * 0.43 + 178, 88, 6)
}
