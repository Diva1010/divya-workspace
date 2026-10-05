import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from './runtime'
import { bloomScale } from './lightingPresets'
import type { V3 } from '../zones/types'

const LAMP_HALO_RADIUS = 0.8
const LAMP_HALO_PEAK = 2.0

const FALLOFF = 4

let texture: THREE.CanvasTexture | null = null
export function haloTexture() {
  if (texture) return texture
  const n = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = n
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(n, n)
  const edge = Math.exp(-FALLOFF)
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2
      const g = Math.max(0, (Math.exp(-FALLOFF * r * r) - edge) / (1 - edge))
      const s = r < 0.8 ? 1 : r >= 1 ? 0 : (1 - (r - 0.8) / 0.2) ** 2 * (1 + 2 * ((r - 0.8) / 0.2))
      const i = (y * n + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = Math.round(255 * g * s)
    }
  }
  ctx.putImageData(img, 0, 0)
  texture = new THREE.CanvasTexture(cv)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function LampHalo({ position }: { position: V3 }) {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: haloTexture(),
        color: 0xffb060,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
      }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  useFrame(() => {
    mat.opacity = bloomScale(LAMP_HALO_PEAK * runtime.env.lampHalo * runtime.lampLevel)
  })
  const d = 2 * LAMP_HALO_RADIUS
  return <sprite position={position} material={mat} scale={[d, d, 1]} raycast={() => null} />
}
