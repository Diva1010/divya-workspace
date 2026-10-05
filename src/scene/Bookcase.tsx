import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { WOOD } from './woodPalette'
import { BOOK_SEG, toneFor } from './Books'
import { makeBook } from './bookGen'
import type { CaseLayout } from './bookcaseBooks'
import { candleBody, type CandleSpec } from './candle'
import { CandleFlames, bookcaseLayout, fairyLayout } from './Candles'
import { CASE, CASES, EGG_PLACE, FAIRY, BACK_T, BOARD_T, KICK_INSET, ORBS, ORB_PLACES, PLINTH_H, SIDE_T, SURFACES, TOP_T, type CaseSpec } from './bookcaseLayout'
import { Decal, useDecalMaterial } from './Decals'
import { DragonEgg } from './DragonEgg'
import { panel, slab } from './geometry'
import { BLOOM, BLOOM_ACTIVE, bloomBoost } from './lightingPresets'
import { GLOBE } from './leftWall'
import { ambient } from './ambient'
import { runtime, wallFade } from './runtime'
import { color, paint } from './Shelves'
import { SECTION_ICON } from '../icons'
import { ShelfHit } from './ReadingHits'

function shellGeometry(c: CaseSpec): THREE.BufferGeometry {
  const { xBack, xFront, floor, height } = CASE
  const face = color(WOOD.caseShell)
  const edge = color(WOOD.caseShell, 0.05)
  const boardFace = color(WOOD.boards)
  const boardEdge = color(WOOD.boards, 0.05)
  const D = xFront - xBack
  const W = c.zMax - c.zMin
  const inner = W - 2 * SIDE_T
  const cx = (xBack + xFront) / 2
  const zc = (c.zMin + c.zMax) / 2
  const parts: THREE.BufferGeometry[] = []
  const put = (base: THREE.BufferGeometry, x: number, y: number, z: number, turn = false, board = false) => {
    const g = base.clone()
    if (turn) g.rotateY(Math.PI / 2)
    g.translate(x, y, z)
    parts.push(board ? paint(g, boardFace, boardEdge) : paint(g, face, edge))
  }
  for (const z of [c.zMin + SIDE_T / 2, c.zMax - SIDE_T / 2]) put(panel(D, height, SIDE_T, 0.012, 0.006, BOOK_SEG), cx, floor + height / 2, z)
  const backH = height - PLINTH_H - TOP_T
  put(panel(inner, backH, BACK_T, 0.012, 0.006, BOOK_SEG), xBack + BACK_T / 2, floor + PLINTH_H + backH / 2, zc, true)
  put(slab(D, W, TOP_T, 0.012, 0.01, BOOK_SEG), cx, floor + height - TOP_T, zc)
  SURFACES.forEach((s) => put(slab(D - BACK_T, inner, BOARD_T, 0.012, 0.01, BOOK_SEG), xBack + BACK_T + (D - BACK_T) / 2, s - BOARD_T, zc, false, true))
  put(panel(inner, PLINTH_H, 0.02, 0.012, 0.006, BOOK_SEG), xFront - KICK_INSET - 0.01, floor + PLINTH_H / 2, zc, true)
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

function CaseView({ spec, material, icon, layout, candles }: { spec: CaseSpec; material: THREE.Material; icon: (typeof SECTION_ICON)[keyof typeof SECTION_ICON]; layout: CaseLayout; candles: CandleSpec[] }) {
  const geometry = useMemo(() => {
    const shell = shellGeometry(spec)
    shell.deleteAttribute('uv')
    const parts = [shell, ...layout.items.map((it) => makeBook(it.params).geometry.applyMatrix4(it.matrix)), ...candles.map(candleBody)]
    const merged = mergeGeometries(parts)!
    parts.forEach((g) => g.dispose())
    return merged
  }, [spec, layout, candles])
  useEffect(() => () => geometry.dispose(), [geometry])
  const icons = useMemo(() => layout.items.filter((it) => it.icon), [layout])
  const dark = useDecalMaterial(icon, 'dark', 'left')
  const light = useDecalMaterial(icon, 'light', 'left')
  return (
    <group>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {icons.map((it, i) => (
        <Decal key={i} material={toneFor(it.icon!.band) === 'dark' ? dark : light} size={it.icon!.size} position={it.icon!.position} rotation={[0, Math.PI / 2, 0]} />
      ))}
      {spec.zMin <= EGG_PLACE.z && EGG_PLACE.z <= spec.zMax && <DragonEgg position={[EGG_PLACE.x, EGG_PLACE.y, EGG_PLACE.z]} />}
    </group>
  )
}

function FairyLights() {
  const { wire, beads } = useMemo(() => {
    const L = fairyLayout()
    const tubes = L.segments.map((s) => {
      const keep = s.pts.filter((_, i) => i % 2 === 0 || i === s.pts.length - 1)
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(keep.map((p) => new THREE.Vector3(...p)), false, 'centripetal'), Math.max(2, keep.length - 1), FAIRY.wireRadius, 3, false)
    })
    const wire = mergeGeometries(tubes)!
    tubes.forEach((g) => g.dispose())
    const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(FAIRY.beadRadius, 0), undefined, L.bulbs.length)
    const m = new THREE.Matrix4()
    L.bulbs.forEach((p, i) => beads.setMatrixAt(i, m.makeTranslation(p[0], p[1], p[2])))
    beads.instanceMatrix.needsUpdate = true
    return { wire, beads }
  }, [])
  const wireMat = useMemo(() => new THREE.MeshBasicMaterial({ color: FAIRY.wire, transparent: true, opacity: FAIRY.wireOpacity, depthWrite: false }), [])
  const beadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: FAIRY.color, roughness: 0.5, metalness: 0, emissive: new THREE.Color(FAIRY.emissive), emissiveIntensity: FAIRY.glowDay, toneMapped: !BLOOM_ACTIVE }), [])
  useEffect(() => {
    beads.material = beadMat
    wallFade.left.add(beadMat)
    return () => {
      wallFade.left.delete(beadMat)
      wireMat.dispose(); beadMat.dispose(); wire.dispose(); beads.geometry.dispose(); beads.dispose()
    }
  }, [wireMat, beadMat, wire, beads])
  useFrame(() => {
    const t = runtime.env.tone
    const glow = t <= 0.55 ? FAIRY.glowDay + ((FAIRY.glowDusk - FAIRY.glowDay) * t) / 0.55 : FAIRY.glowDusk + ((FAIRY.glowNight - FAIRY.glowDusk) * (t - 0.55)) / 0.45
    beadMat.emissiveIntensity = bloomBoost(glow, BLOOM.boostBeads) * ambient.fairy
    wireMat.opacity = FAIRY.wireOpacity * runtime.wallOp.left
  })
  return (
    <>
      <mesh geometry={wire} material={wireMat} raycast={() => null} />
      <primitive object={beads} raycast={() => null} frustumCulled={false} />
      
    </>
  )
}

