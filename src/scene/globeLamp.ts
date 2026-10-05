import * as THREE from 'three'
import { haloTexture } from './LampHalo'
import { BLOOM, BLOOM_ACTIVE, bloomBoost, bloomScale } from './lightingPresets'
import { GLOBE } from './leftWall'
import { runtime, type WallKey } from './runtime'

export function globeMaterials() {
  const globe = new THREE.MeshStandardMaterial({ color: GLOBE.tint, emissive: new THREE.Color(GLOBE.color), emissiveIntensity: 0, roughness: 0.55, metalness: 0, toneMapped: !BLOOM_ACTIVE })
  const glow = new THREE.MeshBasicMaterial({
    map: haloTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
  return { globe, glow }
}

export function stepGlobe(globe: THREE.MeshStandardMaterial, glow: THREE.MeshBasicMaterial, wall: WallKey) {
  const g = runtime.env.glow
  globe.emissiveIntensity = bloomBoost(GLOBE.glow * g, BLOOM.boostCandle)
  glow.opacity = bloomScale(GLOBE.haloPeak * g) * runtime.wallOp[wall]
}
