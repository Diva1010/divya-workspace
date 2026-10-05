import roomJson from './room.json'
import type { DegreesProp, ShelfProp, WhiteboardProp, ZoneData } from './types'

export const room = roomJson as unknown as ZoneData

export const whiteboard = room.wallProps.find((p): p is WhiteboardProp => p.kind === 'whiteboard')!
export const degreeWall = room.wallProps.find((p): p is DegreesProp => p.kind === 'degrees')!
export const leftShelf = room.wallProps.find((p): p is ShelfProp => p.kind === 'shelf' && p.wall === 'left')!
