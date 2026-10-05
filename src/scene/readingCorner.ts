import * as THREE from 'three'
import { WOOD } from './woodPalette'
import type { V3 } from '../zones/types'

export const FLOOR_Y = 0.05

export const BEAN_X = -2.65
export const BEAN_Z = -2.66
export const BEAN_SCALE = 0.65
export const BEAN_RADIUS = 0.85
export const BEAN_SQUASH = 0.72
export const BEAN_LIFT = 0.45

export const STOOL = {
  radius: 0.24, thickness: 0.04, top: 0.5, edge: 0.012, gap: 0.3,
  topColor: WOOD.tableTop, rimColor: WOOD.tableRim,
  legColor: '#2A1B12', legTop: 0.017, legBottom: 0.010, legRadius: 0.15, splay: 0.045, legTurn: 0.35,
  apron: { inner: 0.135, outer: 0.16, height: 0.035, color: '#2A1B12' },
  blob: { size: 0.7, opacity: 0.5 },
}
const beanRadius = () => BEAN_RADIUS * BEAN_SCALE
export const stoolPos = () => ({ x: BEAN_X, z: BEAN_Z + beanRadius() + STOOL.gap + STOOL.radius })

export const CANDLE = { dx: 0.163, dz: -0.024, radius: 0.045, height: 0.12 }
export const FLAME_COLOR = '#FFD36B'
export const FLAME_EMISSIVE = '#FFB347'

export const DIARY = { azimuth: 0.35, offset: 0.03, spin: 0.5, tilt: 0.07, sink: 0.012, w: 0.28, d: 0.2, t: 0.04, cover: '#F0C4D4', pages: '#F6EBDD', ribbon: '#CDB8E8', sticker: '#F6E3A8', stickerInk: '#5B4F6B', scale: 1.3 }

const beanCentreY = () => FLOOR_Y + BEAN_LIFT * BEAN_SCALE
const beanRadii = () => ({ a: BEAN_RADIUS * BEAN_SCALE, b: BEAN_RADIUS * BEAN_SQUASH * BEAN_SCALE })

export function beanSurface(azimuth: number, offset: number): { pos: V3; normal: V3; quat: THREE.Quaternion } {
  const { a, b } = beanRadii()
  const cy = beanCentreY()
  const x = Math.cos(azimuth) * offset
  const z = Math.sin(azimuth) * offset
  const y = b * Math.sqrt(Math.max(0, 1 - (offset / a) ** 2))
  const n = new THREE.Vector3(x / (a * a), y / (b * b), z / (a * a)).normalize()
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
  return { pos: [BEAN_X + x, cy + y, BEAN_Z + z], normal: [n.x, n.y, n.z], quat }
}
