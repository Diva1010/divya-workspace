import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { slab } from './geometry'
import { WOOD } from './woodPalette'
import { room } from '../zones/zone'


const FLOOR_Y = 0.05
const DESK = {
  x0: -0.87, x1: 3.27, z0: -3.98, z1: -2.26, top: 1.2,
  slabT: 0.04, slabRadius: 0.02, slabBevel: 0.008, band: 0.006,
  apronH: 0.07, apronInset: 0.04, apronT: 0.02,
  pedestal: { xs: [[-0.82, -0.32], [2.72, 3.22]], z0: -3.94, z1: -2.74, drawers: 3, drawerH: 0.33, gap: 0.0125, side: 0.012, proud: 0.006 },
  knob: { r: 0.016, depth: 0.012 },
}
const SEG = { curve: 2, bevel: 1 }

const solid = (g: THREE.BufferGeometry, hex: string) => {
  const flat = g.index ? g.toNonIndexed() : g
  flat.deleteAttribute('uv')
  const c = new THREE.Color(hex)
  const a = new Float32Array(flat.attributes.position.count * 3)
  for (let i = 0; i < flat.attributes.position.count; i++) a.set([c.r, c.g, c.b], i * 3)
  flat.setAttribute('color', new THREE.BufferAttribute(a, 3))
  return flat
}
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, hex: string) =>
  solid(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), hex)

function drawer(x0: number, x1: number, y0: number, y1: number, zFace: number, proud: number, front: string, knob: string): THREE.BufferGeometry[] {
  const K = DESK.knob
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return [
    box(x0, y0, zFace, x1, y1, zFace + proud, front),
    solid(new THREE.CylinderGeometry(K.r, K.r, K.depth, 12).rotateX(Math.PI / 2).translate(cx, cy, zFace + proud + K.depth / 2), knob),
  ]
}

function drawerUnit(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, n: number, h: number, gap: number, side: number, proud: number): THREE.BufferGeometry[] {
  const P = { frame: WOOD.deskFrame, drawer: WOOD.deskDrawer, knob: WOOD.deskKnob }
  const parts = [box(x0, y0, z0, x1, y1, z1, P.frame)]
  const margin = (y1 - y0 - n * h - (n - 1) * gap) / 2
  for (let i = 0; i < n; i++) {
    const top = y1 - margin - i * (h + gap)
    parts.push(...drawer(x0 + side, x1 - side, top - h, top, z1, proud, P.drawer, P.knob))
  }
  return parts
}

const CONTACT = { width: 0.004, dark: 0.78, lift: 0.001, props: ['laptop', 'resume-paper'] }
const contactLines = (): THREE.BufferGeometry[] => {
  const c = new THREE.Color(WOOD.deskTop).multiplyScalar(CONTACT.dark)
  const hex = '#' + c.getHexString()
  const out: THREE.BufferGeometry[] = []
  for (const id of CONTACT.props) {
    const p = room.codeProps.find((q) => q.id === id)
    if (!p) continue
    const [w, d] = p.size
    const [x0, x1, z0, z1] = [p.position[0] - w / 2, p.position[0] + w / 2, p.position[2] - d / 2, p.position[2] + d / 2]
    const t = CONTACT.width
    const y0 = DESK.top
    const y1 = DESK.top + CONTACT.lift
    out.push(box(x0 - t, y0, z1, x1 + t, y1, z1 + t, hex), box(x0 - t, y0, z0 - t, x1 + t, y1, z0, hex), box(x0 - t, y0, z0, x0, y1, z1, hex), box(x1, y0, z0, x1 + t, y1, z1, hex))
  }
  return out
}

export interface DeskBuild { geometry: THREE.BufferGeometry; triangles: number; boxes: { name: string; min: [number, number, number]; max: [number, number, number] }[] }

export function buildDesk(): DeskBuild {
  const D = DESK
  const parts: THREE.BufferGeometry[] = []
  const boxes: DeskBuild['boxes'] = []
  const note = (name: string, gs: THREE.BufferGeometry[]) => {
    const b = new THREE.Box3()
    gs.forEach((g) => { g.computeBoundingBox(); b.union(g.boundingBox!) })
    boxes.push({ name, min: b.min.toArray() as [number, number, number], max: b.max.toArray() as [number, number, number] })
    parts.push(...gs)
  }
  const W = D.x1 - D.x0
  const DEP = D.z1 - D.z0
  const slabGeo = slab(W, DEP, D.slabT, D.slabRadius, D.slabBevel, SEG).clone().translate((D.x0 + D.x1) / 2, D.top - D.slabT, (D.z0 + D.z1) / 2)
  note('slab', [solid(slabGeo, WOOD.deskTop)])
  const e = 0.0008
  const yb1 = D.top - D.slabBevel
  const yb0 = yb1 - D.band
  const r = D.slabRadius
  note('edge-band', [
    box(D.x0 + r, yb0, D.z1, D.x1 - r, yb1, D.z1 + e, WOOD.deskEdge),
    box(D.x0 + r, yb0, D.z0 - e, D.x1 - r, yb1, D.z0, WOOD.deskEdge),
    box(D.x0 - e, yb0, D.z0 + r, D.x0, yb1, D.z1 - r, WOOD.deskEdge),
    box(D.x1, yb0, D.z0 + r, D.x1 + e, yb1, D.z1 - r, WOOD.deskEdge),
  ])
  const ay1 = D.top - D.slabT
  const ay0 = ay1 - D.apronH
  const i = D.apronInset
  note('apron', [
    box(D.x0 + i, ay0, D.z1 - i - D.apronT, D.x1 - i, ay1, D.z1 - i, WOOD.deskFrame),
    box(D.x0 + i, ay0, D.z0 + 0.005, D.x0 + i + D.apronT, ay1, D.z1 - i - D.apronT, WOOD.deskFrame),
    box(D.x1 - i - D.apronT, ay0, D.z0 + 0.005, D.x1 - i, ay1, D.z1 - i - D.apronT, WOOD.deskFrame),
  ])
  note('contact-lines', contactLines())
  const P = D.pedestal
  P.xs.forEach(([x0, x1], k) => note(`pedestal-${k}`, drawerUnit(x0, x1, FLOOR_Y, ay0, P.z0, P.z1, P.drawers, P.drawerH, P.gap, P.side, P.proud)))
  const geometry = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return { geometry, triangles: geometry.attributes.position.count / 3, boxes }
}

export function deskBlobs(): [number, number, number, number, number][] {
  const D = DESK
  return D.pedestal.xs.map(([x0, x1]): [number, number, number, number, number] => [(x0 + x1) / 2, (D.pedestal.z0 + D.pedestal.z1) / 2, x1 - x0 + 0.5, D.pedestal.z1 - D.pedestal.z0 + 0.5, 0.3])
}
