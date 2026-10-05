import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { getCurrentRead, getReading, getTravel } from '../../content'
import { back } from '../../store/focus'
import type { IconName } from '../../icons'
import { CloseButton } from '../CloseButton'
import { Icon } from '../Icon'
import { safeHref } from '../parts'
import { coverColors } from './coverColor'
import { PopupShell } from './PopupShell'


const css = (v: Record<string, string | number>) => v as CSSProperties

function useMedia(query: string) {
  const [m, setM] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const f = () => setM(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [query])
  return m
}


type TapePattern = 'stripe' | 'dots' | 'check'
const TAPES: { color: string; pat: TapePattern }[] = [
  { color: '#F4B6C2', pat: 'stripe' }, { color: '#B7D6F0', pat: 'dots' }, { color: '#D3C4F0', pat: 'stripe' }, { color: '#BFE3C0', pat: 'check' }, { color: '#E8DDF7', pat: 'dots' },
]

function Washi({ tilt = -4, left = '50%', tape = TAPES[0] }: { tilt?: number; left?: string; tape?: { color: string; pat: TapePattern } }) {
  return <i className={`washi w-${tape.pat}`} aria-hidden="true" style={css({ '--tr': `${tilt}deg`, '--wl': left, '--wc': tape.color })} />
}

function Decor({ kind }: { kind: 'reading' | 'current' | 'travel' }) {
  return (
    <>
      <LavenderBookmark />
      <Sparkles />
      {kind !== 'current' && (
        <>
          <Sprig side="a" gutter="l" />
          <Sprig side="b" gutter="r" />
          {kind === 'reading' ? <BookStack gutter="r" /> : <TeaCup gutter="l" />}
        </>
      )}
    </>
  )
}


function BookCover({ title, author, cover, size = 'small', children }: { title: string; author?: string; cover?: string; size?: 'small' | 'large'; children?: ReactNode }) {
  const c = coverColors(title)
  const src = cover ? safeHref(cover) : undefined
  const [failed, setFailed] = useState(false)
  const img = !!src && !failed
  const len = title.trim().length
  const fit = len <= 7 ? 'a' : len <= 12 ? 'b' : len <= 20 ? 'c' : 'd'
  return (
    <div className={`bc bc-${size}`} style={css({ '--bc-bg': c.bg, '--bc-spine': c.spine, '--bc-ink': c.ink })}>
      {img && <img className="bc-img" src={src} alt={`${title} cover`} loading="lazy" decoding="async" width={440} height={660} onError={() => setFailed(true)} />}
      <div className={`bc-face${img ? ' bc-hide' : ''}`}>
        <span className={`bc-title bc-t-${fit}`}>{title}</span>
        <span className="bc-orn" aria-hidden="true" />
        {author && <span className="bc-author">{author}</span>}
      </div>
      {children}
    </div>
  )
}


function SketchFrame({ kind, shellTitle, pageTitle, closeLabel, tabs, pageProps, pageRef, resetKey, children }: {
  kind: 'reading' | 'current' | 'travel'
  shellTitle: string
  pageTitle: string
  closeLabel: string
  tabs?: ReactNode
  pageProps?: Record<string, string | number>
  pageRef: React.RefObject<HTMLDivElement | null>
  resetKey: string
  children: ReactNode
}) {
  useLayoutEffect(() => {
    if (pageRef.current) pageRef.current.scrollTop = 0
  }, [pageRef, resetKey])
  return (
    <PopupShell title={shellTitle} variant="sketch">
      <div className="sk" data-kind={kind}>
        <div className="sk-sheet">
          <CloseButton label={closeLabel} variant="sketch" onClick={back} />
          <Decor kind={kind} />
          <h2 className="sk-title"><LavenderTitle text={pageTitle} /></h2>
          <div className="sk-page" ref={pageRef} tabIndex={0} {...(pageProps ?? { role: 'region', 'aria-label': pageTitle })}>
            {children}
          </div>
        </div>
        {tabs}
      </div>
    </PopupShell>
  )
}

