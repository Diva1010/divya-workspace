import fs from 'node:fs'
import { CASE, CASES, SURFACES, SIDE_T, BACK_T, BOARD_T as CASE_BOARD_T, TOP_T, FAIRY } from '../src/scene/bookcaseLayout.ts'
import { STRINGS, buildFairy, fairyObstacles, nearest } from '../src/scene/fairyStrings.ts'

const ROOT_TOL = 0.03
const MAX_TILT = 10
const WALL = 3.99
const BOARD_T = 0.04, BRACKET_DROP = 0.17, BRACKET_REACH = 0.26, BRACKET_FROM_END = 0.2, BRACKET_W = 0.04

const room = JSON.parse(fs.readFileSync('src/zones/room.json', 'utf8'))
const data = JSON.parse(fs.readFileSync('src/scene/plantData.json', 'utf8'))

const boxes = []
const addShelf = (id, wall, s) => {
  const zMin = -(s.x + s.length / 2), zMax = -(s.x - s.length / 2)
  const [x0, x1] = wall === 'right' ? [4 - s.back - s.depth, 4 - s.back] : [-4 + s.back, -4 + s.back + s.depth]
  boxes.push({ id: id + ' board', kind: 'board', b: [x0, s.top - BOARD_T, zMin, x1, s.top, zMax] })
  const n = Math.max(2, s.brackets), span = s.length / 2 - BRACKET_FROM_END, reach = Math.min(BRACKET_REACH, s.depth * 0.8)
  for (let i = 0; i < n; i++) {
    const zc = -(s.x - span + (2 * span * i) / (n - 1))
    const [bx0, bx1] = wall === 'right' ? [x1 - reach, x1] : [x0, x0 + reach]
    boxes.push({ id: `${id} bracket ${i + 1}`, kind: 'bracket', b: [bx0, s.top - BOARD_T - BRACKET_DROP, zc - BRACKET_W / 2, bx1, s.top - BOARD_T, zc + BRACKET_W / 2] })
  }
}
for (const b of room.shelves.boards) addShelf(b.id, room.shelves.wall, { ...b, back: room.shelves.back })
for (const p of room.wallProps) if (p.kind === 'shelf') addShelf(p.id, p.wall, p)
for (const c of CASES) {
  boxes.push({ id: `case ${c.id} side`, kind: 'bracket', b: [CASE.xBack, CASE.floor, c.zMin, CASE.xFront, CASE.floor + CASE.height, c.zMin + SIDE_T] })
  boxes.push({ id: `case ${c.id} side`, kind: 'bracket', b: [CASE.xBack, CASE.floor, c.zMax - SIDE_T, CASE.xFront, CASE.floor + CASE.height, c.zMax] })
  SURFACES.forEach((y, i) => boxes.push({ id: `case ${c.id} level ${i + 1} board`, kind: 'board', b: [CASE.xBack + BACK_T, y - CASE_BOARD_T, c.zMin + SIDE_T, CASE.xFront, y, c.zMax - SIDE_T] }))
  boxes.push({ id: `case ${c.id} top`, kind: 'board', b: [CASE.xBack, CASE.floor + CASE.height - TOP_T, c.zMin, CASE.xFront, CASE.floor + CASE.height, c.zMax] })
}
for (const p of room.plants) if (p.rest) boxes.push({ id: `${p.id} rest box`, kind: 'board', b: p.rest })

const refHeight = (id) => { const b = data[id].bounds; return id.startsWith('ivy/ivy_') || id === 'planter_hang' ? b[5] - b[4] : b[5] }
const scaleOf = (p) => p.size / refHeight(p.model)
const toWorld = (p, pt) => {
  const s = scaleOf(p), c = Math.cos(p.rotationY), sn = Math.sin(p.rotationY)
  return [p.position[0] + (pt[0] * c + pt[2] * sn) * s, p.position[1] + pt[1] * s, p.position[2] + (-pt[0] * sn + pt[2] * c) * s]
}
const inside = (pt, b, m) => pt[0] > b[0] - m && pt[0] < b[3] + m && pt[1] > b[1] - m && pt[1] < b[4] + m && pt[2] > b[2] - m && pt[2] < b[5] + m
const onBoard = (pt) => boxes.find((x) => x.kind === 'board' && pt[0] >= x.b[0] - 0.005 && pt[0] <= x.b[3] + 0.005 && pt[2] >= x.b[2] - 0.005 && pt[2] <= x.b[5] + 0.005 && Math.abs(pt[1] - x.b[4]) <= ROOT_TOL)

