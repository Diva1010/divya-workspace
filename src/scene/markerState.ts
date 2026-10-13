import { useSyncExternalStore } from 'react'

const STORE_KEY = 'ws:sparkle'

interface Saved { found: string[]; on: boolean; seen: boolean }

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
    if (v && Array.isArray(v.found)) return { found: v.found.filter((x: unknown) => typeof x === 'string'), on: v.on !== false, seen: v.seen === true }
  } catch {}
  return { found: [], on: true, seen: false }
}
const saved = load()
const found = new Set(saved.found)
export const FIRST_VISIT = !saved.seen && found.size === 0

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ found: [...found], on: ui.sparkles, seen: true }))
  } catch {}
}

export interface MarkerLabelState {
  text: string
  at: 'cursor' | 'fixed' | 'marker'
  x: number
  y: number
}
interface MarkerUi {
  sparkles: boolean
  hint: boolean
  label: MarkerLabelState | null
}

let ui: MarkerUi = { sparkles: saved.on, hint: FIRST_VISIT && saved.on, label: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<MarkerUi>) => {
  ui = { ...ui, ...patch }
  listeners.forEach((l) => l())
}
export const getMarkerUi = () => ui
export const useMarkerUi = <T,>(select: (s: MarkerUi) => T): T =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => select(ui))

export const setSparkles = (on: boolean) => {
  set({ sparkles: on, hint: on && ui.hint })
  save()
}
export const hideHint = () => {
  if (ui.hint) set({ hint: false })
}
export const setMarkerLabel = (label: MarkerLabelState | null) => set({ label })

export const isFound = (id: string) => found.has(id)
export const markFound = (id: string) => {
  if (found.has(id)) return
  found.add(id)
  hideHint()
  save()
}

export const COARSE = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Touch tap on a label-only object: show its label at the tap until `until` (performance.now ms).
export const decorTap = { until: 0, x: 0, y: 0 }

export let lastPointerType: string = COARSE ? 'touch' : 'mouse'
export const trackPointerType = (t: string) => {
  lastPointerType = t
}

if (FIRST_VISIT) save()
