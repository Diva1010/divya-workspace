import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { bunnyParts } from './bunny'
import { GOLD, LIGHT_OAK, MAT_CREAM, makeFrame } from './frame'
import { assignColors, leanOffset, makeBook, seeded, type BookParams } from './bookGen'
import { GALLERY_MAT, coverRect, globeAt, quad } from './leftWall'
import { PLANT_BOUNDS, PLANT_MODEL_INFO } from './plantFootprint'
import type { PlantPlacement, ShelfBoardSpec } from '../zones/types'

const WALL_FACE_X = 4
const ITEM_GAP = 0.04
const BOOKS_SEED = 20261006

const BOOKS = {
  thickness: [0.022, 0.045] as [number, number],
  thicknessBias: 1.5,
  height: [0.16, 0.3] as [number, number],
  depth: [0.14, 0.22] as [number, number],
  inset: [0.02, 0.04] as [number, number],
  gap: [0.002, 0.004] as [number, number],
  leanDeg: 8,
  leanHeight: [0.22, 0.27] as [number, number],
  leanThickness: [0.026, 0.034] as [number, number],
  pull: 0.01,
  backGap: 0.02,
}

interface Row { z0: number; z1: number; leans: number; pulled: number[] }
interface Stack { zc: number; t: number[]; len: number[]; depth: number; inset: number; yaw: number[]; plant?: string }
const PLAN: Record<string, { row?: Row; stack: Stack }> = {
  S1: { stack: { zc: -2.82, t: [0.032, 0.027, 0.036], len: [0.21, 0.19, 0.17], depth: 0.19, inset: 0.03, yaw: [0.05, -0.06, 0.04] } },
  S2: { row: { z0: -3.8, z1: -3.1, leans: 2, pulled: [3, 9, 14] }, stack: { zc: -2.93, t: [0.034, 0.028, 0.038], len: [0.22, 0.2, 0.17], depth: 0.2, inset: 0.035, yaw: [0.04, -0.05, 0.03], plant: 's2-sansevieria' } },
  S3: { row: { z0: -3.62, z1: -3.02, leans: 1, pulled: [4, 10] }, stack: { zc: -2.88, t: [0.03, 0.036, 0.026], len: [0.21, 0.19, 0.16], depth: 0.19, inset: 0.035, yaw: [-0.05, 0.05, -0.04], plant: 's3-cactus' } },
}

const FRAME = { board: 'S1', art: 'leaf' as const, z: -3.6, backX: 3.86, width: 0.26, height: 0.32, border: 0.025, depth: 0.03, liner: 0.005, reach: 0.1 }
const BUNNY_AT = { board: 'S1', x: 3.87, z: -3.37, yaw: -Math.PI / 2 - 0.3, scale: 1.5 }
const GLOBE_AT = { board: 'S3', x: 3.86, z: -2.42, glowAbove: 0.235 }

interface BoardWorld { id: string; zMin: number; zMax: number; top: number; xBack: number; xFront: number }
const boardWorld = (b: ShelfBoardSpec, back: number): BoardWorld => ({ id: b.id, zMin: b.x - b.length / 2, zMax: b.x + b.length / 2, top: b.top, xBack: WALL_FACE_X - back, xFront: WALL_FACE_X - back - b.depth })

const toWall = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, WALL_FACE_X, 0, 0, 0, 1)

interface Span { id: string; z0: number; z1: number }
interface PlacedBook { shelf: string; kind: 'standing' | 'lean' | 'flat'; params: BookParams; matrix: THREE.Matrix4; pulled: boolean; zc: number }

function plantSpan(p: PlantPlacement): Span {
  const b = PLANT_BOUNDS[p.model]
  const s = p.size / (PLANT_MODEL_INFO[p.model]?.pot ?? 0.5)
  const [c, sn] = [Math.cos(p.rotationY), Math.sin(p.rotationY)]
  let lo = Infinity
  let hi = -Infinity
  for (const x of [b[0], b[1]]) for (const z of [b[2], b[3]]) {
    const w = (-x * sn + z * c) * s
    lo = Math.min(lo, w)
    hi = Math.max(hi, w)
  }
  return { id: p.id, z0: p.position[2] + lo, z1: p.position[2] + hi }
}

