import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { glowTexture } from './glowTexture'
import { isHovered } from './hotspotHover'
import { runtime, themeListeners, type WallKey } from './runtime'
import { THEMES, type Theme } from './themes'
import { getState } from '../store/focus'
import { room } from '../zones/zone'
import type { V3 } from '../zones/types'

const HOTSPOT_GLOW_REACH = 0.25
const HOTSPOT_GLOW_PEAK = 0.5

export function Glow({ group, position, rotation, size, wall, peak = HOTSPOT_GLOW_PEAK, reach = HOTSPOT_GLOW_REACH, instant = false }: { group: string; position: V3; rotation: [number, number, number]; size: [number, number]; wall?: WallKey; peak?: number; reach?: number; instant?: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glowTexture(size[0], size[1], reach),
        color: THEMES[getState().theme].accent,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [size, reach],
  )
  useEffect(() => {
    const f = (t: Theme) => mat.color.set(t.accent)
    themeListeners.add(f)
    return () => {
      themeListeners.delete(f)
      mat.dispose()
    }
  }, [mat])
  const hv = useRef(0)
  useFrame((_, dtRaw) => {
    const goal = isHovered(group) ? 1 : 0
    hv.current = instant ? goal : hv.current + (goal - hv.current) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
    mat.opacity = hv.current * peak * (wall ? runtime.wallOp[wall] : 1)
  })
  return (
    <mesh position={position} rotation={rotation} material={mat} raycast={() => null}>
      <planeGeometry args={[size[0] + 2 * reach, size[1] + 2 * reach]} />
    </mesh>
  )
}

export function HotspotGlows() {
  const glows: ReactElement[] = []
  const seen = new Set<string>()
  for (const p of room.props) {
    const h = p.hotspot
    if (!h?.glow || seen.has(h.pose)) continue
    seen.add(h.pose)
    glows.push(<Glow key={h.pose} group={h.pose} position={h.glow.position} rotation={[0, h.glow.rotationY ?? 0, 0]} size={h.glow.size} wall={h.glow.wall} />)
  }
  for (const p of room.wallProps) {
    const h = p.hotspot
    if (!h?.glow || seen.has(h.pose)) continue
    seen.add(h.pose)
    glows.push(<Glow key={h.pose} group={h.pose} position={h.glow.position} rotation={[0, h.glow.rotationY ?? 0, 0]} size={h.glow.size} wall={h.glow.wall} />)
  }
  for (const p of room.codeProps) {
    const h = p.hotspot
    if (!h || seen.has(h.pose)) continue
    seen.add(h.pose)
    glows.push(
      <Glow key={h.pose} group={h.pose} position={[p.position[0], p.position[1] + 0.004, p.position[2]]} rotation={[-Math.PI / 2, 0, p.rotationY]} size={p.kind === 'phone' ? [(p.size[0] + 0.04) * (p.scale ?? 1), 0.2 * (p.scale ?? 1)] : [p.size[0] * (p.scale ?? 1), p.size[1] * (p.scale ?? 1)]} />,
    )
  }
  return <>{glows}</>
}
