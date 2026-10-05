import { useEffect, type RefObject } from 'react'
import { useFocus } from '../../store/focus'

export function useScreenFocus(root: RefObject<HTMLElement | null>, last: RefObject<string | null>) {
  const phase = useFocus((s) => s.phase)
  useEffect(() => {
    if (phase !== 'screen') return
    const r = root.current
    if (!r) return
    const prev = last.current && r.querySelector<HTMLElement>(`[data-screen-item="${CSS.escape(last.current)}"]`)
    ;(prev || r.querySelector<HTMLElement>('[data-screen-item]'))?.focus({ preventScroll: true })
  }, [phase, root, last])
}
