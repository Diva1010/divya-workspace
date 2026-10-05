export type ContentKey = 'about' | 'experience' | 'skills' | 'projects' | 'contact' | 'resume' | 'education' | 'now' | 'reading' | 'currentRead' | 'travel'
export type TimeOfDay = 'day' | 'dusk' | 'night'
export type V3 = [number, number, number]

interface LampSpec {
  head: V3
  hit: [number, number, number, number][]
  ring: number
  hitBoxes?: [number, number, number, number, number, number][]
}

export interface Prop {
  palette?: Record<string, string>
  id: string
  model: string
  position: V3
  rotationY: number
  scale: number
  shadow?: boolean
  scaleXYZ?: V3
  rotation?: V3
  wall?: 'back' | 'left' | 'right'
  hotspot?: ObjectHotspot
  decal?: Decal
  interaction?: 'lamp' | 'floorLamp'
  lamp?: LampSpec
}

interface PoseSpec {
  target: V3
  dir: V3
  distance: number
  fitWidth?: number
  screen?: { width: number; fallbackPose?: string; minPx: number }
  tallDistance?: number
  shift?: { wide: [number, number]; tall: [number, number] }
  sideCard?: boolean
  wallView?: boolean
  focusLight?: boolean
}

interface GlowSpec {
  kind: 'wall'
  wall: 'back' | 'left' | 'right'
  rotationY?: number
  position: V3
  size: [number, number]
}

interface Decal {
  size: number
  position: V3
  rotation?: V3
  tone?: 'dark' | 'light'
  photo?: [number, number]
}

export interface ObjectHotspot {
  contentKey: ContentKey
  pose: string
  glow?: GlowSpec
}

export interface CodeProp {
  id: string
  kind: 'laptop' | 'standee' | 'phone'
  position: V3
  rotationY: number
  size: [number, number, number]
  lidAngle?: number
  tilt?: number
  scale?: number
  hotspot?: ObjectHotspot
  decal?: Decal
}

export interface ScreenSpec {
  id: string
  prop: string
  kind: 'projects' | 'editor' | 'skills' | 'contact' | 'now'
  pose?: string
}

export interface MonitorScreenQuad {
  halfWidth: number
  bottom: { y: number; z: number }
  top: { y: number; z: number }
}

interface WallPropBase {
  id: string
  wall: 'right' | 'left' | 'back'
  hotspot: ObjectHotspot
}

export interface WhiteboardProp extends WallPropBase {
  kind: 'whiteboard'
  x: number
  y: number
  frame: [number, number]
  surface: [number, number]
  off: number
  tray: { w: number; d: number; y: number }
}

export interface DegreesProp extends WallPropBase {
  kind: 'degrees'
  off: number
  panel: { x: number; w: number; y0: number; y1: number; slats: number; rail: { h: number; proud: number } }
  emblem: { y: number; d: number }
  plate: { y: number; w: number; h: number; depth: number }
  led: { y: number; w: number; h: number }
  diplomas: { xs: number[]; y: number; w: number; h: number; depth: number; border: number; light: { w: number; dy: number } }
}

export interface ShelfProp extends Omit<WallPropBase, 'hotspot' | 'wall'> {
  kind: 'shelf'
  wall: 'right' | 'left'
  hotspot?: undefined
  origin: V3
  x: number
  length: number
  depth: number
  top: number
  back: number
  brackets: number
}

interface CardsProp extends WallPropBase {
  kind: 'cards'
  wall: 'back'
}

type WallProp = WhiteboardProp | DegreesProp | ShelfProp | CardsProp

export interface ShelfBoardSpec {
  id: string
  x: number
  length: number
  depth: number
  top: number
  brackets: number
}

interface WallShelves {
  wall: 'right'
  back: number
  boards: ShelfBoardSpec[]
}

export interface PlantPlacement {
  id: string
  model: string
  group: 'floor' | 'left' | 'right' | 'back'
  position: V3
  rotationY: number
  size: number
  tilt?: [number, number]
  recolor?: Record<string, string>
  stretch?: number
  rest?: [number, number, number, number, number, number]
  note?: string
}

export interface ZoneData {
  id: string
  origin: V3
  lighting: TimeOfDay
  bounds: { halfWidth: number; height: number; thickness: number; frontPostZ: number }
  window: { cx: number; cy: number; w: number; h: number }
  camera: {
    home: { position: V3; target: V3; fov: number }
    orbit: {
      minDistance: number
      maxDistance: number
      minPolar: number
      maxPolarPi: number
      damping: number
      rotateSpeed: number
      zoomSpeed: number
    }
    glideSeconds: number
    backSeconds: number
    focusDistance: number
  }
  poses: Record<string, PoseSpec>
  screens: ScreenSpec[]
  monitorScreen: MonitorScreenQuad
  propScale: number
  props: Prop[]
  codeProps: CodeProp[]
  wallProps: WallProp[]
  shelves: WallShelves
  plants: PlantPlacement[]
}
