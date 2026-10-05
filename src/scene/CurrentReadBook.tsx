import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BOOK_FOOTPRINT } from './ReadingHits'
import { isHovered } from './hotspotHover'
import { runtime } from './runtime'
import type { Prop } from '../zones/types'

const BOOK_THICKNESS = 0.056
const HOVER_LIFT = 0.15
const HOVER_SECONDS = 0.2
const C = { body: '#5EDDA3', deep: '#3DB88C', cream: '#F6EBDD', stem: '#3E8F6B', leaf: '#4FA67C', blush: '#F0C4D4', lavender: '#CDB8E8', butter: '#F6E3A8', white: '#FFFFFF' }
const FLORAL_SCALE = 1.2
const COVER_GLOW = 0.12
const ATLAS = { w: 512, h: 768, cover: 704, spine: [704, 720], pages: [720, 752], swatch: [752, 768] }

function paintCover(x: CanvasRenderingContext2D) {
  const W = 512, H = 704
  x.lineCap = 'round'
  x.lineJoin = 'round'
  x.fillStyle = C.body
  x.fillRect(0, 0, W, H)
  x.strokeStyle = C.deep
  x.lineWidth = 26
  x.strokeRect(13, 13, W - 26, H - 26)
  x.strokeStyle = C.cream
  x.lineWidth = 11
  x.strokeRect(31.5, 31.5, W - 63, H - 63)
  const lx = 96, ly = 92, lw = 320, lh = 128
  x.fillStyle = C.cream
  x.beginPath(); x.roundRect(lx, ly, lw, lh, 18); x.fill()
  x.strokeStyle = C.deep
  x.lineWidth = 3
  x.beginPath(); x.roundRect(lx + 9, ly + 9, lw - 18, lh - 18, 12); x.stroke()
  const leaf = (cx: number, cy: number, rot: number, len: number, wid: number, fill: string) => {
    x.save(); x.translate(cx, cy); x.rotate(rot)
    x.fillStyle = fill
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -wid, len, 0); x.quadraticCurveTo(len * 0.5, wid, 0, 0); x.fill()
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.6
    x.beginPath(); x.moveTo(len * 0.08, 0); x.lineTo(len * 0.86, 0); x.stroke()
    x.restore()
  }
  leaf(176, 156, -0.35, 44, 10, C.stem); leaf(176, 156, 0.35, 44, 10, C.stem)
  leaf(336, 156, Math.PI + 0.35, 44, 10, C.stem); leaf(336, 156, Math.PI - 0.35, 44, 10, C.stem)
  x.fillStyle = C.blush; x.beginPath(); x.arc(256, 156, 12, 0, 7); x.fill()
  x.fillStyle = C.butter; x.beginPath(); x.arc(256, 156, 5, 0, 7); x.fill()
  x.save()
  x.beginPath(); x.rect(48, 48, W - 96, H - 96); x.clip()
  x.translate(256, 500); x.scale(FLORAL_SCALE, FLORAL_SCALE); x.translate(-256, -500)
  const stems: { pts: [number, number][]; blossom: [number, string, string] }[] = [
    { pts: [[256, 640], [236, 560], [262, 480], [244, 400]], blossom: [38, C.blush, C.butter] },
    { pts: [[220, 640], [160, 580], [150, 500], [112, 440]], blossom: [32, C.white, C.butter] },
    { pts: [[292, 640], [356, 580], [372, 508], [404, 444]], blossom: [32, C.butter, C.blush] },
    { pts: [[196, 640], [120, 610], [86, 560], [70, 508]], blossom: [24, C.blush, C.white] },
    { pts: [[318, 640], [392, 612], [424, 566], [442, 520]], blossom: [26, C.white, C.butter] },
  ]
  for (const s of stems) {
    const [a, b, c, d] = s.pts
    x.strokeStyle = C.stem
    x.lineWidth = 9
    x.beginPath(); x.moveTo(...a); x.bezierCurveTo(...b, ...c, ...d); x.stroke()
    for (let i = 1; i <= 4; i++) {
      const t = i * 0.2
      const px = (1 - t) ** 3 * a[0] + 3 * (1 - t) ** 2 * t * b[0] + 3 * (1 - t) * t * t * c[0] + t ** 3 * d[0]
      const py = (1 - t) ** 3 * a[1] + 3 * (1 - t) ** 2 * t * b[1] + 3 * (1 - t) * t * t * c[1] + t ** 3 * d[1]
      const side = i % 2 ? -1 : 1
      leaf(px, py, -Math.PI / 2 + side * 0.9, 46 - i * 3, 13, i % 2 ? C.stem : C.leaf)
    }
  }
  for (const s of stems) {
    const [r, petal, centre] = s.blossom
    const [bx, by] = s.pts[3]
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2
      x.fillStyle = petal
      x.beginPath(); x.arc(bx + Math.cos(a) * r * 0.62, by + Math.sin(a) * r * 0.62, r * 0.5, 0, 7); x.fill()
    }
    x.fillStyle = centre
    x.beginPath(); x.arc(bx, by, r * 0.34, 0, 7); x.fill()
  }
  for (const [bx, by, c] of [[190, 380, C.white], [320, 372, C.blush], [150, 610, C.butter], [372, 612, C.blush], [256, 330, C.butter]] as [number, number, string][]) {
    x.fillStyle = c
    x.beginPath(); x.arc(bx, by, 10, 0, 7); x.fill()
    x.fillStyle = C.stem
    x.beginPath(); x.arc(bx, by + 13, 4, 0, 7); x.fill()
  }
  x.restore()
}

