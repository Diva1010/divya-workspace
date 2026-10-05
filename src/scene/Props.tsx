import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { atlasTexture, prewarmAtlases } from './atlas'
import { makeClickHandlers } from './clickRule'
import { Books } from './Books'
import { Bookcase } from './Bookcase'
import { RightLamp } from './RightLamp'
import { CurrentReadBook } from './CurrentReadBook'
import { Poster } from './Poster'
import { LeftWallDecor } from './LeftWallDecor'
import { AboutFrame } from './AboutFrame'
import { PegBoard } from './PegBoard'
import { ExperienceCards } from './ExperienceCards'
import { Blind } from './Blind'
import { Desk } from './Desk'
import { DeskBooks } from './DeskBooks'
import { Decal, useDecalMaterial } from './Decals'
import { LampHalo } from './LampHalo'
import { PhotoDecal } from './PhotoDecal'
import { hitMaterial } from './hitProxy'
import { BookHit } from './ReadingHits'
import { useHotspot } from './useHotspot'
import { SECTION_ICON } from '../icons'
import { runtime, wallFade } from './runtime'
import { BLOOM, LAMP_SHADOWS_ACTIVE, bloomBoost } from './lightingPresets'
import { THEMES } from './themes'
import { getState, toggleFloorLamp, toggleLamp, useFocus } from '../store/focus'
import { content } from '../content'
import { safeHref } from '../ui/parts'
import { room } from '../zones/zone'
import type { Prop } from '../zones/types'

const BASE = import.meta.env.BASE_URL
const ATLAS_URL = `${BASE}models/furniturebits_texture.png`
const modelUrl = (m: string) => `${BASE}models/${m}.glb`

type Group = 'floor' | 'back' | 'left' | 'right'

const LAMP_SHADE_GLOW = 0.6

function useAtlasMaterial(img: HTMLImageElement, wall: Exclude<Group, 'floor'> | null, emissive?: number) {
  const theme = useFocus((s) => s.theme)
  const mat = useMemo(() => {
    const map = atlasTexture(img, getState().theme)
    const m = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0 })
    if (emissive !== undefined) {
      m.emissive.set(emissive)
      m.emissiveMap = map
      m.emissiveIntensity = 0
    }
    return m
  }, [img, emissive])
  useEffect(() => {
    const t = atlasTexture(img, theme)
    mat.map = t
    if (mat.emissiveMap) mat.emissiveMap = t
  }, [mat, img, theme])
  useEffect(() => {
    if (!wall) return
    wallFade[wall].add(mat)
    return () => {
      wallFade[wall].delete(mat)
    }
  }, [mat, wall])
  useEffect(() => () => mat.dispose(), [mat])
  return mat
}

function cloneWith(scene: THREE.Object3D, pick: (m: THREE.Mesh) => THREE.Material, shadow: boolean) {
  const o = scene.clone(true)
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const m = c as THREE.Mesh
      m.material = pick(m)
      m.castShadow = shadow
      m.receiveShadow = true
    }
  })
  return o
}

let pastelMaterial: THREE.MeshStandardMaterial | null = null
const getPastelMaterial = () => (pastelMaterial ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }))

