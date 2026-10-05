import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  BRASS, DIPLOMA_PX_PER_M, DISC, drawDiploma, drawEmblem, drawPlate, EMISSIVE_PX_PER_M, FRAME_COLOR, FRAME_HALO_REACH, FRAME_HALO_STRENGTH,
  GLOW_HALO_BASE, GOLD, HALO_BLUR, HALO_SCALE, LIGHT_BASE, LIGHT_COLOR, LIGHT_FOCUS, LIGHT_RATE, PAPER_LIFT,
  CEILING_Y, PAPER_GLOW, SLAT_EMISSIVE, TITLE_NIGHT, byTone, SLAT_EMISSIVE_COLOR, LED_COLOR, LED_W, LIGHT_BAR, LIGHT_BAR_INTENSITY, MEDAL_HALO, MEDAL_HALO_K, SPILL, SHADOW_DROP, SHADOW_OPACITY, SHADOW_REACH, SLAT_BACKING, SLAT_BASE, SLAT_W, SLAT_TINT, STUD_R, STUD_T, WALL_SEED, type Rect,
} from './degreeDesign'
import { archPieces, ATLAS, buildDecorGeometry, DECOR_Z, drawDecorAtlas, NOTE_FONT, NOTE_SLOTS } from './degreeDecor'
import { CERT_FONT, loadFont } from './fonts'
import { mulberry, panel } from './geometry'
import { glowTexture } from './glowTexture'
import { hitMaterial } from './hitProxy'
import { haloTexture } from './LampHalo'
import { BLOOM, bloomBoost, bloomScale, SWEEP } from './lightingPresets'
import { ambient } from './ambient'
import { runtime, wallFade } from './runtime'
import { markInside } from './wallView'
import { useHotspot } from './useHotspot'
import { useWallMat } from './wallMat'
import { T } from './constants'
import { content } from '../content'
import { degreeWall } from '../zones/zone'
import { getState } from '../store/focus'

const HIT_PAD = 0.04
const LIFT = 0.002
const SEG = { curve: 3, bevel: 2 }
const WHITE = new THREE.Color(0xffffff)
const hot = (c: string) => new THREE.Color(c).lerp(WHITE, 0.35)

const fontSample = () => {
  const { heading, tagline, items } = content.education
  return [heading, tagline, ...items.flatMap((i) => [i.degree, i.institution, i.years, i.location ?? '', i.status, i.details ?? ''])].join(' ') || 'A'
}

const light = { level: -1 }
function stepLight(dt: number) {
  const st = getState()
  const target = Math.max(LIGHT_BASE[st.time], st.phase === 'screen' && st.active === 'education' ? LIGHT_FOCUS : 0)
  light.level = light.level < 0 ? target : light.level + (target - light.level) * Math.min(1, dt * LIGHT_RATE)
}

let glowMap: THREE.CanvasTexture | null = null
function glowTextureDown() {
  if (glowMap) return glowMap
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const c = cv.getContext('2d')!
  c.setTransform(1, 0, 0, 2, 64, 0)
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.4)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.fillRect(-64, 0, 128, 64)
  glowMap = new THREE.CanvasTexture(cv)
  glowMap.colorSpace = THREE.SRGBColorSpace
  return glowMap
}

