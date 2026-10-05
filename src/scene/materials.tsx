import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { THEMES, type ThemeKey } from './themes'
import { getState } from '../store/focus'
import { themeListeners, wallFade, type WallKey } from './runtime'
import type { V3 } from '../zones/types'

export function useMat(key: ThemeKey, wall?: WallKey) {
  const m = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: THEMES[getState().theme][key],
        roughness: 0.92,
        metalness: 0,
      }),
    [key],
  )
  useEffect(() => {
    const f = (t: (typeof THEMES)['lavender']) => m.color.set(t[key])
    themeListeners.add(f)
    if (wall) wallFade[wall].add(m)
    return () => {
      themeListeners.delete(f)
      if (wall) wallFade[wall].delete(m)
      m.dispose()
    }
  }, [m, key, wall])
  return m
}

interface PieceProps {
  geo: THREE.BufferGeometry
  mat: THREE.Material
  pos?: V3
  cast?: boolean
  recv?: boolean
}
export function Piece({ geo, mat, pos = [0, 0, 0], cast = false, recv = true }: PieceProps) {
  return <mesh geometry={geo} material={mat} position={pos} castShadow={cast} receiveShadow={recv} />
}
