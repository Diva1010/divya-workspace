import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GOLD, LIGHT_OAK, MAT_CREAM, WALNUT, fitArt, makeFrame, paint, type Frame } from './frame'
import { SHELF_ROW, layoutRow, makeBook } from './bookGen'
import { POSTER_TEX } from './posterDesign'
import { CASE } from './bookcaseLayout'
import { artUV, type ArtId } from './wallArt'


const WALL_X = -3.985

export interface ShelfData { x: number; length: number; depth: number; top: number; back: number }
const shelfWorld = (s: ShelfData) => ({ zMin: -(s.x + s.length / 2), zMax: -(s.x - s.length / 2), xBack: -4 + s.back, xFront: -4 + s.back + s.depth, top: s.top })

const STANDING_FRAME = { z: 1.075, backX: -3.74, width: 0.5, height: 0.62, border: 0.028, depth: 0.03, minMat: 0.03 }
const POSTER_ASPECT = POSTER_TEX[0] / POSTER_TEX[1]

interface GalleryItem { id: string; art: ArtId; z: number; y: number; w: number; h: number; border: number; depth: number; color: string }
const GALLERY: GalleryItem[] = [
  { id: 'A', art: 'leaf', z: -1.12, y: 2.95, w: 0.34, h: 0.44, border: 0.025, depth: 0.03, color: LIGHT_OAK },
  { id: 'B', art: 'sunrise', z: -0.66, y: 3.18, w: 0.46, h: 0.34, border: 0.025, depth: 0.03, color: WALNUT },
  { id: 'C', art: 'wildflowers', z: -0.52, y: 2.77, w: 0.26, h: 0.32, border: 0.022, depth: 0.03, color: GOLD },
]
export const GALLERY_MAT = 0.03

export const GLOBE = {
  x: -3.7,
  z: 0.73,
  radius: 0.07,
  baseRadius: 0.045,
  baseHeight: 0.04,
  baseColor: '#5B4F6B',
  color: '#FFD27A',
  tint: '#FFE9B8',
  glow: 1.2,
  haloRadius: 0.35,
  haloX: -3.78,
  haloPeak: 0.5,
  wallSize: 0.8,
  wallY: 2.25,
  wallPeak: 0.18,
  wallX: -3.996,
}

const TOP_FRAMES: { id: string; art: ArtId; z: number; backX: number; width: number; height: number; border: number; depth: number; liner: number; color: string; reach: number; enabled: boolean }[] = [
  { id: 'top-A', art: 'moon', z: -3.62, backX: -3.74, width: 0.34, height: 0.42, border: 0.03, depth: 0.035, liner: 0.005, color: WALNUT, reach: 0.1, enabled: true },
  { id: 'top-B', art: 'leaf', z: -1.66, backX: -3.74, width: 0.22, height: 0.28, border: 0.022, depth: 0.03, liner: 0, color: LIGHT_OAK, reach: 0.1, enabled: true },
]
const CASE_TOP_Y = CASE.floor + CASE.height

const BOOK_ZONE = { z0: -0.508, z1: 0.596 }
const SPINE_ICON_MAX = 0.04

interface Box { name: string; min: [number, number, number]; max: [number, number, number] }
const boxOf = (name: string, g: THREE.BufferGeometry): Box => {
  g.computeBoundingBox()
  return { name, min: g.boundingBox!.min.toArray() as [number, number, number], max: g.boundingBox!.max.toArray() as [number, number, number] }
}

const onWall = (z: number, y: number, x: number) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))
const standingMatrix = (shelfTop: number) => onWall(STANDING_FRAME.z, shelfTop, STANDING_FRAME.backX)

export function quad(w: number, h: number, a: THREE.Matrix4, b: THREE.Matrix4, rect?: [number, number, number, number]) {
  const g = new THREE.PlaneGeometry(w, h)
  if (rect) {
    const uv = g.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setXY(i, rect[0] + uv.getX(i) * (rect[2] - rect[0]), rect[1] + uv.getY(i) * (rect[3] - rect[1]))
  }
  return g.applyMatrix4(a).applyMatrix4(b).toNonIndexed()
}

export function coverRect(id: ArtId, w: number, h: number): [number, number, number, number] {
  const [u0, v0, u1, v1] = artUV(id)
  const a = w / h
  const kx = a < 1 ? a : 1
  const ky = a > 1 ? 1 / a : 1
  const cu = (u0 + u1) / 2
  const cv = (v0 + v1) / 2
  return [cu - ((u1 - u0) / 2) * kx, cv - ((v1 - v0) / 2) * ky, cu + ((u1 - u0) / 2) * kx, cv + ((v1 - v0) / 2) * ky]
}

export function posterQuad(shelfTop: number): THREE.BufferGeometry {
  const f = makeFrame({ width: STANDING_FRAME.width, height: STANDING_FRAME.height, border: STANDING_FRAME.border, depth: STANDING_FRAME.depth, color: LIGHT_OAK, matColor: MAT_CREAM, standing: true })
  const art = fitArt(f.opening, POSTER_ASPECT, STANDING_FRAME.minMat)
  return quad(art.w, art.h, f.artMatrix, standingMatrix(shelfTop))
}

export interface GlobeParts {
  base: THREE.BufferGeometry
  sphere: THREE.BufferGeometry
  glow: THREE.BufferGeometry
  centre: [number, number, number]
  boxes: Box[]
}