function Emissive({ x, y, z, w, h, margin, draw, color, boost = BLOOM.boostGold, halo = GOLD, plain = false, glow = !plain, haloK = 1, nightDim = false }: { x: number; y: number; z: number; w: number; h: number; margin: number; draw: (c: CanvasRenderingContext2D, r: Rect) => void; color?: string; boost?: number; halo?: string; plain?: boolean; glow?: boolean; haloK?: number; nightDim?: boolean }) {
  const parts = useMemo(() => {
    const W = Math.round((w + 2 * margin) * EMISSIVE_PX_PER_M)
    const H = Math.round((h + 2 * margin) * EMISSIVE_PX_PER_M)
    const scales = glow ? [1, HALO_SCALE, HALO_SCALE] : [1]
    const canvases = scales.map((s) => {
      const cv = document.createElement('canvas')
      cv.width = Math.max(2, Math.round(W * s))
      cv.height = Math.max(2, Math.round(H * s))
      return cv
    })
    const textures = canvases.map((cv) => {
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return t
    })
    const core = new THREE.MeshBasicMaterial({ map: textures[0], color: plain ? new THREE.Color(0xffffff) : (color ? new THREE.Color(color) : hot(GOLD)).multiplyScalar(bloomBoost(1, boost)), transparent: true, depthWrite: false, toneMapped: false })
    core.userData.fadeOpacityOnly = true
    const halos = (glow ? [1, 2] : []).map((i) => new THREE.MeshBasicMaterial({ map: textures[i], color: halo, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    return { W, H, scales, canvases, textures, core, halos }
  }, [w, h, margin, color, boost, halo, plain, glow])

  useEffect(() => {
    let alive = true
    const rect: Rect = { x: margin * EMISSIVE_PX_PER_M, y: margin * EMISSIVE_PX_PER_M, w: w * EMISSIVE_PX_PER_M, h: h * EMISSIVE_PX_PER_M }
    const paint = () => {
      parts.canvases.forEach((cv, i) => {
        const c = cv.getContext('2d')
        if (!c) return
        c.setTransform(1, 0, 0, 1, 0, 0)
        c.clearRect(0, 0, cv.width, cv.height)
        c.setTransform(parts.scales[i], 0, 0, parts.scales[i], 0, 0)
        c.fillStyle = '#fff'
        c.strokeStyle = '#fff'
        c.shadowColor = '#fff'
        c.shadowBlur = i === 0 ? 0 : HALO_BLUR[i - 1]
        draw(c, rect)
      })
      parts.textures.forEach((t) => (t.needsUpdate = true))
    }
    paint()
    loadFont(`700 40px ${CERT_FONT}`, fontSample()).then((ok) => {
      if (alive && ok) paint()
    })
    wallFade.right.add(parts.core)
    return () => {
      alive = false
      wallFade.right.delete(parts.core)
      parts.core.dispose()
      parts.halos.forEach((m) => m.dispose())
      parts.textures.forEach((t) => t.dispose())
    }
  }, [parts, draw, w, h, margin])

  useFrame(() => {
    const f = runtime.wallOp.right
    if (nightDim) parts.core.color.setScalar(1 - (1 - TITLE_NIGHT) * runtime.env.tone)
    parts.halos.forEach((m, i) => (m.opacity = bloomScale(GLOW_HALO_BASE[i] * runtime.env.halo * f * haloK)))
  })

  const size: [number, number] = [w + 2 * margin, h + 2 * margin]
  return (
    <group position={[x, y, z]}>
      {parts.halos[1] && <mesh material={parts.halos[1]} position={[0, 0, -2 * LIFT]} raycast={() => null}><planeGeometry args={size} /></mesh>}
      {parts.halos[0] && <mesh material={parts.halos[0]} position={[0, 0, -LIFT]} raycast={() => null}><planeGeometry args={size} /></mesh>}
      <mesh material={parts.core} raycast={() => null}><planeGeometry args={size} /></mesh>
    </group>
  )
}

function useFace(w: number, h: number, draw: (cv: HTMLCanvasElement) => void, redrawKey?: unknown) {
  const latest = useRef(draw)
  latest.current = draw
  const { cv, tex, mat } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = Math.round(w * DIPLOMA_PX_PER_M)
    cv.height = Math.round(h * DIPLOMA_PX_PER_M)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { cv, tex, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0, emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: PAPER_GLOW[0] }) }
  }, [w, h])
  useEffect(() => {
    let alive = true
    latest.current(cv)
    tex.needsUpdate = true
    loadFont(`700 40px ${CERT_FONT}`, fontSample()).then((ok) => {
      if (!alive || !ok) return
      latest.current(cv)
      tex.needsUpdate = true
    })
    wallFade.right.add(mat)
    return () => {
      alive = false
      wallFade.right.delete(mat)
      mat.dispose()
      tex.dispose()
    }
  }, [cv, tex, mat])
  useEffect(() => {
    latest.current(cv)
    tex.needsUpdate = true
  }, [cv, tex, redrawKey])
  return mat
}

