import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { seeded } from './bookGen'

const WAX_COLOR = '#FFF0D2'
const SAUCER_COLOR = '#7A5A44'
const WICK_COLOR = '#3A2E2A'
export const SAUCER_EXTRA = 0.012
export const SAUCER_H = 0.008
const WICK_H = 0.012
export const FLAME_H = 0.042
const FLAME_R = 0.012
export const FLAME_GAP = 0.004

export interface CandleSpec {
  id: string
  where: 'A' | 'B' | 'stool'
  level: number
  x: number
  y: number
  z: number
  radius: number
  height: number
  saucer: boolean
  seed: number
}


const paint = (g: THREE.BufferGeometry, hex: string) => {
  const c = new THREE.Color(hex)
  const n = g.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(a, 3))
  if (g.attributes.uv) g.deleteAttribute('uv')
  return g
}

export function candleBody(c: CandleSpec): THREE.BufferGeometry {
  const r = seeded(c.seed)
  const parts: THREE.BufferGeometry[] = []
  const base = c.saucer ? SAUCER_H : 0
  const top = base + c.height
  const pillar = new THREE.CylinderGeometry(c.radius * 0.96, c.radius, c.height, 14).toNonIndexed()
  pillar.translate(0, base + c.height / 2, 0)
  const p = pillar.attributes.position
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getY(i) - top) > 1e-6) continue
    const rr = Math.hypot(p.getX(i), p.getZ(i))
    const wob = (r() - 0.5) * 0.006
    p.setY(i, top + wob - (rr < 1e-6 ? 0.004 : 0))
  }
  pillar.computeVertexNormals()
  parts.push(paint(pillar, WAX_COLOR))
  if (c.saucer) {
    const s = new THREE.CylinderGeometry(c.radius + SAUCER_EXTRA, c.radius + SAUCER_EXTRA + 0.002, SAUCER_H, 18).toNonIndexed()
    s.translate(0, SAUCER_H / 2, 0)
    parts.push(paint(s, SAUCER_COLOR))
  }
  const wick = new THREE.CylinderGeometry(0.0015, 0.002, WICK_H, 4).toNonIndexed()
  wick.translate(0, top - 0.004 + WICK_H / 2, 0)
  parts.push(paint(wick, WICK_COLOR))
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged.translate(c.x, c.y, c.z)
}

export function flameGeometry(): THREE.BufferGeometry {
  const prof: [number, number][] = [[0, 0], [FLAME_R * 0.75, FLAME_H * 0.12], [FLAME_R, FLAME_H * 0.36], [FLAME_R * 0.62, FLAME_H * 0.7], [0, FLAME_H]]
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 7).toNonIndexed()
  g.deleteAttribute('uv')
  return g
}

export const flameCentre = (c: CandleSpec): [number, number, number] => [c.x, c.y + (c.saucer ? SAUCER_H : 0) + c.height + FLAME_GAP + FLAME_H * 0.45, c.z]
