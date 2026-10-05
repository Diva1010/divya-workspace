import { content, educationStatus, getCurrentRead, getReading, getTravel, formatExperience, siteTitle, sortedTechs, techMonths, techsByCategory } from '../content'
import { AboutPhoto, ContactList, DownloadPdf, Empty, ExperienceEntry, ProjectCard, safeHref } from './parts'

const label = (k: keyof typeof content.sections) => content.sections[k].label

export function Classic() {
  const { identity, about, experience, projects, now, education } = content
  const categories = techsByCategory()
  const reading = getReading()
  const currentRead = getCurrentRead()
  const travel = getTravel()
  const nowItems = now.items.filter((i) => i.trim())
  return (
    <div className="classic">
      <main>
        <header>
          <h1>{siteTitle()}</h1>
          {(identity.name.trim() || identity.title.trim()) && <p className="lead">{[identity.name, identity.title].map((t) => t.trim()).filter(Boolean).join(' · ')}</p>}
          <p className="muted">The 3D room is not available on this device, so this is the text version.</p>
        </header>

        <section aria-labelledby="c-about">
          <h2 id="c-about">{label('about')}</h2>
          <AboutPhoto />
          {about.greeting?.trim() && <p className="lead">{about.greeting}</p>}
          {about.headline.trim() && <p className="muted">{about.headline}</p>}
          {about.paragraphs?.map((t, n) => t.trim() && <p key={n}>{t}</p>)}
          {about.currentChips && about.currentChips.length > 0 && (
            <>
              {about.currentLabel?.trim() && <h3>{about.currentLabel}</h3>}
              <ul className="bk-tags about-chips">{about.currentChips.map((c) => <li key={c}>{c}</li>)}</ul>
            </>
          )}
        </section>

        {reading && (
          <section aria-labelledby="c-reading">
            <h2 id="c-reading">{label('reading')}</h2>
            {reading.top5 && <><h3>Top 5 Books of All Time</h3><ul>{reading.top5.map((b, i) => <li key={i}><strong>{b.title}</strong>{b.author && `, ${b.author}`}</li>)}</ul></>}
            {reading.number1 && <><h3>#1 Recommendation</h3><p><strong>{reading.number1.title}</strong>{reading.number1.author && `, ${reading.number1.author}`}</p>{reading.number1.reason && <p>{reading.number1.reason}</p>}</>}
            {reading.favoriteThisYear && <><h3>{reading.favoriteThisYear.year ? `Favorite Read of ${reading.favoriteThisYear.year}` : 'Favorite Read This Year'}</h3><p><strong>{reading.favoriteThisYear.title}</strong>{reading.favoriteThisYear.author && `, ${reading.favoriteThisYear.author}`}</p>{reading.favoriteThisYear.note && <p>{reading.favoriteThisYear.note}</p>}</>}
            {reading.favoriteGenre && <><h3>Favorite Genre</h3><p>{reading.favoriteGenre}</p></>}
          </section>
        )}

        {currentRead && (
          <section aria-labelledby="c-current-read">
            <h2 id="c-current-read">{label('currentRead')}</h2>
            <p><strong>{currentRead.title}</strong>{currentRead.author && `, ${currentRead.author}`}</p>
            {currentRead.note && <p>{currentRead.note}</p>}
          </section>
        )}

        {travel && (
          <section aria-labelledby="c-travel">
            <h2 id="c-travel">{label('travel')}</h2>
            {travel.places?.map((p, i) => <div key={i}><p><strong>{p.name}</strong>{p.region && ` ${p.region}`}</p>{p.note && <p>{p.note}</p>}</div>)}
            {travel.photos?.map((p, i) => { const src = safeHref(p.path); return src ? <figure key={i}><img src={src} alt={p.alt} loading="lazy" decoding="async" />{p.caption && <figcaption>{p.caption}</figcaption>}</figure> : null })}
          </section>
        )}

        <section aria-labelledby="c-now">
          <h2 id="c-now">{now.heading.trim() || label('now')}</h2>
          {nowItems.length === 0 && !now.tagline.trim() ? <Empty /> : (
            <>
              {nowItems.length > 0 && <ul>{nowItems.map((i, n) => <li key={n}>{i}</li>)}</ul>}
              {now.tagline.trim() && <p className="muted">{now.tagline}</p>}
            </>
          )}
        </section>

        <section aria-labelledby="c-experience">
          <h2 id="c-experience">{label('experience')}</h2>
          {experience.length === 0 ? <Empty /> : experience.map((e, i) => <ExperienceEntry key={i} e={e} />)}
        </section>

        <section aria-labelledby="c-education">
          <h2 id="c-education">{label('education')}</h2>
          {education.heading.trim() && <p className="muted">{education.heading}</p>}
          {education.tagline.trim() && <p className="muted">{education.tagline}</p>}
          {education.items.length === 0 ? <Empty /> : education.items.map((e, i) => (
            <article className="entry" key={i}>
              <h3>{e.degree}</h3>
              <p className="meta">{[e.institution, e.location ?? '', e.years].map((t) => t.trim()).filter(Boolean).join(' · ')}</p>
              {educationStatus(e.status) && <p><strong>{educationStatus(e.status)}</strong></p>}
              {e.details?.trim() && <p>{e.details}</p>}
            </article>
          ))}
        </section>

        <section aria-labelledby="c-skills">
          <h2 id="c-skills">{label('skills')}</h2>
          {categories.length === 0 ? <Empty /> : categories.map((g) => (
            <div key={g.category}>
              <h3>{g.category}</h3>
              <ul>
                {sortedTechs(g.category).map((t) => {
                  const years = formatExperience(techMonths(t.id))
                  return <li key={t.id}>{t.name}{years ? ` (${years})` : ''}</li>
                })}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="c-projects">
          <h2 id="c-projects">{label('projects')}</h2>
          {projects.length === 0 ? <Empty /> : projects.map((p, i) => (
            <article className="entry" key={i}>
              <h3>{p.title}</h3>
              <ProjectCard p={p} />
            </article>
          ))}
        </section>

        <section aria-labelledby="c-resume">
          <h2 id="c-resume">{label('resume')}</h2>
          <DownloadPdf />
        </section>

        <section aria-labelledby="c-contact">
          <h2 id="c-contact">{label('contact')}</h2>
          <ContactList />
        </section>
      </main>
    </div>
  )
}
