import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { consumeClick, CLICK_MAX_MOVE_PX, CLICK_MAX_MS } from './clickRule'
import { isHovered, setHoverOwner } from './hotspotHover'
import { LABEL_ONLY, MARKERS, markerPos, pickMarker, VISITED_CORE_COLOR, VISITED_DAY_HALO_COLOR, VISITED_MOTE_SPEED, VISITED_OPACITY, VISITED_ORBITING_MOTES, VISITED_PULSE_SECONDS, VISITED_SIZE, type MarkerSpec } from './markers'
import { COARSE, decorTap, FIRST_VISIT, hideHint, isFound, markFound, reducedMotion, setMarkerLabel, trackPointerType, useMarkerUi, lastPointerType } from './markerState'
import { runtime } from './runtime'
import { content, getCurrentRead, getReading, getTravel } from '../content'
import { focus, getState, toggleBlind, toggleFloorLamp, toggleLamp, toggleSideLamp, useFocus } from '../store/focus'
import type { ContentKey } from '../zones/types'

// Tunables. Size, brightness and timing live here.
const BASE_PX = 26
const MIN_PX = 20
const MAX_PX = 36
const SIZE_EXP = 0.5
const HOME_DIST = 20.8
const LIFT = 0.05
const PEAK = 0.8
const HIT_RADIUS_PX = 22
const FADE_S = 0.2
const INTRO_S = 1
const BOOST_HOLD_S = 2.2
const BOOST_EASE_S = 0.8
const BOOST = 1.4
const TOUCH_TIER2 = 0.6
const HIT_RADIUS_TOUCH_PX = 28
const HIT_RELEASE_PX = 6
const HIT_MIN_OPACITY = 0.05
const HOVER_SCALE = 1.2
const HOVER_BRIGHTEN = 0.18
const HOVER_IN_S = 0.15
const HOVER_OUT_S = 0.25
const OBJECT_HOVER_OPACITY = 0.4
const TAP_LABEL_S = 1.5
const HINT_MS = 12000
const HALO_NIGHT_OPACITY = 0.3
const HALO_DAY_OPACITY = 0.9
const COLOR_CORE = '#FFF1D6'
const COLOR_GOLD = '#FFD98A'
const COLOR_HALO = '#E7D2FF'
const COLOR_HALO_DAY = '#C9A8F5'

const VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aData;
attribute float aHover;
uniform float uViewH;
uniform float uVisitedSize;
uniform float uBoost;
varying vec2 vUv;
varying vec3 vD;
varying float vH;
void main() {
  vec4 mv = viewMatrix * vec4(aPos, 1.0);
  float d = length(mv.xyz);
  float px = clamp(${BASE_PX.toFixed(1)} * pow(${HOME_DIST.toFixed(1)} / d, ${SIZE_EXP.toFixed(2)}), ${MIN_PX.toFixed(1)}, ${MAX_PX.toFixed(1)}) * aData.x * mix(1.0, uVisitedSize, aData.w) * mix(1.0, ${HOVER_SCALE.toFixed(2)}, aHover) * uBoost;
  float worldPerPx = 2.0 * d / (uViewH * projectionMatrix[1][1]);
  mv.xyz -= normalize(mv.xyz) * ${LIFT.toFixed(3)};
  mv.xy += position.xy * 2.0 * px * worldPerPx;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy * 2.0;
  vD = aData.yzw;
  vH = aHover;
}
`

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uMotion;
uniform float uDay;
uniform float uOpacity;
uniform vec3 uCore;
uniform vec3 uGold;
uniform vec3 uHalo;
uniform vec3 uHaloDay;
uniform vec3 uVisitedCore;
uniform vec3 uVisitedHaloDay;
uniform float uVisitedPulse;
uniform float uVisitedMoteSpeed;
uniform float uVisitedMotes;
varying vec2 vUv;
varying vec3 vD;
varying float vH;
const float TAU = 6.2831853;
vec2 orbit(float a, float tilt, vec2 r) {
  vec2 e = vec2(cos(a) * r.x, sin(a) * r.y);
  float c = cos(tilt), s = sin(tilt);
  return vec2(c * e.x - s * e.y, s * e.x + c * e.y);
}
float mote(vec2 p, vec2 c) {
  float d = length(p - c);
  return smoothstep(0.07, 0.0, d) + 0.5 * exp(-d * d * 500.0);
}
void main() {
  float phase = vD.x;
  float calm = vD.z;
  float pulse = 1.0 + 0.08 * uMotion * sin(uTime * TAU / mix(2.4, uVisitedPulse, calm) + phase);
  float twinkle = 1.0 - 0.14 * uMotion * (0.5 + 0.5 * sin(uTime * TAU / 1.1 + phase * 2.3));
  vec2 p = vUv / pulse;
  vec2 a = abs(p);
  float s = (pow(a.x, 0.6) + pow(a.y, 0.6)) / pow(0.5, 0.6);
  float body = 1.0 - smoothstep(0.5, 1.0, s);
  float centre = exp(-dot(p, p) * 34.0);
  vec3 core = mix(uCore, uVisitedCore, calm);
  vec3 starCol = mix(core, uGold, smoothstep(0.0, 1.0, s));
  float halo = mix(exp(-dot(vUv, vUv) * 5.0), 1.0 - smoothstep(0.7, 1.7, s), uDay);
  float haloOp = mix(${HALO_NIGHT_OPACITY.toFixed(2)}, ${HALO_DAY_OPACITY.toFixed(2)}, uDay);
  vec3 haloCol = mix(uHalo, mix(uHaloDay, uVisitedHaloDay, calm), uDay);
  float speed = mix(1.0, uVisitedMoteSpeed, calm);
  float second = uMotion * mix(1.0, uVisitedMotes - 1.0, calm);
  float m = uMotion * mote(vUv, orbit(uTime * speed * TAU / 3.2 + phase, 0.5, vec2(0.76, 0.34))) + second * mote(vUv, orbit(-uTime * speed * TAU / 4.5 + phase * 1.7, -0.6, vec2(0.7, 0.3)));
  vec3 rgb = starCol * (body * 0.85 + centre * 0.6) * twinkle + haloCol * halo * haloOp + core * m * 0.8;
  rgb *= 1.0 + ${HOVER_BRIGHTEN.toFixed(2)} * vH;
  rgb = ${PEAK.toFixed(2)} * tanh(rgb / ${PEAK.toFixed(2)});
  float op = clamp(vD.y * uOpacity, 0.0, 1.0);
  float alpha = uDay * clamp(body * 0.85 + halo * haloOp, 0.0, 1.0);
  gl_FragColor = vec4(rgb * op, alpha * op);
  #include <colorspace_fragment>
}
`

const smooth01 = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function useChanged<T>(value: T, cb: (v: T) => void) {
  const prev = useRef(value)
  const fn = useRef(cb)
  fn.current = cb
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value
      fn.current(value)
    }
  }, [value])
}

const ACT: Record<string, (pose?: string) => void> = {
  blind: () => toggleBlind(),
  lamp: () => toggleLamp(),
  floorLamp: () => toggleFloorLamp(),
  sideLamp: () => toggleSideLamp(),
}

function labelOf(m: MarkerSpec) {
  if (m.label) return m.label
  const s = content.sections[m.act as ContentKey]
  return s?.label || m.act
}

const GROUP: Record<string, string> = { blind: 'blind', lamp: 'desk-lamp', floorLamp: 'floor-lamp', sideLamp: 'side-lamp' }
const groupOf = (m: MarkerSpec) => m.pose ?? GROUP[m.act]

// 0..1 how strongly the pointer is on this marker's object (hover owner included).
function objectHover(m: MarkerSpec) {
  switch (m.act) {
    case 'blind': return runtime.blindHover
    case 'floorLamp': return runtime.floorLampHover
    case 'sideLamp': return runtime.sideLampHover
    default: return isHovered(groupOf(m)) ? 1 : 0
  }
}

