import * as THREE from 'three'
import { room } from '../zones/zone'
import type { CodeProp, MonitorScreenQuad, Prop, V3, WhiteboardProp } from '../zones/types'

const SCREEN_OFFSET = 0.0015

export interface ScreenFrame {
  center: V3
  quaternion: [number, number, number, number]
  width: number
  height: number
}

export function monitorScreenFrame(prop: Prop, quad: MonitorScreenQuad, propScale: number): ScreenFrame {
  const k = propScale * prop.scale
  const yaw = new THREE.Matrix4().makeRotationY(prop.rotationY)
  const toWorld = (v: THREE.Vector3) => v.clone().multiplyScalar(k).applyMatrix4(yaw).add(new THREE.Vector3(...prop.position))
  const upModel = new THREE.Vector3(0, quad.top.y - quad.bottom.y, quad.top.z - quad.bottom.z)
  const height = (upModel.length() * k)
  upModel.normalize()
  const right = new THREE.Vector3(1, 0, 0).applyMatrix4(yaw)
  const up = upModel.clone().applyMatrix4(yaw)
  const normal = new THREE.Vector3().crossVectors(right, up).normalize()
  const midModel = new THREE.Vector3(0, (quad.top.y + quad.bottom.y) / 2, (quad.top.z + quad.bottom.z) / 2)
  const off = normal.clone().multiplyScalar(SCREEN_OFFSET)
  const center = toWorld(midModel).add(off)
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
  return {
    center: center.toArray() as V3,
    quaternion: [q.x, q.y, q.z, q.w],
    width: 2 * quad.halfWidth * k,
    height,
  }
}

export const LAPTOP_LID_THICKNESS = 0.03
export const LAPTOP_SCREEN_LIFT = 0.002
export const LAPTOP_SCREEN_INSET = 0.1

export function laptopScreenFrame(cp: CodeProp): ScreenFrame {
  const [w, d, h] = cp.size
  const lean = ((cp.lidAngle ?? 105) - 90) * (Math.PI / 180)
  const tilt = new THREE.Matrix4().makeRotationX(-lean)
  const yaw = new THREE.Matrix4().makeRotationY(cp.rotationY)
  const hinge = new THREE.Vector3(0, h, -d / 2)
  const place = (local: THREE.Vector3) => local.clone().applyMatrix4(tilt).add(hinge).applyMatrix4(yaw).add(new THREE.Vector3(...cp.position))
  const sw = w - LAPTOP_SCREEN_INSET
  const sh = d - LAPTOP_SCREEN_INSET
  const lift = LAPTOP_LID_THICKNESS + LAPTOP_SCREEN_LIFT
  const right = new THREE.Vector3(1, 0, 0).applyMatrix4(yaw)
  const up = new THREE.Vector3(0, 1, 0).applyMatrix4(tilt).applyMatrix4(yaw)
  const normal = new THREE.Vector3(0, 0, 1).applyMatrix4(tilt).applyMatrix4(yaw)
  const off = normal.clone().multiplyScalar(SCREEN_OFFSET)
  const mid = d / 2
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
  return {
    center: place(new THREE.Vector3(0, mid, lift)).add(off).toArray() as V3,
    quaternion: [q.x, q.y, q.z, q.w],
    width: sw,
    height: sh,
  }
}

export const PHONE_SCREEN_LIFT = 0.001
export const PHONE_SCREEN_INSET_W = 0.04
export const PHONE_SCREEN_INSET_D = 0.06
export const PHONE_STAND_H = 0.03
const PHONE_TILT = 0.26

export function phonePlacement(cp: CodeProp) {
  const [, d, t] = cp.size
  const alpha = cp.tilt ?? PHONE_TILT
  return { alpha, beta: Math.PI / 2 - alpha, y: PHONE_STAND_H + (t / 2) * Math.sin(alpha) + (d / 2) * Math.cos(alpha) }
}

export function phoneScreenFrame(cp: CodeProp): ScreenFrame {
  const [w, d, t] = cp.size
  const { beta, y } = phonePlacement(cp)
  const R = new THREE.Matrix4().makeRotationY(cp.rotationY).multiply(new THREE.Matrix4().makeRotationX(beta))
  const right = new THREE.Vector3(1, 0, 0).applyMatrix4(R)
  const up = new THREE.Vector3(0, 0, -1).applyMatrix4(R)
  const normal = new THREE.Vector3(0, 1, 0).applyMatrix4(R)
  const s = cp.scale ?? 1
  const center = new THREE.Vector3(...cp.position)
    .add(new THREE.Vector3(0, y, 0).addScaledVector(normal, t / 2 + PHONE_SCREEN_LIFT).multiplyScalar(s))
    .addScaledVector(normal, SCREEN_OFFSET)
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
  return { center: center.toArray() as V3, quaternion: [q.x, q.y, q.z, q.w], width: (w - PHONE_SCREEN_INSET_W) * s, height: (d - PHONE_SCREEN_INSET_D) * s }
}
export const BOARD_SURFACE_LIFT = 0.002

export function whiteboardScreenFrame(wp: WhiteboardProp): ScreenFrame {
  const x = room.bounds.halfWidth - wp.off - BOARD_SURFACE_LIFT - SCREEN_OFFSET
  const right = new THREE.Vector3(0, 0, 1)
  const up = new THREE.Vector3(0, 1, 0)
  const normal = new THREE.Vector3(-1, 0, 0)
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
  const [w, h] = wp.surface
  return {
    center: [x, wp.y, wp.x],
    quaternion: [q.x, q.y, q.z, q.w],
    width: w,
    height: h,
  }
}
