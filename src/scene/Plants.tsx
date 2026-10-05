import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SHADOW_REFRESH } from './lightingPresets'
import { PLANT_MODEL_INFO } from './plantFootprint'
import { wallFade } from './runtime'
import { invalidateShadows } from './shadowRefresh'
import { room } from '../zones/zone'
import type { PlantPlacement } from '../zones/types'

const BASE = import.meta.env.BASE_URL
const modelUrl = (file: string) => `${BASE}models/plants/${file}.glb`

const VARIANT_FILES = new Set(['succulents', 'ivy'])


const plantScale = (p: PlantPlacement) => p.size / (PLANT_MODEL_INFO[p.model]?.pot ?? 1)

function plain(g: THREE.BufferGeometry, kind: 'solid' | 'tex'): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry()
  const copy = (name: string, size: number) => {
    const a = g.getAttribute(name)
    const arr = new Float32Array(a.count * size)
    for (let i = 0; i < a.count; i++) {
      arr[i * size] = a.getX(i)
      arr[i * size + 1] = a.getY(i)
      if (size > 2) arr[i * size + 2] = a.getZ(i)
    }
    out.setAttribute(name === 'color' ? 'color' : name, new THREE.BufferAttribute(arr, size))
  }
  copy('position', 3)
  copy('normal', 3)
  copy(kind === 'solid' ? 'color' : 'uv', kind === 'solid' ? 3 : 2)
  if (g.index) out.setIndex(Array.from(g.index.array))
  return out
}

function plantMatrix(p: PlantPlacement): THREE.Matrix4 {
  const s = plantScale(p)
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(p.tilt?.[0] ?? 0, p.rotationY, p.tilt?.[1] ?? 0, 'YXZ'))
  return new THREE.Matrix4().compose(new THREE.Vector3(...p.position), q, new THREE.Vector3(s, s * (p.stretch ?? 1), s))
}

const GROUPS = ['floor', 'left', 'right', 'back'] as const
type Group = (typeof GROUPS)[number]

function recolor(g: THREE.BufferGeometry, map: PlantPlacement['recolor']): THREE.BufferGeometry {
  const col = g.getAttribute('color')
  if (!map || !col) return g
  const pairs = Object.entries(map).map(([a, b]) => [new THREE.Color(a), new THREE.Color(b)] as const)
  for (let i = 0; i < col.count; i++) {
    for (const [from, to] of pairs) {
      if (Math.abs(col.getX(i) - from.r) + Math.abs(col.getY(i) - from.g) + Math.abs(col.getZ(i) - from.b) < 0.03) col.setXYZ(i, to.r, to.g, to.b)
    }
  }
  return g
}

function pressOnto(g: THREE.BufferGeometry, rest: PlantPlacement['rest']): THREE.BufferGeometry {
  if (!rest) return g
  const pos = g.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    if (x > rest[0] && x < rest[3] && y > rest[1] && y < rest[4] && z > rest[2] && z < rest[5]) pos.setY(i, rest[4] + 0.0004)
  }
  return g
}

interface Part { geometry: THREE.BufferGeometry; key: string; map: THREE.Texture | null }

function modelParts(file: string, scene: THREE.Object3D, node: string | undefined): Part[] {
  scene.updateMatrixWorld(true)
  const root = node ? scene.getObjectByName(node) : scene
  const parts: Part[] = []
  root?.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = m.material as THREE.MeshStandardMaterial
    const solid = !mat.map
    const g = plain(m.geometry, solid ? 'solid' : 'tex')
    g.applyMatrix4(m.matrixWorld)
    parts.push({ geometry: g, key: solid ? 'solid' : `${file}:${mat.name}`, map: solid ? null : mat.map })
  })
  return parts
}

export interface PlantBuild { group: Group; key: string; map: THREE.Texture | null; geometry: THREE.BufferGeometry }

function buildPlantGeometries(sceneOf: (file: string) => THREE.Object3D): PlantBuild[] {
  const cache = new Map<string, Part[]>()
  const parts = (model: string) => {
    let c = cache.get(model)
    if (!c) {
      const [file, node] = model.split('/')
      c = modelParts(file, sceneOf(file), VARIANT_FILES.has(file) ? node : undefined)
      cache.set(model, c)
    }
    return c
  }
  const out: PlantBuild[] = []
  for (const group of GROUPS) {
    const lists = new Map<string, { map: THREE.Texture | null; list: THREE.BufferGeometry[] }>()
    for (const p of room.plants.filter((q) => q.group === group)) {
      const m = plantMatrix(p)
      for (const part of parts(p.model)) {
        let l = lists.get(part.key)
        if (!l) { l = { map: part.map, list: [] }; lists.set(part.key, l) }
        l.list.push(pressOnto(recolor(part.geometry.clone(), part.map ? undefined : p.recolor).applyMatrix4(m), p.rest))
      }
    }
    lists.forEach((l, key) => {
      out.push({ group, key, map: l.map, geometry: mergeGeometries(l.list)! })
      l.list.forEach((g) => g.dispose())
    })
  }
  cache.forEach((c) => c.forEach((p) => p.geometry.dispose()))
  return out
}

export function PlantGroups() {
  const models = useMemo(() => [...new Set(room.plants.map((p) => p.model.split('/')[0]))], [])
  const gltfs = useGLTF(models.map(modelUrl), false)
  const builds = useMemo(() => buildPlantGeometries((f) => gltfs[models.indexOf(f)].scene), [gltfs, models])
  const materials = useMemo(
    () => builds.map((b) => new THREE.MeshStandardMaterial(b.map ? { map: b.map, alphaTest: 0.5, roughness: 0.85, metalness: 0, side: THREE.DoubleSide } : { vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide })),
    [builds],
  )
  useEffect(() => {
    builds.forEach((b, i) => { if (b.group !== 'floor') wallFade[b.group].add(materials[i]) })
    invalidateShadows(SHADOW_REFRESH.loadFrames)
    return () => {
      builds.forEach((b, i) => { if (b.group !== 'floor') wallFade[b.group].delete(materials[i]) })
      materials.forEach((m) => m.dispose())
      builds.forEach((b) => b.geometry.dispose())
    }
  }, [builds, materials])
  return (
    <>
      {builds.map((b, i) => (
        <mesh key={`${b.group}:${b.key}`} geometry={b.geometry} material={materials[i]} castShadow={b.group === 'floor'} receiveShadow raycast={() => null} />
      ))}
    </>
  )
}
