import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js'
import { chooseScreen, getState, settle, useFocus, type Pose } from '../store/focus'
import { room } from '../zones/zone'
import { fitDistance, fovForAspect, SIDE_SHEET_MAX_PX } from './poseFit'
import { BAND_GAP, NAME_H, SIGN_W, SIGN_X, SIGN_Y, TITLE_H } from './NeonSign'

const HOME = {
  pos: new THREE.Vector3(...room.camera.home.position),
  tgt: new THREE.Vector3(...room.camera.home.target),
}
const HOME_SIGN_CLEARANCE = 12
const HOME_SHIFT_MAX = 0.12
const SIGN_TOP = SIGN_Y + (NAME_H + BAND_GAP + TITLE_H) / 2
const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface Glide {
  t: number
  dur: number
  p0: THREE.Vector3
  t0: THREE.Vector3
  p1: THREE.Vector3
  t1: THREE.Vector3
}

function resolvePose(pose: Pose, aspect: number, width: number): { pos: THREE.Vector3; target: THREE.Vector3 } {
  const target = new THREE.Vector3(...pose.target)
  if (!pose.dir || pose.distance === undefined) return { pos: new THREE.Vector3(...pose.pos), target }
  const dir = new THREE.Vector3(...pose.dir)
  const tall = aspect < 1.2
  let d = tall && pose.tallDistance ? pose.tallDistance : pose.distance
  if (pose.fit) d = fitDistance(d, pose.fit.width, aspect, pose.target, pose.fit.dir)
  const pos = target.clone().addScaledVector(dir, d)
  const sheet = pose.sideCard ? width <= SIDE_SHEET_MAX_PX : tall
  const shift = pose.shift ? (sheet ? pose.shift.tall : pose.shift.wide) : null
  if (shift && (shift[0] !== 0 || shift[1] !== 0)) {
    const fwd = dir.clone().negate()
    const right = fwd.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
    const up = right.clone().cross(fwd).normalize()
    const viewH = 2 * d * Math.tan((fovForAspect(aspect) * Math.PI) / 360)
    const delta = right.multiplyScalar(-shift[0] * viewH * aspect).addScaledVector(up, -shift[1] * viewH)
    pos.add(delta)
    target.add(delta)
  }
  return { pos, target }
}

