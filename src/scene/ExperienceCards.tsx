import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BRASS, LIGHT_BAR, byTone } from './degreeDesign'
import { BOARD_FONT, loadFont } from './fonts'
import { EXP, EXP_POSE, layoutJobs, type JobSpec } from './experienceLayout'
import { hitMaterial } from './hitProxy'
import { isHovered } from './hotspotHover'
import { runtime, wallFade } from './runtime'
import { useHotspot } from './useHotspot'
import { room } from '../zones/zone'
import type { ObjectHotspot } from '../zones/types'

const PX = 1000
const M = 0.02
const INK = '#3A2A33'
const HEAD_INK = '#3E2A4A'
const CARD_GLOW: [number, number, number] = [0.6, 0.45, 0.25]
const CARD_ALBEDO = 0.88
const DISC_ALBEDO = 0.56
const LOGO_DARKEN = 0.6
const shade = (hex: string, k = CARD_ALBEDO) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`
const CARD_FILL = 'rgba(235,217,234,.85)', CARD_BORDER = 'rgba(247,236,243,.7)'
const CO_INK = '#1A0F24', ROLE_INK = '#33285A', DATE_INK = '#2E1E3E', PILL = '#D9C8EE'
const FONT = '"Nunito", "Helvetica Neue", Arial, sans-serif'
const SWATCH_BRASS: readonly [number, number] = [100, 1700]
const HOVER = { emissive: [0.68, 0.5, 0.25] as [number, number, number], lift: 0.006, lift2: 0.009, scale: 0.01, scale2: 0.02, wire: 0.3, inS: 0.15, outS: 0.25 }
const RIM = { w: 0.018, pad: 0.03, color: '#F3D9C4', soft: 6 }
const ringCell = (d: number) => ({ x: 1260, y: 800, s: Math.ceil((d + 2 * RIM.pad) * PX) })
const cardRimCell = (cw: number, hPx: number) => ({ x: 1260, y: 1150, w: Math.ceil((cw + 2 * RIM.pad) * PX), h: Math.ceil(hPx + 2 * RIM.pad * PX) })

export const expHover: { level: number[]; unit: number } = { level: [], unit: 0 }
const BASE = import.meta.env.BASE_URL

const roundRect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r) }
function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(/\s+/)) {
    const t = cur ? `${cur} ${w}` : w
    if (c.measureText(t).width <= maxW || !cur) cur = t
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

const medCell = (i: number, d: number) => ({ x: i * (Math.ceil((d + 2 * M) * PX) + 2), y: 0, s: Math.ceil((d + 2 * M) * PX) })
const labelSize = (cw: number) => ({ w: Math.ceil((cw + 2 * M) * PX), h: Math.ceil((EXP.labelH + 2 * M) * PX) })
const labelCell = (i: number, cw: number) => ({ x: i * (labelSize(cw).w + 2), y: 300 })
const HEAD = { x: 0, y: 800, w: Math.ceil(EXP.headingW * PX), h: Math.ceil(EXP.headingH * PX) }

function drawMedallion(c: CanvasRenderingContext2D, k: JobSpec, ox: number, oy: number, s: number, logo: HTMLImageElement | null) {
  c.clearRect(ox, oy, s, s)
  const cx = ox + s / 2, cy = oy + s / 2, r = (k.d * PX) / 2
  c.save()
  c.shadowColor = 'rgba(58,42,51,.3)'; c.shadowBlur = 14; c.shadowOffsetY = 5
  c.fillStyle = shade('#FFFDFB', DISC_ALBEDO)
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill()
  c.restore()
  c.strokeStyle = '#F2C98A'; c.lineWidth = 4
  c.beginPath(); c.arc(cx, cy, r - 2, 0, 7); c.stroke()
  const box = r * 2 * 0.7
  if (logo) {
    const [lw, lh] = k.logoSize ?? [logo.naturalWidth || 200, logo.naturalHeight || 60]
    const sc = Math.min(box / lw, box / lh)
    const tmp = document.createElement('canvas')
    tmp.width = Math.ceil(lw * sc); tmp.height = Math.ceil(lh * sc)
    const t = tmp.getContext('2d')!
    t.drawImage(logo, 0, 0, tmp.width, tmp.height)
    t.globalCompositeOperation = 'source-atop'; t.fillStyle = `rgba(0,0,0,${1 - LOGO_DARKEN})`; t.fillRect(0, 0, tmp.width, tmp.height)
    c.drawImage(tmp, cx - (lw * sc) / 2, cy - (lh * sc) / 2)
  } else {
    c.fillStyle = k.tile
    c.beginPath(); c.arc(cx, cy, box / 2, 0, 7); c.fill()
    c.fillStyle = INK; c.font = `700 ${Math.round(box * 0.6)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(k.name.trim().charAt(0).toUpperCase(), cx, cy + box * 0.04)
  }
}

