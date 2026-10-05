import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BLOOM_ACTIVE } from './lightingPresets'
import { ambient, windowDebug } from './ambient'
import { navDebug } from '../ui/navDebug'
import { shadowRefreshesLastSecond } from './shadowRefresh'

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')
const f2 = (v: number) => v.toFixed(2)
const REFRESH_S = 0.5
const WORST_WINDOW_MS = 1000

function Readout() {
  const gl = useThree((s) => s.gl)
  const el = useRef<HTMLDivElement | null>(null)
  const acc = useRef({ since: 0, smooth: 0, samples: [] as { t: number; ms: number }[], calls: 0, tris: 0 })
  useEffect(() => {
    const div = document.createElement('div')
    div.setAttribute('aria-hidden', 'true')
    div.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;pointer-events:none;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#d8ffe8;background:rgba(0,0,0,.6);padding:4px 7px;border-radius:6px;white-space:pre'
    document.body.appendChild(div)
    el.current = div
    const was = gl.info.autoReset
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = was
      div.remove()
      el.current = null
    }
  }, [gl])
  useFrame((_, delta) => {
    const a = acc.current
    const info = gl.info
    a.calls = info.render.calls
    a.tris = info.render.triangles
    info.reset()
    const ms = delta * 1000
    const now = performance.now()
    a.smooth = a.smooth === 0 ? ms : a.smooth * 0.9 + ms * 0.1
    a.samples.push({ t: now, ms })
    a.since += delta
    if (a.since < REFRESH_S || !el.current) return
    a.since = 0
    a.samples = a.samples.filter((s) => now - s.t <= WORST_WINDOW_MS)
    const worst = Math.max(...a.samples.map((s) => s.ms))
    const canvas = gl.domElement
    el.current.textContent = [
      `fps ${(1000 / a.smooth).toFixed(0)}   frame ${a.smooth.toFixed(1)} ms   worst ${worst.toFixed(1)} ms`,
      `calls ${a.calls}   triangles ${a.tris.toLocaleString('en-US')}`,
      `programs ${info.programs?.length ?? 0}   geometries ${info.memory.geometries}   textures ${info.memory.textures}`,
      `canvas ${canvas.width}x${canvas.height} @ ${gl.getPixelRatio()}   bloom ${BLOOM_ACTIVE ? 'on' : 'off'}   shadow refreshes/s ${shadowRefreshesLastSecond(now)}   ambient ${ambient.on ? 'on' : 'off'}`,
      `ambient neon ${f2(ambient.neon)} sign ${f2(ambient.sign)} fairy ${f2(ambient.fairy)} screen ${f2(ambient.screen)} under ${f2(ambient.underglow)} book ${f2(ambient.book)} t ${f2(ambient.t)}`,
      `nav ${navDebug.mode}${navDebug.scale < 1 ? ' (name x' + navDebug.scale + ')' : ''}   full ${navDebug.full}px icons ${navDebug.icons}px name ${navDebug.name}px sub ${navDebug.sub}px avail ${navDebug.avail}px`,
      `window cloud offset ${f2(windowDebug.cloudOffset)} sunset weight ${f2(windowDebug.sunsetWeight)}   city lit ${windowDebug.litWindows}/${windowDebug.litTotal}   birds ${windowDebug.birdX === null ? 'idle' : 'flying x ' + f2(windowDebug.birdX)}`,
    ].join('\n')
  }, -1000)
  return null
}

export function DebugReadout() {
  return DEBUG ? <Readout /> : null
}