function Feature({ cover, children }: { cover: ReactNode; children: ReactNode }) {
  return (
    <div className="sk-feature">
      <div className="sk-feature-cover">{cover}</div>
      <div className="sk-feature-text">{children}</div>
    </div>
  )
}

function Slip({ children }: { children: ReactNode }) {
  return <LavenderNote cup={false}>{children}</LavenderNote>
}


type TabId = 'top5' | 'pick' | 'fav'
interface TabDef { id: TabId; label: string; icon: IconName; color: string; active: string }

export function ReadingPopup() {
  const r = getReading()
  const f = r?.favoriteThisYear
  const tabs: TabDef[] = []
  if (r?.top5) tabs.push({ id: 'top5', label: 'Top 5', icon: 'star', color: '#F8CCD5', active: '#E57F95' })
  if (r?.number1) tabs.push({ id: 'pick', label: '#1 Pick', icon: 'heart', color: '#CFE8D1', active: '#7FC48A' })
  if (f) tabs.push({ id: 'fav', label: f.year ? `Favorite of ${f.year}` : 'Favorite', icon: 'trophy', color: '#CDE2F5', active: '#7DB6E6' })
  const uid = useId()
  const desktop = useMedia('(min-width: 921px)')
  const [index, setIndex] = useState(0)
  const last = tabs.length - 1
  const i = Math.min(index, Math.max(last, 0))
  const tab = tabs[i]
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (document.activeElement?.getAttribute('role') === 'tab') refs.current[i]?.focus()
  }, [i])

  useEffect(() => {
    if (tabs.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      const onTab = t?.getAttribute('role') === 'tab'
      let to: number | null = null
      if (e.key === 'ArrowRight' || (desktop && onTab && e.key === 'ArrowDown')) to = i + 1
      else if (e.key === 'ArrowLeft' || (desktop && onTab && e.key === 'ArrowUp')) to = i - 1
      else if (onTab && e.key === 'Home') to = 0
      else if (onTab && e.key === 'End') to = last
      if (to === null) return
      e.preventDefault()
      if (to >= 0 && to <= last) setIndex(to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [desktop, i, last, tabs.length])

  const tablist = tabs.length > 0 && (
    <div className="sk-tabs" role="tablist" aria-label="Reading Corner" aria-orientation={desktop ? 'vertical' : 'horizontal'} style={css({ '--tabs': tabs.length })}>
      {tabs.map((t, n) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[n] = el }}
          type="button"
          role="tab"
          id={`${uid}-tab-${t.id}`}
          className="sk-tab"
          style={css({ '--t': t.color, '--ta': t.active })}
          aria-selected={n === i}
          aria-controls={`${uid}-panel`}
          tabIndex={n === i ? 0 : -1}
          onClick={() => setIndex(n)}
        >
          <Icon name={t.icon} size={14} />
          <span className="sk-tab-l" data-t={t.label}>{t.label}</span>
        </button>
      ))}
    </div>
  )

  return (
    <SketchFrame
      kind="reading"
      shellTitle="Reading Corner"
      pageTitle="Divya's Reading Corner"
      closeLabel="Close reading corner"
      tabs={tablist}
      pageProps={tab ? { role: 'tabpanel', id: `${uid}-panel`, 'aria-labelledby': `${uid}-tab-${tab.id}` } : undefined}
      pageRef={pageRef}
      resetKey={tab?.id ?? ''}
    >
      <p className="sr-only" aria-live="polite">{tab?.label}</p>
      {tab && (
        <div className="sk-fade" key={tab.id}>
          {tab.id === 'top5' && r?.top5 && (
            <section>
              <h3 className="sk-sub">My Top 5 Books of All Time</h3>
              <ul className="sk-shelf">
                {r.top5.map((b, n) => (
                  <li key={n} className="sk-lift" style={css({ '--rot': n % 2 ? '1.5deg' : '-2deg' })}>
                    <BookCover title={b.title} author={b.author} cover={b.cover}>
                      <Washi tilt={[-4, 3, -3, 4, -2][n % 5]} left={['46%', '54%', '50%', '44%', '55%'][n % 5]} tape={TAPES[n % TAPES.length]} />
                    </BookCover>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tab.id === 'pick' && r?.number1 && (
            <section>
              <h3 className="sk-sub">My #1 Recommendation</h3>
              <Feature
                cover={
                  <div className="sk-lift" style={css({ '--rot': '-2deg' })}>
                    <BookCover title={r.number1.title} author={r.number1.author} cover={r.number1.cover} size="large">
                      <Washi tilt={-4} left="46%" tape={TAPES[0]} />
                      <span className="sk-stamp-ink" aria-hidden="true"><span>#1 Pick</span></span>
                    </BookCover>
                  </div>
                }
              >
                <p className="sk-book-title">{r.number1.title}</p>
                {r.number1.author && <p className="sk-author">{r.number1.author}</p>}
                {r.number1.reason && <Slip>{r.number1.reason}</Slip>}
              </Feature>
            </section>
          )}
          {tab.id === 'fav' && f && (
            <section>
              <h3 className="sk-sub">{f.year ? `Favorite Read of ${f.year}` : 'Favorite Read This Year'}</h3>
              <Feature
                cover={
                  <div className="sk-lift" style={css({ '--rot': '1.5deg' })}>
                    <BookCover title={f.title} author={f.author} cover={f.cover} size="large"><Washi tilt={4} left="54%" tape={TAPES[1]} /></BookCover>
                  </div>
                }
              >
                <p className="sk-book-title">{f.title}</p>
                {f.author && <p className="sk-author">{f.author}</p>}
                {f.note && <Slip>{f.note}</Slip>}
              </Feature>
            </section>
          )}
        </div>
      )}
    </SketchFrame>
  )
}


const LV = { lav: '#E8DDF7', blush: '#FADBE8', blue: '#D6E9FF', ink: '#4B3F72', soft: '#6A5E8C', gold: '#F5B942', leaf: '#9CC7AE', leafDeep: '#6FA588', heart: '#F4A9C4' }
function LavenderTitle({ text }: { text: string }) {
  return (
    <>
      <svg className="lv-book" viewBox="0 0 48 40" aria-hidden="true" focusable="false"><path d="M24 8 C17 3 8 3 3 6 V34 C8 31 17 31 24 36 C31 31 40 31 45 34 V6 C40 3 31 3 24 8 Z" fill={LV.lav} stroke="#8F77D6" strokeWidth="2.4" strokeLinejoin="round" /><path d="M24 8 V36" stroke="#8F77D6" strokeWidth="2.4" /><path d="M9 13 C13 12 17 12.6 20 14 M9 19 C13 18 17 18.6 20 20 M28 14 C31 12.6 35 12 39 13 M28 20 C31 18.6 35 18 39 19" fill="none" stroke="#B9A6E8" strokeWidth="1.8" strokeLinecap="round" /></svg>
      <span className="lv-title-text">{text}</span>
      <svg className="lv-flourish" viewBox="0 0 220 22" aria-hidden="true" focusable="false"><path d="M6 14 C40 4 70 20 100 12 M120 12 C150 20 180 4 214 14" fill="none" stroke={LV.heart} strokeWidth="3" strokeLinecap="round" /><path d="M110 19 C102 13 100 9 103 6.5 C106 4.5 109 6 110 8.5 C111 6 114 4.5 117 6.5 C120 9 118 13 110 19 Z" fill={LV.heart} /></svg>
    </>
  )
}
function LavenderBookmark() {
  return (
    <svg className="lv-deco lv-bookmark" viewBox="0 0 32 52" aria-hidden="true" focusable="false"><path d="M3 2 H29 V50 L16 40 L3 50 Z" fill={LV.blush} stroke="#E58AAE" strokeWidth="2" strokeLinejoin="round" /><path d="M20 14 A7 7 0 1 0 20 28 A5.5 5.5 0 1 1 20 14 Z" fill="#FFFFFF" stroke="#E58AAE" strokeWidth="1.4" strokeLinejoin="round" /><circle cx="22" cy="12" r="1.2" fill={LV.gold} /></svg>
  )
}
function Sprig({ side, gutter }: { side: 'a' | 'b'; gutter?: 'l' | 'r' }) {
  return (
    <svg className={gutter ? `lv-deco lv-g-sprig lv-g-${gutter}` : `lv-deco lv-sprig lv-sprig-${side}`} viewBox="0 0 44 90" aria-hidden="true" focusable="false"><path d="M22 88 C20 62 24 36 22 6" fill="none" stroke={LV.leafDeep} strokeWidth="2.4" strokeLinecap="round" /><g fill={LV.leaf} stroke={LV.leafDeep} strokeWidth="1.6" strokeLinejoin="round"><path d="M22 70 C10 68 4 58 6 50 C16 50 22 60 22 70 Z" /><path d="M22 52 C34 50 40 40 38 32 C28 32 22 42 22 52 Z" /><path d="M22 34 C10 32 6 22 8 14 C18 14 22 24 22 34 Z" /></g><circle cx="22" cy="6" r="3.2" fill={LV.blush} stroke="#E58AAE" strokeWidth="1.4" /></svg>
  )
}
function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating * 2) / 2))
  const id = useId()
  return (
    <div className="lv-rating" role="img" aria-label={`${r} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((n) => {
        const fill = Math.max(0, Math.min(1, r - n))
        return (
          <svg key={n} viewBox="0 0 48 48" width="26" height="26" aria-hidden="true" focusable="false">
            <defs><clipPath id={`${id}-${n}`}><rect x="0" y="0" width={48 * fill} height="48" /></clipPath></defs>
            <path d="M24 4 L29.5 17.5 L44 18.5 L33 28 L36.5 42 L24 34.5 L11.5 42 L15 28 L4 18.5 L18.5 17.5 Z" fill="#FFFFFF" stroke={LV.gold} strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M24 4 L29.5 17.5 L44 18.5 L33 28 L36.5 42 L24 34.5 L11.5 42 L15 28 L4 18.5 L18.5 17.5 Z" fill={LV.gold} stroke={LV.gold} strokeWidth="2.6" strokeLinejoin="round" clipPath={`url(#${id}-${n})`} />
          </svg>
        )
      })}
    </div>
  )
}
function LavenderNote({ children, cup = true }: { children: ReactNode; cup?: boolean }) {
  return (
    <div className="lv-note">
      <i className="lv-tape" aria-hidden="true" />
      <p>{children}</p>
      {cup && <TeaCup />}
    </div>
  )
}
function TeaCup({ gutter }: { gutter?: 'l' | 'r' }) {
  return (
    <svg className={gutter ? `lv-deco lv-g-cup lv-g-${gutter}` : 'lv-deco lv-cup'} viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" stroke="#8F77D6"><path d="M7 20 H33 V28 C33 35 28 40 20 40 C12 40 7 35 7 28 Z" fill={LV.blue} /><path d="M33 23 H37 C41 23 41 32 36 32 H32" fill="none" /><path d="M5 43 H35" fill="none" /><path d="M15 15 C13 12 17 10 15 7 M22 15 C20 12 24 10 22 7" fill="none" stroke="#B9A6E8" /></g></svg>
  )
}
function BookStack({ gutter }: { gutter?: 'l' | 'r' }) {
  return (
    <svg className={gutter ? `lv-deco lv-g-stack lv-g-${gutter}` : 'lv-deco lv-stack'} viewBox="0 0 64 56" aria-hidden="true" focusable="false"><g stroke="#8F77D6" strokeWidth="2" strokeLinejoin="round"><rect x="6" y="38" width="52" height="12" rx="2" fill={LV.lav} /><rect x="11" y="26" width="44" height="12" rx="2" fill={LV.blush} /><rect x="8" y="14" width="46" height="12" rx="2" fill={LV.blue} /></g><path d="M14 44 H50 M18 32 H48 M15 20 H46" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" /><path d="M46 14 V4 L52 8 L46 12" fill={LV.blush} stroke="#E58AAE" strokeWidth="1.4" strokeLinejoin="round" /></svg>
  )
}
function Sparkles() {
  return (
    <svg className="lv-deco lv-sparkles" viewBox="0 0 60 40" aria-hidden="true" focusable="false"><g fill={LV.gold}><path d="M12 4 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z" /><path d="M44 18 l1.4 4 4 1.4 -4 1.4 -1.4 4 -1.4 -4 -4 -1.4 4 -1.4 Z" /><path d="M30 2 l1 3 3 1 -3 1 -1 3 -1 -3 -3 -1 3 -1 Z" /></g></svg>
  )
}

