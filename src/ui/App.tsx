import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { PopupHost } from './popups/PopupHost'
import { Classic } from './Classic'
import { FocusControls } from './FocusControls'
import { ScreenBack } from './ScreenBack'
import { ErrorBoundary } from './ErrorBoundary'
import { Icon, SectionIcon } from './Icon'
import type { IconName } from '../icons'
import { MENU } from './menu'
import { useNavFit, type NavMode } from './useNavFit'
import { content, educationStatus, getCurrentRead, getReading, getTravel, siteTitle } from '../content'
import { Scene } from '../scene/Scene'
import { THEMES, THEME_SWATCH, type ThemeName } from '../scene/themes'
import { back, failScene, focus, reset, setTheme, setTime, toggleBlind, toggleFloorLamp, toggleLamp, toggleRoof, toggleSideLamp, useFocus } from '../store/focus'
import type { ContentKey, TimeOfDay } from '../zones/types'

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const ROOM_EXTRAS: { key: ContentKey; pose: string; aria: string; has: () => boolean }[] = [
  { key: 'reading', pose: 'reading-shelf', aria: "Open Divya's Reading Corner, favorite books", has: () => !!getReading() },
  { key: 'currentRead', pose: 'current-read', aria: 'Open current read', has: () => !!getCurrentRead() },
  { key: 'travel', pose: 'travel-diary', aria: 'Open travel memories, photo album', has: () => !!getTravel() },
]

function MenuBar({ inert, mode, navRef }: { inert: boolean; mode: NavMode; navRef: RefObject<HTMLElement | null> }) {
  const active = useFocus((s) => s.active)
  const floorLampOn = useFocus((s) => s.floorLampOn)
  const sideLampOn = useFocus((s) => s.sideLampOn)
  const blindClosed = useFocus((s) => s.blindClosed)
  const extras = ROOM_EXTRAS.filter((x) => x.has())
  return (
    <>
      <nav className="menu" data-mode={mode} aria-label="Sections" inert={inert} ref={navRef}>
        {MENU.map((key) => {
          const label = content.sections[key].label || key
          return (
            <button key={key} type="button" data-nav={key} aria-pressed={active === key} aria-label={label} title={label} onClick={() => focus(key)}>
              <SectionIcon section={key} />
              <span className="menu-label">{label}</span>
            </button>
          )
        })}
      </nav>
      <button type="button" className="menu-now" data-nav="now" aria-pressed={active === 'now'} inert={inert} onClick={() => focus('now')}>
        <SectionIcon section="now" />
        <span>{content.sections.now.label || 'now'}</span>
      </button>
      {extras.map((x, i) => (
        <button key={x.key} type="button" className="menu-now menu-extra" style={{ '--i': i + 1 } as React.CSSProperties} aria-label={x.aria} inert={inert} onClick={() => focus(x.key, x.pose)}>
          <SectionIcon section={x.key} />
          <span>{content.sections[x.key].label}</span>
        </button>
      ))}
      {}
      <button type="button" className="menu-now menu-extra" style={{ '--i': extras.length + 1 } as React.CSSProperties} aria-label={floorLampOn ? 'Turn the floor lamp off' : 'Turn the floor lamp on'} aria-pressed={floorLampOn} inert={inert} onClick={toggleFloorLamp}>
        <Icon name="lamp" />
        <span>Floor lamp</span>
      </button>
      {}
      <button type="button" className="menu-now menu-extra" style={{ '--i': extras.length + 2 } as React.CSSProperties} aria-label={sideLampOn ? 'Turn the desk-side lamp off' : 'Turn the desk-side lamp on'} aria-pressed={sideLampOn} inert={inert} onClick={toggleSideLamp}>
        <Icon name="lamp" />
        <span>Desk-side lamp</span>
      </button>
      {}
      <button type="button" className="menu-now menu-extra" style={{ '--i': extras.length + 3 } as React.CSSProperties} aria-label={blindClosed ? 'Open the window blind' : 'Close the window blind'} aria-pressed={blindClosed} inert={inert} onClick={toggleBlind}>
        <Icon name="sun" />
        <span>Window blind</span>
      </button>
    </>
  )
}

const TIMES: { id: TimeOfDay; label: string; icon: IconName }[] = [
  { id: 'day', label: 'Day', icon: 'sun' },
  { id: 'dusk', label: 'Dusk', icon: 'sunset' },
  { id: 'night', label: 'Night', icon: 'moon' },
]

function FitProbe({ refs, name, subtitle }: { refs: { probe: RefObject<HTMLDivElement | null>; full: RefObject<HTMLElement | null>; icons: RefObject<HTMLElement | null>; name: RefObject<HTMLElement | null>; sub: RefObject<HTMLElement | null> }; name: string; subtitle: string }) {
  const buttons = (labels: boolean) =>
    MENU.map((key) => (
      <button key={key} type="button" tabIndex={-1}>
        <SectionIcon section={key} />
        {labels && <span className="menu-label">{content.sections[key].label || key}</span>}
      </button>
    ))
  return (
    <div className="fit-probe" ref={refs.probe} aria-hidden="true" inert>
      <div className="menu" data-mode="full" ref={refs.full as RefObject<HTMLDivElement>}>{buttons(true)}</div>
      <div className="menu" data-mode="icons" ref={refs.icons as RefObject<HTMLDivElement>}>{buttons(false)}</div>
      <div className="title">
        <h1><span ref={refs.name as RefObject<HTMLSpanElement>}>{name}</span></h1>
        <p><span ref={refs.sub as RefObject<HTMLSpanElement>}>{subtitle}</span></p>
      </div>
    </div>
  )
}

