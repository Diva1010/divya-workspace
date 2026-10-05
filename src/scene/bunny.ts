import * as THREE from 'three'

const BUNNY = { height: 0.09, width: 0.05, depth: 0.05, cream: '#F4E8CC', lavender: '#C9B3EA', dark: '#3A2B22' }

const part = (g: THREE.BufferGeometry, hex: string) => {
  const flat = g.index ? g.toNonIndexed() : g
  flat.deleteAttribute('uv')
  flat.computeVertexNormals()
  const c = new THREE.Color(hex)
  const colors = new Float32Array(flat.attributes.position.count * 3)
  for (let i = 0; i < flat.attributes.position.count; i++) colors.set([c.r, c.g, c.b], i * 3)
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return flat
}

const ellipsoid = (rx: number, ry: number, rz: number, w: number, h: number, at: [number, number, number]) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz).translate(...at)

export function bunnyParts(): THREE.BufferGeometry[] {
  const B = BUNNY
  const body = new THREE.SphereGeometry(1, 7, 5).scale(0.025, 0.027, 0.024).translate(0, 0.027, 0)
  const p = body.attributes.position
  for (let i = 0; i < p.count; i++) {
    const k = 1 - 0.22 * Math.max(0, (p.getY(i) - 0.027) / 0.027)
    p.setX(i, p.getX(i) * k)
    p.setZ(i, p.getZ(i) * k)
  }
  const parts = [
    part(body, B.cream),
    part(ellipsoid(0.019, 0.018, 0.018, 6, 4, [0, 0.057, 0.008]), B.cream),
    part(ellipsoid(0.01, 0.01, 0.01, 5, 3, [0, 0.022, -0.023]), B.cream),
    part(ellipsoid(0.0035, 0.003, 0.003, 4, 2, [0, 0.055, 0.0255]), B.lavender),
    part(ellipsoid(0.0028, 0.0034, 0.002, 4, 2, [-0.0075, 0.0615, 0.0243]), B.dark),
    part(ellipsoid(0.0028, 0.0034, 0.002, 4, 2, [0.0075, 0.0615, 0.0243]), B.dark),
  ]
  for (const side of [-1, 1]) {
    const tilt = side * 0.2
    const ear = new THREE.CylinderGeometry(0.0033, 0.0072, 0.028, 5, 1, true).translate(0, 0.014, 0)
    const inner = new THREE.PlaneGeometry(0.006, 0.02).translate(0, 0.0135, 0.0058)
    for (const g of [ear, inner]) {
      g.applyMatrix4(new THREE.Matrix4().makeTranslation(side * 0.0095, 0.062, 0.004).multiply(new THREE.Matrix4().makeRotationZ(-tilt)))
    }
    parts.push(part(ear, B.cream), part(inner, B.lavender))
  }
  return parts
}
