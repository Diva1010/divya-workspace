import * as THREE from 'three'
import type { Theme } from './themes'
import type { TimeOfDay } from '../zones/types'
import { room } from '../zones/zone'
import { ENV, EASE_RATE, type EnvPreset } from './lightingPresets'

export type WallKey = 'back' | 'left' | 'right'


const COLOR_KEYS = ['hemiSky', 'hemiGround', 'sunColor', 'winColor'] as const
type ColorKey = (typeof COLOR_KEYS)[number]
type EnvNumbers = Omit<EnvPreset, ColorKey | 'sunPos'>
export interface Env extends EnvNumbers {
  sunPos: [number, number, number]
  hemiSky: THREE.Color
  hemiGround: THREE.Color
  sunColor: THREE.Color
  winColor: THREE.Color
}

function makeEnv(p: EnvPreset): Env {
  const env = { ...p, sunPos: [...p.sunPos] } as unknown as Env
  for (const k of COLOR_KEYS) env[k] = new THREE.Color(p[k])
  return env
}
const targetColors = Object.fromEntries((Object.keys(ENV) as TimeOfDay[]).map((t) => [t, Object.fromEntries(COLOR_KEYS.map((k) => [k, new THREE.Color(ENV[t][k])]))])) as Record<TimeOfDay, Record<ColorKey, THREE.Color>>

export const runtime = {
  lampLevel: 1,
  floorLampLevel: 1,
  floorLampHover: 0,
  sideLampLevel: 1,
  sideLampHover: 0,
  blind: 0,
  blindHover: 0,
  wallOp: { back: 1, left: 1, right: 1 } as Record<WallKey, number>,
  env: makeEnv(ENV[room.lighting]),
}

export const wallFade: Record<WallKey, Set<THREE.Material>> = {
  back: new Set(),
  left: new Set(),
  right: new Set(),
}

export const themeListeners = new Set<(t: Theme) => void>()

export function stepLamp(dt: number, on: boolean) {
  const t = on ? 1 : 0
  const d = t - runtime.lampLevel
  runtime.lampLevel = Math.abs(d) < 0.002 ? t : runtime.lampLevel + d * Math.min(1, dt * EASE_RATE)
}

export function stepFloorLamp(dt: number, on: boolean) {
  const t = on ? 1 : 0
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const d = t - runtime.floorLampLevel
  runtime.floorLampLevel = reduced || Math.abs(d) < 0.002 ? t : runtime.floorLampLevel + d * Math.min(1, dt * EASE_RATE)
}

const SIDE_LAMP_RATE = 15
export function stepSideLamp(dt: number, on: boolean) {
  const t = on ? 1 : 0
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const d = t - runtime.sideLampLevel
  runtime.sideLampLevel = reduced || Math.abs(d) < 0.002 ? t : runtime.sideLampLevel + d * Math.min(1, dt * SIDE_LAMP_RATE)
}

export function stepBlind(dt: number, closed: boolean, duration: number) {
  const t = closed ? 1 : 0
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const d = t - runtime.blind
  runtime.blind = reduced || Math.abs(d) < 1e-4 ? t : runtime.blind + Math.sign(d) * Math.min(Math.abs(d), dt / duration)
}

export function stepEnv(dt: number, time: TimeOfDay) {
  const k = Math.min(1, dt * EASE_RATE)
  const target = ENV[time]
  const cur = runtime.env as unknown as Record<string, number>
  for (const [key, value] of Object.entries(target)) {
    if (typeof value !== 'number') continue
    const d = value - cur[key]
    cur[key] = Math.abs(d) < 0.002 ? value : cur[key] + d * k
  }
  for (let i = 0; i < 3; i++) {
    const d = target.sunPos[i] - runtime.env.sunPos[i]
    runtime.env.sunPos[i] = Math.abs(d) < 0.002 ? target.sunPos[i] : runtime.env.sunPos[i] + d * k
  }
  for (const key of COLOR_KEYS) runtime.env[key].lerp(targetColors[time][key], k)
}