const pots = room.plants.filter((p) => p.model.startsWith('ivy/pot_'))
const errors = []
const fail = (id, msg) => errors.push(`${id}: ${msg}`)
let strands = 0, groups = 0

for (const p of room.plants) {
  const d = data[p.model]
  if (!d) { fail(p.id, `unknown model ${p.model}`); continue }
  const isIvy = p.model.startsWith('ivy/ivy_'), isPearls = p.model.startsWith('ivy/pearls_'), isPot = p.model.startsWith('ivy/pot_')
  if (isPot || isPearls) {
    groups++
    const base = onBoard(p.position)
    if (!base) fail(p.id, `its base (${p.position.join(', ')}) does not stand on a shelf board (within ${ROOT_TOL} m of a top surface)`)
  }
  if (isPearls) {
    const rim = d.rim * scaleOf(p)
    if (d.beadTop > d.rim + 0.0005) fail(p.id, `beads stand above the rim (${d.beadTop} > ${d.rim})`)
    for (const [k, strand] of d.strands.entries()) {
      strands++
      for (const pt of strand) {
        const w = toWorld(p, pt)
        const hit = boxes.find((x) => inside(w, x.b, d.beadRadius * scaleOf(p) * 0.9))
        if (hit) fail(p.id, `pearl strand ${k + 1} passes through ${hit.id} at (${w.map((v) => v.toFixed(3)).join(', ')})`)
      }
    }
    void rim
  }
  if (isIvy) {
    strands++
    const root = toWorld(p, d.curve[0])
    const host = pots.find((q) => {
      const s = scaleOf(q), rr = data[q.model].rimRadius * s, rimY = q.position[1] + data[q.model].rim * s
      return Math.abs(Math.hypot(root[0] - q.position[0], root[2] - q.position[2]) - rr) <= ROOT_TOL && Math.abs(root[1] - rimY) <= ROOT_TOL
    })
    if (!host && !onBoard(root)) fail(p.id, `FREE-FLOATING: root (${root.map((v) => v.toFixed(3)).join(', ')}) is neither on a pot rim nor on a shelf surface`)
    const tip = toWorld(p, d.curve[d.curve.length - 1])
    const tilt = (Math.atan2(Math.hypot(tip[0] - root[0], tip[2] - root[2]), root[1] - tip[1]) * 180) / Math.PI
    if (tilt > MAX_TILT) fail(p.id, `leans ${tilt.toFixed(1)} degrees from vertical (max ${MAX_TILT})`)
    for (const pt of d.curve) {
      const w = toWorld(p, pt)
      const hit = boxes.find((x) => inside(w, x.b, d.leafRadius * scaleOf(p) * 0.6))
      if (hit) fail(p.id, `strand passes through ${hit.id} at (${w.map((v) => v.toFixed(3)).join(', ')})`)
      if (Math.abs(w[0]) > WALL || w[2] < -WALL) fail(p.id, `stem passes through the wall at (${w.map((v) => v.toFixed(3)).join(', ')})`)
    }
  }
}

