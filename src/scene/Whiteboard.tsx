import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { BOARD_H, BOARD_TEX_W, BOARD_W, drawBoard } from './boardDesign'
import { BOARD_FONT, loadFont } from './fonts'
import { panel } from './geometry'
import { hitMaterial } from './hitProxy'
import { wallFade } from './runtime'
import { BOARD_SURFACE_LIFT } from './screenFrame'
import { useHotspot } from './useHotspot'
import { useWallMat } from './wallMat'
import { T } from './constants'
import { content } from '../content'
import { whiteboard } from '../zones/zone'

const FRAME_COLOR = '#C9CDD6'
const TRAY_COLOR = '#A9AEB9'
const MARKER_COLORS = ['#CDB8E8', '#F0C4D4']
const MARKER_CAP = '#5B4F6B'
const DUSTER_BASE = '#F7CDB4'
const DUSTER_FELT = '#5B4F6B'
const MARKER_SCALE = 1.4
const MARKER_Z = 0.068
const DUSTER_Z = 0.0725
const HIT_PAD = 0.04

function useBoardMaterial() {
  const { tex, cv } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = BOARD_TEX_W
    cv.height = Math.round((BOARD_TEX_W * BOARD_H) / BOARD_W)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { tex, cv }
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 }), [tex])
  useEffect(() => {
    let alive = true
    drawBoard(cv)
    tex.needsUpdate = true
    const sample = [content.now.heading, ...content.now.items, content.now.tagline].join(' ') || 'A'
    loadFont(`700 40px ${BOARD_FONT}`, sample).then((ok) => {
      if (!alive || !ok) return
      drawBoard(cv)
      tex.needsUpdate = true
    })
    wallFade.right.add(mat)
    return () => {
      alive = false
      wallFade.right.delete(mat)
      mat.dispose()
      tex.dispose()
    }
  }, [cv, tex, mat])
  return mat
}

export function Whiteboard() {
  const wp = whiteboard
  const frameMat = useWallMat(FRAME_COLOR)
  const trayMat = useWallMat(TRAY_COLOR)
  const blue = useWallMat(MARKER_COLORS[0])
  const red = useWallMat(MARKER_COLORS[1])
  const cap = useWallMat(MARKER_CAP)
  const base = useWallMat(DUSTER_BASE)
  const felt = useWallMat(DUSTER_FELT)
  const surface = useBoardMaterial()
  const handlers = useHotspot(wp!.hotspot, { wall: 'right' })
  if (!wp) return null
  const [fw, fh] = wp.frame
  const [sw, sh] = wp.surface
  const trayY = wp.tray.y - wp.y
  const trayTop = trayY + 0.02
  const none = () => null
  const markers = [
    { x: -0.56, mat: blue },
    { x: -0.3, mat: red },
  ]
  const hitTop = fh / 2 + HIT_PAD
  const hitBottom = trayY - 0.02 - HIT_PAD
  const hitDepth = wp.tray.d + HIT_PAD + 0.02
  return (
    <group position={[wp.x, wp.y, T / 2]}>
      <mesh geometry={panel(fw, fh, wp.off, 0.03, 0.012)} material={frameMat} position={[0, 0, wp.off / 2]} receiveShadow raycast={none} />
      <mesh material={surface} position={[0, 0, wp.off + BOARD_SURFACE_LIFT]} raycast={none}>
        <planeGeometry args={[sw, sh]} />
      </mesh>
      <mesh geometry={panel(wp.tray.w, 0.04, wp.tray.d, 0.015, 0.008)} material={trayMat} position={[0, trayY, wp.tray.d / 2]} receiveShadow raycast={none} />
      {markers.map((m, i) => (
        <group key={i} position={[m.x, trayTop + 0.011 * MARKER_SCALE, MARKER_Z]} rotation={[0, 0, Math.PI / 2]} scale={MARKER_SCALE}>
          <mesh material={m.mat} raycast={none}><cylinderGeometry args={[0.011, 0.011, 0.11, 12]} /></mesh>
          <mesh material={cap} position={[0, 0.0725, 0]} raycast={none}><cylinderGeometry args={[0.0125, 0.0125, 0.035, 12]} /></mesh>
        </group>
      ))}
      <mesh material={base} position={[0.45, trayTop + 0.006, DUSTER_Z]} raycast={none}><boxGeometry args={[0.12, 0.012, 0.035]} /></mesh>
      <mesh material={felt} position={[0.45, trayTop + 0.027, DUSTER_Z]} raycast={none}><boxGeometry args={[0.12, 0.03, 0.035]} /></mesh>
      <mesh material={hitMaterial} position={[0, (hitTop + hitBottom) / 2, hitDepth / 2]} {...handlers}>
        <boxGeometry args={[fw + 2 * HIT_PAD, hitTop - hitBottom, hitDepth]} />
      </mesh>
    </group>
  )
}
