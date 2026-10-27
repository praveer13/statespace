// A generated item (ASSESSMENT.md section 4.1), set like the page's fixed exercises (components/page/blocks.tsx).
//
// On mount it draws a fresh graded seed from this tab's entropy, steps past seeds the practice record already holds
// for the same ref, and asks the family for an instance its checker can key (drawInstance redraws past a seed the
// checker cannot settle). The learner picks; on Submit the family's checker computes the key again, in this page,
// and grades the pick. Nothing about the key is stored with the item. The result shows the verdict, a state that
// tells the pick from the answer, what the checker assumed (the bound) and what it rests on (the basis), then every
// option with its why. The answer is written to the practice record the way a fixed item's is, with the seed, the
// engine and the instance's identity, so the instance can be regenerated anywhere. "Draw another" draws again:
// nothing locks.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { GRAPH, kcById } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import type { Band, ChoicePart, Grade, InstanceBase, Json, KeyBase } from '@statespace/generators/core'
import { chanceOf, drawInstance, formatSeed, gradedSeed, instanceEventFields, isDiscard } from '@statespace/generators/core'
import type { LedgerStore } from '../../storage/index.ts'
import { InlineMd, Markdown } from '../markdown/Markdown.tsx'
import { isLiveTemplate, loadFamily, portOf } from './registry.ts'
import type { FamilyModule } from './registry.ts'
import './generated.css'

export interface GeneratedItemProps {
  readonly family: string
  readonly template: string
  /** The band to draw at, 1 to 3; band 1 when the content names none. */
  readonly band?: number | undefined
  /** The formalize mode the content asks for; this build serves pick mode and says so for the others. */
  readonly mode?: 'pick' | 'fix' | 'write' | undefined
  /** The exercise head the page sets above the item. */
  readonly head?: ReactNode
  readonly role?: string | undefined
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[] | null
  /**
   * Where the item sits: a drawer's item is written under drawer:D-{nn}/i{n}, a lesson's under item:GEN-{family}/{template}
   * with the page and its place in `data`; without a place (Today) the ref is item:GEN-{family}/{template} alone.
   */
  readonly place?: { readonly page: string; readonly n: number } | undefined
  /** The content build's fingerprint of the family's files, when the page carries one. */
  readonly itemRev?: string | undefined
}

type Drawn = { readonly mod: FamilyModule; readonly instance: InstanceBase; readonly seed: number; readonly redraws: number }

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'absent' }
  | { readonly status: 'exhausted'; readonly tried: number }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly drawn: Drawn }

interface Result {
  readonly picked: string
  readonly grade: Grade
  readonly key: KeyBase
}

const ENGINE = /^[a-z][a-z0-9-]*@[A-Za-z0-9][A-Za-z0-9._+-]*$/
const DRAWER = /^D-[0-9]{2}$/

const bandOf = (n: number | undefined): Band => (n === 2 ? 2 : n === 3 ? 3 : 1)

/** The event ref an answer is written under. */
function refOf(family: string, template: string, place: GeneratedItemProps['place']): string {
  return place !== undefined && DRAWER.test(place.page) ? `drawer:${place.page}/i${place.n}` : `item:${family}/${template}`
}

/** A uint32 from this tab's entropy; the seed itself is drawn by the framework from it. */
function entropy(): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] ?? 0
}

const minus = (n: number): string => (n < 0 ? `−${Math.abs(n)}` : String(n))

/** A state as the feedback prints it: a = 0, x = 1, a′ = −1, ok = true. */
export function showState(w: Json | undefined): string | undefined {
  if (typeof w !== 'object' || w === null || Array.isArray(w)) return undefined
  const parts = Object.entries(w).map(([k, v]) => `${k.replace(/'/g, '′')} = ${typeof v === 'number' ? minus(v) : String(v)}`)
  return parts.length === 0 ? undefined : parts.join(', ')
}

