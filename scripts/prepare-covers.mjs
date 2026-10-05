import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC_DIR = 'assets-src/covers'
const OUT_DIR = 'public/images/covers'
const CONTENT = 'src/content/content.json'
const W = 440
const H = 660
const MAX_KB = 60
const EXT = ['jpg', 'jpeg', 'png', 'webp']

const slug = (title) => title.toLowerCase().replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const data = JSON.parse(fs.readFileSync(CONTENT, 'utf8'))
const r = data.reading ?? {}
const entries = [...(r.top5 ?? []), r.number1, r.favoriteThisYear, data.currentRead].filter((b) => b && typeof b.title === 'string' && b.title.trim())
const titles = [...new Set(entries.map((b) => b.title.trim()))]

const rows = []
let changed = false
for (const title of titles) {
  const s = slug(title)
  const file = EXT.map((e) => path.join(SRC_DIR, `${s}.${e}`)).find((f) => fs.existsSync(f))
  if (!file) { rows.push([title, s, 'missing', '-']); continue }
  let q = 80
  let buf
  for (;;) {
    buf = await sharp(file).rotate().resize(W, H, { fit: 'cover', position: 'centre' }).webp({ quality: q }).toBuffer()
    if (buf.length <= MAX_KB * 1024 || q <= 30) break
    q -= 5
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, `${s}.webp`), buf)
  const cover = `images/covers/${s}.webp`
  for (const b of entries) if (b.title.trim() === title && b.cover !== cover) { b.cover = cover; changed = true }
  rows.push([title, s, 'found', (buf.length / 1024).toFixed(1)])
}
if (changed) fs.writeFileSync(CONTENT, JSON.stringify(data, null, 2) + '\n')

const pad = (v, n) => String(v).padEnd(n)
const w = [Math.max(5, ...rows.map((x) => x[0].length)), Math.max(4, ...rows.map((x) => x[1].length))]
console.log(`${pad('title', w[0])}  ${pad('slug', w[1])}  status   KB`)
for (const x of rows) console.log(`${pad(x[0], w[0])}  ${pad(x[1], w[1])}  ${pad(x[2], 7)}  ${x[3]}`)
console.log(changed ? 'content.json updated.' : 'content.json unchanged.')
