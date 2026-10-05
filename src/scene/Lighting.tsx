import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { FOCUS, ENV, LAMP_SHADOW, LAMP_SHADOWS_ACTIVE, SHADOW_REFRESH, SUN_SHADOW, SUN_SHADOW_MAP, SUN_SHADOW_RADIUS } from './lightingPresets'
import { invalidateShadows, takeShadowRefresh } from './shadowRefresh'
import { runtime, stepBlind, stepEnv, stepFloorLamp, stepLamp, stepSideLamp, themeListeners } from './runtime'
import { BLIND, smooth } from './blindDesign'
import { THEMES } from './themes'
import { getState, useFocus } from '../store/focus'
import { RIGHT_LAMP_HEAD } from './RightLamp'
import { room } from '../zones/zone'

const LAMP_LIGHT_OFFSET = [-0.15, 1.2, 0.4] as const
const LAMP_LIGHT_REF_SCALE = 0.8
const lampProp = room.props.find((p) => p.id === 'lamp')!
const lampLightPos: [number, number, number] = LAMP_LIGHT_OFFSET.map((o, i) => lampProp.position[i] + o * (lampProp.scale / LAMP_LIGHT_REF_SCALE)) as [number, number, number]

function focusScale(d: number) {
  const s = Math.max(0.0001, 1 - (d / FOCUS.distance) ** 4)
  return (d ** FOCUS.decay) / (s * s)
}

