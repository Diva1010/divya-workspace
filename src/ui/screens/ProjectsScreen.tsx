import { useRef } from 'react'
import { content } from '../../content'
import { openDetail } from '../../store/focus'
import { useScreenFocus } from './useScreenFocus'
import { ProjectTile, projectItemId } from '../parts'
import { SectionIcon } from '../Icon'

export function ProjectsScreen() {
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<string | null>(null)
  const list = content.projects
  useScreenFocus(root, last)

  return (
    <div className="scr" ref={root} role="region" aria-label={content.sections.projects.label}>
      <div className="scr-bar" aria-hidden="true">
        <span className="logo" />
        <span>{content.sections.projects.label}</span>
        <span className="spacer" />
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <div className="scr-window">
        <div className="scr-title" aria-hidden="true">
          <i style={{ background: '#EF476F' }} />
          <i style={{ background: '#FFD166' }} />
          <i style={{ background: '#06D6A0' }} />
          <span className="scr-ticon"><SectionIcon section="projects" size={16} /></span>
          <b>{content.sections.projects.label}</b>
        </div>
        {list.length === 0 ? (
          <p className="scr-empty">Nothing added yet.</p>
        ) : (
          <ul className="scr-grid">
            {list.map((p, i) => {
              const id = projectItemId(p, i)
              return (
                <li key={id}>
                  <ProjectTile
                    p={p}
                    id={id}
                    screenItem
                    onOpen={() => {
                      last.current = id
                      openDetail({ section: 'projects', id })
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="scr-dock" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
    </div>
  )
}
