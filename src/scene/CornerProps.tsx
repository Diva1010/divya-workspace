import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BOOK_SEG } from './Books'
import { slab } from './geometry'
import { candleBody } from './candle'
import { CandleFlames, CandleHalos, stoolCandle } from './Candles'
import { CANDLE, DIARY, FLOOR_Y, STOOL, beanSurface, stoolPos } from './readingCorner'
import { tint } from './vcolor'
import { DiaryHit } from './ReadingHits'

function diaryGeometry(): THREE.BufferGeometry {
  const D = DIARY
  const parts: THREE.BufferGeometry[] = []
  const add = (g: THREE.BufferGeometry, x: number, y: number, z: number, hex: string) => {
    g.translate(x, y, z)
    parts.push(tint(g, hex))
  }
  const sl = (w: number, d: number, h: number, r: number, b: number) => slab(w, d, h, r, b, BOOK_SEG).clone()
  add(sl(D.w, D.d, 0.008, 0.012, 0.003), 0, 0, 0, D.cover)
  add(sl(D.w - 0.022, D.d - 0.014, 0.024, 0.006, 0.002), 0.004, 0.008, 0, D.pages)
  add(sl(D.w, D.d, 0.008, 0.012, 0.003), 0, D.t - 0.008, 0, D.cover)
  add(sl(0.016, D.d, D.t, 0.01, 0.004), -D.w / 2 + 0.008, 0, 0, D.cover)
  add(new THREE.BoxGeometry(0.012, 0.002, 0.07).toNonIndexed(), 0.03, 0.022, D.d / 2 + 0.018, D.ribbon)
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.002, 10).toNonIndexed(), 0.04, D.t + 0.001, -0.045, D.sticker)
  add(new THREE.BoxGeometry(0.03, 0.0015, 0.005).toNonIndexed(), 0.04, D.t + 0.0028, -0.045, D.stickerInk)
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

function TravelDiary() {
  const geometry = useMemo(diaryGeometry, [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  const s = useMemo(() => beanSurface(DIARY.azimuth, DIARY.offset), [])
  const quat = useMemo(
    () => s.quat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), DIARY.spin)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), DIARY.tilt)),
    [s],
  )
  const pos: [number, number, number] = [s.pos[0] - s.normal[0] * DIARY.sink, s.pos[1] - s.normal[1] * DIARY.sink, s.pos[2] - s.normal[2] * DIARY.sink]
  return (
    <group position={pos} quaternion={quat} scale={DIARY.scale}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <DiaryHit />
    </group>
  )
}

function stoolGeometry(): THREE.BufferGeometry {
  const S = STOOL
  const e = S.edge
  const R = S.radius
  const T = S.thickness
  const profile = [[0, 0], [R - e, 0], [R - e * 0.3, e * 0.3], [R, e], [R, T - e], [R - e * 0.3, T - e * 0.3], [R - e, T], [0, T]].map(([x, y]) => new THREE.Vector2(x, y))
  const top = new THREE.LatheGeometry(profile, 24).toNonIndexed()
  top.translate(0, S.top - T, 0)
  const topCol = new THREE.Color(S.topColor)
  const rimCol = new THREE.Color(S.rimColor)
  const underCol = rimCol
  const p = top.attributes.position
  const colors = new Float32Array(p.count * 3)
  for (let k = 0; k < p.count; k++) {
    const r = Math.hypot(p.getX(k), p.getZ(k))
    const y = p.getY(k) - (S.top - T)
    const c = r > R - e * 1.1 ? rimCol : y > T * 0.5 ? topCol : underCol
    colors.set([c.r, c.g, c.b], k * 3)
  }
  top.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const A = S.apron
  const apronY = S.top - T - A.height
  const apron = new THREE.LatheGeometry([[A.inner, 0], [A.outer, 0], [A.outer, A.height], [A.inner, A.height]].map(([x, y]) => new THREE.Vector2(x, y)), 24).toNonIndexed()
  apron.translate(0, apronY, 0)
  const parts = [top, tint(apron, A.color), candleBody({ ...stoolCandle(), x: CANDLE.dx, z: CANDLE.dz })]
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < 3; i++) {
    const a = S.legTurn + (i * 2 * Math.PI) / 3
    const hi = new THREE.Vector3(Math.cos(a) * S.legRadius, apronY + A.height * 0.6, Math.sin(a) * S.legRadius)
    const lo = new THREE.Vector3(Math.cos(a) * (S.legRadius + S.splay), FLOOR_Y, Math.sin(a) * (S.legRadius + S.splay))
    const dir = hi.clone().sub(lo)
    const leg = new THREE.CylinderGeometry(S.legTop, S.legBottom, dir.length(), 8).toNonIndexed()
    leg.applyMatrix4(new THREE.Matrix4().compose(hi.clone().add(lo).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()), new THREE.Vector3(1, 1, 1)))
    parts.push(tint(leg, S.legColor))
  }
  for (const g of parts) if (g.attributes.uv) g.deleteAttribute('uv')
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

function Stool() {
  const geometry = useMemo(stoolGeometry, [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  const p = stoolPos()
  return <mesh geometry={geometry} material={material} position={[p.x, 0, p.z]} castShadow receiveShadow />
}

const flameList = [stoolCandle()]

export function CornerProps() {
  return (
    <group>
      <TravelDiary />
      <Stool />
      <CandleFlames candles={flameList} wall={false} />
      <CandleHalos />
    </group>
  )
}
