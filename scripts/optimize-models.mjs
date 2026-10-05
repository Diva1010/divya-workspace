import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'

const PACK = 'assets-src/KayKit_Furniture_Bits_1.0_EXTRA/Assets'
const OUT = 'public/models'
const MODELS = [
  'desk_large', 'monitor', 'keyboard', 'mouse', 'mug_A', 'lamp_desk', 'gameconsole_handheld', 'chair_desk_A',
  'cabinet_medium', 'standing_frame', 'pictureframe_medium',
  'cactus_small_A', 'cactus_small_B', 'cactus_medium_A', 'cactus_medium_B', 'table_small', 'book_single',
  'cup_pencils', 'lamp_standing',
]

function splitLampHead(doc) {
  const mesh = doc.getRoot().listMeshes()[0]
  const prim = mesh.listPrimitives()[0]
  const pos = prim.getAttribute('POSITION')
  const idx = prim.getIndices().getArray()
  const key = (i) => pos.getElement(i, []).map((v) => v.toFixed(4)).join(',')
  const parent = new Map()
  const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k) } return k }
  const union = (a, b) => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); parent.set(find(a), find(b)) }
  for (let i = 0; i < idx.length; i += 3) { const k = [0, 1, 2].map((j) => key(idx[i + j])); union(k[0], k[1]); union(k[1], k[2]) }
  const centroid = (i) => [0, 1, 2].map((a) => [0, 1, 2].reduce((sum, j) => sum + pos.getElement(idx[i + j], [])[a], 0) / 3)
  let seed = null, best = -Infinity
  for (let i = 0; i < idx.length; i += 3) { const z = centroid(i)[2]; if (z > best) { best = z; seed = find(key(idx[i])) } }
  const comp = new Map()
  for (let i = 0; i < idx.length; i += 3) { const r = find(key(idx[i])); const c = centroid(i); const e = comp.get(r) ?? { n: 0, y: 0, z: 0 }; e.n++; e.y += c[1]; e.z += c[2]; comp.set(r, e) }
  const headRoots = new Set([seed])
  for (const [r, e] of comp) if (e.z / e.n > 0.38 && e.y / e.n > 0.7) headRoots.add(r)
  const head = [], body = []
  for (let i = 0; i < idx.length; i += 3) (headRoots.has(find(key(idx[i]))) ? head : body).push(idx[i], idx[i + 1], idx[i + 2])
  const mk = (arr, name) => {
    const acc = doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(arr))
    const p = doc.createPrimitive().setIndices(acc).setMaterial(doc.createMaterial(name))
    for (const sem of prim.listSemantics()) p.setAttribute(sem, prim.getAttribute(sem))
    return p
  }
  mesh.removePrimitive(prim)
  mesh.addPrimitive(mk(body, 'lamp_body')).addPrimitive(mk(head, 'lamp_head'))
  console.log(`lamp_desk split: head ${head.length / 3} triangles, body ${body.length / 3}`)
}

function splitStandingLampHead(doc) {
  const mesh = doc.getRoot().listMeshes()[0]
  const prim = mesh.listPrimitives()[0]
  const pos = prim.getAttribute('POSITION')
  const idx = prim.getIndices().getArray()
  const key = (i) => pos.getElement(i, []).map((v) => v.toFixed(4)).join(',')
  const parent = new Map()
  const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k) } return k }
  const union = (a, b) => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); parent.set(find(a), find(b)) }
  for (let i = 0; i < idx.length; i += 3) { const k = [0, 1, 2].map((j) => key(idx[i + j])); union(k[0], k[1]); union(k[1], k[2]) }
  const minY = new Map()
  for (let i = 0; i < idx.length; i += 3) for (let j = 0; j < 3; j++) { const r = find(key(idx[i])); minY.set(r, Math.min(minY.get(r) ?? Infinity, pos.getElement(idx[i + j], [])[1])) }
  const head = [], body = []
  for (let i = 0; i < idx.length; i += 3) (minY.get(find(key(idx[i]))) >= 1.7 ? head : body).push(idx[i], idx[i + 1], idx[i + 2])
  const mk = (arr, name) => {
    const acc = doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(arr))
    const p = doc.createPrimitive().setIndices(acc).setMaterial(doc.createMaterial(name))
    for (const sem of prim.listSemantics()) p.setAttribute(sem, prim.getAttribute(sem))
    return p
  }
  mesh.removePrimitive(prim)
  mesh.addPrimitive(mk(body, 'lamp_body')).addPrimitive(mk(head, 'lamp_head'))
  console.log(`lamp_standing split: head ${head.length / 3} triangles, body ${body.length / 3}`)
}

const POTS = { r2c7: 'r4c1', r3c7: 'r5c1' }
const REMAP = {
  cabinet_medium: { r0c1: 'r6c2', r0c2: 'r6c3', r0c4: 'r6c4', r0c5: 'r6c5', r1c0: 'r7c2', r1c2: 'r7c3', r1c4: 'r7c4', r1c5: 'r7c5' },
  pictureframe_medium: { r0c3: 'r6c6', r1c3: 'r7c6' },
  chair_desk_A: { r2c0: 'r2c4', r3c0: 'r3c4' },
  monitor: { r4c3: 'r6c7', r5c3: 'r7c7' },
  cactus_small_A: POTS,
  cactus_small_B: POTS,
  cactus_medium_A: POTS,
  cactus_medium_B: POTS,
}
const parseCell = (k) => [Number(k[1]), Number(k[3])]

