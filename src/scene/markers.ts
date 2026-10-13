// Sparkle markers for clickable objects. Plain data (no imports) so scripts/check-content.mjs can load it.
// centers = world centres of the object's click volume (used by the build check). anchor = top centre of the object (world metres), offset = nudge from the anchor, size = multiplier on the marker size.
// tier 1: always visible. tier 2: reveals when its nav button is hovered or focused (desktop); about 60% opacity always on touch.

// Look of a marker the visitor has already used (tune here).
export const VISITED_OPACITY = 0.75
export const VISITED_SIZE = 0.9
export const VISITED_PULSE_SECONDS = 4
export const VISITED_ORBITING_MOTES = 1
export const VISITED_MOTE_SPEED = 0.5
export const VISITED_CORE_COLOR = '#F1E4FF'
export const VISITED_DAY_HALO_COLOR = '#7A55C8' // deeper than the normal Day halo so a visited marker keeps 2:1 against a pale wall

export type MarkerAct = 'blind' | 'lamp' | 'floorLamp' | 'sideLamp' | 'reading' | 'currentRead' | 'travel' | 'about' | 'experience' | 'projects' | 'skills' | 'education' | 'resume' | 'contact' | 'now'

export interface MarkerSpec {
  id: string
  tier: 1 | 2
  act: MarkerAct
  pose?: string
  covers: string[]
  centers: [number, number, number][]
  anchor: [number, number, number]
  offset: [number, number, number]
  size: number
  label?: string
  wall?: 'back' | 'left' | 'right'
}

// Every clickable object: room.json ids where one exists, plus the ones built in code (blind, sideLamp, reading-shelf, travel-diary).
export const HOTSPOT_IDS = [
  'blind', 'lamp', 'floor-lamp', 'sideLamp', 'reading-shelf', 'book', 'travel-diary',
  'modern-family-print', 'monitor-left', 'monitor-right', 'laptop', 'phone', 'resume-paper', 'photo-frame', 'experience-cards', 'degrees', 'whiteboard',
]

export const NO_MARKER: { id: string; reason: string }[] = [{ id: 'modern-family-print', reason: 'label-only decor' }]

// Objects that only show a label (nothing opens). group = hover group, center = world centre of the hit volume.
export const LABEL_ONLY = { id: 'modern-family-print', group: 'modern-family', label: 'My all-time favorite show', center: [-3.7, 2.39, 1.1] as [number, number, number], tapSeconds: 2.5 }

export const ROOM_BOUNDS = { x: [-3.99, 3.99], y: [0, 4.4], z: [-3.99, 4.24] } as const