function Slats() {
  const dw = degreeWall
  const { panel: p } = dw
  const backing = useWallMat(SLAT_BACKING, 'right', SLAT_EMISSIVE[0])
  const geometry = useMemo(() => {
    const rnd = mulberry(WALL_SEED)
    const base = new THREE.Color(SLAT_BASE)
    const pitch = p.w / p.slats
    const height = CEILING_Y - p.y0
    const parts = Array.from({ length: p.slats }, (_, i) => {
      const g = new THREE.BoxGeometry(SLAT_W, height, dw.off - 0.002)
      g.translate(p.x - p.w / 2 + pitch * (i + 0.5), (p.y0 + CEILING_Y) / 2, 0.002 + (dw.off - 0.002) / 2)
      const col = base.clone().offsetHSL(0, 0, (rnd() - 0.5) * 2 * SLAT_TINT)
      const colors = new Float32Array(g.attributes.position.count * 3)
      for (let v = 0; v < g.attributes.position.count; v++) colors.set([col.r, col.g, col.b], v * 3)
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return g
    })
    const flat = (g: THREE.BufferGeometry) => {
      const n = g.index ? g.toNonIndexed() : g
      n.deleteAttribute('uv')
      return n
    }
    const arch = archPieces(p.x, dw.off).map(({ geometry: g, color }) => {
      const col = new THREE.Color(color)
      const n = flat(g)
      const colors = new Float32Array(n.attributes.position.count * 3)
      for (let v = 0; v < n.attributes.position.count; v++) colors.set([col.r, col.g, col.b], v * 3)
      n.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return n
    })
    const merged = mergeGeometries([...parts.map(flat), ...arch])!
    parts.forEach((g) => g.dispose())
    return merged
  }, [dw, p])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, emissive: new THREE.Color(SLAT_EMISSIVE_COLOR), emissiveIntensity: SLAT_EMISSIVE[0] }), [])
  useEffect(() => {
    wallFade.right.add(material)
    return () => {
      wallFade.right.delete(material)
      material.dispose()
      geometry.dispose()
    }
  }, [material, geometry])
  useFrame(() => {
    const e = byTone(SLAT_EMISSIVE, runtime.env.tone)
    material.emissiveIntensity = e
    backing.emissiveIntensity = e
  })
  return (
    <>
      <mesh material={backing} position={[p.x, (p.y0 + CEILING_Y) / 2, 0.0015]} raycast={() => null}>
        <planeGeometry args={[p.w, CEILING_Y - p.y0]} />
      </mesh>
      <mesh geometry={geometry} material={material} receiveShadow raycast={() => null} />
    </>
  )
}

function LedStrips() {
  const dw = degreeWall
  const { panel: p } = dw
  const y0 = p.y0
  const y1 = CEILING_Y
  const xs = [p.x - p.w / 2 + 0.02, p.x + p.w / 2 - 0.02]
  const { core, halo, coreMat, haloMat } = useMemo(() => {
    const planes = (wd: number) => mergeGeometries(xs.map((x) => new THREE.PlaneGeometry(wd, y1 - y0).translate(x, (y0 + y1) / 2, dw.off + 0.003)))!
    return {
      core: planes(LED_W),
      halo: planes(0.16),
      coreMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(LED_COLOR).multiplyScalar(bloomBoost(1, BLOOM.boostGold)), toneMapped: false }),
      haloMat: new THREE.MeshBasicMaterial({ map: haloTexture(), color: LED_COLOR, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }
  }, [dw, y0, y1, xs[0], xs[1]])
  useEffect(() => {
    wallFade.right.add(coreMat)
    return () => {
      wallFade.right.delete(coreMat)
      coreMat.dispose(); haloMat.dispose(); core.dispose(); halo.dispose()
    }
  }, [core, halo, coreMat, haloMat])
  useFrame(() => { haloMat.opacity = bloomScale(GLOW_HALO_BASE[0] * runtime.env.halo * runtime.wallOp.right) })
  return (
    <>
      <mesh geometry={halo} material={haloMat} position={[0, 0, -0.002]} raycast={() => null} />
      <mesh geometry={core} material={coreMat} raycast={() => null} />
    </>
  )
}

