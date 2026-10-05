import { useEffect, useMemo, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from './runtime'
import { screenAt } from './ambient'
import { GLOW_BASE, GLOW_LAMP_OFF } from './lightingPresets'
import { panel, slab } from './geometry'
import { NEAR_WHITE } from './atlas'
import { WOOD } from './woodPalette'
import { glowTexture } from './glowTexture'
import { drawStandee, STANDEE_TEX } from './standeeDesign'
import { loadFont, SIGN_FONT } from './fonts'
import { Decal, useDecalMaterial } from './Decals'
import { phoneTexture, screenPicture } from './screenDesign'
import { SECTION_ICON } from '../icons'
import { LAPTOP_LID_THICKNESS, LAPTOP_SCREEN_INSET, LAPTOP_SCREEN_LIFT, PHONE_SCREEN_INSET_D, PHONE_SCREEN_INSET_W, PHONE_SCREEN_LIFT, PHONE_STAND_H, phonePlacement } from './screenFrame'
import { hitMaterial } from './hitProxy'
import { useHotspot } from './useHotspot'
import { useScreenMounted } from '../store/focus'
import { content } from '../content'
import { safeHref } from '../ui/parts'
import { room } from '../zones/zone'
import type { CodeProp, V3 } from '../zones/types'

const STAND_WOOD = new THREE.Color(WOOD.deskInset).offsetHSL(0, 0, -0.04).getStyle()
const PHONE_GLOW = '#9DB4F0'
const PHONE_GLOW_OPACITY = GLOW_BASE.phone
export const glowFactor = () => runtime.env.glow * (GLOW_LAMP_OFF + (1 - GLOW_LAMP_OFF) * runtime.lampLevel)
const FACE_LIFT_DAY = 0.03
const FACE_LIFT_NIGHT = 0.22
const FACE_LIFT_LAMP_OFF = 0.6
const FACE_EMISSIVE = '#FFF1DC'
const STANDEE = { boardW: 0.42, boardT: 0.012, tilt: 0.14, baseH: 0.04, glow: '#FFC37A', glowOpacity: GLOW_BASE.standee }

function usePictureMaterial(map: THREE.Texture) {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map, toneMapped: false }), [map])
  useEffect(() => () => m.dispose(), [m])
  return m
}

const fixed = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0 })

function Laptop({ p }: { p: CodeProp }) {
  const [w, d, h] = p.size
  const lidH = d
  const lidD = LAPTOP_LID_THICKNESS
  const white = useMemo(() => fixed(NEAR_WHITE), [])
  const mounted = useScreenMounted('skills')
  const screen = usePictureMaterial(screenPicture('skills', mounted))
  useEffect(() => () => white.dispose(), [white])
  useFrame(() => screen.color.setScalar(screenAt(2.9)))
  const tilt = -((p.lidAngle ?? 105) - 90) * (Math.PI / 180)
  return (
    <>
      <mesh geometry={slab(w, d, h, 0.04, 0.015)} material={white} castShadow receiveShadow />
      {}
      <group position={[0, h, -d / 2]} rotation={[tilt, 0, 0]}>
        <mesh geometry={panel(w, lidH, lidD, 0.04, 0.012)} material={white} position={[0, lidH / 2, lidD / 2]} castShadow receiveShadow />
        <mesh material={screen} position={[0, lidH / 2, lidD + LAPTOP_SCREEN_LIFT]} raycast={() => null}>
          <planeGeometry args={[w - LAPTOP_SCREEN_INSET, lidH - LAPTOP_SCREEN_INSET]} />
        </mesh>
      </group>
    </>
  )
}

function Phone({ p }: { p: CodeProp }) {
  const [w, d, t] = p.size
  const { beta, y } = phonePlacement(p)
  const body = useMemo(() => fixed('#CDB8E8'), [])
  const wood = useMemo(() => fixed(STAND_WOOD), [])
  const screen = usePictureMaterial(phoneTexture())
  const glow = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glowTexture(w, d, 0.05), color: PHONE_GLOW, transparent: true, opacity: PHONE_GLOW_OPACITY, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [w, d],
  )
  useEffect(() => () => { body.dispose(); wood.dispose(); glow.dispose() }, [body, wood, glow])
  useFrame(() => {
    glow.opacity = PHONE_GLOW_OPACITY * glowFactor()
    screen.color.setScalar(screenAt(4.4))
  })
  return (
    <>
      {}
      <mesh geometry={slab(w + 0.04, 0.2, PHONE_STAND_H, 0.015, 0.008)} material={wood} castShadow receiveShadow />
      <mesh geometry={slab(w + 0.04, 0.025, PHONE_STAND_H + 0.025, 0.008, 0.005)} material={wood} position={[0, 0, 0.09]} castShadow receiveShadow />
      <group position={[0, y, 0]} rotation={[beta, 0, 0]}>
        <mesh geometry={slab(w, d, t, 0.04, 0.015)} material={body} position={[0, -t / 2, 0]} castShadow receiveShadow />
        <mesh material={screen} rotation={[-Math.PI / 2, 0, 0]} position={[0, t / 2 + PHONE_SCREEN_LIFT, 0]} raycast={() => null}>
          <planeGeometry args={[w - PHONE_SCREEN_INSET_W, d - PHONE_SCREEN_INSET_D]} />
        </mesh>
        <mesh material={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, t / 2 + 0.0004, 0]} raycast={() => null}>
          <planeGeometry args={[w + 0.1, d + 0.1]} />
        </mesh>
      </group>
    </>
  )
}

