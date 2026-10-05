import { getOpener } from '../store/focus'

export function restoreFocus() {
  const { el, key } = getOpener()
  if (el && el.isConnected) { el.focus(); return }
  const nav = key && document.querySelector<HTMLElement>(`[data-nav="${key}"]`)
  if (nav) nav.focus()
}