function keepOuts(board: BoardWorld, plants: PlantPlacement[]): Span[] {
  const out: Span[] = []
  const plan = PLAN[board.id]
  for (const p of plants) {
    if (p.group !== 'right' || p.id === plan?.stack.plant) continue
    if (p.position[1] < board.top - 0.1 || p.position[1] > board.top + 0.25 || p.position[2] < board.zMin || p.position[2] > board.zMax) continue
    out.push(plantSpan(p))
  }
  if (FRAME.board === board.id) out.push({ id: 'frame', z0: FRAME.z - FRAME.width / 2, z1: FRAME.z + FRAME.width / 2 })
  if (BUNNY_AT.board === board.id) out.push({ id: 'bunny', z0: BUNNY_AT.z - 0.045, z1: BUNNY_AT.z + 0.045 })
  if (GLOBE_AT.board === board.id) out.push({ id: 'globe', z0: GLOBE_AT.z - 0.07, z1: GLOBE_AT.z + 0.07 })
  if (plan) out.push({ id: 'stack', z0: plan.stack.zc - Math.max(...plan.stack.len) / 2 - 0.02, z1: plan.stack.zc + Math.max(...plan.stack.len) / 2 + 0.02 })
  return out
}

function clip(a: number, b: number, spans: Span[]): [number, number] {
  for (let again = true; again; ) {
    again = false
    for (const s of spans) {
      if (s.z0 - ITEM_GAP < b && s.z1 + ITEM_GAP > a) {
        if (s.z0 - ITEM_GAP > a) b = s.z0 - ITEM_GAP
        else a = s.z1 + ITEM_GAP
        again = true
      }
    }
  }
  return [a, b]
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ROT_Y = (a: number) => new THREE.Matrix4().makeRotationY(a)

function shelfBooks(board: BoardWorld, spans: Span[], seed: number): PlacedBook[] {
  const plan = PLAN[board.id]
  const out: PlacedBook[] = []
  const r = seeded(seed)
  const uni = (lo: number, hi: number) => lerp(lo, hi, r())
  const B = BOOKS
  const room = (spineX: number) => board.xBack - B.backGap - spineX
  const params = (t: number, h: number, depth: number): BookParams => ({ thickness: t, height: h, depth, color: '#fff', band: '#fff', title: { at: uni(0.5, 0.64), h: uni(0.026, 0.04) } })
  if (plan.row) {
    const [a, b] = clip(plan.row.z0, plan.row.z1, spans.filter((s) => s.id !== 'stack'))
    const phi = (B.leanDeg * Math.PI) / 180
    const leaned = Array.from({ length: plan.row.leans }, () => ({ t: uni(...B.leanThickness), h: uni(...B.leanHeight) }))
    const leanSpan = B.height[1] * Math.tan(phi) + leaned.reduce((s, k) => s + (k.t + B.gap[1]) / Math.cos(phi), 0)
    const zEnd = b - leanSpan
    const row: PlacedBook[] = []
    let z = a
    let h = uni(...B.height)
    for (;;) {
      const t = B.thickness[0] + (B.thickness[1] - B.thickness[0]) * Math.pow(r(), B.thicknessBias)
      if (z + t > zEnd) break
      h = Math.min(B.height[1], Math.max(B.height[0], h + (r() - 0.5) * 0.16))
      const pulled = plan.row.pulled.includes(row.length)
      const inset = pulled ? Math.max(uni(...B.inset), B.inset[0] + B.pull) : uni(...B.inset)
      const spineX = board.xFront + inset - (pulled ? B.pull : 0)
      const depth = Math.min(uni(...B.depth), room(spineX))
      const p = params(t, h, depth)
      row.push({ shelf: board.id, kind: 'standing', params: p, pulled, zc: z + t / 2, matrix: new THREE.Matrix4().makeTranslation(spineX + depth / 2, board.top, z + t / 2).multiply(ROT_Y(Math.PI)) })
      z += t + uni(...B.gap)
    }
    const last = row[row.length - 1].params
    let zp = z - B.gap[1] + leanOffset(last.height, leaned[0].h, phi)
    for (const k of leaned) {
      const spineX = board.xFront + uni(...B.inset)
      const depth = Math.min(uni(...B.depth), room(spineX))
      const p = params(k.t, k.h, depth)
      row.push({
        shelf: board.id,
        kind: 'lean',
        params: p,
        pulled: false,
        zc: zp + k.t / 2,
        matrix: new THREE.Matrix4().makeTranslation(spineX + depth / 2, board.top, zp).multiply(ROT_Y(Math.PI)).multiply(new THREE.Matrix4().makeRotationX(phi)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -k.t / 2)),
      })
      zp += (k.t + B.gap[1]) / Math.cos(phi)
    }
    assignColors(row.map((q) => q.params), seed + 17)
    out.push(...row)
  }
  const S = plan.stack
  const stack: PlacedBook[] = []
  let y = board.top + 0.001
  const spineX = board.xFront + S.inset
  S.t.forEach((t, i) => {
    const p = params(t, S.len[i], S.depth)
    stack.push({
      shelf: board.id,
      kind: 'flat',
      params: p,
      pulled: false,
      zc: S.zc,
      matrix: new THREE.Matrix4()
        .makeTranslation(spineX + S.depth / 2, y, S.zc)
        .multiply(ROT_Y(Math.PI + S.yaw[i]))
        .multiply(new THREE.Matrix4().makeTranslation(0, t / 2, 0))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new THREE.Matrix4().makeTranslation(0, -S.len[i] / 2, 0)),
    })
    y += t
  })
  assignColors(stack.map((q) => q.params), seed + 29)
  out.push(...stack)
  return out
}