function Decor() {
  const dw = degreeWall
  const notes = content.education.notes ?? []
  const count = Math.min(notes.length, NOTE_SLOTS.length)
  const { cv, tex, mat, geometry } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = ATLAS
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { cv, tex, mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }), geometry: buildDecorGeometry(count, DECOR_Z) }
  }, [count, dw.off])
  useEffect(() => {
    let alive = true
    const paint = () => { drawDecorAtlas(cv, notes); tex.needsUpdate = true }
    paint()
    Promise.all([loadFont(`700 40px ${NOTE_FONT}`, notes.join(' ') || 'A'), loadFont(`700 40px ${CERT_FONT}`, 'KEEPCALMAND')]).then((ok) => { if (alive && ok.some(Boolean)) paint() })
    wallFade.right.add(mat)
    return () => {
      alive = false
      wallFade.right.delete(mat)
      mat.dispose(); tex.dispose(); geometry.dispose()
    }
  }, [cv, tex, mat, geometry, notes])
  return <mesh geometry={geometry} material={mat} raycast={() => null} />
}

function Diploma({ index, x }: { index: number; x: number }) {
  const dw = degreeWall
  const { y, w, h, depth, border, light: pl } = dw.diplomas
  const frame = useWallMat(FRAME_COLOR)
  const brass = useWallMat(BRASS)
  const bar = useMemo(() => new THREE.MeshStandardMaterial({ color: BRASS, emissive: new THREE.Color(LIGHT_BAR), emissiveIntensity: LIGHT_BAR_INTENSITY, roughness: 0.5, metalness: 0, toneMapped: false }), [])
  useEffect(() => {
    wallFade.right.add(bar)
    return () => { wallFade.right.delete(bar); bar.dispose() }
  }, [bar])
  const item = content.education.items[index]
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    const src = item?.logo?.trim()
    if (!src || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) { setLogo(null); return }
    let alive = true
    const img = new Image()
    img.onload = () => alive && setLogo(img)
    img.onerror = () => alive && setLogo(null)
    img.src = `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`
    return () => { alive = false }
  }, [item?.logo])
  const face = useFace(w - 2 * border, h - 2 * border, (cv) => drawDiploma(cv, item, logo), logo)
  const studs = useMemo(() => {
    const parts = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => {
      const g = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_T, 6)
      g.rotateX(Math.PI / 2)
      g.translate(sx * (w / 2 - border / 2), sy * (h / 2 - border / 2), 0)
      return g
    }))
    const merged = mergeGeometries(parts)!
    parts.forEach((g) => g.dispose())
    return merged
  }, [w, h, border])
  const mats = useMemo(() => {
    const additive = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, color: LIGHT_COLOR, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    return {
      shadow: new THREE.MeshBasicMaterial({ map: glowTexture(w, h, SHADOW_REACH), color: 0x000000, transparent: true, opacity: 0, depthWrite: false }),
      halo: additive(glowTexture(w, h, FRAME_HALO_REACH)),
      glow: additive(glowTextureDown()),
    }
  }, [w, h])
  useEffect(() => () => {
    studs.dispose()
    Object.values(mats).forEach((m) => m.dispose())
  }, [studs, mats])
  useFrame(() => {
    const f = runtime.wallOp.right
    const L = Math.max(0, light.level)
    mats.shadow.opacity = SHADOW_OPACITY * f
    mats.halo.opacity = FRAME_HALO_STRENGTH * L * f
    mats.glow.opacity = SPILL * (0.75 + 0.25 * L) * f
    face.emissiveIntensity = byTone(PAPER_GLOW, runtime.env.tone) + PAPER_LIFT * 0.3 * L
  })
  const front = dw.off + depth
  const pw = w - 2 * border
  const ph = h - 2 * border
  const barY = h / 2 + pl.dy
  return (
    <group position={[x, y, 0]}>
      <mesh material={mats.shadow} position={[0, -SHADOW_DROP, dw.off + 0.0005]} raycast={() => null}>
        <planeGeometry args={[w + 2 * SHADOW_REACH, h + 2 * SHADOW_REACH]} />
      </mesh>
      <mesh material={mats.halo} position={[0, 0, dw.off + 0.001]} raycast={() => null}>
        <planeGeometry args={[w + 2 * FRAME_HALO_REACH, h + 2 * FRAME_HALO_REACH]} />
      </mesh>
      <mesh geometry={panel(w, h, depth, 0.03, 0.012, SEG)} material={frame} position={[0, 0, dw.off + depth / 2]} receiveShadow raycast={() => null} />
      <mesh material={face} position={[0, 0, front + LIFT]} raycast={() => null}>
        <planeGeometry args={[pw, ph]} />
      </mesh>
      <mesh geometry={studs} material={brass} position={[0, 0, front + STUD_T / 2]} raycast={() => null} />
      <mesh material={mats.glow} position={[0, (barY - 0.01 + h / 2 - h / 3) / 2, front + 2 * LIFT]} raycast={() => null}>
        <planeGeometry args={[w * 1.02, barY - 0.01 - (h / 2 - h / 3)]} />
      </mesh>
      <mesh material={bar} position={[0, barY, dw.off + 0.015]} raycast={() => null}>
        <boxGeometry args={[pl.w, 0.018, 0.03]} />
      </mesh>
    </group>
  )
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

