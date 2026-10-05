import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ambient, stepAmbient } from './ambient'
import { glowFactor } from './CodeProps'
import { glowTexture } from './glowTexture'
import { isHovered } from './hotspotHover'
import { haloTexture } from './LampHalo'
import { AMBIENT_ACTIVE as C } from './lightingPresets'
import { CANDLE, stoolPos } from './readingCorner'
import { themeListeners } from './runtime'
import { THEMES, type Theme } from './themes'
import { getState } from '../store/focus'
import { room } from '../zones/zone'

export function AmbientClock() {
  useFrame((_, dt) => stepAmbient(dt), -10)
  return null
}

const accentOf = (c: string, t: Theme) => (c === 'accent' ? t.accent : c)

function KeyboardUnderglow() {
  const kb = room.props.find((p) => p.id === 'keyboard')!
  const U = C.underglow
  const outline: [number, number] = [U.footprint[0] + 2 * U.fullReach, U.footprint[1] + 2 * U.fullReach]
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glowTexture(outline[0], outline[1], U.softReach),
        color: THEMES[getState().theme].accent,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [U],
  )
  useEffect(() => {
    const f = (t: Theme) => mat.color.set(t.accent)
    themeListeners.add(f)
    return () => {
      themeListeners.delete(f)
      mat.dispose()
    }
  }, [mat])
  useFrame(() => {
    mat.opacity = U.baseOpacity * glowFactor() * ambient.underglow
  })
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[kb.position[0], kb.position[1] + U.lift, kb.position[2] + U.offsetZ]} castShadow={false} receiveShadow={false} raycast={() => null}>
      <planeGeometry args={[outline[0] + 2 * U.softReach, outline[1] + 2 * U.softReach]} />
    </mesh>
  )
}

const BOOK_HOVER_BOOST = 1.5

function BookHalo({ propId = 'book' }: { propId?: string }) {
  const p = room.props.find((q) => q.id === propId)!
  const B = C.book
  const [px, pz] = useMemo(() => {
    const st = stoolPos()
    const dx = p.position[0] - (st.x + CANDLE.dx)
    const dz = p.position[2] - (st.z + CANDLE.dz)
    const len = Math.hypot(dx, dz) || 1
    return [p.position[0] + (dx / len) * B.awayFromCandle, p.position[2] + (dz / len) * B.awayFromCandle]
  }, [p, B.awayFromCandle])
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: haloTexture(), color: accentOf(B.color, THEMES[getState().theme]), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true }),
    [B.color],
  )
  useEffect(() => {
    const f = (t: Theme) => mat.color.set(accentOf(B.color, t))
    themeListeners.add(f)
    return () => {
      themeListeners.delete(f)
      mat.dispose()
    }
  }, [mat, B.color])
  const hv = useRef(0)
  useFrame((_, dtRaw) => {
    hv.current += ((isHovered('current-read') ? 1 : 0) - hv.current) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
    mat.opacity = B.baseOpacity * glowFactor() * ambient.book * (1 + (BOOK_HOVER_BOOST - 1) * hv.current)
  })
  return <sprite material={mat} position={[px, B.y, pz]} scale={[2 * B.radius, 2 * B.radius, 1]} raycast={() => null} />
}

export function AmbientGlows() {
  return (
    <>
      <KeyboardUnderglow />
      <BookHalo />
    </>
  )
}
