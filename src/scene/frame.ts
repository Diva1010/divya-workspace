import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const WALNUT = '#5B3A24'
export const LIGHT_OAK = '#C8A272'
export const GOLD = '#C9A24D'
export const MAT_CREAM = '#F3EAD3'
const GOLD_ROUGHNESS = 0.5
const GOLD_EMISSIVE = 0.04
const FRAME_ROUGHNESS = 0.85
const STANDING_TILT_DEG = 8

export interface FrameOptions {
  width: number
  height: number
  border: number
  depth: number
  color: string
  liner?: number
  linerColor?: string
  matColor?: string
  standing?: boolean
  strutReach?: number
}

export interface Frame {
  geometry: THREE.BufferGeometry
  opening: { w: number; h: number }
  artMatrix: THREE.Matrix4
  triangles: number
}

type P2 = [number, number]

export function paint(g: THREE.BufferGeometry, hex: string, gold = 0) {
  const n = g.attributes.position.count
  const c = new THREE.Color(hex)
  const colors = new Float32Array(n * 3)
  const flag = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    colors.set([c.r, c.g, c.b], i * 3)
    flag[i] = gold
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.setAttribute('aGold', new THREE.BufferAttribute(flag, 1))
  return g
}

function loft(w: number, h: number, profile: P2[], closed: boolean): THREE.BufferGeometry {
  const ring = ([u, v]: P2) => [
    [-w / 2 + u, -h / 2 + u, v],
    [w / 2 - u, -h / 2 + u, v],
    [w / 2 - u, h / 2 - u, v],
    [-w / 2 + u, h / 2 - u, v],
  ]
  const pos: number[] = []
  const n = closed ? profile.length : profile.length - 1
  for (let i = 0; i < n; i++) {
    const a = ring(profile[i])
    const b = ring(profile[(i + 1) % profile.length])
    for (let s = 0; s < 4; s++) {
      const A = a[s], B = a[(s + 1) % 4], C = b[(s + 1) % 4], D = b[s]
      pos.push(...A, ...B, ...C, ...A, ...C, ...D)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

export function makeFrame(o: FrameOptions): Frame {
  const { width: W, height: H, border: b, depth: d } = o
  const bv = Math.min(b * 0.3, 0.008)
  const profile: P2[] = [[0, 0], [0, d * 0.78], [bv, d], [b * 0.7, d], [b, d * 0.58], [b, 0]]
  const parts: THREE.BufferGeometry[] = [paint(loft(W, H, profile, true), o.color, o.color === GOLD ? 1 : 0) ]
  const L = o.liner ?? 0
  if (L > 0) parts.push(paint(loft(W, H, [[b, d * 0.5], [b + L, d * 0.5], [b + L, d * 0.1]], false), o.linerColor ?? GOLD, 1))
  const inner = b + L
  const opening = { w: W - 2 * inner, h: H - 2 * inner }
  const matZ = d * 0.1
  if (o.matColor) {
    const m = new THREE.PlaneGeometry(opening.w, opening.h).toNonIndexed()
    m.deleteAttribute('uv')
    m.translate(0, 0, matZ)
    parts.push(paint(m, o.matColor, 0))
  }
  const artZ = matZ + 0.001
  let artMatrix = new THREE.Matrix4().makeTranslation(0, 0, artZ)
  if (o.standing) {
    const lift = new THREE.Matrix4().makeTranslation(0, H / 2, 0)
    const tilt = new THREE.Matrix4().makeRotationX(-(STANDING_TILT_DEG * Math.PI) / 180)
    const to = tilt.clone().multiply(lift)
    parts.forEach((g) => g.applyMatrix4(to))
    artMatrix = to.clone().multiply(artMatrix)
    const top = new THREE.Vector3(0, H * 0.6, 0.002).applyMatrix4(tilt)
    const foot = new THREE.Vector3(0, 0.003, -(o.strutReach ?? 0.16))
    const dir = foot.clone().sub(top)
    const len = dir.length()
    const strut = new THREE.BoxGeometry(0.022, len, 0.009).toNonIndexed()
    strut.deleteAttribute('uv')
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    strut.applyMatrix4(new THREE.Matrix4().compose(top.clone().add(foot).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)))
    parts.push(paint(strut, o.color, 0))
  }
  const geometry = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return { geometry, opening, artMatrix, triangles: geometry.attributes.position.count / 3 }
}

export function fitArt(opening: { w: number; h: number }, aspect: number, minMat: number): { w: number; h: number } {
  const mw = opening.w - 2 * minMat
  const mh = opening.h - 2 * minMat
  return mw / mh > aspect ? { w: mh * aspect, h: mh } : { w: mw, h: mw / aspect }
}

export function frameMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: FRAME_ROUGHNESS, metalness: 0 })
  const em = new THREE.Color(GOLD).multiplyScalar(GOLD_EMISSIVE)
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGold;\nvarying float vGold;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGold = aGold;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGold;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, ${GOLD_ROUGHNESS.toFixed(3)}, vGold);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(${em.r.toFixed(5)}, ${em.g.toFixed(5)}, ${em.b.toFixed(5)}) * vGold;`)
  }
  m.customProgramCacheKey = () => 'frame-gold-v1'
  return m
}
