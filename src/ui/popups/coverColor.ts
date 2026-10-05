import { BOOK_COLORS } from '../../scene/bookLayout'

const MUTE_TO = '#7A6A52'
const MUTE = 0.25
const DARK_INK = '#2A1B10'
const CREAM_INK = '#FFF6DD'

const rgb = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)) }
const lum = (h: string) => { const [r, g, b] = rgb(h).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const HASH_SEED = 36
function hashIndex(title: string, n: number) {
  let h = HASH_SEED
  for (const ch of title.trim().toLowerCase()) {
    h = Math.imul((h ^ ch.charCodeAt(0)) >>> 0, 2654435761) >>> 0
    h = (h ^ (h >>> 15)) >>> 0
  }
  return h % n
}

export function coverColors(title: string) {
  const palette = BOOK_COLORS[hashIndex(title, BOOK_COLORS.length)]
  const bg = mix(palette, MUTE_TO, MUTE)
  const ink = contrast(bg, DARK_INK) >= contrast(bg, CREAM_INK) ? DARK_INK : CREAM_INK
  return { palette, bg, spine: mix(bg, '#000000', 0.22), ink }
}
