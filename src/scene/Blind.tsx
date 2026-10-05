import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { BLIND, BLIND_CX, BLIND_W, BLIND_Z, blindPose, railsGeometry, slatGeometry, slatMatrices, smooth } from './blindDesign'
import { makeClickHandlers } from './clickRule'
import { hitMaterial } from './hitProxy'
import { runtime, wallFade } from './runtime'
import { getState, toggleBlind } from '../store/focus'

export function Blind() {
  const gl = useThree((s) => s.gl)
  const slatGeo = useMemo(slatGeometry, [])
  const slatMat = useMemo(() => new THREE.MeshStandardMaterial({ color: BLIND.slat.color, roughness: 0.8, metalness: 0 }), [])
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }), [])
  const inst = useRef<THREE.InstancedMesh>(null)
  const rails = useRef<THREE.Mesh>(null)
  const last = useRef(-1)
  const matrices = useMemo<THREE.Matrix4[]>(() => [], [])
  const railsGeo = useMemo(() => railsGeometry(blindPose(smooth(runtime.blind))), [])
  useEffect(() => {
    wallFade.back.add(slatMat)
    wallFade.back.add(railMat)
    return () => {
      wallFade.back.delete(slatMat)
      wallFade.back.delete(railMat)
      slatMat.dispose(); railMat.dispose(); slatGeo.dispose(); rails.current?.geometry.dispose(); railsGeo.dispose()
      runtime.blindHover = 0
    }
  }, [slatMat, railMat, slatGeo, railsGeo])
  const hover = useRef(false)
  useFrame((_, dtRaw) => {
    const c = smooth(runtime.blind)
    if (c !== last.current && inst.current && rails.current) {
      last.current = c
      const pose = blindPose(c)
      slatMatrices(pose, matrices).forEach((m, i) => inst.current!.setMatrixAt(i, m))
      inst.current.instanceMatrix.needsUpdate = true
      const old = rails.current.geometry
      rails.current.geometry = railsGeometry(pose)
      if (old !== railsGeo) old.dispose()
    }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const goal = hover.current ? 1 : 0
    runtime.blindHover = reduced ? goal : runtime.blindHover + (goal - runtime.blindHover) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
  })
  const usable = () => getState().phase !== 'screen' && runtime.wallOp.back >= 0.5
  const click = useMemo(() => makeClickHandlers(toggleBlind, usable), [])
  return (
    <group>
      <instancedMesh ref={inst} args={[slatGeo, slatMat, BLIND.slatCount]} castShadow={false} receiveShadow={false} frustumCulled={false} raycast={() => null} />
      <mesh ref={rails} geometry={railsGeo} material={railMat} castShadow={false} receiveShadow={false} frustumCulled={false} raycast={() => null} />
      <mesh
        material={hitMaterial}
        position={[BLIND_CX, BLIND.top - BLIND.windowH / 2, BLIND_Z]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse' || !usable()) return
          e.stopPropagation()
          hover.current = true
          gl.domElement.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hover.current = false
          gl.domElement.style.cursor = ''
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse' && usable()) hover.current = true
          click.onPointerDown(e)
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse') hover.current = false
          click.onPointerUp(e)
        }}
        onPointerCancel={() => {
          hover.current = false
          click.onPointerCancel()
        }}
      >
        <boxGeometry args={[BLIND_W, BLIND.windowH, 0.05]} />
      </mesh>
    </group>
  )
}
