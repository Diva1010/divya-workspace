import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Glow } from './HotspotGlow'
import { isHovered } from './hotspotHover'
import { hitMaterial } from './hitProxy'
import { haloTexture } from './LampHalo'
import { CANDLE_HALO } from './lightingPresets'
import { useHotspot } from './useHotspot'
import { getCurrentRead, getReading, getTravel } from '../content'
import type { ObjectHotspot, Prop } from '../zones/types'


const SHELF_HIT = { x: [-3.86, -3.4], y: [0.05, 2.65], z: [-3.86, -1.46] }
const SHELF_GLOW = { x: -3.39, size: [2.4, 2.6] as [number, number], peak: 0.1, reach: 0.1 }
const SHELF_SPEC: ObjectHotspot = { contentKey: 'reading', pose: 'reading-shelf' }

export const BOOK_FOOTPRINT: [number, number] = [0.2075, 0.151]
const BOOK_HIT_PAD = 0.04
const BOOK_HIT_Y: [number, number] = [0.5, 0.62]

const DIARY_HIT: [number, number, number] = [0.34, 0.07, 0.26]
const DIARY_HIT_Y = 0.02
const DIARY_GLOW = { radius: 0.2, peak: 0.55, y: 0.03 }
const DIARY_SPEC: ObjectHotspot = { contentKey: 'travel', pose: 'travel-diary' }

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ShelfHitInner() {
  const handlers = useHotspot(SHELF_SPEC, { wall: 'left' })
  const [x, y, z] = [SHELF_HIT.x, SHELF_HIT.y, SHELF_HIT.z]
  return (
    <>
      <mesh material={hitMaterial} position={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]} {...handlers}>
        <boxGeometry args={[x[1] - x[0], y[1] - y[0], z[1] - z[0]]} />
      </mesh>
      <Glow group={SHELF_SPEC.pose} position={[SHELF_GLOW.x, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2]} rotation={[0, Math.PI / 2, 0]} size={SHELF_GLOW.size} wall="left" peak={SHELF_GLOW.peak} reach={SHELF_GLOW.reach} instant={reduced()} />
    </>
  )
}
export function ShelfHit() {
  return getReading() ? <ShelfHitInner /> : null
}

function BookHitInner({ prop }: { prop: Prop }) {
  const handlers = useHotspot(prop.hotspot!)
  const w = BOOK_FOOTPRINT[0] + 2 * BOOK_HIT_PAD
  const d = BOOK_FOOTPRINT[1] + 2 * BOOK_HIT_PAD
  const h = BOOK_HIT_Y[1] - BOOK_HIT_Y[0]
  return (
    <group position={[prop.position[0], 0, prop.position[2]]} rotation={[0, prop.rotationY, 0]}>
      <mesh material={hitMaterial} position={[0, (BOOK_HIT_Y[0] + BOOK_HIT_Y[1]) / 2, 0]} {...handlers}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
    </group>
  )
}
export function BookHit({ prop }: { prop: Prop }) {
  return getCurrentRead() ? <BookHitInner prop={prop} /> : null
}

function DiaryGlow() {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: haloTexture(), color: CANDLE_HALO.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true }), [])
  useEffect(() => () => mat.dispose(), [mat])
  const hv = useRef(0)
  useFrame((_, dtRaw) => {
    const target = isHovered(DIARY_SPEC.pose) ? 1 : 0
    hv.current = reduced() ? target : hv.current + (target - hv.current) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
    mat.opacity = hv.current * DIARY_GLOW.peak
  })
  return <sprite material={mat} position={[0, DIARY_GLOW.y, 0]} scale={[2 * DIARY_GLOW.radius, 2 * DIARY_GLOW.radius, 1]} raycast={() => null} />
}

function DiaryHitInner() {
  const handlers = useHotspot(DIARY_SPEC)
  return (
    <>
      <mesh material={hitMaterial} position={[0, DIARY_HIT_Y, 0]} {...handlers}>
        <boxGeometry args={DIARY_HIT} />
      </mesh>
      <DiaryGlow />
    </>
  )
}
export function DiaryHit() {
  return getTravel() ? <DiaryHitInner /> : null
}