export interface RightDecor {
  items: THREE.BufferGeometry
  frames: THREE.BufferGeometry
  art: THREE.BufferGeometry
  glow: THREE.BufferGeometry
  globe: { geometry: THREE.BufferGeometry; centre: [number, number, number] }
  books: PlacedBook[]
  boxes: { name: string; shelf: string; min: [number, number, number]; max: [number, number, number] }[]
  triangles: { books: number; bunny: number; frames: number; art: number; glow: number; globe: number; perBookMax: number }
}

const boxOf = (name: string, shelf: string, g: THREE.BufferGeometry) => {
  g.computeBoundingBox()
  return { name, shelf, min: g.boundingBox!.min.toArray() as [number, number, number], max: g.boundingBox!.max.toArray() as [number, number, number] }
}
const tri = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3

export function buildRightDecor(boards: ShelfBoardSpec[], back: number, plants: PlantPlacement[]): RightDecor {
  const world = boards.map((b) => boardWorld(b, back))
  const boardOf = (id: string) => world.find((b) => b.id === id)!
  const placed: PlacedBook[] = []
  world.forEach((b, i) => placed.push(...shelfBooks(b, keepOuts(b, plants), BOOKS_SEED + i * 101)))
  const boxes: RightDecor['boxes'] = []
  const itemParts: THREE.BufferGeometry[] = []
  let perBookMax = 0
  let bookTris = 0
  for (const p of placed) {
    const b = makeBook(p.params)
    perBookMax = Math.max(perBookMax, b.triangles)
    bookTris += b.triangles
    itemParts.push(b.geometry.applyMatrix4(p.matrix))
  }
  const s1 = boardOf(BUNNY_AT.board)
  const bunnyM = new THREE.Matrix4().makeTranslation(BUNNY_AT.x, s1.top, BUNNY_AT.z).multiply(ROT_Y(BUNNY_AT.yaw)).multiply(new THREE.Matrix4().makeScale(BUNNY_AT.scale, BUNNY_AT.scale, BUNNY_AT.scale))
  const bunny = bunnyParts().map((g) => g.applyMatrix4(bunnyM))
  const bunnyTris = bunny.reduce((s, g) => s + tri(g), 0)
  boxes.push(boxOf('bunny', BUNNY_AT.board, mergeGeometries(bunny.map((g) => g.clone()))!))
  itemParts.push(...bunny)
  const F = FRAME
  const fr = makeFrame({ width: F.width, height: F.height, border: F.border, depth: F.depth, color: LIGHT_OAK, liner: F.liner, linerColor: GOLD, matColor: MAT_CREAM, standing: true, strutReach: F.reach })
  const frameM = new THREE.Matrix4().makeTranslation(F.backX, boardOf(F.board).top, F.z).multiply(ROT_Y(-Math.PI / 2))
  const frameGeo = fr.geometry.clone().applyMatrix4(frameM)
  boxes.push(boxOf('frame', F.board, frameGeo))
  const aw = fr.opening.w - 2 * GALLERY_MAT
  const ah = fr.opening.h - 2 * GALLERY_MAT
  const art = quad(aw, ah, fr.artMatrix, frameM, coverRect(F.art, aw, ah))
  const s3 = boardOf(GLOBE_AT.board)
  const globe = globeAt('right', { x: GLOBE_AT.x, z: GLOBE_AT.z, top: s3.top, wallY: s3.top + GLOBE_AT.glowAbove })
  boxes.push(...globe.boxes.map((b) => ({ ...b, shelf: GLOBE_AT.board })))
  const frames = mergeGeometries([frameGeo, globe.base])!
  const items = mergeGeometries(itemParts)!
  const out: RightDecor = {
    items: items.applyMatrix4(toWall),
    frames: frames.applyMatrix4(toWall),
    art: art.applyMatrix4(toWall),
    glow: globe.glow.applyMatrix4(toWall),
    globe: { geometry: globe.sphere.applyMatrix4(toWall), centre: globe.centre },
    books: placed,
    boxes,
    triangles: { books: bookTris, bunny: bunnyTris, frames: tri(frames), art: tri(art), glow: tri(globe.glow), globe: tri(globe.sphere), perBookMax },
  }
  itemParts.forEach((g) => g.dispose())
  return out
}

