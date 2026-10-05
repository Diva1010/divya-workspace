import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { back } from '../../store/focus'

const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

export function PopupShell({ title, variant = 'card', label, children }: { title: string; label?: string; variant?: 'card' | 'wide' | 'book-full' | 'project-full' | 'skills-full' | 'sketch' | 'side'; children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null)
  const pressedOnScrim = useRef(false)
  const titleId = useId()
  const full = variant === 'book-full' || variant === 'project-full' || variant === 'skills-full' || variant === 'sketch'

  useEffect(() => {
    dialog.current?.focus()
  }, [])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialog.current) return
    const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const at = document.activeElement
    if (e.shiftKey && (at === first || at === dialog.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus() }
  }

  return (
    <div
      className={`scrim${variant === 'side' ? ' phone-side side-scrim' : ''}${full ? ' book-full-scrim' : ''}${variant === 'sketch' ? ' sketch-scrim' : ''}`}
      onPointerDown={(e) => { pressedOnScrim.current = e.target === e.currentTarget }}
      onClick={(e) => { if (pressedOnScrim.current && e.target === e.currentTarget) back() }}
    >
      <div
        ref={dialog}
        className={`popup ${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={full || label ? undefined : titleId}
        aria-label={full ? title : label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {full ? children : (
          <>
            <header className="popup-head">
              <h2 id={titleId}>{title}</h2>
              <button type="button" className="back" onClick={back}>Back</button>
            </header>
            <div className="popup-body">{children}</div>
          </>
        )}
      </div>
    </div>
  )
}
