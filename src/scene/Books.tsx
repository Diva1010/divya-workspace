import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { DecalTone } from './Decals'
import type { Segments } from './geometry'
import { buildShelfBooks } from './leftWall'
import { wallFade } from './runtime'
import { leftShelf } from '../zones/zone'

export const BOOK_SEG: Segments = { curve: 2, bevel: 1 }

export function toneFor(color: string): DecalTone {
  const c = new THREE.Color(color)
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
  return lum > 0.3 ? 'dark' : 'light'
}

export function Books() {
  const built = useMemo(() => buildShelfBooks(leftShelf), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }), [])
  useEffect(() => {
    wallFade.left.add(material)
    return () => {
      wallFade.left.delete(material)
      material.dispose()
      built.geometry.dispose()
    }
  }, [material, built])
  return (
    <group>
      <mesh geometry={built.geometry} material={material} castShadow receiveShadow raycast={() => null} />
    </group>
  )
}