export function CurrentReadPopup() {
  const c = getCurrentRead()
  const pageRef = useRef<HTMLDivElement>(null)
  return (
    <SketchFrame kind="current" shellTitle="Currently Reading" pageTitle="Currently Reading" closeLabel="Close current read" pageRef={pageRef} resetKey="">
      {c && (
        <Feature
          cover={
            <div className="sk-lift lv-cover" style={css({ '--rot': '2deg' })}>
              <BookCover title={c.title} author={c.author} cover={c.cover} size="large" />
              <Sprig side="a" />
              <Sprig side="b" />
            </div>
          }
        >
          <p className="sk-book-title">{c.title}</p>
          {c.author && <p className="sk-author">{c.author}</p>}
          {c.tags && c.tags.length > 0 && <ul className="lv-tags">{c.tags.map((t, n) => <li key={n} className={n < 2 ? 'lv-tag-a' : 'lv-tag-b'}>{t}</li>)}</ul>}
          {typeof c.rating === 'number' && <Stars rating={c.rating} />}
          {c.note && <LavenderNote>{c.note}</LavenderNote>}
          <BookStack />
          <Sparkles />
        </Feature>
      )}
    </SketchFrame>
  )
}


type Credit = { author: string; license: string; licenseUrl?: string; source: string }
function PhotoCredit({ credit }: { credit: Credit }) {
  const lic = credit.licenseUrl ? safeHref(credit.licenseUrl) : undefined
  const src = safeHref(credit.source)
  return (
    <span className="lv-credit">
      Photo: {credit.author},{' '}
      {lic ? <a href={lic} target="_blank" rel="noopener noreferrer">{credit.license}</a> : credit.license},{' '}
      {src ? <a href={src} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> : 'Wikimedia Commons'} (resized).
      {/BY-SA/i.test(credit.license) && ' Shared under the same licence.'}
    </span>
  )
}

