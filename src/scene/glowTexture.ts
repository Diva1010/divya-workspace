import * as THREE from 'three'

const GLOW_FALLOFF = 4
const GLOW_PX_PER_UNIT = 100
const glowCache = new Map<string, THREE.CanvasTexture>()

export function glowTexture(w: number, h: number, reach: number): THREE.CanvasTexture {
  const key = `${w},${h},${reach}`
  const hit = glowCache.get(key)
  if (hit) return hit
  const W = Math.round((w + 2 * reach) * GLOW_PX_PER_UNIT)
  const H = Math.round((h + 2 * reach) * GLOW_PX_PER_UNIT)
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const hx = w / 2
  const hy = h / 2
  const r = 0.09
  const edge = Math.exp(-GLOW_FALLOFF)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = Math.abs((x + 0.5) / GLOW_PX_PER_UNIT - (w + 2 * reach) / 2)
      const py = Math.abs((y + 0.5) / GLOW_PX_PER_UNIT - (h + 2 * reach) / 2)
      const qx = Math.max(px - (hx - r), 0)
      const qy = Math.max(py - (hy - r), 0)
      const d = Math.max(Math.hypot(qx, qy) - r, 0)
      const t = d / reach
      const g = t >= 1 ? 0 : Math.max(0, (Math.exp(-GLOW_FALLOFF * t * t) - edge) / (1 - edge))
      const roll = t < 0.8 ? 1 : (1 - (t - 0.8) / 0.2) ** 2 * (1 + 2 * ((t - 0.8) / 0.2))
      const i = (y * W + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = Math.round(255 * g * roll)
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  glowCache.set(key, tex)
  return tex
}