function atlas(): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = ATLAS.w
  cv.height = ATLAS.h
  const x = cv.getContext('2d')!
  paintCover(x)
  x.fillStyle = C.deep
  x.fillRect(0, ATLAS.spine[0], ATLAS.w, ATLAS.spine[1] - ATLAS.spine[0])
  x.fillStyle = C.cream
  for (const u of [0.12, 0.16, 0.84, 0.88]) x.fillRect(u * ATLAS.w - 2, ATLAS.spine[0], 4, ATLAS.spine[1] - ATLAS.spine[0])
  x.fillStyle = C.cream
  x.fillRect(0, ATLAS.pages[0], ATLAS.w, ATLAS.pages[1] - ATLAS.pages[0])
  x.fillStyle = 'rgba(150,120,90,.28)'
  for (let y = ATLAS.pages[0] + 2; y < ATLAS.pages[1]; y += 4) x.fillRect(0, y, ATLAS.w, 1.5)
  x.fillStyle = C.lavender
  x.fillRect(0, ATLAS.swatch[0], ATLAS.w / 2, ATLAS.swatch[1] - ATLAS.swatch[0])
  x.fillStyle = C.cream
  x.fillRect(ATLAS.w / 2, ATLAS.swatch[0], ATLAS.w / 2, ATLAS.swatch[1] - ATLAS.swatch[0])
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const uvPx = (px: number, py: number): [number, number] => [px / ATLAS.w, 1 - py / ATLAS.h]

