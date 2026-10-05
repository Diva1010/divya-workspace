import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from './runtime'
import { smooth } from './blindDesign'

const SUN_ELEVATION_DEG = 50
const SUN_SHIFT_X = 0.5
const SUN_GONE_TONE = 0.3
const SUN = {
  color: '#FFD9A0',
  floor: 0.3,
  desk: 0.26,
  shaft: 0.07,
  floorY: 0.058,
  deskY: 1.206,
}
const WIN = { x0: -2.6, x1: 0, yBottom: 1.85, yTop: 3.85, z: -3.93 }
const DESK = { x0: -0.87, x1: 3.27, z0: -3.98, z1: -2.26 }

function atlas(): THREE.CanvasTexture {
  const W = 256, H = 128
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const edge = (t: number, a: number, b: number, soft: number) => Math.min(1, Math.max(0, (t - a) / soft)) * Math.min(1, Math.max(0, (b - t) / soft))
  const sm = (k: number) => k * k * (3 - 2 * k)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let a = 0
      if (x < 128) {
        const u = (x + 0.5) / 128, v = (y + 0.5) / 128
        const cu = Math.max(sm(edge(u, 0.03, 0.47, 0.05)), sm(edge(u, 0.53, 0.97, 0.05)))
        const cvv = Math.max(sm(edge(v, 0.03, 0.47, 0.05)), sm(edge(v, 0.53, 0.97, 0.05)))
        a = cu * cvv
      } else {
        const u = (x - 128 + 0.5) / 128, v = (y + 0.5) / 128
        a = sm(Math.sin(Math.PI * u)) * (1 - sm(v))
      }
      const i = (y * W + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = Math.round(255 * a)
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function projection(y: number) {
  const k = 1 / Math.tan((SUN_ELEVATION_DEG * Math.PI) / 180)
  return { x0: WIN.x0 + SUN_SHIFT_X, x1: WIN.x1 + SUN_SHIFT_X, zNear: WIN.z + (WIN.yBottom - y) * k, zFar: WIN.z + (WIN.yTop - y) * k }
}

function build() {
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = []
  const c = new THREE.Color(SUN.color)
  const quad = (p: [number, number, number][], u: [number, number][], strength: number) => {
    const f = pos.length / 3
    p.forEach((q, i) => { pos.push(...q); uv.push(...u[i]); col.push(c.r * strength, c.g * strength, c.b * strength) })
    idx.push(f, f + 1, f + 2, f, f + 2, f + 3)
  }
  const patch = (y: number, crop: { x0: number; x1: number; z0: number; z1: number }, strength: number) => {
    const P = projection(y)
    const x0 = Math.max(P.x0, crop.x0), x1 = Math.min(P.x1, crop.x1), z0 = Math.max(P.zNear, crop.z0), z1 = Math.min(P.zFar, crop.z1)
    if (x1 <= x0 || z1 <= z0) return
    const U = (x: number) => 0.5 * ((x - P.x0) / (P.x1 - P.x0))
    const V = (z: number) => (z - P.zNear) / (P.zFar - P.zNear)
    quad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [[U(x0), V(z1)], [U(x1), V(z1)], [U(x1), V(z0)], [U(x0), V(z0)]], strength)
  }
  patch(SUN.floorY, { x0: -10, x1: 10, z0: -10, z1: 10 }, SUN.floor)
  patch(SUN.deskY, DESK, SUN.desk)
  const k = 1 / Math.tan((SUN_ELEVATION_DEG * Math.PI) / 180)
  for (const [xa, xb] of [[-2.3, -1.95], [-1.45, -1.1], [-0.75, -0.45]]) {
    const dz = (WIN.yTop - 0.4) * k, dx = SUN_SHIFT_X
    quad([[xa, WIN.yTop - 0.05, WIN.z], [xb, WIN.yTop - 0.05, WIN.z], [xb + dx, 0.4, WIN.z + dz], [xa + dx, 0.4, WIN.z + dz]], [[0.5, 1], [1, 1], [1, 0], [0.5, 0]], SUN.shaft)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

export function SunLight() {
  const geometry = useMemo(build, [])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: atlas(), vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), [])
  useEffect(() => () => { geometry.dispose(); material.map?.dispose(); material.dispose() }, [geometry, material])
  useFrame(() => {
    const day = Math.max(0, 1 - runtime.env.tone / SUN_GONE_TONE)
    material.opacity = day * day * (3 - 2 * day) * (1 - smooth(runtime.blind)) * runtime.wallOp.back
  })
  return <mesh geometry={geometry} material={material} frustumCulled={false} raycast={() => null} castShadow={false} receiveShadow={false} />
}