{
  const ROOM = { x0: -4, x1: 4, z0: -4, z1: 4.24, y0: 0, y1: 4.4 }, TOL = 0.03
  const desk = { x0: -0.87, x1: 3.27, z0: -3.98, z1: -2.26, top: 1.2 }
  const stool = { x: -2.65, z: -1.5675, r: 0.24, top: 0.5 }
  for (const p of room.plants) {
    const d = data[p.model]
    if (!d) continue
    const s = scaleOf(p), c = Math.cos(p.rotationY), sn = Math.sin(p.rotationY)
    const xs = [], zs = []
    for (const bx of [d.bounds[0], d.bounds[1]]) for (const bz of [d.bounds[2], d.bounds[3]]) { xs.push(p.position[0] + (bx * c + bz * sn) * s); zs.push(p.position[2] + (-bx * sn + bz * c) * s) }
    const y0 = p.position[1] + d.bounds[4] * s, y1 = p.position[1] + d.bounds[5] * s
    const out = []
    if (Math.min(...xs) < ROOM.x0 - TOL) out.push('x < -4'); if (Math.max(...xs) > ROOM.x1 + TOL) out.push('x > 4')
    if (Math.min(...zs) < ROOM.z0 - TOL) out.push('z < -4'); if (Math.max(...zs) > ROOM.z1 + TOL) out.push('z > 4.24')
    if (y0 < ROOM.y0 - TOL || y1 > ROOM.y1) out.push('y outside 0 to 4.4')
    if (out.length) fail(p.id, `outside the room (${out.join(', ')}); position (${p.position.join(', ')})`)
    if (p.model === 'planter_hang') {
      if (Math.abs(p.position[2] - ROOM.z0) > 0.01 || p.rotationY !== 0) fail(p.id, `the bracket plate is not flush against the back wall (z ${p.position[2]}, wall -4, rotationY ${p.rotationY}): within 1 cm and facing the room`)
      continue
    }
    if (p.model.startsWith('ivy/ivy_')) continue
    const [px, py, pz] = p.position
    const onBoard = boxes.some((x) => x.kind === 'board' && px >= x.b[0] - 0.05 && px <= x.b[3] + 0.05 && pz >= x.b[2] - 0.05 && pz <= x.b[5] + 0.05 && py - x.b[4] >= -0.05 && py - x.b[4] <= 0.12)
    const onDesk = px >= desk.x0 && px <= desk.x1 && pz >= desk.z0 && pz <= desk.z1 && Math.abs(py - desk.top) <= 0.05
    const onStool = Math.hypot(px - stool.x, pz - stool.z) <= stool.r && Math.abs(py - stool.top) <= 0.05
    const onFloor = Math.abs(py - 0.05) <= 0.05
    if (!(onBoard || onDesk || onStool || onFloor)) fail(p.id, `floats: pivot (${p.position.join(', ')}) is not within 5 cm of a surface`)
  }
  for (const p of [...room.props, ...room.codeProps]) {
    const [px, py, pz] = p.position
    if (px < ROOM.x0 || px > ROOM.x1 || pz < ROOM.z0 || pz > ROOM.z1 || py < ROOM.y0 || py > ROOM.y1) fail(p.id, `outside the room: position (${p.position.join(', ')})`)
  }
}

{
  const obstacles = fairyObstacles(room.plants, data)
  const L = buildFairy(obstacles)
  const r = FAIRY.beadRadius
  let wirePts = 0
  for (const seg of L.segments) for (const pt of seg.pts) {
    wirePts++
    const near = nearest(pt, obstacles)
    if (near < STRINGS.clear - 1e-6) fail('string ' + seg.id, `a wire point (${pt.map((v) => v.toFixed(3)).join(', ')}) is ${(near * 100).toFixed(1)} cm from an obstacle`)
    const hit = boxes.find((x) => inside(pt, x.b, FAIRY.wireRadius))
    if (hit) fail('string ' + seg.id, `the wire passes through ${hit.id} at (${pt.map((v) => v.toFixed(3)).join(', ')})`)
    if (Math.abs(pt[0]) > WALL || pt[2] < -WALL) fail('string ' + seg.id, 'the wire passes through the wall')
  }
  for (const b of L.bulbs) {
    const near = nearest(b, obstacles)
    if (near < STRINGS.clear - 1e-6) fail('bulb', `at (${b.map((v) => v.toFixed(3)).join(', ')}) is ${(near * 100).toFixed(1)} cm from an obstacle`)
    const hit = boxes.find((x) => inside(b, x.b, r))
    if (hit) fail('bulb', `at (${b.map((v) => v.toFixed(3)).join(', ')}) intersects ${hit.id}`)
  }
  const halos = Math.min(FAIRY.maxHalos, Math.ceil(L.bulbs.length / FAIRY.glowEvery))
  if (L.bulbs.length > STRINGS.maxBulbs) fail('string lights', `${L.bulbs.length} bulbs (max ${STRINGS.maxBulbs})`)
  console.log(`check-plants: string lights: ${L.bulbs.length} bulbs, ${halos} glow sprites, ${L.segments.length} strands (${wirePts} wire samples); ${L.skipped.length} cuts: ${L.skipped.join('; ') || 'none'}`)
}

if (errors.length) {
  console.error(`check-plants: ${errors.length} problem(s)\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log(`check-plants: ok (${strands} trailing strands, ${groups} trailing pots, ${boxes.length} boards and brackets checked)`)
