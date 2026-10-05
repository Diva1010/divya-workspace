import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { WOOD } from './woodPalette'

export const BLIND = {
  slatCount: 50,
  pitch: 0.04,
  openDrop: 0.28,
  closedDrop: 1.0,
  tiltOpen: (18 * Math.PI) / 180,
  tiltClosed: (68 * Math.PI) / 180,
  duration: 0.9,
  x0: -2.65,
  x1: 0.05,
  top: 3.85,
  windowH: 2.0,
  out: 0.17,
  headRail: { h: 0.045, d: 0.05 },
  bottomRail: { h: 0.02, d: 0.03 },
  slat: { depth: 0.045, thick: 0.004, color: '#D9B98C' },
  compact: 0.0055,
  cord: '#6B4A35',
  hoverPeak: 0.35,
}
const WALL_FACE_Z = -4
export const BLIND_Z = WALL_FACE_Z + BLIND.out
export const BLIND_W = BLIND.x1 - BLIND.x0
export const BLIND_CX = (BLIND.x0 + BLIND.x1) / 2
const headBottom = BLIND.top - BLIND.headRail.h
const FULL_LENGTH = BLIND.windowH - BLIND.headRail.h - BLIND.bottomRail.h
const PITCH_EFF = Math.min(BLIND.pitch, FULL_LENGTH / (BLIND.slatCount - 1))

export const smooth = (p: number) => p * p * (3 - 2 * p)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface BlindPose {
  bottomY: number
  railY: number
  tilt: number
  ys: number[]
}
export function blindPose(c: number): BlindPose {
  const S = BLIND.slatCount
  const L = lerp(BLIND.openDrop * BLIND.windowH, FULL_LENGTH, c)
  const nSp = Math.min(S, L / PITCH_EFF + 1)
  const stackH = (S - nSp) * BLIND.compact
  const bottomY = headBottom - 0.006 - stackH - L
  const ys: number[] = []
  for (let j = S - 1; j >= 0; j--) {
    const spaced = bottomY + j * PITCH_EFF
    const stacked = headBottom - 0.006 - (S - 1 - j) * BLIND.compact
    const t = Math.min(1, Math.max(0, nSp - j))
    ys.push(lerp(stacked, spaced, t))
  }
  for (let i = 1; i < ys.length; i++) ys[i] = Math.min(ys[i], ys[i - 1] - 0.001)
  return { bottomY: Math.min(bottomY, ys[ys.length - 1]), railY: bottomY - 0.012 - BLIND.bottomRail.h / 2, tilt: lerp(BLIND.tiltOpen, BLIND.tiltClosed, c), ys }
}

export function slatMatrices(pose: BlindPose, out: THREE.Matrix4[] = []): THREE.Matrix4[] {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pose.tilt)
  pose.ys.forEach((y, i) => {
    out[i] = (out[i] ?? new THREE.Matrix4()).compose(new THREE.Vector3(BLIND_CX, y, BLIND_Z), q, new THREE.Vector3(1, 1, 1))
  })
  return out
}
export const slatGeometry = () => new THREE.BoxGeometry(BLIND_W - 0.04, BLIND.slat.thick, BLIND.slat.depth)

const solid = (g: THREE.BufferGeometry, hex: string) => {
  const ng = g.index ? g.toNonIndexed() : g
  const c = new THREE.Color(hex)
  const n = ng.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3)
  ng.setAttribute('color', new THREE.BufferAttribute(a, 3))
  if (ng.attributes.uv) ng.deleteAttribute('uv')
  return ng
}
const bx = (w: number, h: number, d: number, x: number, y: number, z: number, hex: string) => solid(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex)

export function railsGeometry(pose: BlindPose): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const rail = WOOD.boards
  parts.push(bx(BLIND_W, BLIND.headRail.h, BLIND.headRail.d, BLIND_CX, headBottom + BLIND.headRail.h / 2, BLIND_Z, rail))
  parts.push(bx(BLIND_W - 0.02, BLIND.bottomRail.h, BLIND.bottomRail.d, BLIND_CX, pose.railY, BLIND_Z, rail))
  const len = headBottom - (pose.railY + BLIND.bottomRail.h / 2)
  for (const x of [BLIND.x0 + 0.4, BLIND.x1 - 0.4]) for (const z of [-0.0275, 0.0275]) parts.push(bx(0.003, len, 0.003, x, headBottom - len / 2, BLIND_Z + z, BLIND.cord))
  const px = BLIND.x1 - 0.12
  parts.push(bx(0.003, 0.85, 0.003, px, headBottom - 0.425, BLIND_Z + 0.036, BLIND.cord))
  parts.push(solid(new THREE.CylinderGeometry(0.009, 0.006, 0.05, 6).translate(px, headBottom - 0.875, BLIND_Z + 0.036), BLIND.cord))
  parts.push(solid(new THREE.SphereGeometry(0.01, 6, 4).translate(px, headBottom - 0.84, BLIND_Z + 0.036), BLIND.cord))
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}