function Sweep({ xs }: { xs: number[] }) {
  const dp = degreeWall.diplomas
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: haloTexture(), color: SWEEP.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  )
  useEffect(() => () => mat.dispose(), [mat])
  const x0 = Math.min(...xs) - dp.w / 2 - SWEEP.width / 2
  const x1 = Math.max(...xs) + dp.w / 2 + SWEEP.width / 2
  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    if (!ambient.on) {
      m.visible = false
      mat.opacity = 0
      return
    }
    const u = (state.clock.elapsedTime % SWEEP.period) / SWEEP.travel
    if (u >= 1) {
      m.visible = false
      return
    }
    m.visible = true
    m.position.x = x0 + (x1 - x0) * smooth(u)
    mat.opacity = SWEEP.peak * runtime.env.sweep * smooth(u / SWEEP.fade) * smooth((1 - u) / SWEEP.fade) * runtime.wallOp.right
  })
  return (
    <mesh ref={mesh} material={mat} position={[x0, dp.y, degreeWall.off + dp.depth + 0.012]} visible={false} raycast={() => null}>
      <planeGeometry args={[SWEEP.width, SWEEP.height]} />
    </mesh>
  )
}

export function DegreeWall() {
  const dw = degreeWall
  const handlers = useHotspot(dw.hotspot, { wall: 'right' })
  const disc = useWallMat(DISC)
  const { panel: p, emblem: em, plate: pl, diplomas: dp } = dw
  const onWall = () => getState().phase === 'screen' && getState().active === dw.hotspot.contentKey
  const inside = {
    ...handlers,
    onPointerUp: (e: Parameters<typeof handlers.onPointerUp>[0]) => {
      handlers.onPointerUp(e)
      if (onWall()) markInside()
    },
  }
  const top = p.y1 + HIT_PAD
  const bottom = p.y0 - HIT_PAD
  const depth = dw.off + dp.depth + HIT_PAD
  const count = Math.min(content.education.items.length, dp.xs.length)
  useFrame((_, dt) => stepLight(Math.min(dt, 0.05)))
  return (
    <group position={[0, 0, T / 2]}>
      <Slats />
      <mesh position={[p.x, em.y, dw.off + 0.004]} material={disc} raycast={() => null}>
        <circleGeometry args={[em.d / 2, 48]} />
      </mesh>
      <Emissive x={p.x} y={em.y} z={dw.off + 0.007} w={em.d} h={em.d} margin={0.1} draw={drawEmblem} plain glow halo={MEDAL_HALO} haloK={MEDAL_HALO_K} />
      <Emissive x={p.x} y={pl.y} z={dw.off + 0.009} w={pl.w} h={pl.h} margin={0.08} draw={drawPlate} plain nightDim />
      <LedStrips />
      <Decor />
      {dp.xs.slice(0, count).map((x, i) => <Diploma key={i} index={i} x={x} />)}
      {count > 0 && <Sweep xs={dp.xs.slice(0, count)} />}
      <mesh material={hitMaterial} position={[p.x, (top + bottom) / 2, depth / 2]} {...inside}>
        <boxGeometry args={[p.w + 2 * HIT_PAD, top - bottom, depth]} />
      </mesh>
    </group>
  )
}
