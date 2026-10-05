import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { SIGN_FONT, loadFont } from './fonts'
import { posterQuad } from './leftWall'
import { POSTER_TEX, POSTER_TEXT, drawPoster } from './posterDesign'
import { wallFade } from './runtime'
import { leftShelf } from '../zones/zone'

export function Poster() {
  const geometry = useMemo(() => posterQuad(leftShelf.top), [])
  const { cv, tex, material } = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = POSTER_TEX[0]
    cv.height = POSTER_TEX[1]
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    return { cv, tex, material }
  }, [])
  useEffect(() => {
    let alive = true
    const draw = () => {
      drawPoster(cv)
      tex.needsUpdate = true
    }
    draw()
    loadFont(`600 100px ${SIGN_FONT}`, POSTER_TEXT.join(' ')).then((ok) => alive && ok && draw())
    wallFade.left.add(material)
    return () => {
      alive = false
      wallFade.left.delete(material)
      material.dispose(); tex.dispose(); geometry.dispose()
    }
  }, [cv, tex, material, geometry])
  return <mesh geometry={geometry} material={material} raycast={() => null} />
}