function recolored(scene: THREE.Object3D, palette: Record<string, string>, shadow: boolean) {
  const o = scene.clone(true)
  const cache = new Map<string, THREE.Color>()
  const col = (h: string) => cache.get(h) ?? (cache.set(h, new THREE.Color(h)), cache.get(h)!)
  o.traverse((c) => {
    const m = c as THREE.Mesh
    if (!m.isMesh) return
    const g = m.geometry.clone()
    const uv = g.getAttribute('uv')
    const colors = new Float32Array(g.getAttribute('position').count * 3)
    for (let i = 0; i < uv.count; i++) {
      const k = 'r' + Math.min(7, Math.floor(uv.getY(i) * 8)) + 'c' + Math.min(7, Math.floor(uv.getX(i) * 8))
      colors.set(col(palette[k] ?? '#F6EBDD').toArray(), i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    m.geometry = g
    m.material = getPastelMaterial()
    m.castShadow = shadow
    m.receiveShadow = true
  })
  return o
}

function PropModel({ prop, material }: { prop: Prop; material: THREE.Material }) {
  const gltf = useGLTF(modelUrl(prop.model), false)
  const obj = useMemo(() => (prop.palette ? recolored(gltf.scene, prop.palette, prop.shadow ?? false) : cloneWith(gltf.scene, () => material, prop.shadow ?? false)), [gltf, material, prop.shadow, prop.palette])
  const k = room.propScale * prop.scale
  const m = prop.scaleXYZ ?? [1, 1, 1]
  const r = prop.rotation ?? [0, 0, 0]
  return <primitive object={obj} position={prop.position} rotation={[r[0], prop.rotationY + r[1], r[2], 'YXZ']} scale={[k * m[0], k * m[1], k * m[2]]} />
}

function PropDecal({ prop }: { prop: Prop }) {
  const d = prop.decal!
  const material = useDecalMaterial(SECTION_ICON[prop.hotspot!.contentKey], d.tone ?? 'dark', prop.wall)
  const photo = d.photo ? safeHref(content.about.photo ?? '') : undefined
  const [photoReady, setPhotoReady] = useState(false)
  const ready = useCallback(() => setPhotoReady(true), [])
  return (
    <group position={prop.position} rotation={[0, prop.rotationY, 0]}>
      {!photoReady && <Decal material={material} size={d.size} position={d.position} rotation={d.rotation} />}
      {photo && d.photo && <PhotoDecal src={photo} size={d.photo} position={d.position} rotation={d.rotation} wall={prop.wall} onReady={ready} />}
    </group>
  )
}

function HotspotPropModel({ prop, material }: { prop: Prop; material: THREE.Material }) {
  const gltf = useGLTF(modelUrl(prop.model), false)
  const obj = useMemo(() => cloneWith(gltf.scene, () => material, prop.shadow ?? false), [gltf, material, prop.shadow])
  const handlers = useHotspot(prop.hotspot!, { wall: prop.wall })
  const k = room.propScale * prop.scale
  return <primitive object={obj} position={prop.position} rotation={[0, prop.rotationY, 0]} scale={[k, k, k]} {...handlers} />
}

function LampProp({ prop, bodyMaterial, img }: { prop: Prop; bodyMaterial: THREE.Material; img: HTMLImageElement }) {
  const spec = prop.lamp!
  const gl = useThree((s) => s.gl)
  const theme = useFocus((s) => s.theme)
  const gltf = useGLTF(modelUrl(prop.model), false)
  const headMat = useAtlasMaterial(img, null, 0xffb070)
  const obj = useMemo(
    () => cloneWith(gltf.scene, (m) => ((m.material as THREE.Material).name === 'lamp_head' ? headMat : bodyMaterial), LAMP_SHADOWS_ACTIVE ? false : prop.shadow ?? false),
    [gltf, headMat, bodyMaterial, prop.shadow],
  )
  const k = room.propScale * prop.scale
  const ring = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    [],
  )
  useEffect(() => {
    ring.color.set(THEMES[theme].accent)
  }, [ring, theme])
  useEffect(
    () => () => {
      ring.dispose()
    },
    [ring],
  )

  const hover = useRef(false)
  const hv = useRef(0)
  useFrame((_, dtRaw) => {
    const e = runtime.env
    const L = runtime.lampLevel
    headMat.emissiveIntensity = e.shade * L * LAMP_SHADE_GLOW
    hv.current += ((hover.current ? 1 : 0) - hv.current) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
    ring.opacity = hv.current * 0.75
  })

  const handlers = useMemo(() => makeClickHandlers(toggleLamp, () => getState().phase !== 'screen'), [])
  const headPos: [number, number, number] = [spec.head[0] * k, spec.head[1] * k, spec.head[2] * k]
  return (
    <group
      position={prop.position}
      rotation={[0, prop.rotationY, 0]}
      {...handlers}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        if (e.nativeEvent.pointerType !== 'mouse') return
        e.stopPropagation()
        hover.current = true
        gl.domElement.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hover.current = false
        gl.domElement.style.cursor = ''
      }}
    >
      <primitive object={obj} scale={[k, k, k]} />
      {}
      <LampHalo position={headPos} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={ring} raycast={() => null}>
        <ringGeometry args={[spec.ring * 0.82, spec.ring, 48]} />
      </mesh>
      {spec.hit.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x * k, y * k, z * k]} material={hitMaterial}>
          <sphereGeometry args={[r * k, 12, 10]} />
        </mesh>
      ))}
    </group>
  )
}

