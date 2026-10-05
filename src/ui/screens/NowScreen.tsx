import { useEffect, useRef, type CSSProperties } from 'react'
import { content } from '../../content'
import { BOARD_ROCKET } from '../../scene/boardDesign'
import { runtime } from '../../scene/runtime'
import { Icon } from '../Icon'
import { useScreenFocus } from './useScreenFocus'

export function NowScreen() {
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<string | null>(null)
  useScreenFocus(root, last)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      root.current?.style.setProperty('--board-lit', runtime.env.boardLit.toFixed(3))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  const { heading, items, tagline } = content.now
  const list = items.map((i) => i.trim()).filter(Boolean)
  return (
    <div className="scr scr-now" ref={root} style={{ '--board-lit': 1 } as CSSProperties}>
      <div className="now-board" data-screen-item="board" tabIndex={0} role="region" aria-label={heading.trim() || content.sections.now.label}>
        <span className="now-rocket"><Icon name="rocket" size={BOARD_ROCKET.size} /></span>
        {heading.trim() && <h2 className="now-heading"><span>{heading}</span></h2>}
        {list.length > 0 && (
          <ul className="now-items">
            {list.map((item, i) => (
              <li key={i}><i aria-hidden="true" /><span>{item}</span></li>
            ))}
          </ul>
        )}
        {tagline.trim() && <p className="now-tagline">{tagline}</p>}
      </div>
    </div>
  )
}
