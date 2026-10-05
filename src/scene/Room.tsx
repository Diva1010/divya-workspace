import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Piece, useMat } from './materials'
import { panel, slab, wallGeo, mulberry } from './geometry'
import { NeonSign } from './NeonSign'
import { DegreeWall } from './DegreeWall'
import { LeftShelf } from './Shelves'
import { RightShelves } from './RightShelves'
import { Whiteboard } from './Whiteboard'
import { NeonStrip } from './Neon'
import { WindowSky } from './WindowSky'
import { BACKZ, DZ, FLOORY, FZ, H, HALF, T, W, WIN, ZC } from './constants'
import { blobTexture, edgeTexture, skyTexture } from './textures'
import { runtime, themeListeners, wallFade, type WallKey } from './runtime'
import { THEMES } from './themes'
import { degreeWall } from '../zones/zone'
import { getState, useFocus } from '../store/focus'
import type { V3 } from '../zones/types'

function Wall({ name, width, holes, pos, ry, neon, children }: {
  name: WallKey
  width: number
  holes: { cx: number; cy: number; w: number; h: number }[]
  pos: V3
  ry: number
  neon: 'neonA' | 'neonB'
  children?: ReactNode
}) {
  const wallMat = useMat('wall', name)
  const trim = useMat('trim', name)
  return (
    <group position={pos} rotation={[0, ry, 0]}>
      <Piece geo={wallGeo(width, H, T, holes, 0.05)} mat={wallMat} />
      <Piece geo={slab(width - 0.1, 0.14, 0.34, 0.05, 0.02)} mat={trim} pos={[0, 0, T / 2 + 0.07]} />
      <Piece geo={slab(width - 0.1, 0.16, 0.22, 0.05, 0.02)} mat={trim} pos={[0, H - 0.22, T / 2 + 0.08]} />
      <NeonStrip wall={name} length={width - 0.9} colorKey={neon} span={name === 'right' ? [-(width - 0.9) / 2, degreeWall.panel.x - degreeWall.panel.w / 2 - 0.06] : undefined} />
      {children}
    </group>
  )
}

function WindowFrame() {
  const trim = useMat('trim', 'back')
  const day = useMemo(() => new THREE.MeshBasicMaterial({ map: skyTexture(false) }), [])
  const night = useMemo(() => new THREE.MeshBasicMaterial({ map: skyTexture(true), transparent: true, opacity: 0 }), [])
  useEffect(() => {
    wallFade.back.add(day)
    return () => {
      wallFade.back.delete(day)
    }
  }, [day])
  useFrame(() => {
    night.opacity = runtime.env.sky * runtime.wallOp.back
  })
  const { cx, cy, w, h } = WIN
  const wz = T / 2 + 0.06
  return (
    <group>
      <mesh position={[cx, cy, -0.02]} material={day}><planeGeometry args={[w + 0.3, h + 0.3]} /></mesh>
      <mesh position={[cx, cy, -0.01]} material={night}><planeGeometry args={[w + 0.3, h + 0.3]} /></mesh>
      <WindowSky />
      <Piece geo={panel(w + 0.36, 0.16, 0.16, 0.05, 0.03)} mat={trim} pos={[cx, cy + h / 2 + 0.06, wz]} />
      <Piece geo={panel(w + 0.36, 0.16, 0.16, 0.05, 0.03)} mat={trim} pos={[cx, cy - h / 2 - 0.06, wz]} />
      <Piece geo={panel(0.16, h + 0.3, 0.16, 0.05, 0.03)} mat={trim} pos={[cx - w / 2 - 0.06, cy, wz]} />
      <Piece geo={panel(0.16, h + 0.3, 0.16, 0.05, 0.03)} mat={trim} pos={[cx + w / 2 + 0.06, cy, wz]} />
      <Piece geo={panel(0.1, h, 0.12, 0.03, 0.02)} mat={trim} pos={[cx, cy, wz]} />
      <Piece geo={panel(w, 0.1, 0.12, 0.03, 0.02)} mat={trim} pos={[cx, cy, wz]} />
      <Piece geo={slab(w + 0.7, 0.32, 0.09, 0.05, 0.02)} mat={trim} pos={[cx, cy - h / 2 - 0.14, wz + 0.08]} />
    </group>
  )
}

function Floor() {
  const base = useMat('base')
  const base2 = useMat('base2')
  const rug = useMat('rug')
  const planks = useMemo(() => {
    const rnd = mulberry(7)
    const out: { pos: V3; len: number; j: number; m: THREE.MeshStandardMaterial }[] = []
    for (let i = 0; i < 16; i++) {
      const z = -HALF + 0.25 + i * 0.5
      const split = (rnd() - 0.5) * 4
      ;[[-HALF, split], [split, HALF]].forEach((s) => {
        const len = s[1] - s[0]
        if (len < 0.5) return
        const j = (rnd() - 0.5) * 0.08
        out.push({ pos: [(s[0] + s[1]) / 2, 0.025, z], len, j, m: new THREE.MeshStandardMaterial({ roughness: 0.9 }) })
      })
    }
    return out
  }, [])
  useEffect(() => {
    const f = (t: (typeof THEMES)['lavender']) => planks.forEach((p) => p.m.color.set(t.floor).offsetHSL(0, 0, p.j))
    f(THEMES[getState().theme])
    themeListeners.add(f)
    return () => {
      themeListeners.delete(f)
      planks.forEach((p) => p.m.dispose())
    }
  }, [planks])
  const blob = blobTexture()
  const edge = edgeTexture()
  return (
    <group>
      <Piece geo={slab(W + 2 * T + 1.6, DZ + 1.6, 0.32, 0.5, 0.06)} mat={base} pos={[0, -1.05, ZC]} />
      <Piece geo={slab(W + 2 * T + 0.7, DZ + 0.7, 0.3, 0.4, 0.06)} mat={base2} pos={[0, -0.73, ZC]} />
      <Piece geo={slab(W + 2 * T, DZ, 0.4, 0.22, 0.05)} mat={base} pos={[0, -0.43, ZC]} />
      {planks.map((p, i) => (
        <mesh key={i} position={p.pos} material={p.m} receiveShadow>
          <boxGeometry args={[p.len - 0.03, 0.05, 0.47]} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.22, ZC]} renderOrder={-1}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial map={blob} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {[0, -Math.PI / 2, Math.PI / 2].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, -3.5]}>
            <planeGeometry args={[W, 1.0]} />
            <meshBasicMaterial map={edge} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        </group>
      ))}
      <Piece geo={slab(4.4, 3.2, 0.05, 0.5, 0.02)} mat={rug} pos={[0.5, FLOORY, 0.7]} />
    </group>
  )
}

