import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { BOARD_FONT, SIGN_FONT, loadFont } from './fonts'
import { byTone } from './degreeDesign'
import { Glow } from './HotspotGlow'
import { addHover, clearHover, removeHover } from './hotspotHover'
import { hitMaterial } from './hitProxy'
import { CLICK_MAX_MOVE_PX, CLICK_MAX_MS } from './clickRule'
import { BANNER, BANNER_WIDTH, STANDING_FRAME, bannerGeometry, posterQuad } from './leftWall'
import { LABEL_ONLY } from './markers'
import { decorTap } from './markerState'
import { BANNER_LINES, BANNER_TEX, POSTER_LINES, POSTER_TEX, drawBanner, drawPoster } from './posterDesign'
import { runtime, wallFade } from './runtime'
import { getState, useFocus } from '../store/focus'
import { leftShelf } from '../zones/zone'

// Unlit paper and ribbon brightness by time of day [day, dusk, night]: 1 keeps the exact colours (max output 1.0, below the 1.2 bloom threshold).
const PAPER_LEVEL: [number, number, number] = [1, 1, 1]
const HIT = { x: -3.69, width: 0.22 }

export function Poster() {
  const geometry = useMemo(() => posterQuad(leftShelf.top), [])
  const bannerGeo = useMemo(() => bannerGeometry(leftShelf.top), [])
  const banner = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = BANNER_TEX[0]
    cv.height = BANNER_TEX[1]
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { cv, tex, material: new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }) }
  }, [])
  const { cv, tex, material } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = POSTER_TEX[0]
    cv.height = POSTER_TEX[1]
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const material = new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    return { cv, tex, material }
  }, [])
  useEffect(() => {
    let alive = true
    const draw = () => {
      drawPoster(cv)
      tex.needsUpdate = true
    }
    draw()
    drawBanner(banner.cv)
    banner.tex.needsUpdate = true
    Promise.all([loadFont(`600 100px ${SIGN_FONT}`, POSTER_LINES.join(' ')), loadFont(`700 100px ${BOARD_FONT}`, BANNER_LINES.join(' '))]).then((ok) => {
      if (!alive || !ok.some(Boolean)) return
      draw()
      drawBanner(banner.cv)
      banner.tex.needsUpdate = true
    })
    wallFade.left.add(material)
    wallFade.left.add(banner.material)
    return () => {
      alive = false
      wallFade.left.delete(material)
      wallFade.left.delete(banner.material)
      material.dispose(); tex.dispose(); geometry.dispose()
      banner.material.dispose(); banner.tex.dispose(); bannerGeo.dispose()
    }
  }, [cv, tex, material, geometry, banner, bannerGeo])

  const level = useRef(-1)
  useFrame(() => {
    const k = byTone(PAPER_LEVEL, runtime.env.tone)
    if (k !== level.current) {
      level.current = k
      material.color.setScalar(k)
      banner.material.color.setScalar(k)
    }
  })

  const phase = useFocus((s) => s.phase)
  const group = LABEL_ONLY.group
  useEffect(() => {
    if (phase !== 'idle') clearHover(group)
  }, [phase, group])
  useEffect(() => () => clearHover(group), [group])
  const usable = () => {
    const s = getState()
    return s.phase === 'idle' && s.active === null && runtime.wallOp.left >= 0.5
  }
  const down = useRef<{ x: number; y: number; t: number } | null>(null)
  const F = STANDING_FRAME
  const top = leftShelf.top
  return (
    <>
      <mesh geometry={geometry} material={material} raycast={() => null} />
      <mesh geometry={bannerGeo} material={banner.material} raycast={() => null} frustumCulled={false} />
      <Glow group={group} position={[-3.985, top + (F.height + BANNER.overTop) / 2, F.z]} rotation={[0, Math.PI / 2, 0]} size={[BANNER_WIDTH + 0.1, F.height + BANNER.overTop + 0.1]} wall="left" peak={0.12} reach={0.15} />
      <mesh
        material={hitMaterial}
        position={[HIT.x, top + (F.height + BANNER.overTop) / 2, F.z]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse' || !usable()) return
          e.stopPropagation()
          addHover(group)
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType === 'mouse') removeHover(group)
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          down.current = usable() ? { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, t: performance.now() } : null
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          const d = down.current
          down.current = null
          if (!d || e.nativeEvent.pointerType === 'mouse' || !usable()) return
          if (Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) >= CLICK_MAX_MOVE_PX || performance.now() - d.t >= CLICK_MAX_MS) return
          e.stopPropagation()
          decorTap.x = e.nativeEvent.clientX
          decorTap.y = e.nativeEvent.clientY
          decorTap.until = performance.now() + LABEL_ONLY.tapSeconds * 1000
        }}
        onPointerCancel={() => { down.current = null }}
      >
        <boxGeometry args={[HIT.width, F.height + BANNER.overTop, BANNER_WIDTH]} />
      </mesh>
    </>
  )
}