function FloorLampProp({ prop, bodyMaterial, img }: { prop: Prop; bodyMaterial: THREE.Material; img: HTMLImageElement }) {
  const spec = prop.lamp!
  const gl = useThree((s) => s.gl)
  const gltf = useGLTF(modelUrl(prop.model), false)
  const headMat = useAtlasMaterial(img, null, 0xffb070)
  const obj = useMemo(() => cloneWith(gltf.scene, (m) => ((m.material as THREE.Material).name === 'lamp_head' ? headMat : bodyMaterial), prop.shadow ?? false), [gltf, headMat, bodyMaterial, prop.shadow])
  const k = room.propScale * prop.scale
  const hitGeometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    for (const [x, y, z, w, h, d] of spec.hitBoxes ?? []) parts.push(new THREE.BoxGeometry(w * k, h * k, d * k).translate(x * k, y * k, z * k))
    for (const [x, y, z, r] of spec.hit) parts.push(new THREE.SphereGeometry(r * k, 14, 10).translate(x * k, y * k, z * k))
    const g = mergeGeometries(parts)!
    parts.forEach((p) => p.dispose())
    return g
  }, [spec, k])
  useEffect(() => () => hitGeometry.dispose(), [hitGeometry])
  const hover = useRef(false)
  useEffect(() => () => { runtime.floorLampHover = 0 }, [])
  useFrame((_, dtRaw) => {
    const e = runtime.env
    headMat.emissiveIntensity = bloomBoost(e.shade * runtime.floorLampLevel * LAMP_SHADE_GLOW, BLOOM.boostBeads)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const goal = hover.current ? 1 : 0
    runtime.floorLampHover = reduced ? goal : runtime.floorLampHover + (goal - runtime.floorLampHover) * Math.min(1, Math.min(dtRaw, 0.05) * 10)
  })
  const click = useMemo(() => makeClickHandlers(toggleFloorLamp, () => getState().phase !== 'screen'), [])
  return (
    <group position={prop.position} rotation={[0, prop.rotationY, 0]}>
      <primitive object={obj} scale={[k, k, k]} />
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse') return
          e.stopPropagation()
          hover.current = true
          gl.domElement.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hover.current = false
          gl.domElement.style.cursor = ''
        }}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          if (e.nativeEvent.pointerType !== 'mouse') hover.current = true
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
      />
    </group>
  )
}

function PropGroup({ group, img }: { group: Group; img: HTMLImageElement }) {
  const material = useAtlasMaterial(img, group === 'floor' ? null : group)
  const list = room.props.filter((p) => (p.wall ?? 'floor') === group)
  return (
    <>
      {list.map((p) => (
        <Fragment key={p.id}>
          {p.interaction === 'floorLamp' && p.lamp ? (
            <FloorLampProp prop={p} bodyMaterial={material} img={img} />
          ) : p.id === 'photo-frame' ? null : p.interaction === 'lamp' && p.lamp ? (
            <LampProp prop={p} bodyMaterial={material} img={img} />
          ) : p.hotspot?.contentKey === 'currentRead' ? (
            <>
              <CurrentReadBook prop={p} />
              <BookHit prop={p} />
            </>
          ) : p.hotspot ? (
            <HotspotPropModel prop={p} material={material} />
          ) : (
            <PropModel prop={p} material={material} />
          )}
          {p.decal && p.hotspot && <PropDecal prop={p} />}
        </Fragment>
      ))}
    </>
  )
}

const GROUPS: Group[] = ['floor', 'back', 'left', 'right']

function PropsInner() {
  const img = useLoader(THREE.ImageLoader, ATLAS_URL)
  useEffect(() => {
    prewarmAtlases(img, getState().theme)
  }, [img])
  return (
    <>
      {GROUPS.filter((g) => room.props.some((p) => (p.wall ?? 'floor') === g)).map((g) => (
        <PropGroup key={g} group={g} img={img} />
      ))}
    </>
  )
}

export function Props() {
  return (
    <group>
      <Suspense fallback={null}>
        <PropsInner />
      </Suspense>
      <Books />
      <Bookcase />
      <RightLamp />
      <Poster />
      <LeftWallDecor />
      <AboutFrame />
      <PegBoard />
      <ExperienceCards />
      <Blind />
      <Desk />
      <DeskBooks />
    </group>
  )
}
