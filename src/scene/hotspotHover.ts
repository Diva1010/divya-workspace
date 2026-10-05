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
export const isHovered = (group: string) => (counts.get(group) ?? 0) > 0