export function globeAt(wall: 'left' | 'right', at: { x: number; z: number; top: number; wallY: number }): GlobeParts {
  const G = GLOBE
  const f = wall === 'left' ? 1 : -1
  const base = new THREE.CylinderGeometry(G.baseRadius * 0.88, G.baseRadius, G.baseHeight, 16).toNonIndexed()
  base.deleteAttribute('uv')
  base.translate(at.x, at.top + G.baseHeight / 2, at.z)
  const boxes: Box[] = [boxOf('globe-base', base)]
  const sphere = new THREE.SphereGeometry(G.radius, 20, 14)
  const cy = at.top + G.baseHeight + G.radius - 0.01
  sphere.translate(at.x, cy, at.z)
  boxes.push(boxOf('globe', sphere))
  const glowCol = new THREE.Color(G.color)
  const quadAt = (x: number, y: number, size: number, k: number) => {
    const g = new THREE.PlaneGeometry(size, size).rotateY(f * (Math.PI / 2)).translate(x, y, at.z).toNonIndexed()
    const c = glowCol.clone().multiplyScalar(k)
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [c.r, c.g, c.b]).flat(), 3))
    return g
  }
  const haloX = at.x + f * (G.haloX - G.x)
  const wallX = f * G.wallX
  const glow = mergeGeometries([quadAt(haloX, cy, 2 * G.haloRadius, 1), quadAt(wallX, at.wallY, G.wallSize, G.wallPeak / G.haloPeak)])!
  boxes.push(boxOf('globe-halo', quadAt(haloX, cy, 2 * G.haloRadius, 1)), boxOf('globe-wall-glow', quadAt(wallX, at.wallY, G.wallSize, 1)))
  return { base: paint(base, G.baseColor), sphere, glow, centre: [at.x, cy, at.z], boxes }
}

export interface Decor {
  frames: THREE.BufferGeometry
  art: THREE.BufferGeometry
  glow: THREE.BufferGeometry
  globe: { geometry: THREE.BufferGeometry; centre: [number, number, number] }
  boxes: Box[]
  triangles: { frames: number; art: number; glow: number; globe: number }
}

export function buildDecor(shelf: ShelfData): Decor {
  const top = shelf.top
  const parts: THREE.BufferGeometry[] = []
  const boxes: Box[] = []
  const put = (name: string, f: Frame, m: THREE.Matrix4) => {
    const g = f.geometry.clone().applyMatrix4(m)
    boxes.push(boxOf(name, g))
    parts.push(g)
  }
  const S = STANDING_FRAME
  put('standing-frame', makeFrame({ width: S.width, height: S.height, border: S.border, depth: S.depth, color: LIGHT_OAK, matColor: MAT_CREAM, standing: true }), standingMatrix(top))
  const artParts: THREE.BufferGeometry[] = []
  for (const it of GALLERY) {
    const f = makeFrame({ width: it.w, height: it.h, border: it.border, depth: it.depth, color: it.color, matColor: MAT_CREAM })
    const m = onWall(it.z, it.y, WALL_X)
    put(`gallery-${it.id}`, f, m)
    const w = f.opening.w - 2 * GALLERY_MAT
    const h = f.opening.h - 2 * GALLERY_MAT
    artParts.push(quad(w, h, f.artMatrix, m, coverRect(it.art, w, h)))
  }
  for (const t of TOP_FRAMES.filter((k) => k.enabled)) {
    const f = makeFrame({ width: t.width, height: t.height, border: t.border, depth: t.depth, color: t.color, liner: t.liner || undefined, matColor: MAT_CREAM, standing: true, strutReach: t.reach })
    const m = onWall(t.z, CASE_TOP_Y, t.backX)
    put(t.id, f, m)
    const w = f.opening.w - 2 * GALLERY_MAT
    const h = f.opening.h - 2 * GALLERY_MAT
    artParts.push(quad(w, h, f.artMatrix, m, coverRect(t.art, w, h)))
  }
  const G = GLOBE
  const globe = globeAt('left', { x: G.x, z: G.z, top, wallY: G.wallY })
  boxes.push(...globe.boxes)
  parts.push(globe.base)
  const { sphere, glow } = globe
  const cy = globe.centre[1]
  const frames = mergeGeometries(parts)!
  const art = mergeGeometries(artParts)!
  const tri = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3
  return { frames, art, glow, globe: { geometry: sphere, centre: [G.x, cy, G.z] }, boxes, triangles: { frames: tri(frames), art: tri(art), glow: tri(glow), globe: tri(sphere) } }
}

export interface ShelfBooks {
  geometry: THREE.BufferGeometry
  icons: { position: [number, number, number]; size: number; band: string }[]
  boxes: Box[]
  count: number
  triangles: number
  perBookMax: number
}

export function buildShelfBooks(shelf: ShelfData): ShelfBooks {
  const w = shelfWorld(shelf)
  const placed = layoutRow({ ...SHELF_ROW, z0: BOOK_ZONE.z0, z1: BOOK_ZONE.z1, frontX: w.xFront, top: w.top })
  const parts: THREE.BufferGeometry[] = []
  const boxes: Box[] = []
  const icons: ShelfBooks['icons'] = []
  let perBookMax = 0
  placed.forEach((p, i) => {
    const b = makeBook(p.params)
    perBookMax = Math.max(perBookMax, b.triangles)
    const g = b.geometry.clone().applyMatrix4(p.matrix)
    boxes.push(boxOf(`book-${i}-${p.kind}`, g))
    parts.push(g)
    if (p.kind === 'feature') {
      const at = new THREE.Vector3(p.params.depth / 2 + 0.0016, b.spine.titleY, 0).applyMatrix4(p.matrix)
      icons.push({ position: at.toArray() as [number, number, number], size: Math.min(SPINE_ICON_MAX, b.spine.flat * 0.85), band: b.titleColor })
    }
    b.geometry.dispose()
  })
  const geometry = mergeGeometries(parts)!
  const triangles = geometry.attributes.position.count / 3
  parts.forEach((g) => g.dispose())
  return { geometry, icons, boxes, count: placed.length, triangles, perBookMax }
}