export function Lighting() {
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const win = useRef<THREE.PointLight>(null)
  const neonA = useRef<THREE.PointLight>(null)
  const neonB = useRef<THREE.PointLight>(null)
  const focus = useRef<THREE.PointLight>(null)
  const rlamp = useRef<THREE.PointLight>(null)
  const f = useMemo(() => ({ level: 0, dir: new THREE.Vector3(), want: new THREE.Vector3() }), [])
  const w = useMemo(() => ({ pos: new THREE.Vector3(), col: new THREE.Color(), lampOn: null as boolean | null, geometries: -1, casters: '', frame: 0, pixelRatio: -1 }), [])
  const gl = useThree((s) => s.gl)
  const roof = useFocus((s) => s.roof)

  useEffect(() => {
    invalidateShadows(SHADOW_REFRESH.loadFrames)
  }, [roof])
  useEffect(() => {
    const again = () => invalidateShadows(SHADOW_REFRESH.settleFrames)
    window.addEventListener('resize', again)
    window.addEventListener('orientationchange', again)
    gl.domElement.addEventListener('webglcontextrestored', again)
    return () => {
      window.removeEventListener('resize', again)
      window.removeEventListener('orientationchange', again)
      gl.domElement.removeEventListener('webglcontextrestored', again)
    }
  }, [gl])

  useEffect(() => {
    const apply = (t: (typeof THEMES)['lavender']) => {
      neonA.current?.color.set(t.neonA)
      neonB.current?.color.set(t.neonB)
    }
    apply(THEMES[getState().theme])
    themeListeners.add(apply)
    return () => {
      themeListeners.delete(apply)
    }
  }, [])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const st = getState()
    stepEnv(dt, st.time)
    stepLamp(dt, st.lampOn)
    stepFloorLamp(dt, st.floorLampOn)
    stepSideLamp(dt, st.sideLampOn)
    stepBlind(dt, st.blindClosed, BLIND.duration)
    const e = runtime.env
    if (hemi.current) {
      hemi.current.intensity = e.hemi
      hemi.current.color.copy(e.hemiSky)
      hemi.current.groundColor.copy(e.hemiGround)
    }
    if (sun.current) {
      sun.current.intensity = e.sun
      sun.current.color.copy(e.sunColor)
      sun.current.position.set(e.sunPos[0], e.sunPos[1], e.sunPos[2])
      sun.current.shadow.intensity = e.sunShadow
    }
    if (lamp.current) {
      lamp.current.intensity = e.lamp * runtime.lampLevel
      if (LAMP_SHADOWS_ACTIVE) lamp.current.shadow.intensity = e.lampShadow * runtime.lampLevel
    }
    if (win.current) {
      win.current.intensity = e.win * (1 - 0.5 * smooth(runtime.blind))
      win.current.color.copy(e.winColor)
    }
    if (rlamp.current) rlamp.current.intensity = e.rLampLight * runtime.sideLampLevel
    if (neonA.current) neonA.current.intensity = e.neon
    if (neonB.current) neonB.current.intensity = e.neon

    const pose = st.active !== null && st.activePose ? st.poses[st.activePose] : undefined
    const on = !!pose && pose.focusLight !== false
    f.level += ((on ? 1 : 0) - f.level) * Math.min(1, dt * FOCUS.rate)
    if (f.level < 0.002) f.level = on ? f.level : 0
    const light = focus.current
    if (light) {
      if (pose && on) {
        f.dir.set(pose.pos[0] - pose.target[0], pose.pos[1] - pose.target[1], pose.pos[2] - pose.target[2]).normalize()
        f.want.set(pose.target[0] + f.dir.x * FOCUS.toward, pose.target[1] + f.dir.y * FOCUS.toward + FOCUS.up, pose.target[2] + f.dir.z * FOCUS.toward)
        if (light.intensity < 0.01) light.position.copy(f.want)
        else light.position.lerp(f.want, Math.min(1, dt * FOCUS.moveRate))
      }
      light.intensity = e.focus * f.level * focusScale(Math.hypot(FOCUS.toward, FOCUS.up))
    }

    const eps = SHADOW_REFRESH.easeEpsilon
    const sunMoving = Math.abs(e.sunPos[0] - w.pos.x) > eps || Math.abs(e.sunPos[1] - w.pos.y) > eps || Math.abs(e.sunPos[2] - w.pos.z) > eps
    const sunRecolouring = Math.abs(e.sunColor.r - w.col.r) > eps || Math.abs(e.sunColor.g - w.col.g) > eps || Math.abs(e.sunColor.b - w.col.b) > eps
    if (sunMoving || sunRecolouring) invalidateShadows(SHADOW_REFRESH.settleFrames, 'sun')
    w.pos.set(e.sunPos[0], e.sunPos[1], e.sunPos[2])
    w.col.copy(e.sunColor)
    const lampShadowOn = LAMP_SHADOWS_ACTIVE && e.lampShadow * runtime.lampLevel > 0.001
    if (lampShadowOn !== w.lampOn) {
      invalidateShadows(SHADOW_REFRESH.settleFrames, 'lamp')
      w.lampOn = lampShadowOn
    }
    const geometries = state.gl.info.memory.geometries
    if (geometries !== w.geometries) {
      if (w.geometries >= 0) invalidateShadows(SHADOW_REFRESH.loadFrames)
      w.geometries = geometries
    }
    const pixelRatio = state.gl.getPixelRatio()
    if (pixelRatio !== w.pixelRatio) {
      if (w.pixelRatio >= 0) invalidateShadows(SHADOW_REFRESH.settleFrames)
      w.pixelRatio = pixelRatio
    }
    if (++w.frame % SHADOW_REFRESH.casterCheckEvery === 0) {
      let count = 0
      let sum = 0
      state.scene.traverseVisible((o) => {
        if (o.castShadow) {
          count++
          sum += o.id
        }
      })
      const sig = count + ':' + sum
      if (sig !== w.casters) {
        if (w.casters !== '') invalidateShadows(SHADOW_REFRESH.loadFrames)
        w.casters = sig
      }
    }
    const refresh = takeShadowRefresh()
    if (refresh.sun && sun.current) sun.current.shadow.needsUpdate = true
    if (refresh.lamp && LAMP_SHADOWS_ACTIVE && lamp.current) lamp.current.shadow.needsUpdate = true
  })

  const sunStart = ENV[room.lighting].sunPos
  return (
    <>
      <hemisphereLight ref={hemi} args={[0xffffff, 0xe8dde6, 1]} />
      <directionalLight
        ref={sun}
        position={sunStart}
        castShadow
        shadow-mapSize={[SUN_SHADOW_MAP, SUN_SHADOW_MAP]}
        shadow-camera-left={-SUN_SHADOW.extent}
        shadow-camera-right={SUN_SHADOW.extent}
        shadow-camera-top={SUN_SHADOW.extent}
        shadow-camera-bottom={-SUN_SHADOW.extent}
        shadow-camera-near={SUN_SHADOW.near}
        shadow-camera-far={SUN_SHADOW.far}
        shadow-bias={SUN_SHADOW.bias}
        shadow-normalBias={SUN_SHADOW.normalBias}
        shadow-radius={SUN_SHADOW_RADIUS}
        shadow-autoUpdate={false}
      />
      <pointLight
        ref={lamp}
        color={0xffb870}
        distance={10}
        decay={1.6}
        position={lampLightPos}
        castShadow={LAMP_SHADOWS_ACTIVE}
        shadow-mapSize={[LAMP_SHADOW.map, LAMP_SHADOW.map]}
        shadow-bias={LAMP_SHADOW.bias}
        shadow-normalBias={LAMP_SHADOW.normalBias}
        shadow-radius={LAMP_SHADOW.radius}
        shadow-camera-near={LAMP_SHADOW.near}
        shadow-camera-far={LAMP_SHADOW.far}
        shadow-autoUpdate={false}
      />
      <pointLight ref={win} distance={10} decay={1.6} position={[-1.2, 2.9, -3.4]} />
      <pointLight ref={neonA} distance={9} decay={1.6} position={[-1, 4, -3.4]} />
      <pointLight ref={neonB} distance={9} decay={1.6} position={[3.4, 4, 0]} />
      <pointLight ref={rlamp} color={0xffc890} intensity={0} distance={3.5} decay={1.6} position={[RIGHT_LAMP_HEAD[0], RIGHT_LAMP_HEAD[1] + 0.05, RIGHT_LAMP_HEAD[2]]} />
      <pointLight ref={focus} color={FOCUS.color} intensity={0} distance={FOCUS.distance} decay={FOCUS.decay} />
    </>
  )
}
