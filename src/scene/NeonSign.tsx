import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { loadFont, NAME_FONT, SIGN_FONT } from './fonts'
import { ambient } from './ambient'
import { runtime, wallFade } from './runtime'
import { bloomScale } from './lightingPresets'
import { T } from './constants'
import { FILL_FRAC, TEX_W_PX } from './signMetrics'
import { BAND_GAP, NAME_H, NAME_PLANE, SIGN_W, SIGN_X, SIGN_Y, TITLE_H } from './signLayout'
export { BAND_GAP, NAME_H, SIGN_W, SIGN_X, SIGN_Y, TITLE_H }
import { useFocus } from '../store/focus'
import { content } from '../content'

const NAME_COLORS = { day: { tube: '#FF5FC8', core: '#FFA0DC' }, night: { tube: '#FF8AD8', core: '#FFE3F6' }, halo: '#E26BFF' }
const TITLE_COLORS = { day: { tube: '#B07AD0', core: '#D9B8EE' }, night: { tube: '#F2D9FF', core: '#F2D9FF' }, halo: '#FF8AD8' }
const TUBE_LEVEL: [number, number, number] = [0.5, 1.1, 1.1]
const TITLE_HALO_SCALE = 0.7
const TUBE_EM = 0.07
const SHADOW_COLOR = '#1E1450'
const SHADOW_OPACITY = 0.4
const SHADOW_BLUR = 3
const HALO_OPACITY = 0.4
const HALO_BLUR = 1.2
const TITLE_WIDTH = 0.7
const TITLE_TRACK = 0.32
const TEX_W = TEX_W_PX
const SOFT_W = 1024
const FILL = FILL_FRAC
const Z = [0.03, 0.026, 0.022]

interface Face { text: string; font: string; weight: number; track: number; widthFrac: number | null }

function fit(c: CanvasRenderingContext2D, f: Face, width: number, height: number) {
  const at = (px: number) => {
    c.font = `${f.weight} ${px}px ${f.font}`
    return [...f.text].reduce((s, ch) => s + c.measureText(ch).width + f.track * px, 0) - f.track * px
  }
  const base = 100
  let px = Math.min(height * 0.62, (width * base) / at(base))
  px = Math.min(px, height * 0.62)
  return { px, w: at(px), at }
}

function nameFraction(text: string): number {
  const c = document.createElement('canvas').getContext('2d')
  if (!c || !text.trim()) return 0
  const { w } = fit(c, { text, font: NAME_FONT, weight: 400, track: 0, widthFrac: null }, TEX_W * FILL, TEX_W * (NAME_H / SIGN_W))
  return w / TEX_W
}

interface PlaneOpts { w: number; shift: number }
const PLAIN: PlaneOpts = { w: SIGN_W, shift: 0 }

function draw(cv: HTMLCanvasElement, f: Face, kind: 'tube' | 'soft', s: number, tube: string, core: string, blurEm: number, o: PlaneOpts = PLAIN) {
  const c = cv.getContext('2d')
  if (!c) return
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, cv.width, cv.height)
  if (!f.text.trim()) return
  c.setTransform(s, 0, 0, s, 0, 0)
  const W = cv.width / s
  const H = cv.height / s
  const target = f.widthFrac === null ? W * FILL : f.widthFrac * W
  const { px, w, at } = fit(c, f, target, H)
  c.font = `${f.weight} ${px}px ${f.font}`
  c.textAlign = 'left'
  c.textBaseline = 'middle'
  c.lineJoin = 'round'
  c.lineWidth = TUBE_EM * px
  if (kind === 'soft') {
    c.fillStyle = '#fff'
    c.strokeStyle = '#fff'
    c.shadowColor = '#fff'
    c.shadowBlur = blurEm * TUBE_EM * px * s
  } else {
    c.fillStyle = core
    c.strokeStyle = tube
  }
  void at
  const k = W / o.w
  const x0 = (W - w) / 2 + o.shift * k
  let x = x0
  for (const ch of f.text) {
    c.strokeText(ch, x, H / 2)
    c.fillText(ch, x, H / 2)
    x += c.measureText(ch).width + f.track * px
  }
}

interface Line { face: Face; h: number; y: number; colors: typeof NAME_COLORS; haloScale: number; id: string; plane?: PlaneOpts; dx?: number }

