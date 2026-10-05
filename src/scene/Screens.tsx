import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { screenAt } from './ambient'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { disposeScreenPictures, editorTexture, LAPTOP_W, PHONE_W, SCREEN_W, screenPicture } from './screenDesign'
import { laptopScreenFrame, monitorScreenFrame, phoneScreenFrame, whiteboardScreenFrame } from './screenFrame'
import { BOARD_W } from './boardDesign'
import { useFocus } from '../store/focus'
import { room, whiteboard } from '../zones/zone'
import { ProjectsScreen } from '../ui/screens/ProjectsScreen'
import { SkillsScreen } from '../ui/screens/SkillsScreen'
import { ContactScreen } from '../ui/screens/ContactScreen'
import { NowScreen } from '../ui/screens/NowScreen'
import type { ScreenSpec } from '../zones/types'

const HTML_UNITS_PER_PX = 10 / 400

function useHtmlScrollGuard(content: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    let wrapper: HTMLElement | null = null
    let raf = 0
    let frames = 0
    let foundAt = -1
    const reset = () => {
      if (!wrapper) return
      if (wrapper.scrollLeft) wrapper.scrollLeft = 0
      if (wrapper.scrollTop) wrapper.scrollTop = 0
    }
    const find = () => {
      let n = content.current?.parentElement ?? null
      while (n && !(n.style.pointerEvents === 'none' && n.style.overflow === 'hidden' && n.style.position === 'absolute')) n = n.parentElement
      return n
    }
    const tick = () => {
      frames++
      if (!wrapper) {
        wrapper = find()
        if (wrapper) {
          wrapper.addEventListener('scroll', reset)
          foundAt = frames
        }
      }
      reset()
      if ((foundAt >= 0 && frames - foundAt >= 30) || frames >= 120) return
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => {
      cancelAnimationFrame(raf)
      wrapper?.removeEventListener('scroll', reset)
    }
  }, [active, content])
}

function ScreenView({ spec, mounted }: { spec: ScreenSpec; mounted: boolean }) {
  const htmlContent = useRef<HTMLDivElement>(null)
  useHtmlScrollGuard(htmlContent, mounted)
  const frame = useMemo(() => {
    if (spec.kind === 'skills') return laptopScreenFrame(room.codeProps.find((p) => p.id === spec.prop)!)
    if (spec.kind === 'contact') return phoneScreenFrame(room.codeProps.find((p) => p.id === spec.prop)!)
    if (spec.kind === 'now') return whiteboardScreenFrame(whiteboard)
    const prop = room.props.find((p) => p.id === spec.prop)!
    return monitorScreenFrame(prop, room.monitorScreen, room.propScale)
  }, [spec.prop, spec.kind])
  const material = useMemo(
    () =>
      spec.kind === 'skills' || spec.kind === 'contact' || spec.kind === 'now'
        ? null
        : new THREE.MeshBasicMaterial({
            map: spec.kind === 'projects' ? screenPicture('projects', mounted) : editorTexture(),
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          }),
    [spec.kind, mounted],
  )
  useEffect(() => () => material?.dispose(), [material])
  const phase = spec.kind === 'projects' ? 0 : 1.7
  useFrame(() => material?.color.setScalar(screenAt(phase)))
  const domWidth = spec.kind === 'skills' ? LAPTOP_W : spec.kind === 'contact' ? PHONE_W : spec.kind === 'now' ? BOARD_W : SCREEN_W
  const htmlScale = frame.width / (domWidth * HTML_UNITS_PER_PX)
  return (
    <>
      {material && (
        <mesh position={frame.center} quaternion={frame.quaternion} material={material} raycast={() => null}>
          <planeGeometry args={[frame.width, frame.height]} />
        </mesh>
      )}
      {mounted && (
        <Html ref={htmlContent} transform position={frame.center} quaternion={frame.quaternion} scale={htmlScale} zIndexRange={[0, 0]}>
          {spec.kind === 'skills' ? <SkillsScreen /> : spec.kind === 'contact' ? <ContactScreen /> : spec.kind === 'now' ? <NowScreen /> : <ProjectsScreen />}
        </Html>
      )}
    </>
  )
}

export function Screens() {
  const ui = useFocus((s) => (s.screenUi && (s.phase === 'screen' || s.phase === 'open') ? s.active : null))
  useEffect(() => disposeScreenPictures, [])
  return (
    <group>
      {room.screens.map((sc) => (
        <ScreenView key={sc.id} spec={sc} mounted={ui !== null && ui === sc.kind} />
      ))}
    </group>
  )
}

