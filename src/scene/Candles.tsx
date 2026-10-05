import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { layoutBookcases, type BookcaseLayout } from './bookcaseBooks'
import { CASE, CASES, CLEAR, FAIRY, BACK_T, ORBS, ORB_PLACES, SURFACES } from './bookcaseLayout'
import { buildFairy, fairyObstacles, type FairyLayout } from './fairyStrings'
import plantData from './plantData.json'
import { expHover } from './ExperienceCards'
import { EXP, layoutJobs } from './experienceLayout'
import { RIGHT_LAMP, RIGHT_LAMP_HEAD } from './RightLamp'
import { FLAME_H, flameCentre, flameGeometry, type CandleSpec } from './candle'
import { BLOOM, BLOOM_ACTIVE, CANDLE_HALO, GLOW_BASE, bloomBoost, bloomScale } from './lightingPresets'
import { CANDLE, FLAME_COLOR, FLAME_EMISSIVE, STOOL, stoolPos } from './readingCorner'
import { runtime, wallFade } from './runtime'
import { THEMES } from './themes'
import { BLIND, BLIND_CX, BLIND_W, BLIND_Z, blindPose, smooth } from './blindDesign'
import { getState } from '../store/focus'
import { room } from '../zones/zone'

const CANDLE_HALOS = {
  bookcase: { radius: 0.13, peak: 0.7, color: '#FFC88A' },
  stool: { radius: 0.085, peak: 0.45, color: '#FFDDB0' },
}

let cached: BookcaseLayout | null = null
export const bookcaseLayout = (): BookcaseLayout => (cached ??= layoutBookcases(room.plants, CASES))

let cachedFairy: FairyLayout | null = null
export const fairyLayout = (): FairyLayout => (cachedFairy ??= buildFairy(fairyObstacles(room.plants, plantData)))

export function stoolCandle(): CandleSpec {
  const t = stoolPos()
  return { id: 'candle-stool', where: 'stool', level: -1, x: t.x + CANDLE.dx, y: STOOL.top, z: t.z + CANDLE.dz, radius: CANDLE.radius, height: CANDLE.height, saucer: true, seed: 7777 }
}

export function CandleFlames({ candles, wall = true }: { candles: CandleSpec[]; wall?: boolean }) {
  const geometry = useMemo(() => {
    const base = flameGeometry()
    const parts = candles.map((c) => {
      const [x, y, z] = flameCentre(c)
      return base.clone().translate(x, y - FLAME_H * 0.45, z)
    })
    base.dispose()
    const merged = mergeGeometries(parts)!
    parts.forEach((g) => g.dispose())
    return merged
  }, [candles])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: FLAME_COLOR, emissive: new THREE.Color(FLAME_EMISSIVE), emissiveIntensity: GLOW_BASE.flame, roughness: 0.6, metalness: 0, toneMapped: !BLOOM_ACTIVE }), [])
  useEffect(() => {
    if (wall) wallFade.left.add(material)
    return () => {
      if (wall) wallFade.left.delete(material)
      material.dispose()
      geometry.dispose()
    }
  }, [material, geometry, wall])
  useFrame(() => {
    material.emissiveIntensity = bloomBoost(GLOW_BASE.flame * runtime.env.glow, BLOOM.boostCandle)
  })
  return <mesh geometry={geometry} material={material} raycast={() => null} castShadow={false} receiveShadow={false} />
}

