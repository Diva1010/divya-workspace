import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { tint } from './vcolor'
import { WOOD } from './woodPalette'
import { GLOW_BASE } from './lightingPresets'
import { runtime, wallFade } from './runtime'
import type { V3 } from '../zones/types'

const EGG = {
  height: 0.16,
  radius: 0.058,
  taper: 0.22,
  rings: 9,
  around: 12,
  scaleRows: 6,
  scaleCols: 10,
  scaleVariation: 0.3,
  bottom: '#2BB8A8',
  top: '#8A55D9',
  emissive: '#6A4BC8',
  emissiveIntensity: GLOW_BASE.egg,
  stand: { radius: 0.055, height: 0.028, color: WOOD.deskInset, ring: WOOD.pegboard, ringHeight: 0.008 },
}

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function eggGeometry(): THREE.BufferGeometry {
  const e = EGG
  const sphere = new THREE.SphereGeometry(1, e.around, e.rings)
  const p = sphere.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const k = e.radius * (1 - e.taper * Math.max(0, y) * 0.5)
    p.setXYZ(i, p.getX(i) * k, y * (e.height / 2), p.getZ(i) * k)
  }
  const g = sphere.toNonIndexed()
  sphere.dispose()
  g.deleteAttribute('uv')
  g.computeVertexNormals()
  const pos = g.attributes.position
  const bottom = new THREE.Color(e.bottom)
  const top = new THREE.Color(e.top)
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let t = 0; t < pos.count; t += 3) {
    let x = 0, y = 0, z = 0
    for (let j = 0; j < 3; j++) { x += pos.getX(t + j) / 3; y += pos.getY(t + j) / 3; z += pos.getZ(t + j) / 3 }
    const v = Math.min(1, Math.max(0, (y + e.height / 2) / e.height))
    const row = Math.min(e.scaleRows - 1, Math.floor(v * e.scaleRows))
    const ang = (Math.atan2(z, x) / (2 * Math.PI) + 1) % 1
    const col = Math.floor(ang * e.scaleCols + (row % 2) * 0.5) % e.scaleCols
    c.copy(bottom).lerp(top, v).multiplyScalar(1 - e.scaleVariation / 2 + e.scaleVariation * hash(row, col))
    for (let j = 0; j < 3; j++) colors.set([c.r, c.g, c.b], (t + j) * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

function standGeometry(): THREE.BufferGeometry {
  const s = EGG.stand
  const base = new THREE.CylinderGeometry(s.radius * 0.9, s.radius, s.height, 10).toNonIndexed()
  base.translate(0, s.height / 2, 0)
  const ring = new THREE.CylinderGeometry(s.radius * 0.78, s.radius * 0.78, s.ringHeight, 10).toNonIndexed()
  ring.translate(0, s.height + s.ringHeight / 2, 0)
  const parts = [tint(base, s.color), tint(ring, s.ring)]
  for (const g of parts) g.deleteAttribute('uv')
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

export function DragonEgg({ position }: { position: V3 }) {
  const egg = useMemo(eggGeometry, [])
  const stand = useMemo(standGeometry, [])
  const eggMat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05, emissive: new THREE.Color(EGG.emissive), emissiveIntensity: EGG.emissiveIntensity }),
    [],
  )
  const standMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), [])
  useEffect(() => {
    wallFade.left.add(eggMat)
    wallFade.left.add(standMat)
    return () => {
      wallFade.left.delete(eggMat)
      wallFade.left.delete(standMat)
      eggMat.dispose(); standMat.dispose(); egg.dispose(); stand.dispose()
    }
  }, [eggMat, standMat, egg, stand])
  useFrame(() => {
    eggMat.emissiveIntensity = EGG.emissiveIntensity * runtime.env.glow
  })
  const lift = EGG.stand.height + EGG.stand.ringHeight
  return (
    <group position={position}>
      <mesh geometry={stand} material={standMat} castShadow receiveShadow />
      <mesh geometry={egg} material={eggMat} position={[0, lift + EGG.height / 2 - 0.012, 0]} castShadow receiveShadow />
    </group>
  )
}
