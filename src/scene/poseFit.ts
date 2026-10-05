import { room } from '../zones/zone'
import type { V3 } from '../zones/types'

const POSE_FIT_FRACTION = 0.9

export const SIDE_SHEET_MAX_PX = 920

const WIDEN_BELOW = 1.2

export function fovForAspect(a: number): number {
  const home = room.camera.home.fov
  return a >= WIDEN_BELOW ? home : Math.min(62, home * Math.pow(WIDEN_BELOW / a, 0.8))
}

function roomLimit(target: V3, dir: V3): number {
  const b = room.bounds
  const lo: V3 = [-b.halfWidth + 0.2, 0.3, -b.halfWidth + 0.2]
  const hi: V3 = [b.halfWidth - 0.2, b.height - 0.2, b.frontPostZ - 0.2]
  let limit = Infinity
  for (let i = 0; i < 3; i++) {
    if (dir[i] > 1e-6) limit = Math.min(limit, (hi[i] - target[i]) / dir[i])
    else if (dir[i] < -1e-6) limit = Math.min(limit, (lo[i] - target[i]) / dir[i])
  }
  return limit
}

export function fitDistance(distance: number, fitWidth: number, a: number, target: V3, dir: V3): number {
  if (a >= WIDEN_BELOW) return distance
  const need = fitWidth / (POSE_FIT_FRACTION * 2 * a * Math.tan((fovForAspect(a) * Math.PI) / 360))
  return Math.min(room.camera.orbit.maxDistance, roomLimit(target, dir), Math.max(distance, need))
}
