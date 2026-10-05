import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { THEMES } from './themes'
import { getState } from '../store/focus'
import { ambient } from './ambient'
import { runtime, themeListeners, type WallKey } from './runtime'
import { BLOOM, BLOOM_ACTIVE, bloomBoost, bloomScale } from './lightingPresets'
import { H, T } from './constants'

const WHITE = new THREE.Color(0xffffff)
const hot = (c: string) => new THREE.Color(c).lerp(WHITE, 0.35)

export function NeonStrip({ wall, length, colorKey, span }: { wall: WallKey; length: number; colorKey: 'neonA' | 'neonB'; span?: [number, number] }) {
  const len = span ? span[1] - span[0] : length
  const cx = span ? (span[0] + span[1]) / 2 : 0
  const y = H - 0.62
  const z = T / 2 + 0.06
  const { core, halos, base } = useMemo(() => {
    const c = THEMES[getState().theme][colorKey]
    return {
      base: hot(c),
      core: new THREE.MeshBasicMaterial({ color: hot(c).multiplyScalar(bloomBoost(1, BLOOM.boostNeon)), transparent: true, toneMapped: !BLOOM_ACTIVE }),
      halos: [
        { size: 0.08, base: 0.22, m: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }) },
        { size: 0.18, base: 0.09, m: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }) },
      ],
    }
  }, [colorKey])

  useEffect(() => {
    const f = (t: (typeof THEMES)['lavender']) => {
      base.copy(hot(t[colorKey]))
      core.color.copy(base).multiplyScalar(bloomBoost(ambient.neonCore, BLOOM.boostNeon))
      halos.forEach((h) => h.m.color.set(t[colorKey]))
    }
    themeListeners.add(f)
    return () => {
      themeListeners.delete(f)
      core.dispose()
      halos.forEach((h) => h.m.dispose())
    }
  }, [core, halos, base, colorKey])

  useFrame(() => {
    const f = runtime.wallOp[wall]
    core.opacity = f
    core.color.copy(base).multiplyScalar(bloomBoost(ambient.neonCore, BLOOM.boostNeon))
    halos.forEach((h) => (h.m.opacity = bloomScale(h.base * runtime.env.halo * f * ambient.neon)))
  })

  return (
    <group>
      <mesh position={[cx, y, z]} material={core}>
        <boxGeometry args={[len, 0.03, 0.03]} />
      </mesh>
      {halos.map((h, i) => (
        <mesh key={i} position={[cx, y, z]} material={h.m}>
          <boxGeometry args={[len, h.size, h.size]} />
        </mesh>
      ))}
    </group>
  )
}
