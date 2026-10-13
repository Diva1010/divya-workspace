const counts = new Map<string, number>()

export function addHover(group: string) {
  counts.set(group, (counts.get(group) ?? 0) + 1)
}
export function removeHover(group: string) {
  counts.set(group, Math.max(0, (counts.get(group) ?? 0) - 1))
}
export function clearHover(group: string) {
  counts.set(group, 0)
}
// A marker under the pointer owns the hover: only its object counts as hovered, whatever the 3D raycast hits behind it.
let owner: string | null = null
export const setHoverOwner = (group: string | null) => {
  owner = group
}
export const hoverGoal = (group: string, local: boolean) => (owner === null ? local : owner === group)
export const isHovered = (group: string) => (owner !== null ? owner === group : (counts.get(group) ?? 0) > 0)