function bookGeometry(): THREE.BufferGeometry {
  const L = BOOK_FOOTPRINT[0], Wd = BOOK_FOOTPRINT[1], T = BOOK_THICKNESS, b = 0.004
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = []
  const quad = (p: number[][], n: number[], u: [number, number][]) => {
    const f = pos.length / 3
    p.forEach((q, i) => { pos.push(...q); nor.push(...n); uv.push(...u[i]) })
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]]
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    if (c[0] * n[0] + c[1] * n[1] + c[2] * n[2] >= 0) idx.push(f, f + 1, f + 2, f, f + 2, f + 3)
    else idx.push(f, f + 2, f + 1, f, f + 3, f + 2)
  }
  const sw = { spine: uvPx(256, 712), page: (v: number): [number, number] => uvPx(256, ATLAS.pages[0] + 4 + v * 24), rib: uvPx(128, 760), cream: uvPx(384, 760) }
  const flat = (c: [number, number]): [number, number][] => [c, c, c, c]
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, u: [number, number][]) => {
    quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], u)
    quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], u)
    quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], u)
    quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], u)
    quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], u)
    quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], u)
  }
  const hx = L / 2, hz = Wd / 2
  const A = ATLAS
  const coverUv = (x: number, z: number): [number, number] => uvPx(((hz - z) / Wd) * A.w, ((x + hx) / L) * A.cover)
  const top = [[-hx, T + 0.0003, hz], [-hx, T + 0.0003, -hz], [hx, T + 0.0003, -hz], [hx, T + 0.0003, hz]]
  quad(top, [0, 1, 0], top.map((p) => coverUv(p[0], p[2])))
  box(-hx, hx, 0, b, -hz, hz, flat(sw.spine))
  box(-hx, hx, T - b, T, -hz, hz, flat(sw.spine))
  const sp = [[-hx, 0, hz + 0.001], [hx, 0, hz + 0.001], [hx, T, hz + 0.001], [-hx, T, hz + 0.001]]
  quad(sp, [0, 0, 1], [uvPx(0, 712), uvPx(A.w, 712), uvPx(A.w, 710), uvPx(0, 710)])
  const px0 = -hx + 0.004, px1 = hx - 0.004, pz0 = -hz + 0.005, pz1 = hz - 0.002
  const pu: [number, number][] = [sw.page(0), sw.page(0), sw.page(1), sw.page(1)]
  quad([[px0, b, pz1], [px1, b, pz1], [px1, T - b, pz1], [px0, T - b, pz1]], [0, 0, 1], [sw.page(1), sw.page(1), sw.page(0), sw.page(0)])
  quad([[px1, b, pz0], [px0, b, pz0], [px0, T - b, pz0], [px1, T - b, pz0]], [0, 0, -1], [sw.page(1), sw.page(1), sw.page(0), sw.page(0)])
  quad([[px1, b, pz1], [px1, b, pz0], [px1, T - b, pz0], [px1, T - b, pz1]], [1, 0, 0], [sw.page(1), sw.page(1), sw.page(0), sw.page(0)])
  quad([[px0, b, pz0], [px0, b, pz1], [px0, T - b, pz1], [px0, T - b, pz0]], [-1, 0, 0], [sw.page(1), sw.page(1), sw.page(0), sw.page(0)])
  void pu
  const rz = hz - 0.03, rw = 0.006
  quad([[hx - 0.012, 0.0028, rz - rw], [hx + 0.034, 0.0016, rz - rw], [hx + 0.034, 0.0016, rz + rw], [hx - 0.012, 0.0028, rz + rw]], [0, 1, 0], flat(sw.rib))
  quad([[hx - 0.012, 0.0028, rz + rw], [hx + 0.034, 0.0016, rz + rw], [hx + 0.034, 0.0016, rz - rw], [hx - 0.012, 0.0028, rz - rw]], [0, -1, 0], flat(sw.rib))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

export function CurrentReadBook({ prop }: { prop: Prop }) {
  const geometry = useMemo(bookGeometry, [])
  const material = useMemo(() => {
    const map = atlas()
    return new THREE.MeshStandardMaterial({ map, emissive: new THREE.Color(0xffffff), emissiveMap: map, emissiveIntensity: 0, roughness: 0.85, metalness: 0, side: THREE.DoubleSide })
  }, [])
  useEffect(() => () => { geometry.dispose(); material.map?.dispose(); material.dispose() }, [geometry, material])
  const focused = useRef(false)
  useEffect(() => {
    const on = (v: boolean) => (e: Event) => { if ((e.target as HTMLElement | null)?.getAttribute?.('aria-label') === 'Open current read') focused.current = v }
    const fin = on(true), fout = on(false)
    window.addEventListener('focusin', fin)
    window.addEventListener('focusout', fout)
    return () => { window.removeEventListener('focusin', fin); window.removeEventListener('focusout', fout) }
  }, [])
  const level = useRef(0)
  const lastTone = useRef(-1)
  useFrame((_, dtRaw) => {
    const goal = isHovered('current-read') || focused.current ? 1 : 0
    const base = COVER_GLOW * Math.min(1, runtime.env.tone / 0.55)
    if (level.current === goal && base === lastTone.current) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const step = Math.min(dtRaw, 0.05) / HOVER_SECONDS
    level.current = reduced || Math.abs(goal - level.current) <= step ? goal : level.current + Math.sign(goal - level.current) * step
    lastTone.current = base
    material.emissiveIntensity = base + HOVER_LIFT * level.current
  })
  return <mesh geometry={geometry} material={material} position={[prop.position[0], 0.5, prop.position[2]]} rotation={[0, prop.rotationY, 0]} castShadow receiveShadow raycast={() => null} />
}
