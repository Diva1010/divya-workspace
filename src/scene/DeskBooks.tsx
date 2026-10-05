import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GOLD_BAND, assignColors, makeBook, type BookParams } from './bookGen'

const DESK_BOOKS = { spineX: 3.2, z: -2.5, y: 1.2, length: 0.27, depth: 0.195, thickness: [0.033, 0.027], yaw: [0.12, -0.08] }

export function DeskBooks() {
  const geometry = useMemo(() => {
    const D = DESK_BOOKS
    const params: BookParams[] = D.thickness.map((t) => ({ thickness: t, height: D.length, depth: D.depth, color: '#fff', band: GOLD_BAND, title: { at: 0.5, h: 0.03 } }))
    assignColors(params, 4242)
    let y = D.y + 0.001
    const parts = params.map((p, i) => {
      const m = new THREE.Matrix4()
        .makeTranslation(D.spineX - D.depth / 2, y, D.z)
        .multiply(new THREE.Matrix4().makeRotationY(D.yaw[i]))
        .multiply(new THREE.Matrix4().makeTranslation(0, p.thickness / 2, 0))
        .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
        .multiply(new THREE.Matrix4().makeTranslation(0, -p.height / 2, 0))
      y += p.thickness
      return makeBook(p).geometry.applyMatrix4(m)
    })
    const merged = mergeGeometries(parts)!
    parts.forEach((g) => g.dispose())
    return merged
  }, [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow raycast={() => null} />
}