interface LabelLayout { dp: number; pw: number; ph: number; co: { s: number; lines: string[] }; ro: { s: number; lines: string[] }; content: number; pad: number; maxW: number }
function layoutLabel(c: CanvasRenderingContext2D, k: JobSpec, cw: number): LabelLayout {
  const w = cw * PX, pad = Math.round(w * 0.09), maxW = w - 2 * pad
  let dp = 32
  c.font = `600 ${dp}px ${FONT}`
  while (c.measureText(k.dates).width + 40 > maxW && dp > 18) { dp -= 1; c.font = `600 ${dp}px ${FONT}` }
  const pw = c.measureText(k.dates).width + 40, ph = Math.round(dp * 1.75)
  const fit = (text: string, weight: number, start: number, min: number, maxLines: number) => {
    let sz = start
    c.font = `${weight} ${sz}px ${FONT}`
    let lines = wrap(c, text, maxW)
    while ((lines.length > maxLines || lines.some((l) => c.measureText(l).width > maxW)) && sz > min) { sz -= 1; c.font = `${weight} ${sz}px ${FONT}`; lines = wrap(c, text, maxW) }
    return { s: sz, lines }
  }
  const co = fit(k.name, 700, 48, 28, 2)
  const ro = fit(k.role, 600, 36, 22, 2)
  const content = ph + 26 + co.lines.length * co.s * 1.14 + 10 + ro.lines.length * ro.s * 1.16
  return { dp, pw, ph, co, ro, content, pad, maxW }
}
function cardHeightPx(c: CanvasRenderingContext2D, jobs: JobSpec[], cw: number): number {
  const tallest = Math.max(...jobs.map((k) => layoutLabel(c, k, cw).content))
  return Math.min(EXP.labelH * PX, Math.ceil(tallest / 0.84))
}

