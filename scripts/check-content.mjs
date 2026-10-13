import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'

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

{
  const { MARKERS, HOTSPOT_IDS, NO_MARKER, ROOM_BOUNDS, LABEL_ONLY, markerPos } = await import('../src/scene/markers.ts')
  const room = JSON.parse(fs.readFileSync('src/zones/room.json', 'utf8'))
  const covered = new Set(MARKERS.flatMap((m) => m.covers))
  for (const n of NO_MARKER) { if (!n.reason?.trim()) errors.push(`markers: ${n.id} is marked none without a reason`); covered.add(n.id) }
  for (const id of HOTSPOT_IDS) if (!covered.has(id)) errors.push(`markers: hotspot ${id} has no marker entry and no explicit none with a reason in src/scene/markers.ts`)
  const registered = new Set(HOTSPOT_IDS)
  const inRoom = [...room.props.filter((p) => p.hotspot || p.interaction), ...room.codeProps.filter((p) => p.hotspot), ...room.wallProps.filter((p) => p.hotspot)].map((p) => p.id)
  for (const id of inRoom) if (!registered.has(id)) errors.push(`markers: room.json object ${id} is clickable but missing from HOTSPOT_IDS in src/scene/markers.ts`)
  if (MARKERS.length > 24) errors.push(`markers: ${MARKERS.length} markers (max 24)`)
  const seen = new Set()
  for (const m of MARKERS) {
    if (seen.has(m.id)) errors.push(`markers: duplicate id ${m.id}`)
    seen.add(m.id)
    const p = markerPos(m)
    ;['x', 'y', 'z'].forEach((k, i) => {
      const [lo, hi] = ROOM_BOUNDS[k]
      if (!(p[i] >= lo && p[i] <= hi)) errors.push(`markers: ${m.id} anchor ${k}=${p[i].toFixed(3)} is outside the room (${lo}..${hi})`)
    })
  }

  // Picking simulation at the home camera: a pointer at a marker's centre must resolve to that marker, and a pointer at an
  // object's centre must not land in another marker's hit circle (markers win over the 3D raycast behind them).
  const { pickMarker } = await import('../src/scene/markers.ts')
  const home = room.camera.home
  const views = [[1920, 1080], [1536, 864], [1440, 900], [1366, 768], [1280, 720], [820, 1180], [390, 844]]
  for (const [W, H] of views) {
    const a = W / H
    const fov = a >= 1.2 ? home.fov : Math.min(62, home.fov * Math.pow(1.2 / a, 0.8))
    const cam = new THREE.PerspectiveCamera(fov, a, 0.1, 120)
    cam.position.set(...home.position); cam.lookAt(...home.target); cam.updateMatrixWorld(); cam.updateProjectionMatrix()
    const toScreen = (p) => { const v = new THREE.Vector3(...p).project(cam); return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H } }
    const coarse = W < 600
    const r = coarse ? 28 : 22
    const centres = MARKERS.map((m) => toScreen(markerPos(m)))
    const strict = W >= 1366
    const report = (msg) => { if (strict) errors.push(msg); else console.warn(`check-content: warning (${W}x${H}) ${msg}`) }
    {
      const s = toScreen(LABEL_ONLY.center)
      const hit = pickMarker(centres, s.x, s.y, r)
      if (hit >= 0) report(`markers: ${W}x${H} pointer at the ${LABEL_ONLY.id} centre lands in the ${MARKERS[hit].id} marker circle`)
    }
    MARKERS.forEach((m, i) => {
      const got = pickMarker(centres, centres[i].x, centres[i].y, r)
      if (got !== i) report(`markers: ${W}x${H} pointer at ${m.id} marker resolves to ${MARKERS[got]?.id ?? 'nothing'}`)
      for (const c of m.centers) {
        const s = toScreen(c)
        const hit = pickMarker(centres, s.x, s.y, r)
        if (hit >= 0 && hit !== i) report(`markers: ${W}x${H} pointer at the ${m.id} object centre lands in the ${MARKERS[hit].id} marker circle`)
      }
    })
  }
}

if (errors.length) { console.error(`check-content: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`); process.exit(1) }
console.log(`check-content: ok (${found.length} image paths checked)`)
