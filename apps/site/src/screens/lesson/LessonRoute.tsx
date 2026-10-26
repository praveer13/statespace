// A lesson: the built page from the content build, the practice record it reads and writes, and its place in the course
// (the stage it belongs to, the lessons before and after it). A lesson the build has no page for yet still opens with
// its title, its stage and the links on either side, so the course can be walked end to end.

import { Link, useParams } from 'react-router'
import { tierFormat } from '@statespace/content'
import type { Tier } from '@statespace/content'
import { courseLessons, loadManifest, loadPage, loadStages, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { chapterInk, chapterNumber, Pager, PageView, RunningHead } from '../../components/page/PageView.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import '../../components/page/page.css'

export function LessonRoute() {
  const { id = '' } = useParams()
  const store = useStore()
  const events = useEvents(store)
  const data = useLoaded(async () => {
    const [manifest, lessons, stages, page] = await Promise.all([loadManifest(), courseLessons(), loadStages(), loadPage(id)])
    return { manifest, lessons, stages, page }
  }, [id])
  const at = data.status === 'ready' ? data.value.lessons.findIndex((l) => l.id === id) : -1
  const entry = data.status === 'ready' ? data.value.lessons[at] : undefined
  useTitle(data.status === 'ready' ? (data.value.page?.title ?? entry?.title ?? id) : id)

  // The shell gives a lesson the full width for its running head, so these states take the page's column themselves.
  if (data.status === 'loading') return <div className="chapter-state"><Loading what="the lesson" /></div>
  if (data.status === 'error') return <div className="chapter-state"><Failed message={data.message} /></div>
  const { manifest, lessons, stages, page } = data.value
  if (entry === undefined && page === null) return <div className="chapter-state"><Missing what="lesson" id={id} /></div>

  const link = (k: number) => {
    const l = lessons[k]
    return l === undefined ? undefined : { id: l.id, title: l.title }
  }
  const prev = at > 0 ? link(at - 1) : undefined
  const next = at >= 0 ? link(at + 1) : undefined
  const stage = entry?.stage ?? stages.find((s) => s.lessons.some((l) => l.id === id))
  const drawerTitles = new Map(stages.flatMap((s) => s.drawers.map((d) => [d.id, d.title] as const)))

  if (page === null) {
    return (
      <article className="chapter" data-kind="lesson" style={chapterInk('lesson', stage?.id)}>
        <header className="chapter-head">
          <RunningHead kind="lesson" stage={stage} id={id} />
          <div className="chapter-open">
            <div className="chapter-title">
              <span className="chapter-n" aria-hidden="true">
                {chapterNumber('lesson', id)}
              </span>
              <h1>{entry?.title ?? id}</h1>
            </div>
            {entry !== undefined ? <p className="chapter-line">{tierFormat(entry.tier as Tier)}</p> : null}
          </div>
        </header>
        <div className="page-body">
          <div className="page-main">
            <div className="chapter-unwritten md">
              <p>This lesson is not written yet. The course is drafted a stage at a time, and every page opens whenever you choose: the stage page lists the lab and the drawers that are open now.</p>
              {stage !== undefined ? (
                <p>
                  <Link to={`/stages/${stage.id}`}>Open {stage.id} · {stage.title}</Link>
                </p>
              ) : null}
            </div>
            <Pager prev={prev} next={next} />
          </div>
        </div>
      </article>
    )
  }

  return (
    <PageView
      page={page}
      kind="lesson"
      stage={stage}
      builtAt={manifest.builtAt}
      store={store}
      events={events.status === 'ready' ? events.events : null}
      drawerTitles={drawerTitles}
      prev={prev}
      next={next}
    />
  )
}
