import { useMat } from './materials'
import { blobTexture } from './textures'
import { FLOORY } from './constants'
import { CASE, CASES } from './bookcaseLayout'
import { BEAN_RADIUS, BEAN_LIFT, BEAN_SCALE, BEAN_SQUASH, BEAN_X, BEAN_Z, STOOL, stoolPos } from './readingCorner'
import { deskBlobs } from './deskDesign'
import { useMemo } from 'react'
import * as THREE from 'three'

function Blob({ x, z, w, d, o }: { x: number; z: number; w: number; d: number; o: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, FLOORY + 0.058, z]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={blobTexture()} transparent opacity={o} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  )
}

export function RoomExtras() {
  const bean = useMat('bean')
  const geo = useMemo(() => new THREE.SphereGeometry(BEAN_RADIUS, 24, 16), [])
  const stool = stoolPos()
  const caseX = (CASE.xBack + CASE.xFront) / 2 + 0.04
  return (
    <group>
      <group position={[BEAN_X, FLOORY, BEAN_Z]} scale={BEAN_SCALE}>
        <mesh geometry={geo} material={bean} position={[0, BEAN_LIFT, 0]} scale={[1, BEAN_SQUASH, 1]} castShadow receiveShadow />
      </group>
      {deskBlobs().map(([x, z, w, d, o], i) => (
        <Blob key={i} x={x} z={z} w={w} d={d} o={o} />
      ))}
      <Blob x={1.2} z={-1.75} w={1.5} d={1.5} o={0.6} />
      <Blob x={stool.x} z={stool.z} w={STOOL.blob.size} d={STOOL.blob.size} o={STOOL.blob.opacity} />
      <Blob x={BEAN_X} z={BEAN_Z} w={2.1 * BEAN_SCALE} d={2.1 * BEAN_SCALE} o={0.55} />
      {CASES.map((c) => (
        <Blob key={c.id} x={caseX} z={(c.zMin + c.zMax) / 2} w={0.9} d={1.7} o={0.45} />
      ))}
    </group>
  )
}
