// Today's short practice set, the happy path's version of M-today's due items: a few generated questions, each on a
// fresh seed, from the live templates whose primary KC the learner has met. A KC is met once the practice record holds
// an event from the lesson that first teaches it (the KC graph's firstTaught). No scheduler yet: the set is the first
// templates in KC order, at band 1, at most three, and none of it is required.

import { useMemo } from 'react'
import { GRAPH } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import { liveTemplates } from '@statespace/generators/core'
import { useLoaded } from '../../app/content.ts'
import { pagesTouched } from '../../app/progress.ts'
import type { LedgerStore } from '../../storage/index.ts'
import { GeneratedItem, LIVE_FAMILIES, loadFamily } from '../../components/generated/index.ts'
import '../../components/page/page.css'

/** How many questions the set holds at most [D]. */
const DUE_MAX = 3

interface Due {
  readonly family: string
  readonly template: string
  readonly kc: string
}

/** The KCs whose first lesson the record has touched, in the graph's order. */
export function metKcs(events: readonly LedgerEvent[]): string[] {
  const touched = new Set(pagesTouched(events))
  return GRAPH.kcs.filter((k) => k.firstTaught !== undefined && touched.has(k.firstTaught)).map((k) => k.id)
}

async function dueSet(met: readonly string[]): Promise<Due[]> {
  if (met.length === 0) return []
  const mods = await Promise.all(LIVE_FAMILIES.map((f) => loadFamily(f)).filter((p) => p !== null))
  const out: Due[] = []
  for (const kc of met) {
    for (const mod of mods) {
      for (const t of liveTemplates(mod.generator)) {
        if (t.kcs.primary === kc && out.length < DUE_MAX) out.push({ family: mod.generator.id, template: t.id, kc })
      }
    }
  }
  return out
}

export function DueSet({ events, store }: { readonly events: readonly LedgerEvent[] | null; readonly store: LedgerStore | null | undefined }) {
  const met = useMemo(() => (events === null ? null : metKcs(events)), [events])
  const key = met === null ? 'wait' : met.join(',')
  const due = useLoaded(async () => (met === null ? null : dueSet(met)), [key])
  if (due.status !== 'ready' || due.value === null) return null
  const items = due.value
  return (
    <section className="td-section td-due" aria-labelledby="today-due">
      <h2 id="today-due">Practice, drawn fresh</h2>
      {items.length === 0 ? (
        <p className="td-due-lede">Questions on the ideas you have met appear here, each one new. Start a lesson and they follow.</p>
      ) : (
        <>
          <p className="td-due-lede">A few questions on ideas you have met, each drawn new for you. Answer any, skip any.</p>
          <div className="td-due-items">
            {items.map((d, i) => (
              <GeneratedItem
                key={`${d.family}/${d.template}`}
                family={d.family}
                template={d.template}
                band={1}
                role="segment"
                head={
                  <p className="exercise-head">
                    <span className="exercise-word">Question</span> <span className="exercise-n">{i + 1}</span>
                  </p>
                }
                store={store}
                events={events}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