function SignLine({ line, day }: { line: Line; day: boolean }) {
  const parts = useMemo(() => {
    const pw = line.plane?.w ?? SIGN_W
    const ratio = pw / SIGN_W
    const aspect = pw / line.h
    const mk = (w: number) => {
      const cv = document.createElement('canvas')
      cv.width = w
      cv.height = Math.max(2, Math.round(w / aspect))
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return { cv, t }
    }
    const tube = mk(Math.round(TEX_W * ratio))
    const halo = mk(Math.round(SOFT_W * ratio))
    const shadow = mk(Math.round(SOFT_W * ratio))
    const tubeMat = new THREE.MeshBasicMaterial({ map: tube.t, transparent: true, depthWrite: false, toneMapped: false })
    tubeMat.userData.fadeOpacityOnly = true
    tubeMat.color.setScalar(TUBE_LEVEL[1])
    const haloMat = new THREE.MeshBasicMaterial({ map: halo.t, color: line.colors.halo, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadow.t, color: SHADOW_COLOR, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
    return { tube, halo, shadow, tubeMat, haloMat, shadowMat }
  }, [line.h, line.id])

  useEffect(() => {
    let alive = true
    const set = day ? line.colors.day : line.colors.night
    const paint = () => {
      draw(parts.tube.cv, line.face, 'tube', 1, set.tube, set.core, 0, line.plane)
      draw(parts.halo.cv, line.face, 'soft', SOFT_W / TEX_W, set.tube, set.core, HALO_BLUR, line.plane)
      draw(parts.shadow.cv, line.face, 'soft', SOFT_W / TEX_W, set.tube, set.core, SHADOW_BLUR, line.plane)
      for (const p of [parts.tube, parts.halo, parts.shadow]) p.t.needsUpdate = true
    }
    paint()
    loadFont(`${line.face.weight} 100px ${line.face.font}`, line.face.text || 'A').then((ok) => {
      if (alive && ok) paint()
    })
    wallFade.back.add(parts.tubeMat)
    return () => {
      alive = false
      wallFade.back.delete(parts.tubeMat)
      parts.tubeMat.dispose()
      parts.haloMat.dispose()
      parts.shadowMat.dispose()
      for (const p of [parts.tube, parts.halo, parts.shadow]) p.t.dispose()
    }
  }, [parts, line, day])

  useFrame(() => {
    const f = runtime.wallOp.back
    parts.haloMat.opacity = bloomScale(HALO_OPACITY * line.haloScale * (0.7 + 0.3 * (runtime.env.halo / 2.3)) * f * ambient.sign)
    parts.shadowMat.opacity = SHADOW_OPACITY * f
    const tone = runtime.env.tone
    parts.tubeMat.color.setScalar((tone <= 0.55 ? TUBE_LEVEL[0] + ((TUBE_LEVEL[1] - TUBE_LEVEL[0]) * tone) / 0.55 : TUBE_LEVEL[1] + ((TUBE_LEVEL[2] - TUBE_LEVEL[1]) * (tone - 0.55)) / 0.45) * ambient.signTube)
  })

  if (!line.face.text.trim()) return null
  const geo = <planeGeometry args={[line.plane?.w ?? SIGN_W, line.h]} />
  return (
    <group position={[line.dx ?? 0, line.y, 0]}>
      <mesh material={parts.shadowMat} position={[0, 0, Z[2]]} raycast={() => null}>{geo}</mesh>
      <mesh material={parts.haloMat} position={[0, 0, Z[1]]} raycast={() => null}>{geo}</mesh>
      <mesh material={parts.tubeMat} position={[0, 0, Z[0]]} raycast={() => null}>{geo}</mesh>
    </group>
  )
}

export function NeonSign() {
  const { name, title } = content.identity
  const total = NAME_H + BAND_GAP + TITLE_H
  const [nameFrac, setNameFrac] = useState(() => nameFraction(name))
  useEffect(() => {
    let alive = true
    loadFont(`400 100px ${NAME_FONT}`, name || 'A').then((ok) => alive && ok && setNameFrac(nameFraction(name)))
    return () => {
      alive = false
    }
  }, [name])
  const day = useFocus((s) => s.time) === 'day'
  const lines: Line[] = [
    { face: { text: name, font: NAME_FONT, weight: 400, track: 0, widthFrac: null }, h: NAME_H, y: total / 2 - NAME_H / 2, colors: NAME_COLORS, haloScale: 1, id: 'name', plane: { w: NAME_PLANE.w, shift: NAME_PLANE.shift }, dx: NAME_PLANE.dx },
    { face: { text: title.toUpperCase(), font: SIGN_FONT, weight: 600, track: TITLE_TRACK, widthFrac: nameFrac ? Math.min(0.95, TITLE_WIDTH * nameFrac) : null }, h: TITLE_H, y: total / 2 - NAME_H - BAND_GAP - TITLE_H / 2, colors: TITLE_COLORS, haloScale: TITLE_HALO_SCALE, id: 'title' },
  ]
  return (
    <group position={[SIGN_X, SIGN_Y, T / 2]}>
      {lines.map((l) => <SignLine key={l.id} line={l} day={day} />)}
    </group>
  )
}
