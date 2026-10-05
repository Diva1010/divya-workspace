import { useEffect, type ComponentType } from 'react'
import type { ContentKey } from '../../zones/types'
import { getState, useFocus } from '../../store/focus'
import { restoreFocus } from '../focusReturn'
import { AboutPopup, CurrentReadPopup, ExperiencePopup, ReadingPopup, TravelPopup, NowPopup, ProjectDetailPopup, ProjectsPopup, ResumePopup, SkillsDashboardPopup, SkillsPopup } from './popups'

const REGISTRY: Partial<Record<ContentKey, ComponentType>> = {
  about: AboutPopup,
  experience: ExperiencePopup,
  skills: SkillsPopup,
  projects: ProjectsPopup,
  resume: ResumePopup,
  now: NowPopup,
  reading: ReadingPopup,
  currentRead: CurrentReadPopup,
  travel: TravelPopup,
}

export function PopupHost() {
  const active = useFocus((s) => s.active)
  const open = useFocus((s) => s.phase === 'open' && s.active !== null)
  const detail = useFocus((s) => s.detail)
  useEffect(() => {
    if (!open) return
    return () => {
      if (getState().phase !== 'screen') restoreFocus()
    }
  }, [open])
  if (!open || !active) return null
  if (detail?.section === 'projects') return <ProjectDetailPopup key={detail.id} id={detail.id} />
  if (detail?.section === 'skills') return <SkillsDashboardPopup key={detail.id} category={detail.id} />
  const Popup = REGISTRY[active]
  if (!Popup) return null
  return <Popup key={active} />
}