function Standee({ p }: { p: CodeProp }) {
  const [w, d] = p.size
  const bw = STANDEE.boardW
  const bh = bw * Math.SQRT2
  const wood = useMemo(() => fixed(STAND_WOOD), [])
  const edge = useMemo(() => fixed(NEAR_WHITE), [])
  const { cv, tex, face } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = STANDEE_TEX[0]
    cv.height = STANDEE_TEX[1]
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { cv, tex, face: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, emissive: new THREE.Color(FACE_EMISSIVE), emissiveMap: tex, emissiveIntensity: FACE_LIFT_DAY }) }
  }, [])
  const glow = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glowTexture(w, d, 0.1), color: STANDEE.glow, transparent: true, opacity: STANDEE.glowOpacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [w, d],
  )
  useEffect(() => {
    let alive = true
    let photo: HTMLImageElement | null = null
    const draw = () => {
      drawStandee(cv, photo)
      tex.needsUpdate = true
    }
    draw()
    loadFont(`600 40px ${SIGN_FONT}`, content.identity.name || 'A').then((ok) => alive && ok && draw())
    const src = safeHref(content.about.photo ?? '')
    if (src) {
      const img = new Image()
      img.onload = () => {
        if (!alive) return
        photo = img
        draw()
      }
      img.src = src
    }
    return () => {
      alive = false
      wood.dispose(); edge.dispose(); face.dispose(); glow.dispose(); tex.dispose()
    }
  }, [cv, tex, wood, edge, face, glow])
  useFrame(() => {
    glow.opacity = STANDEE.glowOpacity * glowFactor()
    face.emissiveIntensity = (FACE_LIFT_DAY + (FACE_LIFT_NIGHT - FACE_LIFT_DAY) * runtime.env.tone) * (FACE_LIFT_LAMP_OFF + (1 - FACE_LIFT_LAMP_OFF) * runtime.lampLevel)
  })
  const zb = d / 2 - 0.05
  return (
    <>
      <mesh material={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} raycast={() => null}>
        <planeGeometry args={[w + 0.2, d + 0.2]} />
      </mesh>
      <mesh geometry={slab(w, d, STANDEE.baseH, 0.02, 0.008)} material={wood} castShadow receiveShadow />
      <mesh geometry={slab(w, 0.02, STANDEE.baseH + 0.025, 0.008, 0.005)} material={wood} position={[0, 0, d / 2 - 0.01]} castShadow receiveShadow />
      <group position={[0, STANDEE.baseH, zb]} rotation={[-STANDEE.tilt, 0, 0]}>
        <mesh geometry={panel(bw, bh, STANDEE.boardT, 0.012, 0.004)} material={edge} position={[0, bh / 2, 0]} castShadow receiveShadow />
        <mesh material={face} position={[0, bh / 2, STANDEE.boardT / 2 + 0.0006]} raycast={() => null}>
          <planeGeometry args={[bw - 0.01, bh - 0.01]} />
        </mesh>
      </group>
    </>
  )
}

const PAD = 0.04

function hitBox(p: CodeProp): { c: V3; s: V3 } {
  const [w, d, h] = p.size
  let mn: V3 = [-w / 2, 0, -d / 2]
  let mx: V3 = [w / 2, h, d / 2]
  if (p.kind === 'phone') {
    const a = p.tilt ?? 0.26
    mn = [-w / 2, 0, -(d / 2) * Math.sin(a) - 0.1]
    mx = [w / 2, PHONE_STAND_H + d * Math.cos(a) + h, 0.12]
  }
  if (p.kind === 'standee') {
    mn = [-w / 2, 0, -d / 2 - 0.08]
    mx = [w / 2, h, d / 2]
  }
  if (p.kind === 'laptop') {
    const th = ((p.lidAngle ?? 105) - 90) * (Math.PI / 180)
    const t = d
    mn = [mn[0], 0, -d / 2 - t * Math.sin(th)]
    mx = [mx[0], h + t * Math.cos(th) + 0.03 * Math.sin(th), d / 2]
  }
  return { c: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], s: [mx[0] - mn[0] + 2 * PAD, mx[1] - mn[1] + 2 * PAD, mx[2] - mn[2] + 2 * PAD] }
}

function CodeDecal({ p }: { p: CodeProp }) {
  const d = p.decal!
  const material = useDecalMaterial(SECTION_ICON[p.hotspot!.contentKey], d.tone ?? 'dark')
  return <Decal material={material} size={d.size} position={d.position} rotation={d.rotation} />
}

function Hot({ p, children }: { p: CodeProp; children: ReactNode }) {
  const handlers = useHotspot(p.hotspot!)
  const hb = hitBox(p)
  return (
    <group position={p.position} rotation={[0, p.rotationY, 0]} {...handlers}>
      <group scale={p.scale ?? 1}>
        {children}
        {p.decal && p.hotspot && <CodeDecal p={p} />}
        <mesh position={hb.c} material={hitMaterial}>
          <boxGeometry args={hb.s} />
        </mesh>
      </group>
    </group>
  )
}

export function CodeProps() {
  return (
    <>
      {room.codeProps.map((p) => (
        <Hot key={p.id} p={p}>
          {p.kind === 'laptop' ? <Laptop p={p} /> : p.kind === 'phone' ? <Phone p={p} /> : <Standee p={p} />}
        </Hot>
      ))}
    </>
  )
}