export function TravelPopup() {
  const t = getTravel()
  const pageRef = useRef<HTMLDivElement>(null)
  const photos = (t?.photos ?? []).map((p) => ({ ...p, src: safeHref(p.path), thumbSrc: safeHref(p.thumb ?? p.path) }))
  const entries = (t?.places ?? []).map((place) => ({ place, photo: photos.find((p) => p.place && p.place === place.id && p.src) }))
  return (
    <SketchFrame kind="travel" shellTitle="Travel Memories" pageTitle="Places I've Loved" closeLabel="Close travel memories" pageRef={pageRef} resetKey="">
      <div className="lv-travel">
        <p className="lv-from">Photos from Wikimedia Commons</p>
        {entries.map(({ place, photo }, n) => (
          <article key={place.id ?? place.name} className={`lv-entry${n % 2 ? ' lv-flip' : ''}`}>
            <h3 className="sk-book-title lv-entry-title">{place.name}</h3>
            {photo && (
              <figure className="lv-entry-photo">
                <img
                  src={photo.src ?? undefined}
                  srcSet={photo.src && photo.thumbSrc ? `${photo.thumbSrc} 640w, ${photo.src} 1600w` : undefined}
                  sizes="(min-width: 921px) 440px, 100vw"
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  style={photo.width && photo.height ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined}
                  loading={n === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <figcaption className="sk-caption lv-entry-cap">{photo.caption ?? place.name}</figcaption>
              </figure>
            )}
            {place.note && <LavenderNote cup={false}>{place.note}</LavenderNote>}
            {photo?.credit && <PhotoCredit credit={photo.credit} />}
          </article>
        ))}
      </div>
    </SketchFrame>
  )
}
