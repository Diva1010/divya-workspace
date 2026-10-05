import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { makeClickHandlers } from './clickRule'
import { hitMaterial } from './hitProxy'
import { BLOOM, BLOOM_ACTIVE, bloomBoost } from './lightingPresets'
import { runtime } from './runtime'
import { getState, toggleSideLamp } from '../store/focus'

export const RIGHT_LAMP = {
  x: 3.5, z: -3.1, y: 0.05,
  shadeCentre: 2.28,
  shadeRadius: 0.165, shadeHeight: 0.34,
  poleScale: 0.5,
  body: '#CDB8E8',
  shade: '#FFF1D6',
  glow: '#FFD9A0',
}
const PACK = { headY: 2.15, headRadius: 0.504, headHeight: 0.74, shadeBottom: 1.78 }
const SY_HEAD = RIGHT_LAMP.shadeHeight / PACK.headHeight
const SXZ_HEAD = RIGHT_LAMP.shadeRadius / PACK.headRadius
const SY_BODY = (RIGHT_LAMP.shadeCentre - RIGHT_LAMP.shadeHeight / 2) / PACK.shadeBottom
export const RIGHT_LAMP_HEAD: [number, number, number] = [RIGHT_LAMP.x, RIGHT_LAMP.y + RIGHT_LAMP.shadeCentre, RIGHT_LAMP.z]

function rebuilt(m: THREE.Mesh, pos: (p: THREE.Vector3) => void, nrm: [number, number, number], color: THREE.Color): THREE.BufferGeometry {
  const src = m.geometry
  const a = src.getAttribute('position')
  const n = src.getAttribute('normal')
  const p = new Float32Array(a.count * 3)
  const q = new Float32Array(a.count * 3)
  const v = new THREE.Vector3()
  const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld)
  const w = new THREE.Vector3()
  const col = new Float32Array(a.count * 3)
  for (let i = 0; i < a.count; i++) {
    v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld)
    pos(v)
    p.set([v.x, v.y, v.z], i * 3)
    w.fromBufferAttribute(n, i).applyMatrix3(nm)
    w.set(w.x / nrm[0], w.y / nrm[1], w.z / nrm[2]).normalize()
    q.set([w.x, w.y, w.z], i * 3)
    col.set([color.r, color.g, color.b], i * 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(p, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(q, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  if (src.index) g.setIndex(Array.from(src.index.array))
  return g
}

export function RightLamp() {
  const gltf = useGLTF(`${import.meta.env.BASE_URL}models/lamp_standing.glb`, false)
  const gl = useThree((s) => s.gl)
  const L = RIGHT_LAMP
  const { bodyGeo, headGeo, hitGeo } = useMemo(() => {
    gltf.scene.updateMatrixWorld(true)
    const body = new THREE.Color(L.body)
    const shade = new THREE.Color(L.shade)
    const bodies: THREE.BufferGeometry[] = []
    const heads: THREE.BufferGeometry[] = []
    gltf.scene.traverse((c) => {
      const m = c as THREE.Mesh
      if (!m.isMesh) return
      if ((m.material as THREE.Material).name === 'lamp_head') {
        heads.push(rebuilt(m, (v) => v.set(v.x * SXZ_HEAD, L.shadeCentre + (v.y - PACK.headY) * SY_HEAD, v.z * SXZ_HEAD), [SXZ_HEAD, SY_HEAD, SXZ_HEAD], shade))
      } else {
        bodies.push(rebuilt(m, (v) => v.set(v.x * L.poleScale, v.y * SY_BODY, v.z * L.poleScale), [L.poleScale, SY_BODY, L.poleScale], body))
      }
    })
    const bodyGeo = mergeGeometries(bodies)!
    const headGeo = mergeGeometries(heads)!
    bodies.forEach((g) => g.dispose()); heads.forEach((g) => g.dispose())
    const parts = [
      new THREE.BoxGeometry(0.46, 0.46, 0.46).translate(0, L.shadeCentre, 0),
      new THREE.BoxGeometry(0.2, L.shadeCentre - 0.2, 0.2).translate(0, (L.shadeCentre - 0.2) / 2, 0),
    ]
    const hitGeo = mergeGeometries(parts)!
    parts.forEach((g) => g.dispose())
    return { bodyGeo, headGeo, hitGeo }
  }, [gltf, L])
  const { bodyMat, headMat } = useMemo(
    () => ({
      bodyMat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
      headMat: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color(L.glow), emissiveIntensity: 0, roughness: 0.7, metalness: 0, toneMapped: !BLOOM_ACTIVE }),
    }),
    [L],
  )
  useEffect(() => () => {
    bodyGeo.dispose(); headGeo.dispose(); hitGeo.dispose(); bodyMat.dispose(); headMat.dispose()
    runtime.sideLampHover = 0
  }, [bodyGeo, headGeo, hitGeo, bodyMat, headMat])
  const hover = useRef(false)
  useFrame((_, dtRaw) => {
    headMat.emissiveIntensity = bloomBoost(runtime.env.rLampGlow * runtime.sideLampLevel, BLOOM.boostBeads)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const goal = hover.current ? 1 : 0
    runtime.sideLampHover = reduced ? goal : runtime.sideLampHover + (goal - runtime.sideLampHover) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
  })
  const click = useMemo(() => makeClickHandlers(toggleSideLamp, () => getState().phase !== 'screen'), [])
  return (
    <group position={[L.x, L.y, L.z]}>
      <mesh geometry={bodyGeo} material={bodyMat} receiveShadow />
      <mesh geometry={headGeo} material={headMat} receiveShadow />
      <mesh
        geometry={hitGeo}
        material={hitMaterial}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse') return
          e.stopPropagation()
          hover.current = true
          gl.domElement.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hover.current = false
          gl.domElement.style.cursor = ''
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse') hover.current = true
          click.onPointerDown(e)
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse') hover.current = false
          click.onPointerUp(e)
        }}
        onPointerCancel={() => {
          hover.current = false
          click.onPointerCancel()
        }}
      />
    </group>
  )
}
