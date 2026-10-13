import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Tunables for the ribbon on the Modern Family frame (metres).
export const RIBBON = {
  height: 0.15,
  bandK: 1.043,
  envelopeK: 1.12,
  cornerK: 0.14,
  notchK: 0.25,
  pointRadius: 0.004,
  thickness: 0.008,
  bevel: 0.003,
  bevelSegments: 1,
  curveSegments: 6,
  drapeMiddle: 0.012,
  drapeEnds: -0.01,
  tailAngleDeg: 12,
  tailW: 0.05,
  tailLen: 0.09,
  tailNotch: 0.02,
  tailRadius: 0.006,
}

type P = [number, number]

// Closed polygon with each corner rounded by a true radius (quadratic blend).
function roundedShape(pts: P[], radii: number[]): THREE.Shape {
  const s = new THREE.Shape()
  const n = pts.length
  const at = (i: number) => pts[(i + n) % n]
  const corner = (i: number) => {
    const p = at(i), a = at(i - 1), b = at(i + 1)
    const va = [a[0] - p[0], a[1] - p[1]], vb = [b[0] - p[0], b[1] - p[1]]
    const la = Math.hypot(va[0], va[1]), lb = Math.hypot(vb[0], vb[1])
    const cos = (va[0] * vb[0] + va[1] * vb[1]) / (la * lb)
    const theta = Math.acos(Math.min(1, Math.max(-1, cos)))
    const d = Math.min(radii[i] / Math.tan(theta / 2), la / 2, lb / 2)
    return { s: [p[0] + (va[0] / la) * d, p[1] + (va[1] / la) * d] as P, e: [p[0] + (vb[0] / lb) * d, p[1] + (vb[1] / lb) * d] as P, p }
  }
  const c0 = corner(0)
  s.moveTo(c0.e[0], c0.e[1])
  for (let k = 1; k <= n; k++) {
    const c = corner(k % n)
    s.lineTo(c.s[0], c.s[1])
    s.quadraticCurveTo(c.p[0], c.p[1], c.e[0], c.e[1])
  }
  return s
}

// Frame-local ribbon: x across, y up (frame centre = 0), z out of the frame face. Returns one merged, non-indexed geometry
// with uv into the banner atlas: band in the top (1 - v0) of the canvas, tails and folds in two blocks of the strip below.
export function buildRibbon(frameW: number, frameH: number, frameDepth: number, v0: number): THREE.BufferGeometry {
  const R = RIBBON
  const bandW = frameW * R.bandK
  const half = bandW / 2
  const yTop = frameH / 2 + 0.03
  const yBot = yTop - R.height
  const yMid = (yTop + yBot) / 2
  const rc = R.cornerK * R.height
  const notch = R.notchK * R.height
  const outline: P[] = [[-half, yTop], [half, yTop], [half - notch, yMid], [half, yBot], [-half, yBot], [-half + notch, yMid]]
  const shape = roundedShape(outline, [rc, rc, R.pointRadius, rc, rc, R.pointRadius])
  const band = new THREE.ExtrudeGeometry(shape, { depth: R.thickness, bevelEnabled: true, bevelThickness: R.bevel, bevelSize: R.bevel, bevelSegments: R.bevelSegments, curveSegments: R.curveSegments, steps: 1 })
  const total = R.thickness + 2 * R.bevel
  const zFront = frameDepth + 0.026
  band.translate(0, 0, zFront - total + R.bevel)
  const bp = band.getAttribute('position')
  const buv = new Float32Array(bp.count * 2)
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), y = bp.getY(i)
    buv[i * 2] = (x + half) / bandW
    buv[i * 2 + 1] = v0 + ((y - yBot) / R.height) * (1 - v0)
    const u = x / half
    bp.setZ(i, bp.getZ(i) + R.drapeMiddle + (R.drapeEnds - R.drapeMiddle) * u * u)
  }
  band.setAttribute('uv', new THREE.BufferAttribute(buv, 2))
  const parts: THREE.BufferGeometry[] = [band]

  const zBack = frameDepth * 0.55
  const ang = (R.tailAngleDeg * Math.PI) / 180
  for (const sgn of [-1, 1]) {
    const tw = R.tailW, tl = R.tailLen
    const tailShape = roundedShape([[-tw / 2, 0], [tw / 2, 0], [tw / 2, -tl], [0, -tl + R.tailNotch], [-tw / 2, -tl]], [R.tailRadius, R.tailRadius, R.tailRadius, R.pointRadius, R.tailRadius])
    const tail = new THREE.ShapeGeometry(tailShape, R.curveSegments)
    // hang from just inside the band end, tilt outward and down
    tail.rotateZ(sgn * -ang)
    tail.translate(sgn * (half - tw * 0.45), yBot + 0.03, zBack)
    const fold = new THREE.BufferGeometry()
    fold.setAttribute('position', new THREE.Float32BufferAttribute([
      sgn * (half - 0.03), yBot + 0.012, zFront - total + 0.002,
      sgn * (half - 0.003), yBot + 0.012, zBack,
      sgn * (half - 0.03), yBot - 0.025, zBack,
    ], 3))
    for (const [g, u] of [[tail, 0.25], [fold, 0.75]] as [THREE.BufferGeometry, number][]) {
      const n = g.getAttribute('position').count
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(Array.from({ length: n }, () => [u, v0 / 2]).flat()), 2))
    }
    parts.push(tail.index ? tail.toNonIndexed() : tail, fold)
  }
  const merged = mergeGeometries(parts.map((g) => { g.deleteAttribute('normal'); return g.index ? g.toNonIndexed() : g }))!
  merged.computeVertexNormals()
  parts.forEach((g) => g.dispose())
  return merged
}

export const ribbonEnvelope = (frameW: number) => frameW * RIBBON.envelopeK
