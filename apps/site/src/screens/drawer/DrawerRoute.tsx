// A drawer (DESIGN.md SCR-drawer): the lesson renderer without calls, so its cells show their recorded runs as free runs
// and its fixed questions are answered under drawer:D-{nn}/i{n}. Opening a drawer is noted in the practice record as an
// uncredited view (ARCHITECTURE.md section 7.2), once per visit; it is never required.

import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { loadManifest, loadPage, loadStages, useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { PageView } from '../../components/page/PageView.tsx'
import { Failed, Loading, Missing } from '../../components/page/states.tsx'
import '../../components/page/page.css'

export function DrawerRoute() {
  const { id = '' } = useParams()
  const store = useStore()
  const events = useEvents(store)
  const data = useLoaded(async () => {
    const [manifest, stages, page] = await Promise.all([loadManifest(), loadStages(), loadPage(id)])
    return { manifest, stages, page }
  }, [id])
  const listed = data.status === 'ready' ? data.value.stages.flatMap((s) => s.drawers).find((d) => d.id === id) : undefined
  useTitle(data.status === 'ready' ? (data.value.page?.title ?? listed?.title ?? id) : id)

  const noted = useRef<string | null>(null)
  const built = data.status === 'ready' && data.value.page !== null
  useEffect(() => {
    if (!built || store === null || store === undefined || noted.current === id || !/^D-[0-9]{2}$/.test(id)) return
    noted.current = id
    void store.record({ kind: 'view', ref: `view:${id}`, provenance: 'own', exposure: 'seen' }).catch(() => undefined)
  }, [built, store, id])

  if (data.status === 'loading') return <Loading what="the drawer" />
  if (data.status === 'error') return <Failed message={data.message} />
  const { manifest, stages, page } = data.value
  const stage = stages.find((s) => s.drawers.some((d) => d.id === id))
  if (page === null && listed === undefined) return <Missing what="drawer" id={id} />
  const drawerTitles = new Map(stages.flatMap((s) => s.drawers.map((d) => [d.id, d.title] as const)))

  if (page === null) {
    return (
      <article className="screen page">
        <header className="screen-head page-head">
          <p className="kicker">
            {stage !== undefined ? (
              <>
                <Link to={`/stages/${stage.id}`}>
                  {stage.id} · {stage.title}
                </Link>{' '}
                ▸{' '}
              </>
            ) : null}
            {id}
          </p>
          <h1>{listed?.title ?? id}</h1>
          <p className="meta">{listed?.deferred === true ? 'Drawer · deferred' : 'Drawer'}</p>
        </header>
        <div className="sheet prose">
          <p>This drawer is not written yet. Drawers are side material: open whenever you like, and never required.</p>
        </div>
      </article>
    )
  }

  return (
    <PageView
      page={page}
      kind="drawer"
      stage={stage}
      builtAt={manifest.builtAt}
      store={store}
      events={events.status === 'ready' ? events.events : null}
      drawerTitles={drawerTitles}
    />
  )
}
