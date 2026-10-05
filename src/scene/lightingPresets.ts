import type { TimeOfDay, V3 } from '../zones/types'

const P = Math.PI

const IS_COARSE = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches

const DPR_MAX_COARSE = 1.5
const DPR_MAX_DESKTOP = 1.5
export const DPR_MAX = IS_COARSE ? DPR_MAX_COARSE : DPR_MAX_DESKTOP

export const EASE_RATE = 4

export const BLOOM_ACTIVE = !IS_COARSE

export const BLOOM = {
  threshold: 1.2,
  smoothing: 0.2,
  radius: 0.7,
  levels: 6,
  mipmapBlur: true,
  multisampling: 2,
  dprMax: 1.5,
  intensity: { day: 0.25, dusk: 0.5, night: 0.6 },
  boostNeon: 1.5,
  boostSign: 1.5,
  boostGold: 1.5,
  boostBeads: 1.1,
  boostCandle: 2.0,
  haloScale: 0.5,
}
export const bloomScale = (value: number) => (BLOOM_ACTIVE ? value * BLOOM.haloScale : value)
export const bloomBoost = (value: number, factor: number) => (BLOOM_ACTIVE ? value * factor : value)

export interface EnvPreset {
  tone: number
  hemi: number
  sun: number
  lamp: number
  win: number
  neon: number
  focus: number
  shade: number
  halo: number
  sky: number
  lampHalo: number
  glow: number
  candleHalo: number
  sweep: number
  sunShadow: number
  lampShadow: number
  bloom: number
  rLampGlow: number
  rLampLight: number
  boardLit: number
  hemiSky: string
  hemiGround: string
  sunColor: string
  winColor: string
  sunPos: V3
}

export const ENV: Record<TimeOfDay, EnvPreset> = {
  day: {
    tone: 0, hemi: 0.365 * P, sun: 0.75 * P, lamp: 0.2 * P, win: 0.3 * P, neon: 0, focus: 0,
    shade: 0.15, halo: 0.5, sky: 0, lampHalo: 0, glow: 0.25, candleHalo: 0, sweep: 0.35, sunShadow: 0.7, lampShadow: 0.3, bloom: BLOOM.intensity.day, boardLit: 1, rLampGlow: 0.1, rLampLight: 0,
    hemiSky: '#CFE2FF', hemiGround: '#F0D3B5', sunColor: '#FFE3B0', winColor: '#FFF1DC', sunPos: [4, 8.3, 9],
  },
  dusk: {
    tone: 0.55,
    hemi: 0.5 * P,
    sun: 0.46 * P,
    lamp: 1.0 * P,
    win: 0.5 * P,
    neon: 0.45 * P,
    focus: 0.6 * P,
    shade: 0.9, halo: 1.6, sky: 0.6, lampHalo: 0.3,
    glow: 0.75,
    candleHalo: 0.3, sweep: 0.8,
    sunShadow: 0.45,
    lampShadow: 0.85, bloom: BLOOM.intensity.dusk, boardLit: 0.833, rLampGlow: 1.4, rLampLight: 0.45 * P,
    hemiSky: '#B9A6F0',
    hemiGround: '#8A6A8F',
    sunColor: '#FFB88A',
    winColor: '#ffd0a8',
    sunPos: [8, 6.5, 8],
  },
  night: {
    tone: 1, hemi: 0.14 * P, sun: 0.16 * P, lamp: 1.9 * P, win: 0.4 * P, neon: 0.75 * P, focus: 1.0 * P,
    shade: 1.3, halo: 2.3, sky: 1, lampHalo: 0.3, glow: 1, candleHalo: 0.4, sweep: 1, sunShadow: 0.6, lampShadow: 1, bloom: BLOOM.intensity.night, boardLit: 0.7, rLampGlow: 2.0, rLampLight: 0.8 * P,
    hemiSky: '#7a74c8', hemiGround: '#2a2358', sunColor: '#8f9dff', winColor: '#8ba3ff', sunPos: [9, 5, 7],
  },
}

export const SUN_SHADOW = {
  mapDesktop: 2048,
  mapPhone: 1024,
  extent: 9,
  near: 1,
  far: 30,
  bias: -0.0006,
  normalBias: 0.02,
  blur: 0.05,
}
export const SUN_SHADOW_MAP = IS_COARSE ? SUN_SHADOW.mapPhone : SUN_SHADOW.mapDesktop
export const SUN_SHADOW_RADIUS = SUN_SHADOW.blur / ((2 * SUN_SHADOW.extent) / SUN_SHADOW_MAP)