function homeFraming(canvas: HTMLCanvasElement, width: number, height: number): { pos: THREE.Vector3; tgt: THREE.Vector3 } {
  const pos = HOME.pos.clone()
  const tgt = HOME.tgt.clone()
  const rects = [document.querySelector('nav.menu'), document.querySelector('#stage > .title')].filter((e): e is Element => !!e).map((e) => e.getBoundingClientRect())
  if (!rects.length || width < 1 || height < 1) return { pos, tgt }
  const aspect = width / height
  const fov = fovForAspect(aspect)
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 120)
  const box = canvas.getBoundingClientRect()
  const z = -room.bounds.halfWidth
  const corners = [-1, 1].map((k) => new THREE.Vector3(SIGN_X + (k * SIGN_W) / 2, SIGN_TOP, z))
  let moved = 0
  for (let i = 0; i < 4; i++) {
    cam.position.copy(pos)
    cam.lookAt(tgt)
    cam.updateMatrixWorld()
    const p = corners.map((c) => { const v = c.clone().project(cam); return { x: box.left + ((v.x + 1) / 2) * width, y: box.top + ((1 - v.y) / 2) * height } })
    const x0 = Math.min(p[0].x, p[1].x)
    const x1 = Math.max(p[0].x, p[1].x)
    const top = Math.min(p[0].y, p[1].y)
    let need = 0
    for (const r of rects) if (r.left < x1 && r.right > x0) need = Math.max(need, r.bottom + HOME_SIGN_CLEARANCE - top)
    const dy = Math.min(need, HOME_SHIFT_MAX * height - moved)
    if (dy <= 0.5) break
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion)
    const viewH = 2 * pos.distanceTo(tgt) * Math.tan((fov * Math.PI) / 360)
    const delta = up.multiplyScalar((dy / height) * viewH)
    pos.add(delta)
    tgt.add(delta)
    moved += dy
  }
  return { pos, tgt }
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const active = useFocus((s) => s.active)
  const nonce = useFocus((s) => s.resetNonce)
  const gl = useThree((s) => s.gl)
  const home = useRef({ pos: HOME.pos.clone(), tgt: HOME.tgt.clone() })
  const glide = useRef<Glide | null>(null)
  const saved = useRef<{ p: THREE.Vector3; t: THREE.Vector3 } | null>(null)
  const prevActive = useRef(active)
  const prevNonce = useRef(nonce)

  useEffect(() => {
    const a = size.width / Math.max(size.height, 1)
    camera.fov = fovForAspect(a)
    camera.updateProjectionMatrix()
  }, [size, camera])

  useEffect(() => {
    if (!controls) return
    const refresh = () => {
      const next = homeFraming(gl.domElement, size.width, size.height)
      const prev = home.current
      const resting = getState().active === null && !glide.current && camera.position.distanceTo(prev.pos) < 0.02 && controls.target.distanceTo(prev.tgt) < 0.02
      home.current = next
      if (resting) {
        camera.position.copy(next.pos)
        controls.target.copy(next.tgt)
        camera.lookAt(next.tgt)
        controls.update()
      }
    }
    refresh()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(refresh) : null
    for (const e of [document.querySelector('nav.menu'), document.querySelector('#stage > .title')]) if (e) ro?.observe(e)
    return () => ro?.disconnect()
  }, [controls, size, camera, gl])

  const flyTo = (pos: THREE.Vector3, tgt: THREE.Vector3, dur: number) => {
    if (!controls) return
    glide.current = {
      t: 0,
      dur: reduceMotion() ? 0.001 : dur,
      p0: camera.position.clone(),
      t0: controls.target.clone(),
      p1: pos.clone(),
      t1: tgt.clone(),
    }
    controls.enabled = false
  }

  useEffect(() => {
    if (!controls || active === prevActive.current) return
    prevActive.current = active
    if (active) {
      const { activePose, poses } = getState()
      let poseId = activePose
      let pose = poseId ? poses[poseId] : undefined
      if (!pose) return
      const aspect = size.width / Math.max(size.height, 1)
      if (pose.screen) {
        const dist = Math.hypot(pose.pos[0] - pose.target[0], pose.pos[1] - pose.target[1], pose.pos[2] - pose.target[2])
        const viewWidth = 2 * dist * Math.tan((fovForAspect(aspect) * Math.PI) / 360) * aspect
        const px = (pose.screen.width / viewWidth) * size.width
        const use = px >= pose.screen.minPx
        if (!use && pose.screen.fallbackPose) {
          poseId = pose.screen.fallbackPose
          pose = poses[poseId] ?? pose
          chooseScreen(false, poseId)
        } else {
          if (!use && pose.dir) pose = { ...pose, distance: (dist * px) / pose.screen.minPx }
          chooseScreen(true, poseId)
        }
      } else if (pose.wallView) {
        chooseScreen(true, poseId)
      }
      if (!saved.current) saved.current = { p: camera.position.clone(), t: controls.target.clone() }
      const resolved = resolvePose(pose, aspect, size.width)
      const pos = resolved.pos
      const target = resolved.target
      controls.minDistance = Math.min(room.camera.orbit.minDistance, pos.distanceTo(target) * 0.98)
      flyTo(pos, target, room.camera.glideSeconds)
    } else if (saved.current) {
      flyTo(saved.current.p, saved.current.t, room.camera.backSeconds)
      saved.current = null
    } else {
      flyTo(home.current.pos, home.current.tgt, room.camera.backSeconds)
    }
  }, [active, controls])

  useEffect(() => {
    if (!controls || nonce === prevNonce.current) return
    prevNonce.current = nonce
    saved.current = null
    prevActive.current = null
    flyTo(home.current.pos, home.current.tgt, room.camera.backSeconds)
  }, [nonce, controls])

  useFrame((_, dtRaw) => {
    const g = glide.current
    if (!g || !controls) return
    g.t += Math.min(dtRaw, 0.05)
    const k = Math.min(1, Math.max(0, g.t / g.dur))
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
    camera.position.lerpVectors(g.p0, g.p1, e)
    controls.target.lerpVectors(g.t0, g.t1, e)
    camera.lookAt(controls.target)
    if (k >= 1) {
      glide.current = null
      if (getState().active === null) controls.minDistance = room.camera.orbit.minDistance
      controls.enabled = !getState().screenUi || getState().active === null
      controls.update()
      settle()
    }
  })

  return null
}
