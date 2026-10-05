import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambient, windowDebug } from './ambient'
import { AMBIENT_ACTIVE } from './lightingPresets'
import { runtime } from './runtime'
import { cloudTexture, litWindowsTexture, paintLitWindows, skyCells, SKY_PLANE_H, SKY_PLANE_W, sunsetTexture } from './textures'
import { MAX_BIRDS, makeBirds, makeCity, writeBirds } from './windowLife'
import { WIN } from './constants'

const SUNSET_RENDER_ORDER = -1
const CLOUD_RENDER_ORDER = -2
const CLOUD_Z = -0.015
const SUNSET_Z = -0.005
const LIT_Z = -0.008
const LIT_RENDER_ORDER = 1
const BIRD_Z = -0.004
const BIRD_RENDER_ORDER = 0.5
const BIRD_SLATE = new THREE.Color('#4A5578')
const BIRD_VIOLET = new THREE.Color('#2B2257')
const smoothstep = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

export function WindowSky() {
  const W = AMBIENT_ACTIVE.window
  const { cloud, sunset } = useMemo(() => {
    const mk = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    return { cloud: mk(cloudTexture(W.clouds.repeatX)), sunset: mk(sunsetTexture(W.sunset.repeatY)) }
  }, [W.clouds.repeatX, W.sunset.repeatY])
  const C = W.city
  const B = W.birds
  const life = useMemo(() => {
    const cells = skyCells()
    const city = makeCity(cells)
    const { cv, tex } = litWindowsTexture()
    paintLitWindows(cv, cells, city.lit, C.color)
    const lit = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    const birds = makeBirds()
    const pos = new Float32Array(MAX_BIRDS * 18)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    const bird = new THREE.MeshBasicMaterial({ color: BIRD_SLATE, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    return { cells, city, cv, tex, lit, birds, pos, geo, bird }
  }, [C.color])
  const birdMesh = useRef<THREE.Mesh>(null)
  useEffect(
    () => () => {
      cloud.dispose()
      sunset.dispose()
      life.lit.dispose()
      life.tex.dispose()
      life.bird.dispose()
      life.geo.dispose()
    },
    [cloud, sunset, life],
  )
  useFrame(() => {
    const t = ambient.on ? ambient.t : 0
    const wall = runtime.wallOp.back
    const e = runtime.env
    const cOff = (W.clouds.speedUvPerSec * t) % 1
    cloud.map!.offset.x = cOff
    cloud.opacity = Math.max(0, 1 - e.sky) * wall * W.clouds.opacity
    cloud.visible = cloud.opacity > 0.002
    const w = Math.min(1, Math.max(0, 1 - Math.abs(e.tone - 0.55) / (e.tone > 0.55 ? 0.45 : 0.55)))
    sunset.map!.offset.y = W.sunset.baseOffset + 0.5 * W.sunset.shiftAmount * Math.sin((Math.PI * 2 * t) / W.sunset.periodSec)
    sunset.opacity = w * W.sunset.peakOpacity * wall
    sunset.visible = sunset.opacity > 0.002
    windowDebug.cloudOffset = cOff
    windowDebug.sunsetWeight = w

    life.lit.opacity = e.sky * wall
    life.lit.visible = life.lit.opacity > 0.002
    if (!ambient.on) {
      if (life.city.reset()) {
        paintLitWindows(life.cv, life.cells, life.city.lit, C.color)
        life.tex.needsUpdate = true
      }
    } else if (e.sky >= 0.05 && wall >= 0.5) {
      if (life.city.step(ambient.t, C)) {
        paintLitWindows(life.cv, life.cells, life.city.lit, C.color)
        life.tex.needsUpdate = true
      }
    } else life.city.pause()
    windowDebug.litWindows = life.city.count
    windowDebug.litTotal = life.cells.length

    const bm = birdMesh.current
    const op = (1 - smoothstep(0.6, 1, e.sky)) * wall
    if (!ambient.on) {
      life.birds.stop()
      if (bm) bm.visible = false
      windowDebug.birdX = null
    } else {
      const flying = life.birds.step(ambient.t, B, op > 0.05)
      if (bm) {
        bm.visible = flying && op > 0.002 && wall >= 0.5
        if (bm.visible) {
          writeBirds(life.pos, life.birds.flock, ambient.t, B, WIN.cx, WIN.cy, WIN.w, WIN.h)
          life.geo.attributes.position.needsUpdate = true
          life.bird.opacity = op
          life.bird.color.lerpColors(BIRD_SLATE, BIRD_VIOLET, Math.min(1, Math.max(0, e.sky)))
        }
      }
      windowDebug.birdX = flying ? life.birds.flock.leadX : null
    }
  })
  const geo = <planeGeometry args={[SKY_PLANE_W, SKY_PLANE_H]} />
  return (
    <>
      <mesh position={[WIN.cx, WIN.cy, CLOUD_Z]} material={cloud} renderOrder={CLOUD_RENDER_ORDER} castShadow={false} receiveShadow={false} raycast={() => null}>{geo}</mesh>
      <mesh position={[WIN.cx, WIN.cy, SUNSET_Z]} material={sunset} renderOrder={SUNSET_RENDER_ORDER} castShadow={false} receiveShadow={false} raycast={() => null}>{geo}</mesh>
      <mesh position={[WIN.cx, WIN.cy, LIT_Z]} material={life.lit} renderOrder={LIT_RENDER_ORDER} castShadow={false} receiveShadow={false} raycast={() => null}>{geo}</mesh>
      <mesh ref={birdMesh} geometry={life.geo} material={life.bird} position={[0, 0, BIRD_Z]} renderOrder={BIRD_RENDER_ORDER} visible={false} frustumCulled={false} castShadow={false} receiveShadow={false} raycast={() => null} />
    </>
  )
}
