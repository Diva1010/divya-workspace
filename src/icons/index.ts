import sectionIcons from './sectionIcons.json'
import { ICON_PATHS, type IconName } from './paths'
import type { ContentKey } from '../zones/types'

export { ICON_PATHS, type IconName }

export const SECTION_ICON = sectionIcons as Record<ContentKey, IconName>

const ICON_STROKE = 2

const path2d = new Map<IconName, Path2D[]>()
function icon2d(name: IconName): Path2D[] {
  let p = path2d.get(name)
  if (!p) {
    p = ICON_PATHS[name].map((d) => new Path2D(d))
    path2d.set(name, p)
  }
  return p
}

export function strokeIcon(c: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number, lineWidth = ICON_STROKE) {
  c.save()
  c.translate(x - size / 2, y - size / 2)
  c.scale(size / 24, size / 24)
  c.lineWidth = lineWidth
  c.lineCap = 'round'
  c.lineJoin = 'round'
  for (const p of icon2d(name)) c.stroke(p)
  c.restore()
}
