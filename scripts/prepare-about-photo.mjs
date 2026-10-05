import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const MAX_SIDE = 960
const TARGET_KB = 120
const SRC_DIR = 'assets-src/about'
const OUT_DIR = 'public/images'
const IMAGE = /\.(jpe?g|png|webp|avif|heic|heif|tiff?|gif)$/i

const files = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR).filter((f) => IMAGE.test(f)) : []
if (files.length !== 1) {
  console.error(`Expected exactly one image in ${SRC_DIR}, found ${files.length}${files.length ? `: ${files.join(', ')}` : ''}. Stopping.`)
  process.exit(1)
}
const src = path.join(SRC_DIR, files[0])
fs.mkdirSync(OUT_DIR, { recursive: true })

const base = () => sharp(src).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })

async function encode(format) {
  let last
  for (let q = 90; q >= 40; q -= 5) {
    last = await base()[format]({ quality: q }).toBuffer({ resolveWithObject: true })
    if (last.data.length <= TARGET_KB * 1024) break
  }
  return { format, ...last }
}

const webp = await encode('webp')
const jpeg = await encode('jpeg')
const best = jpeg.data.length < webp.data.length ? jpeg : webp
const ext = best.format === 'jpeg' ? 'jpg' : 'webp'
for (const old of ['about.webp', 'about.jpg']) fs.rmSync(path.join(OUT_DIR, old), { force: true })
const out = path.join(OUT_DIR, `about.${ext}`)
fs.writeFileSync(out, best.data)

const m = await sharp(out).metadata()
console.log(`${out}: ${(best.data.length / 1024).toFixed(1)} KB, ${m.width}x${m.height}, ${m.format} (webp ${(webp.data.length / 1024).toFixed(1)} KB, jpg ${(jpeg.data.length / 1024).toFixed(1)} KB)`)
console.log('metadata still held:', { exif: !!m.exif, icc: !!m.icc, xmp: !!m.xmp, iptc: !!m.iptc, orientation: m.orientation ?? null })
if (best.data.length > TARGET_KB * 1024) console.warn(`Warning: larger than ${TARGET_KB} KB even at the lowest quality.`)
