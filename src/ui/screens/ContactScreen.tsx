import { useRef, type CSSProperties, type ReactNode } from 'react'
import { content } from '../../content'
import { ICON_PATHS } from '../../icons'
import { contactHref, PHONE_ENVELOPE, PHONE_TEX_W, PHONE_TILE, PHONE_TILES, PHONE_W, type PhoneField } from '../../scene/screenDesign'
import { useScreenFocus } from './useScreenFocus'

const GLYPH: Record<PhoneField, ReactNode> = {
  email: (
    <g transform={`translate(${-PHONE_ENVELOPE.size / 2} ${-PHONE_ENVELOPE.size / 2}) scale(${PHONE_ENVELOPE.size / 24})`} strokeWidth={(PHONE_ENVELOPE.stroke * 24) / PHONE_ENVELOPE.size}>
      {ICON_PATHS.envelope.map((d, i) => <path key={i} d={d} />)}
    </g>
  ),
  linkedin: (
    <g transform="rotate(-45)">
      <rect x="-46" y="-17" width="56" height="34" rx="17" />
      <rect x="-10" y="-17" width="56" height="34" rx="17" />
    </g>
  ),
  github: (
    <>
      <path d="M-14 -34 L-44 0 L-14 34" />
      <path d="M14 -34 L44 0 L14 34" />
      <path d="M6 -40 L-6 40" />
    </>
  ),
}

const ARIA: Record<PhoneField, string> = { email: 'Email Divya', linkedin: 'LinkedIn profile, opens in a new tab', github: 'GitHub profile, opens in a new tab' }

const S = PHONE_W / PHONE_TEX_W
const px = (units: number) => `${units * S}px`

export function ContactScreen() {
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<string | null>(null)
  useScreenFocus(root, last)
  return (
    <div className="scr scr-phone" ref={root} role="region" aria-label={content.sections.contact.label}>
      <div className="ph-dots" aria-hidden="true">
        <i style={{ left: px(34), top: px(24), width: px(60), height: px(12), borderRadius: px(6) }} />
        {[0, 1, 2].map((i) => (
          <i key={i} style={{ left: px(PHONE_TEX_W - 40 - i * 22 - 6), top: px(24), width: px(12), height: px(12), borderRadius: '50%' }} />
        ))}
      </div>
      <div className="ph-notch" aria-hidden="true" style={{ left: px(PHONE_TEX_W / 2 - 60), top: px(12), width: px(120), height: px(26), borderRadius: px(13) }} />
      {PHONE_TILES.map((t) => {
        const href = contactHref(t.field)
        const style: CSSProperties = { left: px(PHONE_TEX_W / 2 - PHONE_TILE / 2), top: px(t.cy - PHONE_TILE / 2), width: px(PHONE_TILE) }
        const inner = (
          <>
            <span className="ph-ico" style={{ width: px(PHONE_TILE), height: px(PHONE_TILE), borderRadius: px(32), background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` }}>
              <svg viewBox="-70 -70 140 140" width="100%" height="100%" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {GLYPH[t.field]}
              </svg>
            </span>
            {}
            <span className="ph-label" style={{ top: px(PHONE_TILE / 2 + 112 - 26 * 0.83), fontSize: px(26) }}>{t.label}</span>
          </>
        )
        return href ? (
          <a
            key={t.field}
            className="ph-tile"
            style={style}
            href={href}
            title={t.label}
            aria-label={ARIA[t.field]}
            data-screen-item={t.field}
            {...(t.field === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {inner}
          </a>
        ) : (
          <a key={t.field} className="ph-tile off" style={style} aria-disabled="true" title="Link not added yet">
            {inner}
          </a>
        )
      })}
      <div className="ph-home" aria-hidden="true" style={{ left: px(PHONE_TEX_W / 2 - 70), top: px(1063 - 28), width: px(140), height: px(8), borderRadius: px(4) }} />
    </div>
  )
}
