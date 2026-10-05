import fs from 'node:fs'
import path from 'node:path'

const PUBLIC = process.env.CHECK_PUBLIC ?? 'public'
const content = JSON.parse(fs.readFileSync('src/content/content.json', 'utf8'))
const found = []
const walk = (v, where) => {
  if (typeof v === 'string') { if (/^images\/.+\.(webp|png|jpe?g|svg|gif)$/i.test(v.trim())) found.push([v.trim(), where]) }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, where ? `${where}.${k}` : k)
}
walk(content, '')
const errors = []
for (const [rel, where] of found) {
  const file = path.join(PUBLIC, rel)
  if (!fs.existsSync(file)) { errors.push(`${where}: ${rel} does not exist in public/`); continue }
  const buf = fs.readFileSync(file)
  if (!buf.length) { errors.push(`${where}: ${rel} is empty`); continue }
  if (/\.webp$/i.test(rel) && !(buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP')) errors.push(`${where}: ${rel} is not a valid WebP`)
}
{
  const t = content.travel
  const places = t?.places ?? []
  if (!places.length) errors.push('travel: no places')
  for (const p of places) {
    if (!p.note || !p.note.trim()) errors.push(`travel.${p.id ?? p.name}: the note is empty`)
    const ph = (t?.photos ?? []).find((x) => x.place && x.place === p.id)
    if (!ph) { errors.push(`travel.${p.id ?? p.name}: no photo for this place`); continue }
    for (const k of ['path', 'thumb']) {
      if (!ph[k]) { errors.push(`travel.${p.id}: the photo has no ${k}`); continue }
      const file = path.join(PUBLIC, ph[k])
      if (!fs.existsSync(file) || fs.statSync(file).size < 1024) errors.push(`travel.${p.id}: ${ph[k]} is missing or under 1 KB`)
    }
  }
}

if (errors.length) { console.error(`check-content: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`); process.exit(1) }
console.log(`check-content: ok (${found.length} image paths checked)`)
