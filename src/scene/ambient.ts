import { AMBIENT, AMBIENT_ACTIVE as C, BLOOM_ACTIVE } from './lightingPresets'

const reduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
const computeOn = () => AMBIENT.enabled && !(AMBIENT.respectReducedMotion && !!reduced?.matches)

const K = BLOOM_ACTIVE ? C.bloomAmpScale : 1
const TAU = Math.PI * 2
const mid = (min: number, max: number) => (min + max) / 2
const smooth = (x: number) => x * x * (3 - 2 * x)

function wander(t: number, periods: readonly number[], phase = 0) {
  let s = 0
  let w = 0
  periods.forEach((p, i) => {
    const k = 1 / (1 + i * 0.5)
    s += k * Math.sin((TAU * t) / p + phase + i * 1.7)
    w += k
  })
  return s / w
}

export const ambient = {
  on: computeOn(),
  t: 0,
  neon: 1,
  neonCore: 1,
  sign: 1,
  signTube: 1,
  fairy: 1,
  screen: 1,
  underglow: mid(C.underglow.min, C.underglow.max),
  book: mid(C.book.min, C.book.max),
}

export const windowDebug = { cloudOffset: 0, sunsetWeight: 0, litWindows: 0, litTotal: 0, birdX: null as number | null }

export function screenAt(phase: number) {
  if (!ambient.on) return 1
  return Math.min(1, Math.max(0, 1 - C.screen.amp * K * (0.5 + 0.5 * Math.sin((TAU * ambient.t) / C.screen.periodSec + phase))))
}

const dipState = { start: -1, next: 0 }
const nextDip = (t: number) => {
  const [a, b] = C.neon.dip.every
  return t + a + Math.random() * (b - a)
}

function rest() {
  ambient.neon = ambient.neonCore = ambient.sign = ambient.signTube = ambient.fairy = ambient.screen = 1
  ambient.underglow = mid(C.underglow.min, C.underglow.max)
  ambient.book = mid(C.book.min, C.book.max)
}

const breathe = (t: number, c: { period: number; min: number; max: number }) => Math.max(0, mid(c.min, c.max) + ((c.max - c.min) / 2) * Math.sin((TAU * t) / c.period))

let slowAcc = 1
function writeFast(t: number) {
  const n = C.neon
  let dip = 0
  if (dipState.start < 0 && t >= dipState.next) dipState.start = t
  if (dipState.start >= 0) {
    const x = (t - dipState.start) / (n.dip.durationMs / 1000)
    if (x >= 1) {
      dipState.start = -1
      dipState.next = nextDip(t)
    } else dip = smooth(1 - Math.abs(2 * x - 1))
  }
  const pos = (v: number) => Math.max(0, v)
  ambient.neon = pos((1 + n.haloAmp * wander(t, n.periodsSec)) * (1 - n.dip.depth * dip))
  ambient.neonCore = pos(1 - n.dip.depth * K * dip)
  ambient.sign = pos(1 + C.sign.haloAmp * wander(t, C.sign.periodsSec, 0.9))
  ambient.signTube = pos(1 - C.sign.tubeDepth * K * (0.5 + 0.5 * wander(t, C.sign.periodsSec, 3.3)))
  ambient.fairy = pos(1 - (1 - C.fairy.min) * K * (0.5 + 0.5 * wander(t, C.fairy.periodsSec, 2.2)))
}
function writeSlow(t: number) {
  ambient.screen = screenAt(0)
  ambient.underglow = breathe(t, C.underglow)
  ambient.book = breathe(t, C.book)
}

dipState.next = nextDip(0)
if (ambient.on) {
  writeFast(0)
  writeSlow(0)
} else rest()

reduced?.addEventListener?.('change', () => {
  ambient.on = computeOn()
  if (!ambient.on) rest()
  else slowAcc = 1
})

export function stepAmbient(dtRaw: number) {
  if (!ambient.on) return
  const dt = Math.min(dtRaw, 0.05)
  ambient.t += dt
  writeFast(ambient.t)
  slowAcc += dt
  if (slowAcc >= 1 / 30) {
    slowAcc = 0
    writeSlow(ambient.t)
  }
}
