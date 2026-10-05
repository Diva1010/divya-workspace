import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const CONTENT = 'src/content/content.json'
const SRC_DIR = 'assets-src/wall-art'
const OUT_DIR = 'public/images/wall-art'
const IDS = ['leaf', 'sunrise', 'wildflowers', 'moon', 'photo1', 'photo2', 'photo3']
const WALL_ART_PX = 640
const MAX_KB = 80
const EXT = ['jpg', 'jpeg', 'png', 'webp']

const data = JSON.parse(fs.readFileSync(CONTENT, 'utf8'))
const wallArt = { ...(data.wallArt ?? {}) }
const rows = []
for (const id of IDS) {
  const file = EXT.map((e) => path.join(SRC_DIR, `${id}.${e}`)).find((f) => fs.existsSync(f))
  if (!file) {
    if (wallArt[id] && !fs.existsSync(path.join(OUT_DIR, `${id}.webp`))) delete wallArt[id]
    rows.push([id, 'missing', '-', '-'])
    continue
  }
  let q = 80
  let buf
  for (;;) {
    buf = await sharp(file).rotate().resize(WALL_ART_PX, WALL_ART_PX, { fit: 'inside', withoutEnlargement: true }).webp({ quality: q }).toBuffer()
    if (buf.length <= MAX_KB * 1024 || q <= 30) break
    q -= 5
  }
  const meta = await sharp(buf).metadata()
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, `${id}.webp`), buf)
  wallArt[id] = `images/wall-art/${id}.webp`
  rows.push([id, 'found', `${meta.width} x ${meta.height}`, (buf.length / 1024).toFixed(1)])
}

const pad = (v, n) => String(v).padEnd(n)
console.log(`${pad('id', 12)}  ${pad('status', 7)}  ${pad('size', 11)}  KB`)
for (const x of rows) console.log(`${pad(x[0], 12)}  ${pad(x[1], 7)}  ${pad(x[2], 11)}  ${x[3]}`)
if (rows.every((x) => x[1] === 'missing')) console.log(`No pictures found in ${SRC_DIR}/ (the drawn art is used).`)

const before = JSON.stringify(data.wallArt ?? {})
if (Object.keys(wallArt).length) data.wallArt = wallArt
else delete data.wallArt
const changed = JSON.stringify(data.wallArt ?? {}) !== before
if (changed) fs.writeFileSync(CONTENT, JSON.stringify(data, null, 2) + '\n')
console.log(changed ? 'content.json updated (wallArt).' : 'content.json unchanged.')
