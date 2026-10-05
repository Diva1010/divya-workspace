import { SHADOW_REFRESH } from './lightingPresets'

export type ShadowTarget = 'all' | 'sun' | 'lamp'
const pending = { sun: SHADOW_REFRESH.initialFrames, lamp: SHADOW_REFRESH.initialFrames }
const log: number[] = []

export function invalidateShadows(frames: number = SHADOW_REFRESH.settleFrames, which: ShadowTarget = 'all') {
  if (which !== 'lamp') pending.sun = Math.max(pending.sun, frames)
  if (which !== 'sun') pending.lamp = Math.max(pending.lamp, frames)
}

export function takeShadowRefresh(now = performance.now()) {
  const sun = pending.sun > 0
  const lamp = pending.lamp > 0
  if (sun) pending.sun--
  if (lamp) pending.lamp--
  if (sun) log.push(now)
  if (lamp) log.push(now)
  return { sun, lamp }
}

export function shadowRefreshesLastSecond(now = performance.now()) {
  while (log.length && now - log[0] > 1000) log.shift()
  return log.length
}