function remapUVs(doc, name, map) {
  let moved = 0, minMargin = 1, straddle = 0
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const uv = prim.getAttribute('TEXCOORD_0')
    const cellOf = (i) => { const [u, v] = uv.getElement(i, []); return 'r' + Math.min(7, Math.floor(v * 8)) + 'c' + Math.min(7, Math.floor(u * 8)) }
    const idx = prim.getIndices().getArray()
    for (let t = 0; t < idx.length; t += 3) {
      const offs = new Set([0, 1, 2].map((j) => {
        const k = cellOf(idx[t + j]); const to = map[k]
        if (!to) return '0,0'
        const [r, c] = parseCell(k); const [r2, c2] = parseCell(to)
        return `${r2 - r},${c2 - c}`
      }))
      if (offs.size > 1) { straddle++; console.log(`  ! ${name}: triangle ${t / 3} spans cells ${[0, 1, 2].map((j) => cellOf(idx[t + j])).join(' ')}`) }
    }
    const seen = new Set()
    for (const i of idx) {
      if (seen.has(i)) continue
      seen.add(i)
      const key = cellOf(i)
      const to = map[key]
      if (!to) continue
      const [u, v] = uv.getElement(i, [])
      const [r, c] = parseCell(key)
      const [r2, c2] = parseCell(to)
      minMargin = Math.min(minMargin, u * 8 - c, c + 1 - u * 8, v * 8 - r, r + 1 - v * 8)
      uv.setElement(i, [u + (c2 - c) / 8, v + (r2 - r) / 8])
      moved++
    }
  }
  console.log(`${name}: remapped ${moved} vertices, triangles that would be distorted: ${straddle}, smallest UV margin to a cell edge: ${minMargin.toFixed(4)} cells`)
}

function keepStandingFrame(doc) {
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0]
  const pos = prim.getAttribute('POSITION')
  const uv = prim.getAttribute('TEXCOORD_0')
  const idx = prim.getIndices().getArray()
  const key = (i) => pos.getElement(i, []).map((v) => v.toFixed(4)).join(',')
  const parent = new Map()
  const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k) } return k }
  const union = (a, b) => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); parent.set(find(a), find(b)) }
  for (let i = 0; i < idx.length; i += 3) { const k = [0, 1, 2].map((j) => key(idx[i + j])); union(k[0], k[1]); union(k[1], k[2]) }
  const cellOf = (i) => { const [u, v] = uv.getElement(i, []); return 'r' + Math.min(7, Math.floor(v * 8)) + 'c' + Math.min(7, Math.floor(u * 8)) }
  const drop = new Set()
  const minY = new Map()
  for (let i = 0; i < idx.length; i += 3) {
    const r = find(key(idx[i]))
    if (cellOf(idx[i]) === 'r2c2') drop.add(r)
    for (let j = 0; j < 3; j++) minY.set(r, Math.min(minY.get(r) ?? Infinity, pos.getElement(idx[i + j], [])[1]))
  }
  for (const [r, y] of minY) if (y < 0.05) drop.add(r)
  const keep = []
  let removed = 0
  for (let i = 0; i < idx.length; i += 3) {
    if (drop.has(find(key(idx[i])))) { removed++; continue }
    keep.push(idx[i], idx[i + 1], idx[i + 2])
  }
  if (drop.size !== 2) throw new Error(`keepStandingFrame: expected to drop 2 shells (board, books), dropped ${drop.size}`)
  prim.getIndices().setArray(idx instanceof Uint32Array ? new Uint32Array(keep) : new Uint16Array(keep))
  console.log(`standing_frame: dropped the board and the books, ${removed} triangles (kept ${keep.length / 3})`)
}

await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder })

fs.mkdirSync(OUT, { recursive: true })
const rows = []
const SOURCE = { standing_frame: 'shelf_B_large_decorated' }
const only = process.argv.slice(2)
for (const name of MODELS.filter((n) => !only.length || only.includes(n))) {
  const src = path.join(PACK, 'gltf', `${SOURCE[name] ?? name}.gltf`)
  const doc = await io.read(src)
  if (name === 'lamp_desk') splitLampHead(doc)
  if (name === 'lamp_standing') splitStandingLampHead(doc)
  if (name === 'standing_frame') keepStandingFrame(doc)
  if (REMAP[name]) remapUVs(doc, name, REMAP[name])
  for (const mat of doc.getRoot().listMaterials()) mat.setBaseColorTexture(null)
  for (const tex of doc.getRoot().listTextures()) tex.dispose()
  await doc.transform(dedup({ keepUniqueNames: true }), prune({ keepAttributes: true }), weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  const dst = path.join(OUT, `${name}.glb`)
  await io.write(dst, doc)
  let tris = 0
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    tris += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3
  }
  rows.push({ name, tris, kb: +(fs.statSync(dst).size / 1024).toFixed(1) })
}
fs.copyFileSync(path.join(PACK, 'textures/furniturebits_texture.png'), path.join(OUT, 'furniturebits_texture.png'))
console.table(rows)
const total = rows.reduce((a, r) => a + r.kb, 0) + fs.statSync(path.join(OUT, 'furniturebits_texture.png')).size / 1024
console.log(`models: ${rows.length}, triangles: ${rows.reduce((a, r) => a + r.tris, 0)}, total incl. atlas: ${total.toFixed(1)} KB`)
