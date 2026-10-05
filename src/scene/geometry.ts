import * as THREE from 'three'

function rr(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

const cache = new Map<string, THREE.BufferGeometry>()
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key)
  if (!g) {
    g = make()
    cache.set(key, g)
  }
  return g as T
}

export interface Segments {
  curve: number
  bevel: number
}

export function panel(w: number, h: number, d: number, r: number, b: number, seg?: Segments) {
  return cached(`panel:${w},${h},${d},${r},${b},${seg?.curve ?? 5},${seg?.bevel ?? 3}`, () => {
    b = Math.min(b, d / 2 - 0.001, w / 2 - 0.001, h / 2 - 0.001)
    r = Math.max(r, b + 0.01)
    const g = new THREE.ExtrudeGeometry(rr(w - 2 * b, h - 2 * b, r - b), {
      depth: d - 2 * b,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: seg?.bevel ?? 3,
      curveSegments: seg?.curve ?? 5,
    })
    g.translate(0, 0, -(d / 2 - b))
    return g
  })
}

export function slab(w: number, d: number, h: number, r: number, b: number, seg?: Segments) {
  return cached(`slab:${w},${d},${h},${r},${b},${seg?.curve ?? 5},${seg?.bevel ?? 3}`, () => {
    const g = panel(w, d, h, r, b, seg).clone()
    g.rotateX(-Math.PI / 2)
    g.translate(0, h / 2, 0)
    return g
  })
}

export interface Hole {
  cx: number
  cy: number
  w: number
  h: number
}

export function wallGeo(wd: number, hh: number, th: number, holes: Hole[], b: number) {
  return cached(`wall:${wd},${hh},${th},${b},${JSON.stringify(holes)}`, () => {
    const s = new THREE.Shape()
    s.moveTo(-wd / 2 + b, b)
    s.lineTo(wd / 2 - b, b)
    s.lineTo(wd / 2 - b, hh - b)
    s.lineTo(-wd / 2 + b, hh - b)
    s.lineTo(-wd / 2 + b, b)
    holes.forEach((h) => {
      const p = new THREE.Path()
      const x0 = h.cx - h.w / 2 - b
      const x1 = h.cx + h.w / 2 + b
      const y0 = h.cy - h.h / 2 - b
      const y1 = h.cy + h.h / 2 + b
      p.moveTo(x0, y0)
      p.lineTo(x0, y1)
      p.lineTo(x1, y1)
      p.lineTo(x1, y0)
      p.lineTo(x0, y0)
      s.holes.push(p)
    })
    const g = new THREE.ExtrudeGeometry(s, {
      depth: th - 2 * b,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2,
      curveSegments: 2,
    })
    g.translate(0, 0, -(th / 2 - b))
    return g
  })
}

export function mulberry(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
