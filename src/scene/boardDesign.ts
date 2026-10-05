import { BOARD_FONT } from './fonts'
import { strokeIcon } from '../icons'
import { content } from '../content'

export const BOARD_W = 760
export const BOARD_H = 480
export const BOARD_TEX_W = 1280
const BOARD_COLORS = { surface: '#F8F9FB', ink: '#27303F', heading: '#2A5BD7', check: '#2A5BD7', tagline: '#B8344A' }
const BOARD_LAYOUT = {
  padX: 40, padTop: 32,
  headingPx: 40, headingLine: 48, headingGap: 20,
  itemPx: 32, itemRow: 52, box: 26, boxGap: 18,
  taglinePx: 22, taglineLine: 30, taglineBottom: 36,
}
export const BOARD_ROCKET = { size: 83, top: 32, right: 40, stroke: 1.6 }
const L = BOARD_LAYOUT
const clean = (items: string[]) => items.map((i) => i.trim()).filter(Boolean)

export function drawBoard(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')
  if (!c) return
  const { heading, items, tagline } = content.now
  const s = cv.width / BOARD_W
  c.setTransform(s, 0, 0, s, 0, 0)
  c.fillStyle = BOARD_COLORS.surface
  c.fillRect(0, 0, BOARD_W, BOARD_H)
  c.textBaseline = 'middle'
  c.textAlign = 'left'
  if (heading.trim()) {
    c.font = `700 ${L.headingPx}px ${BOARD_FONT}`
    c.fillStyle = BOARD_COLORS.heading
    const y = L.padTop + L.headingLine / 2
    c.fillText(heading, L.padX, y)
    c.fillRect(L.padX, L.padTop + L.headingLine - 2, c.measureText(heading).width, 3)
  }
  const R = BOARD_ROCKET
  c.strokeStyle = BOARD_COLORS.heading
  strokeIcon(c, 'rocket', BOARD_W - R.right - R.size / 2, R.top + R.size / 2, R.size, R.stroke)
  const limit = BOARD_H - L.taglineBottom - L.taglineLine - 8
  c.font = `700 ${L.itemPx}px ${BOARD_FONT}`
  clean(items).forEach((item, i) => {
    const top = L.padTop + L.headingLine + L.headingGap + i * L.itemRow
    if (top + L.itemRow > limit) return
    const cy = top + L.itemRow / 2
    c.strokeStyle = BOARD_COLORS.check
    c.lineWidth = 3
    c.beginPath()
    c.roundRect(L.padX + 1.5, cy - L.box / 2 + 1.5, L.box - 3, L.box - 3, 4)
    c.stroke()
    c.fillStyle = BOARD_COLORS.ink
    c.fillText(item, L.padX + L.box + L.boxGap, cy)
  })
  if (tagline.trim()) {
    c.font = `700 ${L.taglinePx}px ${BOARD_FONT}`
    c.fillStyle = BOARD_COLORS.tagline
    c.fillText(tagline, L.padX, BOARD_H - L.taglineBottom - L.taglineLine / 2)
  }
}
