// Today's session (M-today; DESIGN.md SCR-today): the plan's composition and length, Start, and the cards one at a time.
// Each item is a GeneratedItem on a fresh seed; its event carries `data.today` (the day and the plan's slot) so a reload
// shows what was answered, and a re-find carries `data.refind` (specimens/model/status.ts owns that contract), so the
// cabinet marks the specimen kept. The tags ride on a thin wrapper of the store's `record`; nothing else changes.
//
// The words never count what is not in today's set: no overdue count, no streak, no "behind". Stop after any card.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { GRAPH, kcById } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import type { PlanCard, TodayPlan } from '@statespace/learner/schedule'
import { answeredSlots } from '@statespace/learner/schedule'
import type { LedgerStore } from '../../storage/index.ts'
import { GeneratedItem } from '../../components/generated/index.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import '../../components/page/page.css'

/** The store with every `record` call's data extended by `extra`: how a Today card tags its item's event. */
function taggedStore(store: LedgerStore, extra: Record<string, unknown>): LedgerStore {
  return new Proxy(store, {
    get(target, prop) {
      if (prop === 'record') {
        return (input: Parameters<LedgerStore['record']>[0]) => target.record({ ...input, data: { ...((input.data as Record<string, unknown> | undefined) ?? {}), ...extra } as typeof input.data })
      }
      const v = Reflect.get(target, prop, target) as unknown
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v
    },
  })
}

const kcName = (id: string): string | undefined => kcById(GRAPH, id)?.name

/** "4 items · 1 audit case · 1 re-find · about 11 minutes" */
export function composition(plan: TodayPlan): string {
  const parts: string[] = []
  const { items, audits, refinds } = plan.counts
  if (items > 0) parts.push(`${items} ${items === 1 ? 'item' : 'items'}`)
  if (audits > 0) parts.push(`${audits} audit case`)
  if (refinds > 0) parts.push(`${refinds} ${refinds === 1 ? 're-find' : 're-finds'}`)
  const [lo, hi] = plan.minutes
  if (lo > 0) parts.push(lo === hi ? `about ${lo} minutes` : `about ${lo} to ${hi} minutes`)
  return parts.join(' · ')
}

const LABEL: Record<string, string> = { due: 'Practice', return: 'A second look', welcome: 'Welcome back', call: 'A call', refind: 'Re-find', audit: 'Audit case' }

function labelOf(c: PlanCard): string {
  if (c.kind === 'item') return LABEL[c.why] ?? 'Practice'
  return LABEL[c.kind] ?? ''
}

function whyOf(c: PlanCard): string {
  if (c.kind === 'refind') return `Find the same move on a fresh variant. A right answer keeps ${c.specimen}${c.title !== undefined ? `, ${c.title}` : ''}, in your cabinet.`
  if (c.kind === 'audit') return `${c.audit.anchor}: ${c.audit.subject}. Decide whether the agent's claim holds, with the evidence that shows it.`
  if (c.why === 'return') return 'You were sure and it missed. This is a fresh variant of the same question.'
  if (c.why === 'welcome') return 'An idea you have met, on a fresh seed, to start back with.'
  if (c.why === 'call') return 'One call: a verdict before the run.'
  return 'An idea you have met, drawn fresh. Its next day comes from how your answers have gone.'
}

const skillOf = (c: PlanCard): string | undefined => (c.kind === 'audit' ? undefined : kcName(c.kc))

interface Props {
  readonly plan: TodayPlan
  readonly events: readonly LedgerEvent[]
  readonly store: LedgerStore | null | undefined
}