function glowAtlas(): THREE.CanvasTexture {
  const W = 256
  const H = 128
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const edge = Math.exp(-4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = x < 128 ? 0 : 1
      const r = Math.hypot(((x % 128) + 0.5) / 128 - 0.5, (y + 0.5) / 128 - 0.5) * 2
      let a = 0
      if (cell === 0) {
        const g = Math.max(0, (Math.exp(-4 * r * r) - edge) / (1 - edge))
        a = g * (r < 0.8 ? 1 : r >= 1 ? 0 : (1 - (r - 0.8) / 0.2) ** 2 * (1 + 2 * ((r - 0.8) / 0.2)))
      } else {
        const d = Math.abs(r - 0.85) / 0.1
        a = d >= 1 ? 0 : (1 - d * d) ** 2
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

const FLOOR_LAMP_GLOW = {
  haloRadius: 0.55, haloPeak: 0.45,
  poolRadius: 0.9, poolPeak: 0.14, poolY: 0.056, poolShift: 0.15,
  wallSize: 0.9, wallPeak: 0.16, wallX: -3.996,
  color: '#FFC878',
  ringPeak: 0.75,
}

const CASE_GLOW = {
  color: '#FFC88A',
  fairy: { radius: 0.06, peak: 0.4, color: '#FFE2B0' },
  orb: { radius: 0.16, peak: 0.55 },
  wash: { halfWidth: 0.45, peak: 0.22, lift: 0.003 },
}

const BACK_GLOW = {
  color: '#FFB070',
  wall: { x0: 0.14, x1: 0.95, y0: 1.7, y1: 3.9, z: -3.993, peak: 0.1 },
  sill: { x0: -2.95, x1: 0.35, z0: -4.0, z1: -3.7, y: 1.802, peak: 0.12 },
  rim: { peak: 0.06, edges: [
    { centre: [-1.3, 3.84, -3.858], rx: 1.3, ry: 0.04 }, { centre: [-1.3, 1.86, -3.858], rx: 1.3, ry: 0.04 },
    { centre: [-2.59, 2.85, -3.858], rx: 0.04, ry: 1.0 }, { centre: [-0.01, 2.85, -3.858], rx: 0.04, ry: 1.0 },
  ] },
  spill: { floor: { centre: [-1.3, 0.056, -2.75], rx: 1.3, rz: 1.1, peak: 0.12 }, desk: { centre: [-0.45, 1.205, -3.3], rx: 0.55, rz: 0.5, peak: 0.1 } },
  deskPool: { x: -0.58, y: 1.204, z: -3.5, radius: 0.5, peak: 0.12 },
}

type Quad = { cell: 0 | 1; kind: 'billboard' | 'flat'; centre: () => [number, number, number]; radius: number; ry?: number; right?: [number, number, number]; up?: [number, number, number]; strength: () => number; color: () => string }

export function CandleHalos() {
  const quads = useMemo(() => {
    const list: Quad[] = bookcaseLayout().candles.map((c) => ({ cell: 0, kind: 'billboard', centre: () => flameCentre(c), radius: CANDLE_HALOS.bookcase.radius, strength: () => bloomScale(CANDLE_HALOS.bookcase.peak * CANDLE_HALO.peak * runtime.env.candleHalo) * runtime.wallOp.left, color: () => CANDLE_HALOS.bookcase.color }))
    const sc = stoolCandle()
    list.push({ cell: 0, kind: 'billboard', centre: () => flameCentre(sc), radius: CANDLE_HALOS.stool.radius, strength: () => bloomScale(CANDLE_HALOS.stool.peak * CANDLE_HALO.peak * runtime.env.candleHalo), color: () => CANDLE_HALOS.stool.color })
    const lamp = room.props.find((p) => p.id === 'floor-lamp')
    if (lamp?.lamp) {
      const k = room.propScale * lamp.scale
      const G = FLOOR_LAMP_GLOW
      const [px, py, pz] = lamp.position
      const shade: [number, number, number] = [px + lamp.lamp.head[0] * k, py + lamp.lamp.head[1] * k, pz + lamp.lamp.head[2] * k]
      const lit = () => runtime.env.glow * runtime.floorLampLevel
      list.push({ cell: 0, kind: 'billboard', centre: () => shade, radius: G.haloRadius, strength: () => bloomScale(G.haloPeak * lit()), color: () => G.color })
      list.push({ cell: 0, kind: 'flat', centre: () => [px + G.poolShift, G.poolY, pz], radius: G.poolRadius, right: [0, 0, 1], up: [1, 0, 0], strength: () => bloomScale(G.poolPeak * lit()), color: () => G.color })
      list.push({ cell: 0, kind: 'flat', centre: () => [G.wallX, shade[1], pz], radius: G.wallSize / 2, right: [0, 0, -1], up: [0, 1, 0], strength: () => bloomScale(G.wallPeak * lit()) * runtime.wallOp.left, color: () => G.color })
      list.push({ cell: 1, kind: 'flat', centre: () => [px, G.poolY + 0.002, pz], radius: lamp.lamp.ring * 1.15, right: [0, 0, 1], up: [1, 0, 0], strength: () => G.ringPeak * runtime.floorLampHover, color: () => THEMES[getState().theme].accent })
    }
    const W = BACK_GLOW
    const wash = () => Math.max(0, Math.min(1, 1 - Math.abs(runtime.env.tone - 0.55) / 0.55)) * (1 - smooth(runtime.blind)) * runtime.wallOp.back
    list.push({ cell: 0, kind: 'flat', centre: () => [(W.wall.x0 + W.wall.x1) / 2, (W.wall.y0 + W.wall.y1) / 2, W.wall.z], radius: (W.wall.x1 - W.wall.x0) / 2, ry: (W.wall.y1 - W.wall.y0) / 2, right: [1, 0, 0], up: [0, 1, 0], strength: () => bloomScale(W.wall.peak * wash()), color: () => W.color })
    list.push({ cell: 0, kind: 'flat', centre: () => [(W.sill.x0 + W.sill.x1) / 2, W.sill.y, (W.sill.z0 + W.sill.z1) / 2], radius: (W.sill.x1 - W.sill.x0) / 2, ry: (W.sill.z1 - W.sill.z0) / 2, right: [1, 0, 0], up: [0, 0, 1], strength: () => bloomScale(W.sill.peak * wash()), color: () => W.color })
    for (const e of W.rim.edges) list.push({ cell: 0, kind: 'flat', centre: () => e.centre as [number, number, number], radius: e.rx, ry: e.ry, right: [1, 0, 0], up: [0, 1, 0], strength: () => bloomScale(W.rim.peak * wash()), color: () => W.color })
    list.push({ cell: 0, kind: 'flat', centre: () => [BLIND_CX, blindPose(smooth(runtime.blind)).railY, BLIND_Z + 0.03], radius: BLIND_W / 2 + 0.1, ry: 0.08, right: [1, 0, 0], up: [0, 1, 0], strength: () => BLIND.hoverPeak * runtime.blindHover * runtime.wallOp.back, color: () => THEMES[getState().theme].accent })
    list.push({ cell: 0, kind: 'flat', centre: () => [W.deskPool.x, W.deskPool.y, W.deskPool.z], radius: W.deskPool.radius, right: [1, 0, 0], up: [0, 0, 1], strength: () => bloomScale(W.deskPool.peak * runtime.env.glow * runtime.lampLevel), color: () => W.color })
    const rl = () => (runtime.env.rLampGlow / 2) * runtime.sideLampLevel
    list.push({ cell: 0, kind: 'billboard', centre: () => RIGHT_LAMP_HEAD, radius: 0.4, strength: () => bloomScale(0.4 * rl()), color: () => '#FFC890' })
    list.push({ cell: 0, kind: 'flat', centre: () => [3.994, RIGHT_LAMP_HEAD[1], RIGHT_LAMP.z], radius: 0.7, ry: 0.8, right: [0, 0, 1], up: [0, 1, 0], strength: () => bloomScale(0.2 * rl()) * runtime.wallOp.right, color: () => '#FFC890' })
    list.push({ cell: 0, kind: 'flat', centre: () => [RIGHT_LAMP.x - 0.1, 0.056, RIGHT_LAMP.z], radius: 0.8, right: [0, 0, 1], up: [1, 0, 0], strength: () => bloomScale(0.14 * rl()), color: () => '#FFC890' })
    list.push({ cell: 1, kind: 'flat', centre: () => [RIGHT_LAMP.x, 0.058, RIGHT_LAMP.z], radius: 0.3 * 1.15, right: [0, 0, 1], up: [1, 0, 0], strength: () => 0.75 * runtime.sideLampHover, color: () => THEMES[getState().theme].accent })
    const tl = () => 0.4 + 0.6 * Math.min(1, runtime.env.tone / 0.55)
    const TL = layoutJobs()
    for (const [i, k] of TL.jobs.entries()) {
      list.push({ cell: 0, kind: 'flat', centre: () => [k.x, k.y + 0.17, EXP.z + 0.012], radius: 0.13, ry: 0.15, right: [1, 0, 0], up: [0, 1, 0], strength: () => bloomScale(0.28 * tl() * (1 + 0.1 * expHover.unit + 0.3 * (expHover.level[i] ?? 0))) * runtime.wallOp.back, color: () => '#FFC37A' })
      list.push({ cell: 0, kind: 'flat', centre: () => [k.x, k.y, EXP.z - 0.002], radius: k.d / 2 + 0.1, right: [1, 0, 0], up: [0, 1, 0], strength: () => bloomScale(0.22 * tl() * (1 + 0.3 * expHover.unit)) * runtime.wallOp.back, color: () => '#FFD9A0' })
      list.push({ cell: 0, kind: 'flat', centre: () => [k.x, k.y - k.d / 2 - EXP.labelDy - 0.17, EXP.z + 0.03], radius: TL.cardW * 0.62, ry: 0.2, right: [1, 0, 0], up: [0, 1, 0], strength: () => bloomScale(0.01 * expHover.unit + 0.03 * (expHover.level[i] ?? 0)) * runtime.wallOp.back, color: () => '#F6EAF4' })
    }
    const rowHalf = ((TL.jobs.length - 1) * TL.gap) / 2 + TL.cardW / 2 + 0.15
    list.push({ cell: 0, kind: 'flat', centre: () => [TL.cx, 2.95, EXP.z - 0.012], radius: rowHalf * 1.25, ry: 0.85, right: [1, 0, 0], up: [0, 1, 0], strength: () => bloomScale(0.14 * expHover.unit) * runtime.wallOp.back, color: () => '#FFD9A0' })
    for (const sp of [W.spill.floor, W.spill.desk]) list.push({ cell: 0, kind: 'flat', centre: () => sp.centre as [number, number, number], radius: sp.rx, ry: sp.rz, right: [1, 0, 0], up: [0, 0, 1], strength: () => bloomScale(sp.peak * wash()), color: () => W.color })
    const G = CASE_GLOW
    const lit = () => runtime.env.glow * runtime.wallOp.left
    fairyLayout().bulbs.filter((_, i) => i % FAIRY.glowEvery === 0).slice(0, FAIRY.maxHalos).forEach((p) => {
      list.push({ cell: 0, kind: 'billboard', centre: () => [p[0], p[1], p[2]], radius: G.fairy.radius, strength: () => bloomScale(G.fairy.peak * lit()), color: () => G.fairy.color })
    })
    for (const o of ORB_PLACES) list.push({ cell: 0, kind: 'billboard', centre: () => [o.x, o.y + ORBS.baseHeight + ORBS.radius * 0.85, o.z], radius: G.orb.radius, strength: () => bloomScale(G.orb.peak * lit()), color: () => G.color })
    const washes = [...bookcaseLayout().candles.filter((c) => c.level >= 0).map((c) => ({ level: c.level, z: c.z })), ...ORB_PLACES.filter((o) => o.level >= 0).map((o) => ({ level: o.level, z: o.z }))]
    for (const w of washes) list.push({ cell: 0, kind: 'flat', centre: () => [CASE.xBack + BACK_T + G.wash.lift, SURFACES[w.level] + CLEAR / 2, w.z], radius: G.wash.halfWidth, ry: CLEAR / 2, right: [0, 0, 1], up: [0, 1, 0], strength: () => bloomScale(G.wash.peak * lit()), color: () => G.color })
    return list
  }, [])
  const { geometry, material } = useMemo(() => {
    const n = quads.length
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 12), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 12), 3).setUsage(THREE.DynamicDrawUsage))
    const uv: number[] = []
    const idx: number[] = []
    quads.forEach((q, i) => {
      const u0 = q.cell * 0.5 + 0.004
      const u1 = q.cell * 0.5 + 0.5 - 0.004
      uv.push(u0, 0, u1, 0, u1, 1, u0, 1)
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3)
    })
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setIndex(idx)
    const material = new THREE.MeshBasicMaterial({ map: glowAtlas(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    return { geometry: g, material }
  }, [quads])
  useEffect(() => () => { geometry.dispose(); material.dispose(); material.map?.dispose() }, [geometry, material])
  const tmp = useMemo(() => ({ right: new THREE.Vector3(), up: new THREE.Vector3(), col: new THREE.Color() }), [])
  useFrame(({ camera }) => {
    const e = camera.matrixWorld.elements
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    const col = geometry.getAttribute('color') as THREE.BufferAttribute
    quads.forEach((q, i) => {
      const [x, y, z] = q.centre()
      if (q.kind === 'billboard') {
        tmp.right.set(e[0], e[1], e[2])
        tmp.up.set(e[4], e[5], e[6])
      } else {
        tmp.right.set(...(q.right as [number, number, number]))
        tmp.up.set(...(q.up as [number, number, number]))
      }
      tmp.col.set(q.color()).multiplyScalar(q.strength())
      ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], j) => {
        const rx = q.radius
        const ry = q.ry ?? q.radius
        pos.setXYZ(i * 4 + j, x + tmp.right.x * sx * rx + tmp.up.x * sy * ry, y + tmp.right.y * sx * rx + tmp.up.y * sy * ry, z + tmp.right.z * sx * rx + tmp.up.z * sy * ry)
        col.setXYZ(i * 4 + j, tmp.col.r, tmp.col.g, tmp.col.b)
      })
    })
    pos.needsUpdate = true
    col.needsUpdate = true
  })
  return <mesh geometry={geometry} material={material} frustumCulled={false} raycast={() => null} castShadow={false} receiveShadow={false} />
}

