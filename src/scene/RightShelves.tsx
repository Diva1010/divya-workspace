import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { frameMaterial } from './frame'
import { globeMaterials, stepGlobe } from './globeLamp'
import { SHADOW_REFRESH } from './lightingPresets'
import { buildRightDecor } from './rightWall'
import { wallFade } from './runtime'
import { invalidateShadows } from './shadowRefresh'
import { ShelfBoards } from './Shelves'
import { T } from './constants'
import { ATLAS_SIZE, drawAtlas, loadArtOverrides } from './wallArt'
import { content } from '../content'
import { room } from '../zones/zone'

const BASE = import.meta.env.BASE_URL

export function RightShelves() {
  const boards = useMemo(() => room.shelves.boards.map((b) => ({ ...b, back: room.shelves.back })), [])
  const decor = useMemo(() => buildRightDecor(room.shelves.boards, room.shelves.back, room.plants), [])
  const itemMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }), [])
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
    const faded = [itemMat, frameMat, art.material, globeMat]
    faded.forEach((m) => wallFade.right.add(m))
    const cancel = loadArtOverrides(art.cv, BASE, content.wallArt, () => {
      art.tex.needsUpdate = true
    })
    invalidateShadows(SHADOW_REFRESH.loadFrames)
    return () => {
      cancel()
      faded.forEach((m) => wallFade.right.delete(m))
      faded.forEach((m) => m.dispose())
      glowMat.dispose()
      art.tex.dispose()
      decor.items.dispose()
      decor.frames.dispose()
      decor.art.dispose()
      decor.glow.dispose()
      decor.globe.geometry.dispose()
    }
  }, [itemMat, frameMat, art, globeMat, glowMat, decor])
  useFrame(() => stepGlobe(globeMat, glowMat, 'right'))
  return (
    <>
      <ShelfBoards wall="right" shelves={boards} stops="start" />
      <group position={[0, 0, T / 2]}>
        <mesh geometry={decor.items} material={itemMat} castShadow receiveShadow raycast={() => null} />
        <mesh geometry={decor.frames} material={frameMat} castShadow receiveShadow raycast={() => null} />
        <mesh geometry={decor.art} material={art.material} castShadow receiveShadow raycast={() => null} />
        <mesh geometry={decor.globe.geometry} material={globeMat} castShadow receiveShadow raycast={() => null} />
        <mesh geometry={decor.glow} material={glowMat} castShadow={false} receiveShadow={false} raycast={() => null} />
      </group>
    </>
  )
}
