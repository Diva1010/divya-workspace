import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { wallFade, type WallKey } from './runtime'

export function useWallMat(color: string, wall: WallKey = 'right', glow = 0) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...(glow ? { emissive: new THREE.Color(color), emissiveIntensity: glow } : {}) }), [color, glow])
  useEffect(() => {
    wallFade[wall].add(m)
    return () => {
      wallFade[wall].delete(m)
      m.dispose()
    }
  }, [m, wall])
  return m
}
