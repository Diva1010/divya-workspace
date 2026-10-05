import { useRef } from 'react'
import { categoryColor, content, techsByCategory } from '../../content'
import { openDetail } from '../../store/focus'
import { SectionIcon } from '../Icon'
import { useScreenFocus } from './useScreenFocus'

export function SkillsScreen() {
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<string | null>(null)
  useScreenFocus(root, last)
  const groups = techsByCategory()
  return (
    <div className="scr scr-laptop" ref={root} role="region" aria-label={content.sections.skills.label}>
      <div className="scr-ltitle" aria-hidden="true">
        <i style={{ background: '#EF476F' }} />
        <i style={{ background: '#FFD166' }} />
        <i style={{ background: '#06D6A0' }} />
        <span className="scr-ticon"><SectionIcon section="skills" size={16} /></span>
        <b>{content.sections.skills.label}</b>
      </div>
      {groups.length === 0 ? (
        <p className="scr-empty scr-lempty">Nothing added yet.</p>
      ) : (
        <div className="scr-lbody">
          <ul className="scr-catgrid">
            {groups.map((g) => (
              <li key={g.category}>
                <button
                  type="button"
                  className="scr-cat"
                  data-screen-item={g.category}
                  aria-label={`${g.category}, ${g.technologies.length} technologies. Open skills`}
                  onClick={() => {
                    last.current = g.category
                    openDetail({ section: 'skills', id: g.category })
                  }}
                >
                  <i className="scr-catdot" aria-hidden="true" style={{ background: categoryColor(g.category) }} />
                  <span className="scr-catname">{g.category}</span>
                  <span className="scr-catcount">{g.technologies.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
