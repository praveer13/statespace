// One erosion on its own page (/report/erosions/ER-n): the forecast, then the crack and its specimen. Every erosion can
// be read here whether or not it has fired in your record; the page says which (nothing locks).

import { Link, useParams } from 'react-router'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import { Loading, Missing } from '../../components/page/states.tsx'
import { erosionOf } from './data.ts'
import { ErosionEvent } from './ErosionEvent.tsx'
import { useErosionReading } from './useErosions.ts'
import './report.css'

export function ErosionScreen() {
  const { id = '' } = useParams()
  const er = erosionOf(id.toUpperCase())
  useTitle(er !== undefined ? `${er.id} · Erosion` : 'Erosion')
  const store = useStore()
  const events = useEvents(store)
  const record = events.status === 'ready' ? events.events : events.status === 'unavailable' ? [] : null
  const reading = useErosionReading(record)
  if (er === undefined) return <Missing what="erosion" id={id} />
  return (
    <article className="screen report">
      <header className="screen-head report-head">
        <p className="report-crumbs">
          <Link to="/report">Report</Link> · Erosion log
        </p>
        <h1>{er.id}</h1>
        <p className="report-lede">
          {er.seam} meets {er.specimen}. An erosion is an event, not a stamp: it cracks a segment or an assumption record, and the claim keeps its stamp.
        </p>
      </header>
      {reading === null ? <Loading what="your record" /> : <ErosionEvent er={er} state={reading.erosions.find((e) => e.id === er.id)} store={store} />}
    </article>
  )
}
