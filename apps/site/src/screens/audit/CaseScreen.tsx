// One case opened on its own (/audit/case/AUD-1.1/3): always open, never locked (I5). The case is graded as in a
// session and its answer key follows at once, because nothing else is waiting.

import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTitle } from '../../app/title.ts'
import { useLoaded } from '../../app/content.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { CaseDesk } from './CaseDesk.tsx'
import { Feedback } from './Feedback.tsx'
import { browseOrder, loadAudit } from './pool.ts'
import type { Finding, Graded } from './record.ts'
import './audit.css'

export function CaseScreen() {
  const { anchor: anchorId = '', n: nText = '' } = useParams()
  useTitle(`${anchorId} case ${nText}`)
  const loaded = useLoaded(loadAudit, [])
  const store = useStore()
  const ev = useEvents(store)
  const [done, setDone] = useState<{ key: string; finding: Finding; graded: Graded } | null>(null)
  const key = `${anchorId}/${nText}`

  const anchor = loaded.status === 'ready' ? loaded.value.anchors.find((a) => a.id === anchorId) : undefined
  const c = anchor === undefined ? undefined : browseOrder(anchor)[Number(nText) - 1]
  const filed = done !== null && done.key === key ? done : null

  return (
    <article className="screen audit">
      <header className="screen-head ws-head">
        <h1>
          {anchorId} · case {nText}
        </h1>
        <p className="lede">{anchor?.subject ?? 'A case of the Audit Desk'}</p>
        <p className="aplain">
          <Link to="/audit">The Audit Desk</Link>
        </p>
      </header>
      {loaded.status === 'loading' ? (
        <p className="aplain" role="status">
          Opening the case…
        </p>
      ) : loaded.status === 'error' ? (
        <p className="aplain" role="status">
          The cases did not load ({loaded.message}). Reload the page to try again.
        </p>
      ) : anchor === undefined || c === undefined ? (
        <p className="aplain">
          The pool holds no case at this address. <Link to="/audit">Every case is listed at the Desk</Link>.
        </p>
      ) : filed === null ? (
        <CaseDesk
          key={key}
          pool={loaded.value}
          anchor={anchor}
          c={c}
          n={1}
          sitting={{ id: 'open', position: 0, size: 1 }}
          seed={null}
          store={store}
          events={ev.status === 'ready' ? ev.events : []}
          onFiled={(finding, graded) => setDone({ key, finding, graded })}
        />
      ) : (
        <section className="audit-section" aria-labelledby="ac-key" style={{ ['--vol' as string]: `var(--vol-${anchor.stage.slice(1)})` }}>
          <h2 id="ac-key">The answer key</h2>
          <Feedback pool={loaded.value} anchor={anchor} c={c} n={1} finding={filed.finding} graded={filed.graded} />
        </section>
      )}
    </article>
  )
}
