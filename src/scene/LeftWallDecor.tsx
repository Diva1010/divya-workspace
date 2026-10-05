import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { frameMaterial } from './frame'
import { globeMaterials, stepGlobe } from './globeLamp'
import { SHADOW_REFRESH } from './lightingPresets'
import { buildDecor } from './leftWall'
import { wallFade } from './runtime'
import { invalidateShadows } from './shadowRefresh'
import { ATLAS_SIZE, drawAtlas, loadArtOverrides } from './wallArt'
import { content } from '../content'
import { leftShelf } from '../zones/zone'

const BASE = import.meta.env.BASE_URL

export function LeftWallDecor() {
  const decor = useMemo(() => buildDecor(leftShelf), [])
  const frameMat = useMemo(frameMaterial, [])
  const art = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = ATLAS_SIZE
    drawAtlas(cv)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    return { cv, tex, material }
  }, [])
  const { globe: globeMat, glow: glowMat } = useMemo(globeMaterials, [])
  useEffect(() => {
    wallFade.left.add(frameMat)
    wallFade.left.add(art.material)
    wallFade.left.add(globeMat)
    const cancel = loadArtOverrides(art.cv, BASE, content.wallArt, () => {
      art.tex.needsUpdate = true
    })
    invalidateShadows(SHADOW_REFRESH.loadFrames)
    return () => {
      cancel()
      wallFade.left.delete(frameMat)
      wallFade.left.delete(art.material)
      wallFade.left.delete(globeMat)
      frameMat.dispose()
      art.material.dispose()
      art.tex.dispose()
      globeMat.dispose()
      glowMat.dispose()
      decor.frames.dispose()
      decor.art.dispose()
      decor.glow.dispose()
      decor.globe.geometry.dispose()
    }
  }, [frameMat, art, globeMat, glowMat, decor])
  useFrame(() => stepGlobe(globeMat, glowMat, 'left'))
  return (
    <group>
      <mesh geometry={decor.frames} material={frameMat} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={decor.art} material={art.material} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={decor.globe.geometry} material={globeMat} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={decor.glow} material={glowMat} castShadow={false} receiveShadow={false} raycast={() => null} />
    </group>
  )
}
