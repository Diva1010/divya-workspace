import { useEffect, useMemo } from 'react'
import { ABOUT_FRAME, ABOUT_X, ABOUT_Y } from './aboutLayout'
import { MAT_CREAM, WALNUT, frameMaterial, makeFrame } from './frame'
import { hitMaterial } from './hitProxy'
import { wallFade } from './runtime'
import { useHotspot } from './useHotspot'
import { room } from '../zones/zone'

export function AboutFrame() {
  const prop = room.props.find((p) => p.id === 'photo-frame')!
  const A = ABOUT_FRAME
  const geometry = useMemo(() => {
    const f = makeFrame({ width: A.width, height: A.height, border: A.border, depth: A.depth, color: WALNUT, liner: A.liner, matColor: MAT_CREAM })
    return f.geometry.translate(ABOUT_X, ABOUT_Y, A.backZ)
  }, [A])
  const material = useMemo(frameMaterial, [])
  useEffect(() => {
    wallFade.back.add(material)
    return () => {
      wallFade.back.delete(material)
      material.dispose()
      geometry.dispose()
    }
  }, [material, geometry])
  const handlers = useHotspot(prop.hotspot!, { wall: 'back' })
  const pad = 0.04
  return (
    <>
      <mesh geometry={geometry} material={material} castShadow receiveShadow raycast={() => null} />
      <mesh material={hitMaterial} position={[ABOUT_X, ABOUT_Y, A.backZ + (A.depth + 0.04) / 2]} {...handlers}>
        <boxGeometry args={[A.width + pad, A.height + pad, A.depth + 0.04]} />
      </mesh>
    </>
  )
}
