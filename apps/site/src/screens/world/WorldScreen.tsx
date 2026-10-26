// SCR-clearinghouse (docs/WORLD.md section 6.2; DESIGN.md SCR-clearinghouse): the week, its incidents, the world and
// what is plugged in. Three columns from 1200 px (incidents main, the world and the plug-ins beside it), one column on a
// phone. The page belongs to no volume, so its accent is the series black (--vol-10). Always open (I5): before LAB-3 the
// world is open to browse and the week's incidents are first-contact practice that counts toward nothing.

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { LedgerEvent } from '@statespace/ledger'
import { useTitle } from '../../app/title.ts'
import { useEvents, useStore } from '../../app/ledger.ts'
import { Loading } from '../../components/page/states.tsx'
import { loadAudit } from '../audit/pool.ts'
import { About, Holds, LedgerBoard, Plugged, Rules, RunLine, Traffic } from './WorldParts.tsx'
import { cardLabel, IncidentDesk } from './IncidentDesk.tsx'
import type { GapClass } from './IncidentDesk.tsx'
import { filingOf, labelText, labsReached, pastLab3, useWeeks, useWorld } from './model.ts'
import type { Incident, Week } from '@statespace/world'
import '../audit/audit.css'
import './world.css'

const FALLBACK_KINDS: Record<string, GapClass['kind']> = {
  G1: 'rebutting', G2: 'rebutting', G3: 'rebutting', G12: 'rebutting',
  G4: 'undermining', G5: 'undermining', G6: 'undermining', G7: 'undermining', G11: 'undermining',
  G8: 'undercutting', G9: 'undercutting', G10: 'undercutting', G13: 'undercutting',
}

