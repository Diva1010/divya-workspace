import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { strokeIcon, type IconName } from '../icons'
import { wallFade, type WallKey } from './runtime'
import type { V3 } from '../zones/types'

const DECAL_DARK = '#4A4D57'
const DECAL_LIGHT = '#FFF8EC'
export type DecalTone = 'dark' | 'light'

const textures = new Map<string, THREE.CanvasTexture>()
function iconTexture(name: IconName, tone: DecalTone) {
  const key = `${name}:${tone}`
  let t = textures.get(key)
  if (!t) {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 256
    const c = cv.getContext('2d')!
    c.strokeStyle = tone === 'dark' ? DECAL_DARK : DECAL_LIGHT
    strokeIcon(c, name, 128, 128, 232, 2.1)
    t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    textures.set(key, t)
  }
  return t
}

export function useDecalMaterial(name: IconName, tone: DecalTone, wall?: WallKey) {
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: iconTexture(name, tone),
      transparent: true,
      depthWrite: false,
      roughness: 0.92,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    m.userData.fadeOpacityOnly = true
    return m
  }, [name, tone])
  useEffect(() => {
    if (wall) wallFade[wall].add(mat)
    return () => {
      if (wall) wallFade[wall].delete(mat)
      mat.dispose()
    }
  }, [mat, wall])
  return mat
}

export function Decal({ material, size, position, rotation = [0, 0, 0] }: { material: THREE.Material; size: number; position: V3; rotation?: V3 }) {
  return (
    <mesh material={material} position={position} rotation={rotation} raycast={() => null}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}
