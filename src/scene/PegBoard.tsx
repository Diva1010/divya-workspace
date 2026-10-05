import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { ATLAS_PX, BOARD, BOARD_W, HOLE_TILE_PX, PHOTO_CELLS, PHOTO_CELL_PX, buildPegboard, drawHoleTile, drawNote, drawPegAtlas } from './pegboardDesign'
import { loadFont, BOARD_FONT } from './fonts'
import { SHADOW_REFRESH } from './lightingPresets'
import { wallFade } from './runtime'
import { invalidateShadows } from './shadowRefresh'
import { loadCellOverrides } from './wallArt'
import { content } from '../content'

const BASE = import.meta.env.BASE_URL

const PEG_WALL_Z = 3.53
export function PegBoard() {
  const build = useMemo(buildPegboard, [])
  const hole = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = HOLE_TILE_PX
    drawHoleTile(cv)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(BOARD_W / BOARD.pitch, BOARD.h / BOARD.pitch)
    tex.anisotropy = 8
    return tex
  }, [])
  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({ map: hole, roughness: 0.92, metalness: 0 }), [hole])
  const atlas = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = ATLAS_PX
    drawPegAtlas(cv)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const material = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.9, metalness: 0 })
    return { cv, tex, material }
  }, [])
  useEffect(() => {
    let alive = true
    wallFade.left.add(panelMat)
    wallFade.left.add(atlas.material)
    const cancel = loadCellOverrides(atlas.cv, BASE, content.wallArt, PHOTO_CELLS, PHOTO_CELL_PX, () => { atlas.tex.needsUpdate = true })
    loadFont(`700 100px ${BOARD_FONT}`, 'BuildExploreCreate').then((ok) => { if (alive && ok) { drawNote(atlas.cv); atlas.tex.needsUpdate = true } })
    invalidateShadows(SHADOW_REFRESH.loadFrames)
    return () => {
      alive = false
      cancel()
      wallFade.left.delete(panelMat)
      wallFade.left.delete(atlas.material)
      panelMat.dispose()
      hole.dispose()
      atlas.material.dispose()
      atlas.tex.dispose()
      build.panel.dispose()
      build.items.dispose()
    }
  }, [panelMat, hole, atlas, build])
  return (
    <group position={[0, 0, PEG_WALL_Z]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={build.panel} material={panelMat} castShadow receiveShadow raycast={() => null} />
      <mesh geometry={build.items} material={atlas.material} castShadow receiveShadow raycast={() => null} />
    </group>
  )
}
