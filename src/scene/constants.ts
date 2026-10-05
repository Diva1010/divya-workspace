import { room } from '../zones/zone'

export const HALF = room.bounds.halfWidth
export const W = HALF * 2
export const H = room.bounds.height
export const T = room.bounds.thickness
export const FZ = room.bounds.frontPostZ
export const BACKZ = -HALF - T
export const ZC = (FZ + BACKZ) / 2
export const DZ = FZ - BACKZ
export const FLOORY = 0.05
export const WIN = room.window
