import { mulberry } from './geometry'
import type { AmbientTable } from './lightingPresets'
import type { SkyCell } from './textures'

type City = AmbientTable['window']['city']
type Birds = AmbientTable['window']['birds']

export function makeCity(cells: SkyCell[], seed = 77) {
  const original = cells.map((c) => c.lit)
  const lit = original.slice()
  let count = lit.filter(Boolean).length
  const rnd = mulberry(seed)
  let nextTick = -1
  const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
  const pick = (state: boolean) => {
    const n = lit.length
    const s = Math.floor(rnd() * n)
    for (let k = 0; k < n; k++) {
      const i = (s + k) % n
      if (lit[i] === state) return i
    }
    return -1
  }
  const set = (i: number, v: boolean) => {
    if (i < 0 || lit[i] === v) return
    lit[i] = v
    count += v ? 1 : -1
  }
  function tick(c: City) {
    const n = randInt(c.windowsPerTick[0], c.windowsPerTick[1])
    for (let k = 0; k < n; k++) {
      const N = lit.length
      let on: boolean
      if (count / N < c.minOnFraction) on = true
      else on = rnd() < 0.5
      if (on && (count + 1) / N > c.maxOnFraction) on = false
      else if (!on && (count - 1) / N < c.minOnFraction) on = true
      set(pick(!on), on)
    }
  }
  return {
    lit,
    cells,
    get count() {
      return count
    },
    reset() {
      nextTick = -1
      let changed = false
      for (let i = 0; i < lit.length; i++) if (lit[i] !== original[i]) changed = true
      for (let i = 0; i < lit.length; i++) lit[i] = original[i]
      count = original.filter(Boolean).length
      return changed
    },
    pause() {
      nextTick = -1
    },
    step(t: number, c: City) {
      const period = 1 / c.toggleTicksPerSec
      if (nextTick < 0) nextTick = t + period
      if (t < nextTick) return false
      tick(c)
      nextTick = t - nextTick > period ? t + period : nextTick + period
      return true
    },
  }
}

export const MAX_BIRDS = 4
export function makeBirds(seed = 303) {
  const rnd = mulberry(seed)
  const range = (r: [number, number]) => r[0] + rnd() * (r[1] - r[0])
  const flock = {
    flying: false,
    t0: 0,
    dir: 1,
    n: 0,
    cross: 12,
    baseY: 0,
    ox: new Float32Array(MAX_BIRDS),
    oy: new Float32Array(MAX_BIRDS),
    ph: new Float32Array(MAX_BIRDS),
    next: -1,
    leadX: 0,
  }
  return {
    flock,
    step(t: number, b: Birds, canSpawn: boolean) {
      if (flock.next < 0) flock.next = t + range(b.intervalSec)
      if (flock.flying) {
        if (t - flock.t0 >= flock.cross) {
          flock.flying = false
          flock.next = t + range(b.intervalSec)
        }
      } else if (t >= flock.next) {
        if (!canSpawn) flock.next = t + range(b.intervalSec)
        else {
          flock.flying = true
          flock.t0 = t
          flock.dir = rnd() < 0.5 ? 1 : -1
          flock.n = Math.min(MAX_BIRDS, Math.round(b.count[0] + rnd() * (b.count[1] - b.count[0])))
          flock.cross = range(b.crossSec)
          flock.baseY = rnd()
          for (let i = 0; i < MAX_BIRDS; i++) {
            flock.ox[i] = (rnd() * 2 - 1) * b.spread
            flock.oy[i] = (rnd() * 2 - 1) * 0.06
            flock.ph[i] = rnd() * Math.PI * 2
          }
        }
      }
      return flock.flying
    },
    stop() {
      flock.flying = false
      flock.next = -1
    },
  }
}

export function writeBirds(pos: Float32Array, flock: ReturnType<typeof makeBirds>['flock'], t: number, b: Birds, cx: number, cy: number, w: number, h: number) {
  const margin = 0.2 + b.spread
  const u = Math.min(1, Math.max(0, (t - flock.t0) / flock.cross))
  const lead = cx - flock.dir * (w / 2 + margin) + flock.dir * (w + 2 * margin) * u
  flock.leadX = lead
  const y0 = cy + h * (b.yBand[0] + (b.yBand[1] - b.yBand[0]) * flock.baseY)
  const s = b.wingspan
  for (let i = 0; i < MAX_BIRDS; i++) {
    const o = i * 18
    if (i >= flock.n) {
      pos.fill(0, o, o + 18)
      continue
    }
    const x = lead + flock.ox[i]
    const y = y0 + flock.oy[i] + b.bob * Math.sin((Math.PI * 2 * (t - flock.t0)) / 5 + flock.ph[i])
    const flap = s * (0.06 + 0.2 * Math.sin(Math.PI * 2 * b.flapHz * t + flock.ph[i]))
    const v = [
      [x, y], [x - s / 2, y + flap], [x - s * 0.12, y - s * 0.1],
      [x, y], [x + s * 0.12, y - s * 0.1], [x + s / 2, y + flap],
    ]
    for (let k = 0; k < 6; k++) {
      pos[o + k * 3] = v[k][0]
      pos[o + k * 3 + 1] = v[k][1]
      pos[o + k * 3 + 2] = 0
    }
  }
}