function Roof() {
  const visible = useFocus((s) => s.roof)
  const trim = useMat('trim')
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0xdcd3ff, transparent: true, opacity: 0.2, roughness: 0.15, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
    [],
  )
  useEffect(() => {
    const f = (t: (typeof THEMES)['lavender']) => glass.color.set(t.accent).lerp(new THREE.Color(0xffffff), 0.6)
    f(THEMES[getState().theme])
    themeListeners.add(f)
    return () => {
      themeListeners.delete(f)
      glass.dispose()
    }
  }, [glass])
  const edge = HALF + T - 0.12
  return (
    <group position={[0, H, 0]} visible={visible}>
      <mesh material={glass} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, ZC]}>
        <planeGeometry args={[W + 2 * T, DZ]} />
      </mesh>
      <Piece geo={slab(W + 2 * T, 0.24, 0.2, 0.06, 0.03)} mat={trim} pos={[0, 0, BACKZ + 0.12]} cast recv={false} />
      <Piece geo={slab(W + 2 * T, 0.24, 0.2, 0.06, 0.03)} mat={trim} pos={[0, 0, FZ - 0.12]} cast recv={false} />
      <Piece geo={slab(0.24, DZ, 0.2, 0.06, 0.03)} mat={trim} pos={[-edge, 0, ZC]} cast recv={false} />
      <Piece geo={slab(0.24, DZ, 0.2, 0.06, 0.03)} mat={trim} pos={[edge, 0, ZC]} cast recv={false} />
      {[-1.3, 1.3].map((z) => (
        <Piece key={z} geo={slab(W + 2 * T - 0.4, 0.14, 0.14, 0.05, 0.02)} mat={trim} pos={[0, 0, z]} recv={false} />
      ))}
      {[-1.6, 1.6].map((x) => (
        <Piece key={x} geo={slab(0.14, DZ - 0.4, 0.14, 0.05, 0.02)} mat={trim} pos={[x, 0, ZC]} recv={false} />
      ))}
    </group>
  )
}

function Posts() {
  const trim = useMat('trim')
  return (
    <>
      {[-1, 1].map((sx) => (
        <Piece key={sx} geo={slab(0.26, 0.26, H, 0.07, 0.03)} mat={trim} pos={[sx * (HALF + T - 0.13), 0, FZ - 0.13]} cast />
      ))}
    </>
  )
}

const WALLS: Record<WallKey, { n: THREE.Vector3; c: THREE.Vector3 }> = {
  back: { n: new THREE.Vector3(0, 0, -1), c: new THREE.Vector3(0, 0, -HALF - T / 2) },
  left: { n: new THREE.Vector3(-1, 0, 0), c: new THREE.Vector3(-HALF - T / 2, 0, 0) },
  right: { n: new THREE.Vector3(1, 0, 0), c: new THREE.Vector3(HALF + T / 2, 0, 0) },
}
export function WallFader() {
  const tmp = useRef(new THREE.Vector3())
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    ;(Object.keys(WALLS) as WallKey[]).forEach((k) => {
      const d = WALLS[k]
      const side = tmp.current.copy(state.camera.position).sub(d.c).dot(d.n)
      const target = side > 0.2 ? 0.07 : 1
      let o = runtime.wallOp[k]
      o += (target - o) * Math.min(1, dt * 8)
      if (Math.abs(target - o) < 0.004) o = target
      runtime.wallOp[k] = o
      const tr = o < 0.995
      wallFade[k].forEach((m) => {
        m.opacity = o
        if (m.userData.fadeOpacityOnly) return
        if (m.transparent !== tr) {
          m.transparent = tr
          m.needsUpdate = true
        }
        m.depthWrite = !tr
      })
    })
  })
  return null
}

export function Room() {
  return (
    <group>
      <Floor />
      <Wall name="back" width={W + 2 * T} holes={[WIN]} pos={[0, 0, -HALF - T / 2]} ry={0} neon="neonA">
        <WindowFrame />
        <NeonSign />
      </Wall>
      <Wall name="right" width={W} holes={[]} pos={[HALF + T / 2, 0, 0]} ry={-Math.PI / 2} neon="neonB">
        <Whiteboard />
        <DegreeWall />
        <RightShelves />
      </Wall>
      <Wall name="left" width={W} holes={[]} pos={[-HALF - T / 2, 0, 0]} ry={Math.PI / 2} neon="neonA">
        <LeftShelf />
      </Wall>
      <Roof />
      <Posts />
    </group>
  )
}