function useClasses(): readonly GapClass[] {
  const [classes, setClasses] = useState<readonly GapClass[]>(() => Object.entries(FALLBACK_KINDS).map(([id, kind]) => ({ id, name: '', kind })).sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))))
  useEffect(() => {
    let live = true
    loadAudit()
      .then((p) => {
        if (live && p.classes.length > 0) setClasses(p.classes)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  return classes
}

type IncidentState = 'new' | 'filed' | 'retired'

function stateOf(events: readonly LedgerEvent[], inc: Incident, current: boolean): IncidentState {
  if (filingOf(events, inc) !== undefined) return 'filed'
  return current ? 'new' : 'retired'
}

const STATE_WORD: Record<IncidentState, string> = { new: 'new', filed: 'filed', retired: 'retired unscored' }

function IncidentCards({ week, events, open, onOpen, current }: { readonly week: Week; readonly events: readonly LedgerEvent[]; readonly open: number | null; readonly onOpen: (slot: number) => void; readonly current: boolean }) {
  return (
    <ol className="wcards">
      {week.incidents.map((inc, i) => {
        const st = stateOf(events, inc, current)
        const isOpen = open === inc.slot
        return (
          <li key={inc.id} className="wcard" data-open={isOpen || undefined}>
            <button type="button" className="wcard-button" aria-expanded={isOpen} aria-controls={`incident-${inc.slot}`} onClick={() => onOpen(inc.slot)}>
              <span className="wcard-n">{i + 1}</span>
              <span className="wcard-body">
                <span className="wcard-kind">{cardLabel(inc)}</span>
                <span className="wcard-subject">{inc.subject}</span>
              </span>
              <span className="wcard-state">{STATE_WORD[st]}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function WorldScreen() {
  useTitle('The Clearinghouse')
  const store = useStore()
  const ev = useEvents(store)
  const weeksState = useWeeks(store)
  const events = ev.status === 'ready' ? ev.events : ev.status === 'unavailable' ? [] : null
  const weeks = weeksState.status === 'ready' ? weeksState.weeks : null
  const world = useWorld(weeks, events)
  const classes = useClasses()
  const [params, setParams] = useSearchParams()

  const latest = world?.weeks[world.weeks.length - 1]
  const asked = Number(params.get('week'))
  const week = world?.weeks.find((w) => w.input.k === asked) ?? latest
  const current = week !== undefined && week === latest
  const openParam = params.get('incident')
  const open = openParam === null ? null : Number(openParam)
  const labs = useMemo(() => (events === null ? new Set<string>() : labsReached(events)), [events])

  if (world === null || week === undefined || events === null) {
    return (
      <article className="screen audit world">
        <header className="screen-head ws-head">
          <h1>The Clearinghouse</h1>
        </header>
        <Loading what="this week’s world" />
      </article>
    )
  }

  const early = !pastLab3(events)
  const n = week.incidents.length
  const openInc = week.incidents.find((i) => i.slot === open)
  const setOpen = (slot: number) => {
    const next = new URLSearchParams(params)
    if (open === slot) next.delete('incident')
    else next.set('incident', String(slot))
    setParams(next, { replace: true })
  }

  return (
    <article className="screen audit world">
      <header className="screen-head ws-head">
        <h1>The Clearinghouse</h1>
        <p className="lede">
          Week of {labelText(week.input.label)} · {n} {n === 1 ? 'incident' : 'incidents'}
        </p>
        <p className="audit-purpose">
          A small ledger of tenants, accounts and holds, run in this tab by the course’s interpreter. Each week brings agent proposals and events to judge before you trust them. {n} {n === 1 ? 'incident' : 'incidents'} · about {n * 10}–{n * 15} minutes. Nothing is
          timed, and a week you skip never comes back as a backlog.
        </p>
        {early ? <p className="wearly">Nothing of yours is plugged in yet. Incidents begin after LAB-3. The world stays open to browse, and this week’s incidents are open as first-contact practice, which counts toward nothing.</p> : null}
        {weeksState.status === 'ready' && !weeksState.kept ? <p className="anote">This browser keeps no record, so this week lives only for this visit.</p> : null}
      </header>

      <div className="wgrid">
        <div className="wmain">
          <section className="audit-section" aria-labelledby="w-incidents">
            <h2 id="w-incidents">{current ? 'This week’s incidents' : `Week ${week.input.k}’s incidents`}</h2>
            <IncidentCards week={week} events={events} open={open} onOpen={setOpen} current={current} />
            {openInc !== undefined ? (
              <div id={`incident-${openInc.slot}`}>
                <IncidentDesk
                  key={openInc.id}
                  world={world}
                  inc={openInc}
                  n={week.incidents.indexOf(openInc) + 1}
                  size={n}
                  classes={classes}
                  store={store}
                  events={events}
                  filed={filingOf(events, openInc)}
                  firstContact={early}
                  retired={!current}
                />
              </div>
            ) : (
              <p className="anote">Open an incident to judge it. You pick the order and may stop after any one.</p>
            )}
          </section>

          <section className="audit-section" aria-labelledby="w-ledger">
            <h2 id="w-ledger">The world this week</h2>
            <LedgerBoard w={world.standing} week={week} />
            <RunLine week={week} what={`start ${week.run.startHash.slice(0, 8)} → end ${week.run.endHash.slice(0, 8)}`} />
          </section>
        </div>

        <aside className="wside" aria-label="The world">
          <section className="audit-section" aria-labelledby="w-rules">
            <h2 id="w-rules">The world’s rules</h2>
            <Rules week={week} />
            <RunLine week={week} />
          </section>
          <section className="audit-section" aria-labelledby="w-traffic">
            <h2 id="w-traffic">Traffic</h2>
            <Traffic week={week} />
          </section>
          <section className="audit-section" aria-labelledby="w-holds">
            <h2 id="w-holds">Holds</h2>
            <Holds week={week} />
          </section>
        </aside>

        <aside className="wplugged" aria-label="What is plugged in">
          <section className="audit-section" aria-labelledby="w-plug">
            <h2 id="w-plug">What is plugged in</h2>
            <Plugged labs={labs} />
          </section>
          <section className="audit-section" aria-labelledby="w-weeks">
            <h2 id="w-weeks">Your weeks</h2>
            <ul className="wweeks">
              {[...world.weeks].reverse().map((w) => (
                <li key={w.input.k}>
                  <Link to={`/world?week=${w.input.k}`} aria-current={w === week ? 'page' : undefined}>
                    Week {w.input.k}
                  </Link>{' '}
                  <span className="anote-inline">
                    {labelText(w.input.label)} · seed <code>{(w.input.seed >>> 0).toString(16).padStart(8, '0')}</code>
                  </span>
                </li>
              ))}
            </ul>
            <p className="anote">Each week replays from its seed and the weeks before it; nothing about the world is stored.</p>
          </section>
          <About />
        </aside>
      </div>
    </article>
  )
}
