import { lazy, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Room, WallFader } from './Room'
import { RoomExtras } from './RoomExtras'
import { CornerProps } from './CornerProps'
import { Props } from './Props'
import { PlantGroups } from './Plants'
import { SunLight } from './SunLight'
import { CodeProps } from './CodeProps'
import { HotspotGlows } from './HotspotGlow'
import { Screens } from './Screens'
import { Lighting } from './Lighting'
import { CameraRig } from './CameraRig'
import { themeListeners } from './runtime'
import { THEMES } from './themes'
import { useFocus } from '../store/focus'
import { BLOOM, BLOOM_ACTIVE, DPR_MAX } from './lightingPresets'
import { DebugReadout } from './DebugReadout'
import { AmbientClock, AmbientGlows } from './AmbientFx'
import { room } from '../zones/zone'

function ThemeSync() {
  const theme = useFocus((s) => s.theme)
  useEffect(() => {
    const t = THEMES[theme]
    themeListeners.forEach((f) => f(t))
  }, [theme])
  return null
}

const BloomFx = lazy(() => import('./BloomFx'))

export function Scene() {
  const { home, orbit } = room.camera
  return (
    <Canvas
      shadows="percentage"
      flat
      dpr={[1, BLOOM_ACTIVE ? Math.min(DPR_MAX, BLOOM.dprMax) : DPR_MAX]}
      camera={{ fov: home.fov, near: 0.1, far: 120, position: home.position }}
      gl={{ alpha: true, antialias: !BLOOM_ACTIVE, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      aria-label="3D room. Drag to orbit, scroll or pinch to zoom."
    >
      <AmbientClock />
      <Lighting />
      <Room />
      <RoomExtras />
      <CornerProps />
      <Props />
      <Suspense fallback={null}>
        <PlantGroups />
        <SunLight />
      </Suspense>
      <CodeProps />
      <HotspotGlows />
      <Screens />
      <AmbientGlows />
      <WallFader />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={orbit.damping}
        minDistance={orbit.minDistance}
        maxDistance={orbit.maxDistance}
        minPolarAngle={orbit.minPolar}
        maxPolarAngle={Math.PI * orbit.maxPolarPi}
        rotateSpeed={orbit.rotateSpeed}
        zoomSpeed={orbit.zoomSpeed}
        target={home.target}
      />
      <CameraRig />
      <DebugReadout />
      {BLOOM_ACTIVE && (
        <Suspense fallback={null}>
          <BloomFx />
        </Suspense>
      )}
      <ThemeSync />
    </Canvas>
  )
}
