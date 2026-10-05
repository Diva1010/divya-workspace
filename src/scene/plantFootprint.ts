import data from './plantData.json'

export const PLANT_BOUNDS = Object.fromEntries(Object.entries(data as Record<string, { bounds: number[] }>).map(([k, v]) => [k, v.bounds])) as Record<string, [number, number, number, number, number, number]>

export const PLANT_MODEL_INFO: Record<string, { pot: number }> = Object.fromEntries(
  Object.entries(data as Record<string, { bounds: number[] }>).map(([k, v]) => [k, { pot: k.startsWith('ivy/ivy_') || k === 'planter_hang' ? v.bounds[5] - v.bounds[4] : v.bounds[5] }]),
)
