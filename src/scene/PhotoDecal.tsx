import { useEffect, useMemo, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PHOTO_FOCUS_X, PHOTO_FOCUS_Y } from './photoCrop'
import { wallFade, type WallKey } from './runtime'
import type { V3 } from '../zones/types'

const MAX_ANISOTROPY = 8

export function PhotoDecal({ src, size, position, rotation = [0, 0, 0], wall, onReady }: { src: string; size: [number, number]; position: V3; rotation?: V3; wall?: WallKey; onReady: () => void }) {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const [tex, setTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let alive = true
    let loaded: THREE.Texture | null = null
    const start = () => {
      new THREE.TextureLoader().load(
        src,
        (t) => {
          if (!alive) { t.dispose(); return }
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = Math.min(MAX_ANISOTROPY, maxAniso)
          const img = t.image as { width: number; height: number }
          const imgA = img.width / img.height
          const planeA = size[0] / size[1]
          if (imgA > planeA) {
            t.repeat.x = planeA / imgA
            t.offset.x = (1 - t.repeat.x) * PHOTO_FOCUS_X
          } else {
            t.repeat.y = imgA / planeA
            t.offset.y = (1 - t.repeat.y) * (1 - PHOTO_FOCUS_Y)
          }
          loaded = t
          setTex(t)
        },
        undefined,
        () => { },
      )
    }
    const idle = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const handle = idle ? idle(start, { timeout: 2000 }) : window.setTimeout(start, 300)
    return () => {
      alive = false
      if (idle) (window as unknown as { cancelIdleCallback: (h: number) => void }).cancelIdleCallback(handle)
      else window.clearTimeout(handle)
      loaded?.dispose()
    }
  }, [src, size, maxAniso])

  const material = useMemo(() => {
    if (!tex) return null
    const m = new THREE.MeshStandardMaterial({
      map: tex,
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
  }, [tex])

  useEffect(() => {
    if (!material) return
    if (wall) wallFade[wall].add(material)
    onReady()
    return () => {
      if (wall) wallFade[wall].delete(material)
      material.dispose()
    }
  }, [material, wall, onReady])

  if (!material) return null
  return (
    <mesh material={material} position={position} rotation={rotation} raycast={() => null}>
      <planeGeometry args={size} />
    </mesh>
  )
}
