import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'assets-src/logos', OUT = 'public/images/logos', PREVIEW = path.join(SRC, 'preview')
const NAMES = ['hcl_logo', 'accenture_logo']
const MAX = 512, PAD = 0.04, KEY_HI = 226, KEY_LO = 190, BG = 245
fs.mkdirSync(PREVIEW, { recursive: true })
let ok = true
for (const name of NAMES) {
  const src = path.join(SRC, `${name}.png`)
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b)
    let a = Math.min(1, Math.max(0, 1 - mn / BG))
    if (mn >= KEY_LO && mx - mn <= 10) a *= Math.min(1, Math.max(0, (KEY_HI - mn) / (KEY_HI - KEY_LO)))
    const un = (c) => (a > 0 ? Math.max(0, Math.min(255, Math.round((c - (1 - a) * BG) / a))) : 0)
    rgba[i * 4] = un(r); rgba[i * 4 + 1] = un(g); rgba[i * 4 + 2] = un(b); rgba[i * 4 + 3] = Math.round(a * 255)
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const tw = x1 - x0 + 1, th = y1 - y0 + 1, pad = Math.round(Math.max(tw, th) * PAD)
  const trimmed = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract({ left: x0, top: y0, width: tw, height: th })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
  fs.writeFileSync(path.join(OUT, `${name}.png`), trimmed)
  const v = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = v.info.width, H = v.info.height, d = v.data
  const al = (x, y) => d[(y * W + x) * 4 + 3]
  const corners = [al(0, 0), al(W - 1, 0), al(0, H - 1), al(W - 1, H - 1)]
  let light = 0, fringe = 0, semi = 0
  for (let i = 0; i < W * H; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3]
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b)
    if (a >= 230 && mn >= 215 && mx - mn <= 10) light++
    if (a > 12 && a < 243) { semi++; if (mn >= 200 && mx - mn <= 25) fringe++ }
  }
  const pass = corners.every((c) => c === 0) && light === 0 && fringe <= semi * 0.02
  ok &&= pass
  console.log(`${name}: ${W}x${H}px, corner alpha ${corners.join('/')}, neutral light opaque pixels left ${light}, edge pixels ${semi} of which light (halo) ${fringe} -> ${pass ? 'clean' : 'NOT CLEAN'}`)
  for (const [tag, bg] of [['cream', '#FFFDFB'], ['plum', '#3E2A4A']]) await sharp({ create: { width: W + 80, height: H + 80, channels: 3, background: bg } }).composite([{ input: trimmed, left: 40, top: 40 }]).png().toFile(path.join(PREVIEW, `${name}-on-${tag}.png`))
}
if (!ok) { console.error('process-logos: a logo is not clean; do not ship it (see assets-src/logos/preview/)'); process.exit(1) }