export function Session({ plan, events, store }: Props) {
  const [at, setAt] = useState<number | null>(null)
  const done = answeredSlots(events, plan.day)
  // An audit case is filed on the Audit Desk; it is done for today once an audit event on its case is in today's record.
  const auditDone = (c: PlanCard): LedgerEvent | undefined =>
    c.kind === 'audit' ? events.find((e) => e.kind === 'audit' && e.day === plan.day && e.ref === `audit:${c.audit.ref}`) : undefined
  const answered = (c: PlanCard): LedgerEvent | undefined => done.get(c.slot) ?? auditDone(c)
  const cards = plan.cards
  const allDone = cards.length > 0 && cards.every((c) => answered(c) !== undefined)
  const stepRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (at !== null) stepRef.current?.focus()
  }, [at])

  const start = (): void => {
    const first = cards.findIndex((c) => answered(c) === undefined)
    setAt(first < 0 ? 0 : first)
  }

  return (
    <section className="td-session" aria-labelledby="today-set">
      <div className="td-plan">
        <h2 id="today-set">{heading(plan)}</h2>
        <p className="td-plan-lede">{lede(plan)}</p>
        {cards.length > 0 && at === null ? (
          <p className="actions td-actions">
            <button type="button" className="button button-primary td-start" onClick={start}>
              {allDone ? 'Look again' : done.size > 0 ? 'Carry on' : 'Start'}
            </button>
          </p>
        ) : null}
      </div>

      {cards.length > 0 ? (
        <ol className="td-cards">
          {cards.map((c, i) => {
            const a = answered(c)
            return (
              <li key={c.slot} className="td-card-row" data-current={at === i ? 'true' : undefined}>
                <button type="button" className="td-card-pick" onClick={() => setAt(i)} aria-current={at === i ? 'step' : undefined}>
                  <span className="td-card-n">{i + 1}</span>
                  <span className="td-card-what">
                    <span className="td-card-kind">{labelOf(c)}</span>
                    <span className="td-card-skill">{c.kind === 'audit' ? c.audit.anchor : c.kind === 'refind' ? `${c.specimen}${c.title !== undefined ? ` · ${c.title}` : ''}` : <InlineMd text={skillOf(c) ?? c.kc} />}</span>
                  </span>
                  <span className="td-card-state">{a === undefined ? `about ${c.minutes} min` : resultWord(a)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : null}

      {at !== null && cards[at] !== undefined ? (
        <div className="td-step" ref={stepRef} tabIndex={-1} aria-label={`Card ${at + 1} of ${cards.length}`}>
          <Card key={`${cards[at].slot}`} card={cards[at]} n={at + 1} of={cards.length} plan={plan} events={events} store={store} answered={answered(cards[at])} />
          <p className="actions td-step-actions">
            {at + 1 < cards.length ? (
              <button type="button" className="button button-primary" onClick={() => setAt(at + 1)}>
                Next card
              </button>
            ) : null}
            <button type="button" className="button button-secondary" onClick={() => setAt(null)}>
              {at + 1 < cards.length ? 'Stop here' : 'Close the set'}
            </button>
          </p>
          {at + 1 === cards.length ? <p className="td-plan-lede">That is today's set. Stop here, or open a stage and keep going.</p> : null}
        </div>
      ) : null}
    </section>
  )
}

function resultWord(e: LedgerEvent): string {
  if (e.kind === 'audit') return 'filed'
  return e.ok === true ? 'answered · matched' : e.ok === false ? 'answered · missed' : 'answered · not graded'
}

function heading(plan: TodayPlan): string {
  if (plan.mode === 'welcome') return 'Welcome back'
  if (plan.mode === 'bench') return 'Back at the bench'
  if (plan.mode === 'landmark') return 'A fresh start'
  return "Today's set"
}

function lede(plan: TodayPlan): string {
  if (plan.mode === 'start') return 'Your first set appears here after your first lesson. Each question in it is drawn fresh for you.'
  if (plan.mode === 'welcome') return 'Good to see you. Here is a short set on ideas you have met, to start back with. Nothing piled up while you were away.'
  if (plan.mode === 'bench')
    return 'A longer first session back, 20 to 30 minutes: a few ideas you met first, one call, then the last claim card and the next piece of your lab, restated in your own words.'
  if (plan.mode === 'landmark')
    return 'A fresh start. Begin with a short set on what has stayed with you. For the next two weeks one session meets a week.'
  if (plan.cards.length === 0) return 'Nothing is due. Practice a stage, or stop here.'
  return 'A short session on fresh seeds. Stop after any card and nothing is lost.'
}

function Card({ card, n, of, plan, events, store, answered }: { readonly card: PlanCard; readonly n: number; readonly of: number; readonly plan: TodayPlan; readonly events: readonly LedgerEvent[]; readonly store: LedgerStore | null | undefined; readonly answered: LedgerEvent | undefined }) {
  const head = (
    <p className="exercise-head">
      <span className="exercise-word">{labelOf(card)}</span> <span className="exercise-n">{n}</span>
      <span className="td-of"> of {of}</span>
    </p>
  )
  const note = <p className="td-card-why">{whyOf(card)}</p>
  // Answered before this card was opened: show what happened. Answered while open: the item keeps its own feedback.
  const [before] = useState(answered !== undefined)
  if (card.kind === 'audit') {
    return (
      <div className="question no-margin td-audit">
        {head}
        {note}
        {answered !== undefined ? <p className="td-card-why">Filed today. The Audit Desk shows its key and what it found.</p> : null}
        <p className="actions">
          <Link className="button button-primary" to={`/audit/case/${card.audit.anchor}/${card.audit.n}`}>
            Open the case
          </Link>
        </p>
      </div>
    )
  }
  if (before && answered !== undefined) {
    return (
      <div className="question no-margin">
        {head}
        {note}
        <p className="td-card-why">
          You answered this card today: {resultWord(answered).replace('answered · ', 'your answer ')}. A new draw is in the stage's lessons, or tomorrow's set.
        </p>
      </div>
    )
  }
  const tag: Record<string, unknown> = { today: { day: plan.day, slot: card.slot }, ...(card.kind === 'refind' ? { refind: { specimen: card.specimen } } : {}) }
  return (
    <Tagged store={store} tag={tag}>
      {(s) => (
        <>
          {note}
          <GeneratedItem family={card.family} template={card.template} band={1} role="segment" head={head} store={s} events={events} />
        </>
      )}
    </Tagged>
  )
}

function Tagged({ store, tag, children }: { readonly store: LedgerStore | null | undefined; readonly tag: Record<string, unknown>; readonly children: (s: LedgerStore | null | undefined) => ReactNode }) {
  const s = useMemo(() => (store === null || store === undefined ? store : taggedStore(store, tag)), [store]) // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children(s)}</>
}