export const MARKERS: MarkerSpec[] = [
  { id: 'blind', tier: 1, act: 'blind', covers: ['blind'], centers: [[-1.3, 2.85, -3.83]], anchor: [-0.07, 2.93, -3.79], offset: [0, -0.1, 0.04], size: 1, label: 'Open or close the blinds', wall: 'back' },
  { id: 'lamp', tier: 1, act: 'lamp', covers: ['lamp'], centers: [[-0.58, 1.66, -3.4]], anchor: [-0.58, 2.05, -3.106], offset: [0, 0.12, 0], size: 1, label: 'Lamp on/off' },
  { id: 'floorLamp', tier: 1, act: 'floorLamp', covers: ['floor-lamp'], centers: [[-3.62, 1.5, -1.1]], anchor: [-3.62, 1.75, -1.1], offset: [0, 0.1, 0], size: 1, label: 'Lamp on/off' },
  { id: 'sideLamp', tier: 1, act: 'sideLamp', covers: ['sideLamp'], centers: [[3.5, 2.33, -3.1]], anchor: [3.5, 2.5, -3.1], offset: [0, 0.09, 0], size: 1, label: 'Lamp on/off' },
  { id: 'reading', tier: 1, act: 'reading', pose: 'reading-shelf', covers: ['reading-shelf'], centers: [[-3.63, 1.35, -2.66]], anchor: [-3.46, 2.65, -2.66], offset: [0, 0.1, 0], size: 1, label: 'Browse the bookshelf', wall: 'left' },
  { id: 'currentRead', tier: 1, act: 'currentRead', pose: 'current-read', covers: ['book'], centers: [[-2.663, 0.56, -1.498]], anchor: [-2.663, 0.62, -1.498], offset: [0, 0.09, 0], size: 1, label: 'Currently reading' },
  { id: 'travel', tier: 1, act: 'travel', pose: 'travel-diary', covers: ['travel-diary'], centers: [[-2.62, 0.76, -2.65]], anchor: [-2.62, 0.795, -2.65], offset: [0, 0.09, 0], size: 1, label: "Places I've loved" },
  { id: 'projects', tier: 2, act: 'projects', pose: 'screen-left', covers: ['monitor-left', 'monitor-right'], centers: [[0.3, 1.65, -3.6], [1.44, 1.65, -3.6]], anchor: [0.87, 1.98, -3.6], offset: [0, 0.1, 0], size: 1 },
  { id: 'skills', tier: 2, act: 'skills', pose: 'laptop-screen', covers: ['laptop'], centers: [[2.6, 1.5, -3.15]], anchor: [2.6, 1.84, -3.525], offset: [0, 0.09, 0], size: 1 },
  { id: 'contact', tier: 2, act: 'contact', pose: 'phone-screen', covers: ['phone'], centers: [[0.07, 1.3, -2.4]], anchor: [0.07, 1.42, -2.45], offset: [0.06, 0.09, 0], size: 1 },
  { id: 'resume', tier: 2, act: 'resume', pose: 'resume-paper', covers: ['resume-paper'], centers: [[-0.58, 1.45, -2.55]], anchor: [-0.58, 1.64, -2.55], offset: [-0.28, 0.06, 0], size: 1 },
  { id: 'about', tier: 2, act: 'about', pose: 'photo-frame', covers: ['photo-frame'], centers: [[2.6854, 3.205, -3.96]], anchor: [2.6854, 3.5, -3.96], offset: [0, 0.09, 0], size: 1, wall: 'back' },
  { id: 'experience', tier: 2, act: 'experience', pose: 'experience', covers: ['experience-cards'], centers: [[1.0, 2.93, -3.95]], anchor: [1.06, 3.615, -3.95], offset: [0, 0.09, 0], size: 1, wall: 'back' },
  { id: 'education', tier: 2, act: 'education', pose: 'education', covers: ['degrees'], centers: [[3.93, 1.92, 2.07]], anchor: [3.93, 3.5, 2.07], offset: [0, 0.09, -0.6], size: 1, wall: 'right' },
  { id: 'now', tier: 2, act: 'now', pose: 'whiteboard-screen', covers: ['whiteboard'], centers: [[3.9, 1.92, -0.3]], anchor: [3.93, 2.59, -0.3], offset: [0, 0.09, 0.7], size: 1, wall: 'right' },
]

// Screen-space picking shared with the build check: the nearest marker centre within radius wins.
// The current owner is kept until the pointer is more than radius + release px from it (hysteresis), unless another centre is nearer.
export function pickMarker(centres: ({ x: number; y: number } | null)[], x: number, y: number, radius: number, current = -1, release = 0): number {
  let best = -1
  let bestD = radius
  let curD = Infinity
  centres.forEach((c, i) => {
    if (!c) return
    const d = Math.hypot(c.x - x, c.y - y)
    if (i === current) curD = d
    if (d <= bestD) { bestD = d; best = i }
  })
  if (current >= 0 && curD <= radius + release && (best < 0 || curD <= bestD)) return current
  return best
}

export const markerPos = (m: MarkerSpec): [number, number, number] => [m.anchor[0] + m.offset[0], m.anchor[1] + m.offset[1], m.anchor[2] + m.offset[2]]
