import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { SHADOW_REFRESH } from './lightingPresets'
import { buildDesk } from './deskDesign'
import { invalidateShadows } from './shadowRefresh'

export function Desk() {
  const build = useMemo(() => buildDesk(), [])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }), [])
  useEffect(() => {
    invalidateShadows(SHADOW_REFRESH.loadFrames)
    return () => {
      material.dispose()
      build.geometry.dispose()
    }
  }, [build, material])
  return <mesh geometry={build.geometry} material={material} castShadow receiveShadow raycast={() => null} />
}