export function Markers() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const events = useThree((s) => s.events)
  const entries = useMemo(
    () => MARKERS.filter((m) => (m.act === 'reading' ? !!getReading() : m.act === 'currentRead' ? !!getCurrentRead() : m.act === 'travel' ? !!getTravel() : true)),
    [],
  )
  const n = entries.length
  const sparkles = useMarkerUi((s) => s.sparkles)
  const sparklesRef = useRef(sparkles)
  sparklesRef.current = sparkles
  const motion = useMemo(() => (reducedMotion() ? 0 : 1), [])

  const { geo, mat, data, hoverData } = useMemo(() => {
    const data = new Float32Array(n * 4)
    const pos = new Float32Array(n * 3)
    const hoverData = new Float32Array(n)
    entries.forEach((m, i) => {
      pos.set(markerPos(m), i * 3)
      data[i * 4] = m.size
      data[i * 4 + 1] = i * 1.7 + 0.4
    })
    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    geo.setAttribute('uv', quad.getAttribute('uv'))
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3))
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aHover', new THREE.InstancedBufferAttribute(hoverData, 1).setUsage(THREE.DynamicDrawUsage))
    geo.instanceCount = n
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      uniforms: {
        uTime: { value: 0 },
        uViewH: { value: 800 },
        uBoost: { value: 1 },
        uOpacity: { value: 1 },
        uMotion: { value: motion },
        uDay: { value: 0 },
        uCore: { value: new THREE.Color(COLOR_CORE) },
        uGold: { value: new THREE.Color(COLOR_GOLD) },
        uHalo: { value: new THREE.Color(COLOR_HALO) },
        uHaloDay: { value: new THREE.Color(COLOR_HALO_DAY) },
        uVisitedCore: { value: new THREE.Color(VISITED_CORE_COLOR) },
        uVisitedHaloDay: { value: new THREE.Color(VISITED_DAY_HALO_COLOR) },
        uVisitedSize: { value: VISITED_SIZE },
        uVisitedPulse: { value: VISITED_PULSE_SECONDS },
        uVisitedMoteSpeed: { value: VISITED_MOTE_SPEED },
        uVisitedMotes: { value: VISITED_ORBITING_MOTES },
      },
    })
    return { geo, mat, data, hoverData }
  }, [entries, n, motion])
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  const mesh = useRef<THREE.Mesh>(null)
  const cur = useRef<Float32Array>(new Float32Array(n))
  const calm = useRef<Float32Array>(new Float32Array(n))
  const hover = useRef<Float32Array>(new Float32Array(n))
  const intro = useRef({ ready: -1, start: -1 })
  const ui = useRef({ disc: -1, focus: -1, reveal: -1, tap: -1, tapUntil: 0, labelKey: '' })
  const cursor = useRef({ x: 0, y: 0 })
  const hintTimer = useRef(0)

  const idx = (id: string) => entries.findIndex((m) => m.id === id)

  const tmp = useRef(new THREE.Vector3())
  const screenOf = (i: number, rect: DOMRect) => {
    const v = tmp.current.set(...markerPos(entries[i])).project(camera)
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height, ok: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 }
  }
  const idle = () => {
    const s = getState()
    return s.phase === 'idle' && s.active === null
  }
  const centres = useRef<({ x: number; y: number } | null)[]>([])
  const pick = (x: number, y: number, coarse: boolean, hold = false) => {
    if (!idle() || intro.current.start < 0) return -1
    const rect = gl.domElement.getBoundingClientRect()
    const list = centres.current
    for (let i = 0; i < n; i++) {
      const m = entries[i]
      const p = screenOf(i, rect)
      list[i] = p.ok && cur.current[i] > HIT_MIN_OPACITY && !(m.wall && runtime.wallOp[m.wall] < 0.5) ? p : null
    }
    return pickMarker(list, x, y, coarse ? HIT_RADIUS_TOUCH_PX : HIT_RADIUS_PX, hold ? ui.current.disc : -1, hold ? HIT_RELEASE_PX : 0)
  }
  const setOwner = (i: number) => {
    const u = ui.current
    if (u.disc === i) return
    u.disc = i
    setHoverOwner(i >= 0 ? groupOf(entries[i]) : null)
    gl.domElement.style.cursor = i >= 0 ? 'pointer' : ''
  }
  const activate = (i: number) => {
    const m = entries[i]
    const fn = ACT[m.act]
    if (fn) fn()
    else focus(m.act as ContentKey, m.pose)
  }
  const showTap = (id: string) => {
    if (lastPointerType === 'mouse') return
    const i = idx(id)
    if (i < 0) return
    ui.current.tap = i
    ui.current.tapUntil = performance.now() + TAP_LABEL_S * 1000
  }

  const lampOn = useFocus((s) => s.lampOn)
  const floorLampOn = useFocus((s) => s.floorLampOn)
  const sideLampOn = useFocus((s) => s.sideLampOn)
  const blindClosed = useFocus((s) => s.blindClosed)
  const active = useFocus((s) => s.active)
  useChanged(active, (v) => { if (v) entries.forEach((m) => { if (m.act === v) markFound(m.id) }) })
  useChanged(lampOn, () => { markFound('lamp'); showTap('lamp') })
  useChanged(floorLampOn, () => { markFound('floorLamp'); showTap('floorLamp') })
  useChanged(sideLampOn, () => { markFound('sideLamp'); showTap('sideLamp') })
  useChanged(blindClosed, () => { markFound('blind'); showTap('blind') })

  useEffect(() => {
    const el = ((events as { connected?: HTMLElement }).connected ?? gl.domElement.parentElement ?? gl.domElement) as HTMLElement
    let down: { i: number; x: number; y: number; t: number } | null = null
    const leaveDisc = () => setOwner(-1)
    const onDown = (e: PointerEvent) => {
      trackPointerType(e.pointerType)
      const coarse = e.pointerType !== 'mouse'
      const i = pick(e.clientX, e.clientY, coarse)
      if (coarse) setOwner(i)
      down = i >= 0 ? { i, x: e.clientX, y: e.clientY, t: performance.now() } : null
    }
    const onUp = (e: PointerEvent) => {
      const d = down
      down = null
      const coarse = e.pointerType !== 'mouse'
      if (coarse) setOwner(-1)
      if (!d || !idle()) return
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= CLICK_MAX_MOVE_PX || performance.now() - d.t >= CLICK_MAX_MS) return
      if (pick(e.clientX, e.clientY, coarse) !== d.i) return
      consumeClick()
      activate(d.i)
    }
    const onMove = (e: PointerEvent) => {
      trackPointerType(e.pointerType)
      cursor.current.x = e.clientX
      cursor.current.y = e.clientY
      if (e.pointerType !== 'mouse') return
      setOwner(pick(e.clientX, e.clientY, false, true))
    }
    const onCancel = () => { down = null; leaveDisc() }
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('pointerup', onUp, true)
    el.addEventListener('pointermove', onMove, true)
    el.addEventListener('pointercancel', onCancel, true)
    el.addEventListener('pointerleave', leaveDisc, true)
    const keyOf = (t: EventTarget | null) => {
      const b = (t as HTMLElement | null)?.closest?.('[data-nav],[data-marker]') as HTMLElement | null
      return b ? idx(b.dataset.nav ?? b.dataset.marker ?? '') : -1
    }
    const onFocusIn = (e: FocusEvent) => {
      const i = keyOf(e.target)
      if (i >= 0 && (e.target as HTMLElement).matches(':focus-visible')) { ui.current.focus = i; ui.current.reveal = i }
    }
    const onFocusOut = () => { ui.current.focus = -1; ui.current.reveal = -1 }
    const onOver = (e: PointerEvent) => { if (e.pointerType === 'mouse') ui.current.reveal = keyOf(e.target) }
    const onOut = (e: PointerEvent) => { if (e.pointerType === 'mouse' && ui.current.focus < 0) ui.current.reveal = -1 }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    return () => {
      leaveDisc()
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('pointerup', onUp, true)
      el.removeEventListener('pointermove', onMove, true)
      el.removeEventListener('pointercancel', onCancel, true)
      el.removeEventListener('pointerleave', leaveDisc, true)
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
    }
  }, [entries, gl, camera, events])

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const U = mat.uniforms
    const now = state.clock.elapsedTime
    U.uTime.value = now
    U.uViewH.value = state.size.height
    U.uDay.value = 1 - Math.min(1, runtime.env.tone / 0.55)

    const t = intro.current
    if (t.start < 0) {
      const p = useProgress.getState()
      if ((p.total > 0 && !p.active) || now > 8) {
        if (t.ready < 0) t.ready = now
        else if (now - t.ready > 0.4) {
          t.start = now
          hintTimer.current = window.setTimeout(hideHint, HINT_MS)
        }
      }
    }
    const it = t.start < 0 ? -1 : now - t.start
    let boost = 0
    if (FIRST_VISIT && it >= 0 && motion > 0) boost = it < BOOST_HOLD_S ? 1 : 1 - smooth01((it - BOOST_HOLD_S) / BOOST_EASE_S)
    U.uOpacity.value = it < 0 ? 0 : (motion > 0 ? smooth01(it / INTRO_S) : 1) * (1 + (BOOST - 1) * boost)
    U.uBoost.value = 1 + (BOOST - 1) * boost

    const s = getState()
    const open = s.phase !== 'idle' || s.active !== null
    const on = sparklesRef.current
    const u = ui.current
    const step = dt / FADE_S
    let changed = false
    let hchanged = false
    let any = false
    let hoverIdx = -1
    let hoverMax = 0.3
    if (open && u.disc >= 0) setOwner(-1)
    if (u.disc >= 0) gl.domElement.style.cursor = 'pointer'
    const hstepIn = dt / HOVER_IN_S
    const hstepOut = dt / HOVER_OUT_S
    for (let i = 0; i < n; i++) {
      const m = entries[i]
      const owned = u.disc === i
      const strength = open ? 0 : objectHover(m)
      if (!owned && strength > hoverMax) { hoverMax = strength; hoverIdx = i }
      const found = isFound(m.id)
      let base = 0
      if (on && !open) {
        if (m.tier === 1) base = found ? VISITED_OPACITY : 1
        else if (COARSE) base = found ? VISITED_OPACITY : TOUCH_TIER2
        else base = u.reveal === i ? (found ? VISITED_OPACITY : 1) : 0
        if (m.wall) base *= runtime.wallOp[m.wall]
      }
      const goal = owned || !(strength > 0.3 || u.focus === i) ? base : Math.min(base, OBJECT_HOVER_OPACITY)
      const c = cur.current[i]
      const next = Math.abs(goal - c) <= step ? goal : c + Math.sign(goal - c) * step
      if (next !== c) { cur.current[i] = next; data[i * 4 + 2] = next; changed = true }
      const cg = found ? 1 : 0
      const cc = calm.current[i]
      const cn = Math.abs(cg - cc) <= step ? cg : cc + Math.sign(cg - cc) * step
      if (cn !== cc) { calm.current[i] = cn; data[i * 4 + 3] = cn; changed = true }
      const hg = owned ? 1 : 0
      const hc = hover.current[i]
      const hn = hg > hc ? Math.min(hg, hc + hstepIn) : Math.max(hg, hc - hstepOut)
      if (hn !== hc) { hover.current[i] = hn; hoverData[i] = hn; hchanged = true }
      if (next > 0.002) any = true
    }
    if (hchanged) (geo.getAttribute('aHover') as THREE.InstancedBufferAttribute).needsUpdate = true
    if (changed) (geo.getAttribute('aData') as THREE.InstancedBufferAttribute).needsUpdate = true
    if (mesh.current) mesh.current.visible = any

    // Label: a marker under the pointer, keyboard focus and touch taps sit at the marker; hovering the object itself follows the cursor.
    let want: { i: number; at: 'cursor' | 'fixed' | 'marker' } | null = null
    if (!open) {
      if (u.disc >= 0) want = { i: u.disc, at: 'marker' }
      else if (u.focus >= 0) want = { i: u.focus, at: 'fixed' }
      else if (u.tap >= 0 && performance.now() < u.tapUntil) want = { i: u.tap, at: 'fixed' }
      else if (lastPointerType === 'mouse' && hoverIdx >= 0) want = { i: hoverIdx, at: 'cursor' }
      else if (lastPointerType === 'mouse' && isHovered(LABEL_ONLY.group)) want = { i: -1, at: 'cursor' }
      else if (performance.now() < decorTap.until) want = { i: -1, at: 'fixed' }
    }
    const key = want ? `${want.i}:${want.at}` : ''
    if (key !== u.labelKey) {
      u.labelKey = key
      if (!want) setMarkerLabel(null)
      else if (want.i < 0) {
        const tapped = want.at === 'fixed'
        setMarkerLabel({ text: LABEL_ONLY.label, at: want.at, x: tapped ? decorTap.x : cursor.current.x, y: tapped ? decorTap.y : cursor.current.y })
      } else {
        const m = entries[want.i]
        const p = screenOf(want.i, gl.domElement.getBoundingClientRect())
        setMarkerLabel({ text: labelOf(m), at: want.at, x: want.at === 'cursor' ? cursor.current.x : p.x, y: want.at === 'cursor' ? cursor.current.y : p.y })
      }
    }
    if (u.tap >= 0 && performance.now() >= u.tapUntil) u.tap = -1
  })

  useEffect(() => {
    if (sparkles) return
    setMarkerLabel(null)
  }, [sparkles])
  useEffect(() => {
    const el = gl.domElement
    el.addEventListener('pointerdown', hideHint)
    return () => el.removeEventListener('pointerdown', hideHint)
  }, [gl])
  useEffect(() => () => window.clearTimeout(hintTimer.current), [])

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} renderOrder={10000} visible={false} raycast={() => null} />
}
