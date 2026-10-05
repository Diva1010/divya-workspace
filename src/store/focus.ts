import { useSyncExternalStore } from 'react'
import type { ContentKey, TimeOfDay, V3 } from '../zones/types'
import type { ThemeName } from '../scene/themes'
import { room } from '../zones/zone'

export interface Pose {
  pos: V3
  target: V3
  fit?: { dir: V3; distance: number; width: number }
  screen?: { width: number; fallbackPose?: string; minPx: number }
  dir?: V3
  distance?: number
  tallDistance?: number
  shift?: { wide: [number, number]; tall: [number, number] }
  sideCard?: boolean
  wallView?: boolean
  focusLight?: boolean
}

type Phase = 'idle' | 'gliding' | 'screen' | 'open'
export interface Detail {
  section: 'projects' | 'skills'
  id: string
}

export interface FocusState {
  theme: ThemeName
  time: TimeOfDay
  roof: boolean
  lampOn: boolean
  floorLampOn: boolean
  sideLampOn: boolean
  blindClosed: boolean
  active: ContentKey | null
  activePose: string | null
  phase: Phase
  detail: Detail | null
  detailFrom: Detail | null
  screenUi: boolean
  poses: Record<string, Pose>
  resetNonce: number
  sceneFailed: boolean
}

const norm = (v: V3): V3 => {
  const l = Math.hypot(...v) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
function seedPoses(): Record<string, Pose> {
  const out: Record<string, Pose> = {}
  for (const [id, p] of Object.entries(room.poses)) {
    const d = norm(p.dir)
    out[id] = { pos: [p.target[0] + d[0] * p.distance, p.target[1] + d[1] * p.distance, p.target[2] + d[2] * p.distance], target: p.target, fit: p.fitWidth ? { dir: d, distance: p.distance, width: p.fitWidth } : undefined, screen: p.screen, dir: d, distance: p.distance, tallDistance: p.tallDistance, shift: p.shift, sideCard: p.sideCard, wallView: p.wallView, focusLight: p.focusLight }
  }
  return out
}

function defaultPoseId(key: ContentKey): string | null {
  const obj = [...room.props, ...room.codeProps, ...room.wallProps].find((p) => p.hotspot?.contentKey === key)
  return obj?.hotspot?.pose ?? null
}

let state: FocusState = {
  theme: 'lavender',
  time: room.lighting,
  roof: true,
  lampOn: true,
  floorLampOn: true,
  sideLampOn: true,
  blindClosed: false,
  active: null,
  activePose: null,
  phase: 'idle',
  detail: null, detailFrom: null,
  screenUi: false,
  poses: seedPoses(),
  resetNonce: 0,
  sceneFailed: false,
}

const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
function set(patch: Partial<FocusState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const getState = () => state
export function useFocus<T>(select: (s: FocusState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

let opener: HTMLElement | null = null
let originKey: ContentKey | null = null
export const getOpener = () => ({ el: opener, key: originKey })

export const setTheme = (theme: ThemeName) => set({ theme })
export const setTime = (time: TimeOfDay) => set({ time })
export const toggleRoof = () => set({ roof: !state.roof })
export const toggleLamp = () => set({ lampOn: !state.lampOn })
export const toggleFloorLamp = () => set({ floorLampOn: !state.floorLampOn })
export const toggleSideLamp = () => set({ sideLampOn: !state.sideLampOn })
export const toggleBlind = () => set({ blindClosed: !state.blindClosed })

export function focus(key: ContentKey, poseId?: string) {
  const pose = poseId ?? defaultPoseId(key)
  if (state.active === key && state.activePose === pose) return
  if (state.active === null) {
    const el = document.activeElement
    opener = el instanceof HTMLElement && el !== document.body ? el : null
    originKey = key
  }
  set({ active: key, activePose: pose, detail: null, detailFrom: null, screenUi: false, phase: pose && state.poses[pose] ? 'gliding' : 'open' })
}
export const back = () => {
  if (state.active === null) return
  if (state.phase === 'open' && state.detail && state.screenUi) {
    if (state.detailFrom) {
      set({ detail: state.detailFrom, detailFrom: null })
      return
    }
    set({ detail: null, detailFrom: null, phase: 'screen' })
    return
  }
  set({ active: null, activePose: null, detail: null, detailFrom: null, screenUi: false, phase: 'idle' })
}
export const reset = () =>
  set({ active: null, activePose: null, detail: null, detailFrom: null, screenUi: false, phase: 'idle', resetNonce: state.resetNonce + 1 })
export const settle = () => {
  if (state.active !== null && state.phase === 'gliding') set({ phase: state.screenUi ? 'screen' : 'open' })
}
export const chooseScreen = (use: boolean, poseId: string | null) => set({ screenUi: use, activePose: poseId })
export const openDetail = (detail: Detail) => {
  if (state.phase !== 'screen' && !(state.phase === 'open' && state.active !== null)) return
  set({ detail, detailFrom: state.detail, phase: 'open' })
}
export const failScene = () => set({ sceneFailed: true, active: null, activePose: null, detail: null, detailFrom: null, screenUi: false, phase: 'idle' })

export const useScreenMounted = (kind: string) =>
  useFocus((s) => s.screenUi && (s.phase === 'screen' || s.phase === 'open') && s.active === kind)
