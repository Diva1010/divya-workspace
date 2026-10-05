import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { WOOD } from './woodPalette'
import { T } from './constants'
import { slab } from './geometry'
import { wallFade, type WallKey } from './runtime'
import { leftShelf } from '../zones/zone'
import type { ShelfProp } from '../zones/types'

const BOARD_THICKNESS = 0.04
const BOARD_RADIUS = 0.012
const BOARD_BEVEL = 0.01
const BRACKET_WIDTH = 0.04
const BRACKET_DROP = 0.17
const BRACKET_REACH = 0.26
const BRACKET_FROM_END = 0.2
const STOP_THICKNESS = 0.03
const STOP_HEIGHT = 0.23
const STOP_DEPTH = 0.23
const SEG = { curve: 2, bevel: 1 }

export const color = (hex: string, darken = 0) => new THREE.Color(hex).offsetHSL(0, 0, -darken)

export function paint(g: THREE.BufferGeometry, top: THREE.Color, rest: THREE.Color) {
  const n = g.attributes.normal
  const colors = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < n.count; i++) colors.set(n.getY(i) > 0.5 ? top.toArray() : rest.toArray(), i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

function gusset(x: number, bottom: number, back: number, reach: number) {
  const b = 0.004
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(reach, 0)
  shape.lineTo(0, -BRACKET_DROP)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: BRACKET_WIDTH - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 })
  g.translate(0, 0, -(BRACKET_WIDTH - 2 * b) / 2)
  g.rotateY(-Math.PI / 2)
  g.translate(x, bottom, back)
  return g
}

function shelfGeometry(s: Pick<ShelfProp, 'x' | 'length' | 'depth' | 'top' | 'back' | 'brackets'>, stops: boolean | 'start' = true): THREE.BufferGeometry {
  const top = color(WOOD.boards)
  const edge = color(WOOD.edges)
  const bracket = color(WOOD.edges)
  const bottom = s.top - BOARD_THICKNESS
  const parts: THREE.BufferGeometry[] = []
  parts.push(paint(slab(s.length, s.depth, BOARD_THICKNESS, BOARD_RADIUS, BOARD_BEVEL, SEG).clone().translate(s.x, bottom, s.back + s.depth / 2), top, edge))
  if (stops) {
    for (const side of stops === 'start' ? [-1] : [-1, 1]) {
      parts.push(paint(slab(STOP_THICKNESS, STOP_DEPTH, STOP_HEIGHT, 0.008, 0.006, SEG).clone().translate(s.x + side * (s.length / 2 - STOP_THICKNESS / 2), s.top, s.back + STOP_DEPTH / 2), edge, edge))
    }
  }
  const n = Math.max(2, s.brackets)
  const span = s.length / 2 - BRACKET_FROM_END
  for (let i = 0; i < n; i++) parts.push(paint(gusset(s.x - span + (2 * span * i) / (n - 1), bottom, s.back, Math.min(BRACKET_REACH, s.depth * 0.8)), bracket, bracket))
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

export function ShelfBoards({ wall, shelves, stops = true }: { wall: WallKey; shelves: Pick<ShelfProp, 'x' | 'length' | 'depth' | 'top' | 'back' | 'brackets'>[]; stops?: boolean | 'start' }) {
  const geometry = useMemo(() => mergeGeometries(shelves.map((s) => shelfGeometry(s, stops)))!, [shelves, stops])
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }), [])
  useEffect(() => {
    wallFade[wall].add(material)
    return () => {
      wallFade[wall].delete(material)
      material.dispose()
      geometry.dispose()
    }
  }, [material, geometry, wall])
  return (
    <group position={[0, 0, T / 2]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow raycast={() => null} />
    </group>
  )
}

export function LeftShelf() {
  const s = leftShelf
  const shelves = useMemo(() => [s], [s])
  return <ShelfBoards wall="left" shelves={shelves} />
}