function Controls({ inert }: { inert: boolean }) {
  const time = useFocus((s) => s.time)
  const theme = useFocus((s) => s.theme)
  const roof = useFocus((s) => s.roof)
  const lampOn = useFocus((s) => s.lampOn)
  return (
    <div className="bar" role="toolbar" aria-label="Scene controls" inert={inert}>
      <div className="bar-main">
        <div className="grp" role="group" aria-label="Time of day">
          {TIMES.map((t) => (
            <button key={t.id} type="button" className="ib" aria-label={t.label} title={t.label} aria-pressed={time === t.id} onClick={() => setTime(t.id)}>
              <Icon name={t.icon} />
            </button>
          ))}
        </div>
        <div className="grp themes" role="group" aria-label="Color theme">
          {(Object.keys(THEMES) as ThemeName[]).reverse().map((n) => (
            <button key={n} type="button" className="dot" aria-label={`${n} theme`} title={`${n[0].toUpperCase()}${n.slice(1)} theme`} aria-pressed={theme === n} onClick={() => setTheme(n)}>
              <i style={{ background: THEME_SWATCH[n] }} />
            </button>
          ))}
        </div>
      </div>
      <div className="grp acts" role="group" aria-label="Scene options">
        <button type="button" className="ib tog" aria-label="Lamp" title="Lamp" aria-pressed={lampOn} onClick={toggleLamp}>
          <Icon name="lamp" />
        </button>
        <button type="button" className="ib tog" aria-label="Roof" title="Roof" aria-pressed={roof} onClick={toggleRoof}>
          <Icon name="home" />
        </button>
        <button type="button" className="ib" aria-label="Reset view" title="Reset view" onClick={reset}>
          <Icon name="rotateCcw" />
        </button>
      </div>
    </div>
  )
}

function WallText() {
  const { identity, now, education } = content
  const items = now.items.filter((i) => i.trim())
  return (
    <section className="sr-only" aria-label="On the walls">
      {identity.name.trim() && <p>{identity.name}</p>}
      {identity.title.trim() && <p>{identity.title}</p>}
      {(now.heading.trim() || items.length > 0 || now.tagline.trim()) && (
        <>
          {now.heading.trim() && <h2>{now.heading}</h2>}
          {items.length > 0 && <ul>{items.map((i, n) => <li key={n}>{i}</li>)}</ul>}
          {now.tagline.trim() && <p>{now.tagline}</p>}
        </>
      )}
      {education.items.length > 0 && (
        <>
          {education.heading.trim() && <h2>{education.heading}</h2>}
          {education.tagline.trim() && <p>{education.tagline}</p>}
          <ul>
            {education.items.map((e, n) => (
              <li key={n}>{[e.degree, e.institution, e.location ?? '', e.years, educationStatus(e.status), e.details ?? ''].map((t) => t.trim()).filter(Boolean).join(', ')}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

const SUBTITLE = 'Explore my journey, projects and experience in an interactive 3D space.'

export default function App() {
  const webgl = useMemo(hasWebGL, [])
  const stage = useRef<HTMLDivElement>(null)
  const titleEl = useRef<HTMLDivElement>(null)
  const navEl = useRef<HTMLElement>(null)
  const probe = useRef<HTMLDivElement>(null)
  const probeFull = useRef<HTMLElement>(null)
  const probeIcons = useRef<HTMLElement>(null)
  const probeName = useRef<HTMLElement>(null)
  const probeSub = useRef<HTMLElement>(null)
  const refs = useMemo(() => ({ stage, title: titleEl, nav: navEl, probe, probeFull, probeIcons, probeName, probeSub }), [])
  const fit = useNavFit(refs)
  const sceneFailed = useFocus((s) => s.sceneFailed)
  const time = useFocus((s) => s.time)
  const popupOpen = useFocus((s) => s.phase === 'open')
  useEffect(() => {
    document.title = siteTitle()
  }, [])
  useEffect(() => {
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!webgl || sceneFailed) return <Classic />

  return (
    <div id="stage" ref={stage} className={`is-${time}`} data-nav={fit.mode}>
      <FocusControls />
      <div className="sky day" />
      <div className="sky dusk" />
      <div className="sky night" />
      <ErrorBoundary onError={failScene}>
        <Scene />
      </ErrorBoundary>
      <div className="vignette" aria-hidden="true" />
      <div className="title" ref={titleEl} data-sub={fit.showSub}>
        <h1>{siteTitle()}</h1>
        <p>{SUBTITLE}</p>
      </div>
      <FitProbe refs={{ probe, full: probeFull, icons: probeIcons, name: probeName, sub: probeSub }} name={siteTitle()} subtitle={SUBTITLE} />
      <WallText />
      <MenuBar inert={popupOpen} mode={fit.mode} navRef={navEl} />
      <Controls inert={popupOpen} />
      <ScreenBack />
      <PopupHost />
    </div>
  )
}
