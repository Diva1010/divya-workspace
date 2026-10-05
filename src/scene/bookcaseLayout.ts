

export const CASE = { xBack: -3.86, xFront: -3.46, floor: 0.05, height: 2.6 }
export const SIDE_T = 0.03
export const BACK_T = 0.012
export const BOARD_T = 0.03
export const TOP_T = 0.04
export const PLINTH_H = 0.1
export const KICK_INSET = 0.03
export const LEVELS = 7

const underTop = CASE.floor + CASE.height - TOP_T
const surface0 = CASE.floor + PLINTH_H + BOARD_T
const PITCH = (underTop - surface0 + BOARD_T) / LEVELS
export const SURFACES = Array.from({ length: LEVELS }, (_, i) => surface0 + i * PITCH)
export const CLEAR = PITCH - BOARD_T
const EGG_LEVEL = 4

export const EGG_PLACE = { x: (CASE.xBack + BACK_T + CASE.xFront) / 2, y: SURFACES[EGG_LEVEL], z: -2.024 }

export interface CaseSpec { id: 'A' | 'B'; zMin: number; zMax: number; seed: number }
export const CASES: CaseSpec[] = [
  { id: 'A', zMin: -3.86, zMax: -2.66, seed: 20261103 },
  { id: 'B', zMin: -2.66, zMax: -1.46, seed: 20261104 },
]
export const inside = (c: CaseSpec) => ({ z0: c.zMin + SIDE_T, z1: c.zMax - SIDE_T, x0: CASE.xBack + BACK_T, x1: CASE.xFront })

export const FAIRY = {
  beadSpacing: 0.12,
  wireRadius: 0.002,
  beadRadius: 0.013,
  swagLength: 0.3,
  dip: 0.07,
  topY: CASE.floor + CASE.height - 0.015,
  outset: 0.014,
  sideDrop: 0.85,
  sideWaves: 2,
  color: '#FFF1D6',
  emissive: '#FFE2B0',
  wire: '#F4EEF2',
  wireOpacity: 0.42,
  glowDay: 0.6,
  glowDusk: 2.0,
  glowNight: 2.6,
  glowEvery: 4,
  maxHalos: 35,
}

export const ORBS = { radius: 0.045, baseRadius: 0.03, baseHeight: 0.03 }
export const ORB_PLACES: { id: string; where: 'A' | 'B' | 'top'; level: number; x: number; y: number; z: number }[] = [
  { id: 'orb-top', where: 'top', level: -1, x: -3.6, y: CASE.floor + CASE.height, z: -2.9 },
  { id: 'orb-mid', where: 'B', level: 3, x: -3.61, y: SURFACES[3], z: -2.15 },
]

export const CASE_CANDLES: { id: string; where: 'A' | 'B'; level: number; z: number; radius: number; height: number; saucer: boolean; onStack: number }[] = [
  { id: 'candle-A1', where: 'A', level: 1, z: -3.2, radius: 0.036, height: 0.15, saucer: false, onStack: 0 },
  { id: 'candle-A2', where: 'A', level: 5, z: -3.6, radius: 0.05, height: 0.09, saucer: true, onStack: 2 },
  { id: 'candle-B1', where: 'B', level: 2, z: -2.3, radius: 0.05, height: 0.1, saucer: true, onStack: 3 },
  { id: 'candle-B2', where: 'B', level: 5, z: -2.45, radius: 0.036, height: 0.15, saucer: false, onStack: 0 },
]