const LAMP_SHADOWS = true
export const LAMP_SHADOWS_ACTIVE = LAMP_SHADOWS && !IS_COARSE
export const LAMP_SHADOW = { map: 512, bias: -0.0015, normalBias: 0.025, near: 0.1, far: 10, radius: 2 }

export const SHADOW_REFRESH = {
  initialFrames: 12,
  loadFrames: 3,
  settleFrames: 2,
  easeEpsilon: 0.002,
  casterCheckEvery: 20,
}

export const FOCUS = { color: '#ffe2b8', distance: 1.5, decay: 2, toward: 0.45, up: 0.2, rate: 4, moveRate: 8 }

export const GLOW_BASE = {
  phone: 0.22,
  standee: 0.26,
  flame: 1.6,
  egg: 0.14,
}
export const GLOW_LAMP_OFF = 0.6
export const CANDLE_HALO = { radius: 0.13, peak: 1, color: '#FFC470' }

export const SWEEP = { period: 13.5, travel: 6, fade: 0.3, peak: 0.15, width: 0.55, height: 1.5, color: '#FFC37A' }

export interface AmbientTable {
  bloomAmpScale: number
  neon: { haloAmp: number; periodsSec: number[]; dip: { every: [number, number]; durationMs: number; depth: number } }
  sign: { haloAmp: number; tubeDepth: number; periodsSec: number[] }
  fairy: { min: number; periodsSec: number[] }
  screen: { amp: number; periodSec: number }
  underglow: { period: number; min: number; max: number; baseOpacity: number; footprint: [number, number]; fullReach: number; softReach: number; offsetZ: number; lift: number }
  book: { period: number; min: number; max: number; baseOpacity: number; radius: number; y: number; awayFromCandle: number; color: string }
  window: {
    clouds: { speedUvPerSec: number; opacity: number; repeatX: number }
    sunset: { periodSec: number; peakOpacity: number; shiftAmount: number; baseOffset: number; repeatY: number }
    city: { toggleTicksPerSec: number; windowsPerTick: [number, number]; minOnFraction: number; maxOnFraction: number; color: string }
    birds: { count: [number, number]; intervalSec: [number, number]; crossSec: [number, number]; wingspan: number; flapHz: number; spread: number; yBand: [number, number]; bob: number }
  }
}

const AMBIENT_DEFAULT: AmbientTable = {
  bloomAmpScale: 1,
  neon: { haloAmp: 0.15, periodsSec: [7, 11, 19], dip: { every: [12, 25], durationMs: 140, depth: 0.3 } },
  sign: { haloAmp: 0.12, tubeDepth: 0.08, periodsSec: [9, 13] },
  fairy: { min: 0.7, periodsSec: [3.1, 5.3] },
  screen: { amp: 0.06, periodSec: 6 },
  underglow: { period: 6, min: 0.45, max: 1.0, baseOpacity: 0.3, footprint: [0.88, 0.52], fullReach: 0.2, softReach: 0.06, offsetZ: -0.03, lift: 0.002 },
  window: { clouds: { speedUvPerSec: 0.012, opacity: 0.9, repeatX: 0.6 }, sunset: { periodSec: 90, peakOpacity: 0.55, shiftAmount: 0.18, baseOffset: 0.225, repeatY: 0.55 },
    city: { toggleTicksPerSec: 2, windowsPerTick: [1, 2], minOnFraction: 0.55, maxOnFraction: 0.85, color: '#FFD98A' },
    birds: { count: [3, 4], intervalSec: [25, 45], crossSec: [10, 14], wingspan: 0.12, flapHz: 3.5, spread: 0.25, yBand: [0.05, 0.42], bob: 0.04 } },
  book: { period: 4.5, min: 0.5, max: 1.0, baseOpacity: 0.3, radius: 0.16, y: 0.64, awayFromCandle: 0.05, color: 'accent' },
}

export const AMBIENT = {
  enabled: true,
  respectReducedMotion: true,
  ...AMBIENT_DEFAULT,
}
export const AMBIENT_ACTIVE: AmbientTable = AMBIENT_DEFAULT