function Orbs() {
  const { spheres, bases } = useMemo(() => {
    const sp: THREE.BufferGeometry[] = []
    const bs: THREE.BufferGeometry[] = []
    const base = new THREE.Color(GLOBE.baseColor)
    for (const o of ORB_PLACES) {
      const s = new THREE.SphereGeometry(ORBS.radius, 16, 12)
      s.translate(o.x, o.y + ORBS.baseHeight + ORBS.radius * 0.85, o.z)
      sp.push(s)
      const b = new THREE.CylinderGeometry(ORBS.baseRadius * 0.8, ORBS.baseRadius, ORBS.baseHeight, 12)
      b.translate(o.x, o.y + ORBS.baseHeight / 2, o.z)
      b.setAttribute('color', new THREE.BufferAttribute(new Float32Array(b.attributes.position.count * 3).map((_, i) => [base.r, base.g, base.b][i % 3]), 3))
      b.deleteAttribute('uv')
      bs.push(b)
    }
    const spheres = mergeGeometries(sp.map((g) => (g.deleteAttribute('uv'), g)))!
    const bases = mergeGeometries(bs)!
    sp.forEach((g) => g.dispose()); bs.forEach((g) => g.dispose())
    return { spheres, bases }
  }, [])
  const sphereMat = useMemo(() => new THREE.MeshStandardMaterial({ color: GLOBE.tint, emissive: new THREE.Color(GLOBE.color), emissiveIntensity: 0, roughness: 0.55, metalness: 0, toneMapped: !BLOOM_ACTIVE }), [])
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 }), [])
  useEffect(() => {
    wallFade.left.add(sphereMat)
    wallFade.left.add(baseMat)
    return () => {
      wallFade.left.delete(sphereMat)
      wallFade.left.delete(baseMat)
      sphereMat.dispose(); baseMat.dispose(); spheres.dispose(); bases.dispose()
    }
  }, [sphereMat, baseMat, spheres, bases])
  useFrame(() => {
    sphereMat.emissiveIntensity = bloomBoost(GLOBE.glow * runtime.env.glow, BLOOM.boostCandle)
  })
  return (
    <>
      <mesh geometry={spheres} material={sphereMat} raycast={() => null} />
      <mesh geometry={bases} material={baseMat} raycast={() => null} receiveShadow />
    </>
  )
}

const CASE_ICONS = [SECTION_ICON.projects, SECTION_ICON.skills]

export function Bookcase() {
  const layout = bookcaseLayout()
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }), [])
  useEffect(() => {
    wallFade.left.add(material)
    return () => {
      wallFade.left.delete(material)
      material.dispose()
    }
  }, [material])
  return (
    <group>
      {CASES.map((c, i) => (
        <CaseView key={c.id} spec={c} material={material} icon={CASE_ICONS[i % CASE_ICONS.length]} layout={layout.cases[c.id]} candles={layout.candles.filter((k) => k.where === c.id)} />
      ))}
      <FairyLights />
      <Orbs />
      <CandleFlames candles={layout.candles} />
      <ShelfHit />
    </group>
  )
}
