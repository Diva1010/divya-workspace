import * as THREE from 'three'
import { fovForAspect } from './poseFit'
import { content } from '../content'
import { degreeWall } from '../zones/zone'
import type { Pose } from '../store/focus'

export const PHONE_MAX_WIDTH = 600
export const LANDSCAPE_MAX_HEIGHT = 500
export const CARD_FILL = 0.88
export const CARD_FIT_HEIGHT = 0.96
export const LANDSCAPE_FILL = 0.88
export const SWIPE_MIN_PX = 40
export const SWIPE_HORIZONTAL_RATIO = 1.5
export const CARD_GLIDE_S = 0.35
export const TOP_MIN_PX = 8
export const TOP_GAP_PX = 8
export const PAGER_H_PX = 54
export const PAGER_GAP_PX = 8

export type EduMode = 'overview' | 'cards' | 'landscape'

export const eduMode = (w: number, h: number): EduMode =>
  w <= PHONE_MAX_WIDTH && w < h ? 'cards' : w >= h && h < LANDSCAPE_MAX_HEIGHT ? 'landscape' : 'overview'

export const eduCount = () => Math.min(content.education.items.length, degreeWall.diplomas.xs.length)

export const barGap = (stageBottom: number) => {
  const bar = document.querySelector('.bar')
  return bar ? Math.max(0, stageBottom - bar.getBoundingClientRect().top) : 0
}

export function educationFraming(pose: Pose, box: DOMRect, card: number): { mode: EduMode; pos: THREE.Vector3; target: THREE.Vector3 } | null {
  const mode = eduMode(box.width, box.height)
  const count = eduCount()
  if (mode === 'overview' || !pose.dir || count < 1) return null
  const { xs, y, w, h } = degreeWall.diplomas
  const aspect = box.width / box.height
  const tanH = Math.tan((fovForAspect(aspect) * Math.PI) / 360)
  const dir = new THREE.Vector3(...pose.dir)
  if (mode === 'landscape') {
    const span = xs[count - 1] - xs[0] + w
    const d = Math.max(h / (LANDSCAPE_FILL * 2 * tanH), span / (CARD_FIT_HEIGHT * 2 * aspect * tanH))
    const target = new THREE.Vector3(pose.target[0], y, (xs[0] + xs[count - 1]) / 2)
    return { mode, target, pos: target.clone().addScaledVector(dir, d) }
  }
  const nav = document.querySelector('nav.menu')
  const top = Math.max(TOP_MIN_PX, nav ? nav.getBoundingClientRect().bottom - box.top + TOP_GAP_PX : 0)
  const bottom = barGap(box.bottom) + PAGER_GAP_PX + PAGER_H_PX + PAGER_GAP_PX
  const avail = Math.max(1, box.height - top - bottom)
  const d = Math.max(w / (CARD_FILL * 2 * aspect * tanH), (h * box.height) / (avail * CARD_FIT_HEIGHT * 2 * tanH))
  const dy = ((bottom - top) / 2) * ((2 * d * tanH) / box.height)
  const target = new THREE.Vector3(pose.target[0], y - dy, xs[Math.min(Math.max(card, 0), count - 1)])
  return { mode, target, pos: target.clone().addScaledVector(dir, d) }
}