const kcName = (id: string): string | undefined => kcById(GRAPH, id)?.name

export function GeneratedItem(props: GeneratedItemProps) {
  const { family, template, store, events, place } = props
  const band = bandOf(props.band)
  const ref = refOf(family, template, place)
  const [draw, setDraw] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<Result | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | undefined>(undefined)
  const shownAt = useRef(0)
  // Submit disables itself while the checker runs and goes once it answers, which drops a keyboard user's focus to the
  // page: when the check settles, focus moves to the result (WCAG 2.4.3).
  const outcome = useRef<HTMLDivElement>(null)
  const submitted = useRef(false)
  useEffect(() => {
    if (busy || !submitted.current) return
    submitted.current = false
    const active = document.activeElement
    if (active === null || active === document.body) outcome.current?.focus()
  }, [busy])
  // The seeds already answered under this ref, read once per draw so a write does not redraw the item.
  const eventsRef = useRef(events)
  eventsRef.current = events

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    setPicked(undefined)
    setResult(undefined)
    setNote(undefined)
    const load = loadFamily(family)
    if (load === null) {
      setState({ status: 'absent' })
      return
    }
    void (async () => {
      try {
        const mod = await load
        if (!isLiveTemplate(mod, template)) {
          if (live) setState({ status: 'absent' })
          return
        }
        const taken = new Set((eventsRef.current ?? []).filter((e) => e.ref === ref && typeof e.seed === 'number').map((e) => e.seed as number))
        const seed = gradedSeed(entropy(), (s) => taken.has(s))
        const out = await drawInstance(mod.generator, portOf(mod), { seed, band, template, skip: (s) => taken.has(s) })
        if (!live) return
        if (out.status === 'exhausted') setState({ status: 'exhausted', tried: out.discarded.length })
        else {
          shownAt.current = performance.now()
          setState({ status: 'ready', drawn: { mod, instance: out.instance, seed: out.seed, redraws: out.discarded.length } })
        }
      } catch (e) {
        if (live) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    })()
    return () => {
      live = false
    }
  }, [family, template, band, ref, draw])

  // Draw another (or Draw again) goes with the old draw, which drops a keyboard user's focus to the page: once the new
  // draw is on screen, focus moves to the question (WCAG 2.4.3).
  const box = useRef<HTMLDivElement>(null)
  const redrawn = useRef(false)
  useEffect(() => {
    if (!redrawn.current || state.status === 'loading') return
    redrawn.current = false
    const active = document.activeElement
    if (active === null || active === document.body) box.current?.focus()
  }, [state])
  const again = (): void => {
    redrawn.current = true
    setDraw((n) => n + 1)
  }

  if (state.status === 'absent') {
    return (
      <div ref={box} tabIndex={-1} className="question question-generated no-margin" data-role={props.role}>
        {props.head}
        <p className="question-later">A fresh question is generated here for each learner. The generator for this question arrives in a later build.</p>
      </div>
    )
  }
  if (state.status !== 'ready') {
    return (
      <div ref={box} tabIndex={-1} className="question question-generated no-margin" data-role={props.role} aria-busy={state.status === 'loading'}>
        {props.head}
        {state.status === 'loading' ? <p className="question-later">Drawing a fresh question…</p> : null}
        {state.status === 'exhausted' ? (
          <p className="question-later">
            The checker could not settle the {state.tried} questions it drew this time, so none is shown.{' '}
            <button type="button" className="gen-link" onClick={again}>
              Draw again
            </button>
          </p>
        ) : null}
        {state.status === 'error' ? <p className="question-later">No question could be drawn: {state.message}</p> : null}
      </div>
    )
  }

  const { mod, instance, seed } = state.drawn
  const part = instance.item.parts.find((p): p is ChoicePart => p.kind === 'choice')
  const chance = chanceOf(instance.item)
  const primary = instance.kcs.primary
  const name = `gen-${family}-${template}-${place !== undefined ? `${place.page}-i${place.n}` : 'today'}`.replace(/[^A-Za-z0-9_-]/g, '-')
  const promptId = `${name}-prompt`
  const done = result !== undefined

  const submit = async (): Promise<void> => {
    if (picked === undefined || done || busy || part === undefined) return
    submitted.current = true
    setBusy(true)
    try {
      const port = portOf(mod)
      // The key, computed now by the family's checker; nothing about it was stored with the item.
      const key = await mod.generator.key(instance, port)
      if (isDiscard(key)) {
        setNote(`The checker could not settle this question now (${key.discard}), so it was not graded.`)
        return
      }
      const answer = { [part.id]: picked }
      const grade = await mod.generator.grade(instance, answer, key, port)
      setResult({ picked, grade, key })
      if (store === null || store === undefined) {
        setNote('This browser is not keeping your record, so the answer was not saved.')
        return
      }
      const fields = instanceEventFields(instance)
      const seen = (eventsRef.current ?? []).some((e) => e.ref === ref && e.seed === fields.seed)
      const engine = grade.engine ?? key.engine
      try {
        await store.record({
          kind: 'item',
          ref,
          seed: fields.seed,
          ...(ENGINE.test(engine) ? { engine } : {}),
          provenance: 'own',
          exposure: seen ? 'seen' : 'unseen',
          ...(grade.ok === null ? {} : { ok: grade.ok }),
          resp: { picked },
          ...(grade.ok === false && grade.misconception !== undefined ? { mis: grade.misconception } : {}),
          ...(props.itemRev !== undefined ? { itemRev: props.itemRev } : {}),
          ms: Math.max(0, Math.round(performance.now() - shownAt.current)),
          data: {
            ...(place !== undefined ? { page: place.page, item: `i${place.n}` } : {}),
            instance: fields.data.instance,
            kc: primary,
          },
        })
      } catch (e) {
        setNote(`The answer was not saved: ${e instanceof Error ? e.message : String(e)}`)
      }
    } catch (e) {
      setNote(`The question could not be graded: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const keyAnswer = result?.key.choices.find((c) => c.part === part?.id)?.answer
  const shown = done ? result.picked : picked
  return (
    <div ref={box} tabIndex={-1} className="question gen-item no-margin" data-role={props.role} data-family={family} data-template={template}>
      {props.head}
      <p className="gen-meta">
        <span>Drawn fresh for you</span>
        <span>
          {family} {template}, band {band}
        </span>
        <span>
          seed <code>{formatSeed(seed)}</code>
        </span>
        {chance !== 'none' ? <span>chance by guessing 1 in {chance.oneIn}</span> : null}
      </p>
      {kcName(primary) !== undefined ? (
        <p className="gen-kc">
          <span className="gen-kc-label">Skill</span> <InlineMd text={kcName(primary) as string} />
        </p>
      ) : null}
      {props.mode !== undefined && props.mode !== 'pick' ? <p className="gen-kc">This question will ask you to {props.mode} the query once that mode is built; for now you pick it.</p> : null}
      <div id={promptId} className="question-prompt">
        <Markdown md={instance.item.stem} />
        {part !== undefined ? <p className="gen-ask">{part.prompt}</p> : null}
      </div>
      {part !== undefined ? (
        <fieldset className="question-options" aria-labelledby={promptId} disabled={done || busy}>
          {part.options.map((o) => (
            <label key={o.id} className="question-option" data-picked={shown === o.id ? 'true' : undefined}>
              <input type="radio" name={name} value={o.id} checked={shown === o.id} onChange={() => setPicked(o.id)} />
              <span className="opt-id">{o.id}</span>
              <OptionText text={o.text} className="question-option-text" />
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="question-later">This question has a part this page cannot show yet.</p>
      )}
      {!done ? (
        <div className="actions">
          <button type="button" className="button button-primary" disabled={picked === undefined || busy} onClick={() => void submit()}>
            {busy ? 'Checking…' : 'Submit'}
          </button>
          {picked === undefined ? <span className="question-need">Pick an answer first.</span> : null}
        </div>
      ) : null}
      <div ref={outcome} role="status" aria-live="polite" tabIndex={-1}>
        {done && part !== undefined ? <Feedback result={result} part={part} keyAnswer={keyAnswer} /> : null}
        {note !== undefined ? <p className="question-note">{note}</p> : null}
      </div>
      {done || note !== undefined ? (
        <p className="actions">
          <button type="button" className="button button-secondary" onClick={again}>
            Draw another
          </button>
        </p>
      ) : null}
    </div>
  )
}

function Feedback({ result, part, keyAnswer }: { readonly result: Result; readonly part: ChoicePart; readonly keyAnswer: string | undefined }) {
  const { grade, key, picked } = result
  const extra = key as KeyBase & { readonly premise?: Json; readonly violation?: Json | null }
  const witness = grade.ok === false ? showState(grade.witness) : undefined
  const premise = showState(extra.premise)
  const verdict = grade.ok === null ? 'Not graded.' : grade.ok ? 'Your answer matched.' : 'Your answer missed.'
  return (
    <>
      <p className="question-result">
        <strong>{verdict}</strong> You answered {picked}
        {keyAnswer !== undefined ? `; the checker's answer is ${keyAnswer}.` : '.'}
        {grade.ok === null ? ` ${grade.why}` : ''}
      </p>
      <dl className="gen-facts">
        {witness !== undefined && keyAnswer !== undefined ? (
          <div>
            <dt>
              Where {picked} and {keyAnswer} differ
            </dt>
            <dd className="gen-formula">{witness}</dd>
          </div>
        ) : null}
        {premise !== undefined ? (
          <div>
            <dt>The premises can hold</dt>
            <dd className="gen-formula">{premise}</dd>
          </div>
        ) : null}
        {extra.violation !== undefined && keyAnswer !== undefined ? (
          <div>
            <dt>{keyAnswer} in the box</dt>
            <dd>
              {extra.violation === null ? (
                'unsat: no state in the box satisfies it, so nothing in the box violates the property'
              ) : (
                <>
                  sat, for example <span className="gen-formula">{showState(extra.violation)}</span>
                </>
              )}
            </dd>
          </div>
        ) : null}
        {grade.bound !== undefined ? (
          <div>
            <dt>Checked over</dt>
            <dd>{grade.bound}; nothing outside it</dd>
          </div>
        ) : null}
        <div>
          <dt>Checked by</dt>
          <dd>
            {grade.basis}
            {grade.engine !== undefined ? (
              <>
                {' '}
                (<code>{grade.engine}</code>)
              </>
            ) : null}
          </dd>
        </div>
      </dl>
      <div className="whys">
        <p className="whys-head">Every option, and why</p>
        <ul className="whys-list">
          {part.options.map((o) => (
            <li key={o.id} data-key={o.id === keyAnswer ? 'true' : undefined}>
              <p className="whys-option">
                <span className="opt-id">{o.id}.</span> <OptionText text={o.text} />
                {o.id === keyAnswer ? <span className="whys-key"> · the answer</span> : null}
              </p>
              <Markdown md={o.why} className="whys-why" />
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

/** Options that are formulas keep the code face; options written as words (a verdict, a prediction) read as prose, with `code` spans. */
function OptionText({ text, className }: { readonly text: string; readonly className?: string }) {
  const prose = text.includes('`') || /[A-Za-z]{3,} [A-Za-z]{2,} [A-Za-z]{2,}/.test(text)
  const cls = [className, prose ? 'gen-prose' : 'gen-formula'].filter(Boolean).join(' ')
  return <span className={cls}>{prose ? <InlineMd text={text} /> : text}</span>
}