function drawLabel(c: CanvasRenderingContext2D, k: JobSpec, ox: number, oy: number, cw: number, hPx: number) {
  const w = cw * PX, h = hPx, m = M * PX, L = labelSize(cw)
  c.clearRect(ox, oy, L.w, L.h)
  const T = layoutLabel(c, k, cw)
  c.save()
  c.shadowColor = 'rgba(75,63,114,.16)'; c.shadowBlur = 14; c.shadowOffsetY = 4
  c.fillStyle = CARD_FILL.replace(/rgba\((\d+),(\d+),(\d+)/, (_, r, g, b) => { const q = new THREE.Color(`rgb(${r},${g},${b})`).multiplyScalar(CARD_ALBEDO); return `rgba(${Math.round(q.r * 255)},${Math.round(q.g * 255)},${Math.round(q.b * 255)}` })
  roundRect(c, ox + m, oy + m, w, h, 22); c.fill()
  c.restore()
  c.strokeStyle = CARD_BORDER; c.lineWidth = 1.5
  roundRect(c, ox + m + 0.75, oy + m + 0.75, w - 1.5, h - 1.5, 22); c.stroke()
  const cx = ox + m + w / 2
  const padV = h * 0.08 + (h - T.content - h * 0.16) / 2
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'
  let y = oy + m + padV
  c.fillStyle = shade(PILL); roundRect(c, cx - T.pw / 2, y, T.pw, T.ph, T.ph / 2); c.fill()
  c.font = `600 ${T.dp}px ${FONT}`; c.fillStyle = DATE_INK; c.fillText(k.dates, cx, y + T.ph / 2 + T.dp * 0.34)
  y += T.ph + 26
  c.font = `700 ${T.co.s}px ${FONT}`; c.fillStyle = CO_INK
  for (const l of T.co.lines) { y += T.co.s * 0.92; c.fillText(l, cx, y); y += T.co.s * 0.22 }
  y += 10
  c.font = `600 ${T.ro.s}px ${FONT}`; c.fillStyle = ROLE_INK
  for (const l of T.ro.lines) { y += T.ro.s * 0.92; c.fillText(l, cx, y); y += T.ro.s * 0.24 }
}

function drawRims(c: CanvasRenderingContext2D, d: number, cw: number, hPx: number) {
  const rc = ringCell(d), cc = cardRimCell(cw, hPx), lw = RIM.w * PX
  c.clearRect(rc.x, rc.y, rc.s, rc.s)
  c.clearRect(cc.x, cc.y, 520, 520)
  c.save(); c.strokeStyle = RIM.color; c.shadowColor = RIM.color; c.shadowBlur = RIM.soft; c.lineWidth = lw
  c.beginPath(); c.arc(rc.x + rc.s / 2, rc.y + rc.s / 2, (d * PX) / 2 + lw / 2, 0, 7); c.stroke()
  roundRect(c, cc.x + RIM.pad * PX - lw / 2, cc.y + RIM.pad * PX - lw / 2, cw * PX + lw, hPx + lw, 22 + lw / 2); c.stroke()
  c.restore()
}

function drawHeading(c: CanvasRenderingContext2D) {
  const { x, y, w, h } = HEAD
  c.clearRect(x, y, w, h)
  c.save(); c.shadowColor = 'rgba(255,190,110,.95)'; c.shadowBlur = 14
  c.strokeStyle = '#FFD9A0'; c.lineWidth = 6; c.lineCap = 'round'
  c.beginPath(); c.moveTo(x + 150, y + 118); c.bezierCurveTo(x + 330, y + 40, x + 470, y + 130, x + w / 2, y + 74); c.bezierCurveTo(x + w / 2 + 110, y + 24, x + w / 2 + 170, y + 120, x + w / 2 + 250, y + 70); c.bezierCurveTo(x + w - 420, y + 40, x + w - 250, y + 110, x + w - 150, y + 90); c.stroke()
  c.restore()
  c.fillStyle = '#FFD27A'
  for (const [sx, sy, r] of [[x + 120, y + 70, 16], [x + w - 130, y + 40, 20], [x + w / 2 + 40, y + 20, 12], [x + w - 330, y + 112, 11]] as [number, number, number][]) {
    c.beginPath(); c.moveTo(sx, sy - r); c.quadraticCurveTo(sx, sy, sx + r, sy); c.quadraticCurveTo(sx, sy, sx, sy + r); c.quadraticCurveTo(sx, sy, sx - r, sy); c.quadraticCurveTo(sx, sy, sx, sy - r); c.fill()
  }
  const cy = y + 150 + (h - 150) / 2 - 6
  c.font = `700 ${Math.round(0.16 * PX * 1.12)}px ${BOARD_FONT}`
  c.textBaseline = 'middle'; c.textAlign = 'left'
  const tw = c.measureText('Experience').width, bw = 76, gap = 22
  const left = x + w / 2 - (bw + gap + tw) / 2
  c.save()
  c.shadowColor = 'rgba(246,233,240,.85)'; c.shadowBlur = 8; c.shadowOffsetX = 0; c.shadowOffsetY = 0
  c.fillStyle = HEAD_INK; c.strokeStyle = HEAD_INK; c.lineWidth = 2.5; c.lineJoin = 'round'
  c.strokeText('Experience', left + bw + gap, cy + 6)
  c.fillText('Experience', left + bw + gap, cy + 6)
  c.lineWidth = 7; c.lineCap = 'round'
  roundRect(c, left, cy - 18, bw, 50, 10); c.stroke()
  c.beginPath(); c.moveTo(left + 22, cy - 18); c.lineTo(left + 22, cy - 30); c.lineTo(left + bw - 22, cy - 30); c.lineTo(left + bw - 22, cy - 18); c.stroke()
  c.beginPath(); c.moveTo(left, cy + 8); c.lineTo(left + bw, cy + 8); c.stroke()
  c.restore()
}

export function ExperienceCards() {
  const L = useMemo(layoutJobs, [])
  const hotspot = useMemo(() => room.wallProps.find((p) => p.kind === 'cards')?.hotspot as ObjectHotspot | undefined, [])
  const handlers = useHotspot(hotspot ?? { contentKey: 'experience' as const, pose: EXP_POSE }, { wall: 'back' })
  const built = useMemo(() => {
    const W = 2048, H = 2048
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    const ctx = cv.getContext('2d')!
    const logos: (HTMLImageElement | null)[] = L.jobs.map(() => null)
    const cur = { h: cardHeightPx(ctx, L.jobs, L.cardW) }
    const paint = () => {
      const nh = cardHeightPx(ctx, L.jobs, L.cardW)
      if (nh !== cur.h) { cur.h = nh; applyH() }
      drawRims(ctx, L.d, L.cardW, cur.h)
      L.jobs.forEach((k, i) => { const m = medCell(i, L.d); drawMedallion(ctx, k, m.x, m.y, m.s, logos[i]); const l = labelCell(i, L.cardW); drawLabel(ctx, k, l.x, l.y, L.cardW, cur.h) })
      drawHeading(ctx)
      ctx.fillStyle = BRASS; ctx.fillRect(SWATCH_BRASS[0], SWATCH_BRASS[1], 32, 32)
    }
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [], rgba: number[] = []
    const quad = (p: number[][], n: number[], u: number[][], alpha = 1) => {
      const f = pos.length / 3
      p.forEach((q, i) => { pos.push(...q); nor.push(...n); uv.push(...u[i]); rgba.push(1, 1, 1, alpha) })
      const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]]
      const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      if (c[0] * n[0] + c[1] * n[1] + c[2] * n[2] >= 0) idx.push(f, f + 1, f + 2, f, f + 2, f + 3)
      else idx.push(f, f + 2, f + 1, f, f + 3, f + 2)
    }
    const U = (px: number, py: number) => [px / W, 1 - py / H]
    const rect = (x0: number, y0: number, x1: number, y1: number, z: number, c: { x: number; y: number; w: number; h: number }, alpha = 1) =>
      quad([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, 1], [U(c.x, c.y + c.h), U(c.x + c.w, c.y + c.h), U(c.x + c.w, c.y), U(c.x, c.y)], alpha)
    const medFirst: number[] = [], labelFirst: number[] = []
    type Q = { first: number; cx: number; cy: number; hw: number; hh: number }
    const qMed: Q[] = [], qMedRim: Q[] = [], qCard: Q[] = [], qCardRim: Q[] = []
    const cardTop = (k: JobSpec) => k.y - k.d / 2 - EXP.labelDy + M
    L.jobs.forEach((k, i) => {
      const m = medCell(i, L.d), hw = k.d / 2 + M
      const rc = ringCell(L.d), rh = k.d / 2 + RIM.pad
      qMedRim.push({ first: pos.length / 3, cx: k.x, cy: k.y, hw: rh, hh: rh })
      rect(k.x - rh, k.y - rh, k.x + rh, k.y + rh, EXP.z - 0.003, { x: rc.x, y: rc.y, w: rc.s, h: rc.s }, 0)
      medFirst.push(pos.length / 3)
      qMed.push({ first: pos.length / 3, cx: k.x, cy: k.y, hw, hh: hw })
      rect(k.x - hw, k.y - hw, k.x + hw, k.y + hw, EXP.z, { x: m.x, y: m.y, w: m.s, h: m.s })
      const l = labelCell(i, L.cardW), top = k.y - k.d / 2 - EXP.labelDy + M, bottom = top - (cur.h / PX + 2 * M)
      const hc = cur.h / PX, cc = cardRimCell(L.cardW, cur.h), ch = hc / 2 + RIM.pad
      qCardRim.push({ first: pos.length / 3, cx: k.x, cy: cardTop(k) - M - hc / 2, hw: L.cardW / 2 + RIM.pad, hh: ch })
      rect(k.x - L.cardW / 2 - RIM.pad, cardTop(k) - M - hc - RIM.pad, k.x + L.cardW / 2 + RIM.pad, cardTop(k) - M + RIM.pad, EXP.z - 0.003, { x: cc.x, y: cc.y, w: cc.w, h: cc.h }, 0)
      labelFirst.push(pos.length / 3)
      qCard.push({ first: pos.length / 3, cx: k.x, cy: (top + bottom) / 2, hw: L.cardW / 2 + M, hh: (top - bottom) / 2 })
      rect(k.x - L.cardW / 2 - M, bottom, k.x + L.cardW / 2 + M, top, EXP.z, { x: l.x, y: l.y, w: labelSize(L.cardW).w, h: Math.ceil(cur.h + 2 * M * PX) })
    })
    rect(L.cx - EXP.headingW / 2, EXP.headingY - EXP.headingH / 2, L.cx + EXP.headingW / 2, EXP.headingY + EXP.headingH / 2, EXP.z, HEAD)
    const sw = U(SWATCH_BRASS[0] + 16, SWATCH_BRASS[1] + 16)
    const arm = (x: number, y: number) => {
      const x0 = x - 0.005, x1 = x + 0.005, y0 = y - 0.005, y1 = y + 0.005, z0 = EXP.wallZ, z1 = EXP.wallZ + 0.06
      const u = [sw, sw, sw, sw]
      quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], u)
      quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], u)
      quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], u)
      quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], u)
      quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], u)
      quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], u)
    }
    L.jobs.forEach((k) => arm(k.x, k.y + EXP.domeDy))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rgba), 4).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(idx)
    const parts: THREE.BufferGeometry[] = []
    const col = (geo: THREE.BufferGeometry, hex: string) => {
      const c = new THREE.Color(hex), n = geo.getAttribute('position').count
      geo.setAttribute('color', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]), 3))
      if (geo.getAttribute('uv')) geo.deleteAttribute('uv')
      return geo.index ? geo.toNonIndexed() : geo
    }
    const xs = L.jobs.map((k) => k.x), wy = (x: number) => {
      for (let i = 0; i < xs.length - 1; i++) if (x >= xs[i] && x <= xs[i + 1]) return EXP.y - EXP.sag * Math.sin((Math.PI * (x - xs[i])) / (xs[i + 1] - xs[i]))
      return EXP.y
    }
    const xa = xs[0] - 0.2, xb = xs[xs.length - 1] + 0.2
    const wp: THREE.Vector3[] = []
    for (let x = xa; x <= xb + 1e-6; x += 0.03) wp.push(new THREE.Vector3(x, wy(x), EXP.z - 0.004))
    parts.push(col(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wp), wp.length * 2, 0.003, 4, false), '#FFD9A0'))
    for (let i = 0; i < xs.length - 1; i++) for (const u of [0.25, 0.5, 0.75]) {
      const bx = xs[i] + (xs[i + 1] - xs[i]) * u
      parts.push(col(new THREE.IcosahedronGeometry(0.008, 0).translate(bx, wy(bx), EXP.z - 0.004), '#FFE7B8'))
    }
    for (const k of L.jobs) {
      const dome = new THREE.SphereGeometry(EXP.domeR, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(k.x, k.y + EXP.domeDy - 0.012, EXP.wallZ + 0.06)
      parts.push(col(dome, BRASS))
    }
    const wl = new THREE.BufferGeometry()
    const nP = parts.reduce((s, p) => s + p.getAttribute('position').count, 0)
    const wlPos = new Float32Array(nP * 3), wlNor = new Float32Array(nP * 3), wlCol = new Float32Array(nP * 3)
    let o = 0
    for (const p of parts) { wlPos.set(p.getAttribute('position').array as Float32Array, o * 3); wlNor.set(p.getAttribute('normal').array as Float32Array, o * 3); wlCol.set(p.getAttribute('color').array as Float32Array, o * 3); o += p.getAttribute('position').count; p.dispose() }
    wl.setAttribute('position', new THREE.BufferAttribute(wlPos, 3)); wl.setAttribute('normal', new THREE.BufferAttribute(wlNor, 3)); wl.setAttribute('color', new THREE.BufferAttribute(wlCol, 3))
    const place = (q: Q, sc: number, z: number) => {
      const p = g.getAttribute('position') as THREE.BufferAttribute, x0 = q.cx - q.hw * sc, x1 = q.cx + q.hw * sc, y0 = q.cy - q.hh * sc, y1 = q.cy + q.hh * sc
      p.setXYZ(q.first, x0, y0, z); p.setXYZ(q.first + 1, x1, y0, z); p.setXYZ(q.first + 2, x1, y1, z); p.setXYZ(q.first + 3, x0, y1, z)
    }
    const applyH = () => {
      const t = g.getAttribute('uv') as THREE.BufferAttribute, hc = cur.h / PX
      L.jobs.forEach((k, i) => {
        const top = cardTop(k), bottom = top - (hc + 2 * M), l = labelCell(i, L.cardW), cc = cardRimCell(L.cardW, cur.h)
        qCard[i].cy = (top + bottom) / 2; qCard[i].hh = (top - bottom) / 2
        qCardRim[i].cy = top - M - hc / 2; qCardRim[i].hh = hc / 2 + RIM.pad
        for (const j of [0, 1]) { t.setY(qCard[i].first + j, 1 - (l.y + cur.h + 2 * M * PX) / H); t.setY(qCardRim[i].first + j, 1 - (cc.y + cc.h) / H) }
      })
      t.needsUpdate = true
      placeAll()
    }
    const state = { u: 0, z: EXP.z }
    const placeAll = () => {
      const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      L.jobs.forEach((_, i) => {
        const lv = expHover.level[i] ?? 0
        const sc = reduced ? 1 : 1 + HOVER.scale * state.u + HOVER.scale2 * lv, z = reduced ? EXP.z : EXP.z + HOVER.lift * state.u + HOVER.lift2 * lv
        place(qMed[i], sc, z); place(qCard[i], sc, z)
        place(qMedRim[i], sc, z - 0.003); place(qCardRim[i], sc, z - 0.003)
      })
      ;(g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      const c = g.getAttribute('color') as THREE.BufferAttribute
      L.jobs.forEach((_, i) => { const a = Math.min(0.7, 0.2 * state.u + 0.7 * (expHover.level[i] ?? 0)); for (const q of [qMedRim[i], qCardRim[i]]) for (let v = 0; v < 4; v++) c.setW(q.first + v, a) })
      c.needsUpdate = true
    }
    paint()
    return { tex, g, wl, placeAll, paint, logos, state }
  }, [L])
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: built.tex, emissive: new THREE.Color(0xffffff), emissiveMap: built.tex, emissiveIntensity: CARD_GLOW[0], roughness: 0.8, metalness: 0, transparent: true, alphaTest: 0.02, vertexColors: true })
    m.userData.fadeOpacityOnly = true
    return m
  }, [built])
  const warm = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color(LIGHT_BAR), emissiveIntensity: 1.6, roughness: 0.5, metalness: 0, toneMapped: false }), [])
  useEffect(() => {
    let alive = true
    wallFade.back.add(material)
    wallFade.back.add(warm)
    expHover.level = L.jobs.map(() => 0)
    L.jobs.forEach((k, i) => {
      if (!k.logo) return
      const img = new Image()
      img.onload = () => { if (!alive) return; built.logos[i] = img; built.paint(); built.tex.needsUpdate = true }
      img.onerror = () => { if (import.meta.env.DEV) console.warn(`Experience timeline: the logo of ${k.name} failed to load (${img.src}); its monogram is shown instead`) }
      img.src = `${BASE}${k.logo}`
    })
    Promise.all([loadFont('700 40px "Nunito"', 'Experience'), loadFont('600 40px "Nunito"', 'Experience'), loadFont(`700 40px ${BOARD_FONT}`, 'Experience')]).then((ok) => { if (alive && ok.some(Boolean)) { built.paint(); built.tex.needsUpdate = true } })
    return () => {
      alive = false
      wallFade.back.delete(material)
      wallFade.back.delete(warm)
      material.dispose(); warm.dispose(); built.tex.dispose(); built.g.dispose(); built.wl.dispose()
    }
  }, [L, built, material, warm])
  const over = useRef(-1)
  const focused = useRef(false)
  useEffect(() => {
    const on = (v: boolean) => (e: Event) => { if ((e.target as HTMLElement | null)?.getAttribute?.('data-nav') === 'experience') focused.current = v }
    const fin = on(true), fout = on(false)
    window.addEventListener('focusin', fin); window.addEventListener('focusout', fout)
    return () => { window.removeEventListener('focusin', fin); window.removeEventListener('focusout', fout) }
  }, [])
  const jobAt = (x: number) => L.jobs.findIndex((k) => Math.abs(x - k.x) <= L.gap / 2)
  const lastTone = useRef(-1)
  const lastUnit = useRef(-1)
  const unitRef = useRef(0)
  useFrame((_, dtRaw) => {
    const tone = runtime.env.tone
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dt = Math.min(dtRaw, 0.05)
    const ease = (cur: number, goal: number) => { const step = dt / (goal > cur ? HOVER.inS : HOVER.outS); return Math.abs(goal - cur) <= step ? goal : cur + Math.sign(goal - cur) * step }
    unitRef.current = ease(unitRef.current, isHovered(EXP_POSE) || focused.current ? 1 : 0)
    const unit = unitRef.current
    const unitMoved = unit !== expHover.unit
    expHover.unit = unit
    if (tone !== lastTone.current || unit !== lastUnit.current) {
      material.emissiveIntensity = byTone(CARD_GLOW, tone) + (byTone(HOVER.emissive, tone) - byTone(CARD_GLOW, tone)) * unit
      warm.emissiveIntensity = (0.9 + 1.4 * Math.min(1, tone / 0.55)) * (1 + HOVER.wire * unit)
      lastTone.current = tone
      lastUnit.current = unit
    }
    let moved = unitMoved
    L.jobs.forEach((_, i) => {
      const cur = expHover.level[i] ?? 0, next = ease(cur, over.current === i && unitRef.current > 0 ? 1 : 0)
      if (next !== cur) { expHover.level[i] = next; moved = true }
    })
    if (moved) { built.state.u = unit; built.placeAll() }
    void reduced
  })
  const x0 = L.jobs[0].x - L.cardW / 2 - 0.04, x1 = L.jobs[L.jobs.length - 1].x + L.cardW / 2 + 0.04
  const y0 = EXP.y - L.d / 2 - EXP.labelDy - EXP.labelH - 0.03,  y1 = EXP.headingY + EXP.headingH / 2
  return (
    <group>
      <mesh geometry={built.g} material={material} frustumCulled={false} raycast={() => null} receiveShadow={false} castShadow={false} />
      <mesh geometry={built.wl} material={warm} raycast={() => null} />
      <mesh
        material={hitMaterial}
        position={[(x0 + x1) / 2, (y0 + y1) / 2, EXP.wallZ + 0.035]}
        {...handlers}
        onPointerMove={(e) => { over.current = jobAt(e.point.x) }}
        onPointerOut={(e) => { over.current = -1; handlers.onPointerOut(e) }}
      >
        <boxGeometry args={[x1 - x0, y1 - y0, 0.07]} />
      </mesh>
    </group>
  )
}
