// One Part A probe (ASSESSMENT.md sections 6.1 and 6.2): a generated item at band 2 on a seed the record has never
// held, with a call before the answer. On Submit the family's checker computes the key in this page and grades the
// answer; the probe is written as probe:S{n}/A/{attempt}/{index}, with the call, the seed and the instance, so it can
// be regenerated anywhere. Nothing about the key is stored. The agent is closed: a learner who had help says so, and
// the probe is written as assisted, which scores 0.

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { GRAPH, kcById } from '@statespace/kc'
import type { LedgerEvent } from '@statespace/ledger'
import type { ChoicePart, Grade, InstanceBase, Json, KeyBase, TrueFalsePart } from '@statespace/generators/core'
import { chanceOf, drawInstance, formatSeed, gradedSeed, instanceEventFields, isDiscard } from '@statespace/generators/core'
import { defenceRef } from '@statespace/learner/signoff'
import type { LedgerStore } from '../../storage/index.ts'
import { InlineMd, Markdown } from '../../components/markdown/Markdown.tsx'
import { isLiveTemplate, loadFamily, portOf } from '../../components/generated/registry.ts'
import type { FamilyModule } from '../../components/generated/registry.ts'
import type { Slot } from './sample.ts'
import { takenSeeds } from './sample.ts'
import { CallTaps, type Conf } from './CallTaps.tsx'

const ENGINE = /^[a-z][a-z0-9-]*@[A-Za-z0-9][A-Za-z0-9._+-]*$/

export interface ProbeProps {
  readonly stage: string
  readonly attempt: number
  readonly size: number
  readonly slot: Slot
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[]
  /** Called before the probe is written, so the page keeps it in view with its feedback until Next. */
  readonly onAnswering: () => void
  readonly onDone: () => void
}

type Drawn = { readonly mod: FamilyModule; readonly instance: InstanceBase; readonly seed: number }
type State = { readonly status: 'loading' } | { readonly status: 'error'; readonly message: string } | { readonly status: 'ready'; readonly drawn: Drawn }

// Next probe and Draw another remove the button that was pressed, which drops a keyboard user's focus to the page. The
// button marks the hand-off; the probe (or the line that ends Part A) that is on screen next takes the focus (WCAG 2.4.3).
let probeHandoff = false

export function useProbeFocus<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!probeHandoff || ref.current === null) return
    const active = document.activeElement
    // the pressed button can outlive one render (Draw another redraws in place): wait while focus is still on it
    if (active !== null && active !== document.body && (ref.current.closest('.dfn-probe')?.contains(active) ?? false)) return
    probeHandoff = false
    if (active === null || active === document.body) ref.current.focus()
  })
  return ref
}

function entropy(): number {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] ?? 0
}

export function Probe({ stage, attempt, size, slot, store, events, onAnswering, onDone }: ProbeProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [draw, setDraw] = useState(0)
  const [choice, setChoice] = useState<string | undefined>(undefined)
  const [tf, setTf] = useState<Record<string, boolean>>({})
  const [conf, setConf] = useState<Conf | null>(null)
  const [help, setHelp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<{ grade: Grade; key: KeyBase } | undefined>(undefined)
  const shownAt = useRef(0)
  const eventsRef = useRef(events)
  eventsRef.current = events
  const headRef = useProbeFocus<HTMLHeadingElement>()
  // Submit disables itself while the checker runs; when it settles, focus moves to what it answered.
  const outcome = useRef<HTMLDivElement>(null)
  const submitted = useRef(false)
  useEffect(() => {
    if (busy || !submitted.current) return
    submitted.current = false
    const active = document.activeElement
    if (active === null || active === document.body) outcome.current?.focus()
  }, [busy])

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    setChoice(undefined)
    setTf({})
    setConf(null)
    setResult(undefined)
    setNote(undefined)
    const load = loadFamily(slot.family)
    if (load === null) {
      setState({ status: 'error', message: `this build has no generator for ${slot.family}` })
      return
    }
    void (async () => {
      try {
        const mod = await load
        if (!isLiveTemplate(mod, slot.template)) throw new Error(`${slot.family} ${slot.template} is not drawn in this build`)
        const taken = takenSeeds(eventsRef.current)
        const seed = gradedSeed(entropy(), (s) => taken.has(s))
        const out = await drawInstance(mod.generator, portOf(mod), { seed, band: 2, template: slot.template, skip: (s) => taken.has(s) })
        if (!live) return
        if (out.status === 'exhausted') throw new Error(`the checker could not settle the ${out.discarded.length} questions it drew`)
        shownAt.current = performance.now()
        setState({ status: 'ready', drawn: { mod, instance: out.instance, seed: out.seed } })
      } catch (e) {
        if (live) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    })()
    return () => {
      live = false
    }
  }, [slot.family, slot.template, draw])

  const head = (
    <h3 ref={headRef} tabIndex={-1} className="exercise-head">
      <span className="exercise-word">Probe</span> <span className="exercise-n">A.{slot.index}</span>{' '}
      <span className="exercise-role">
        · of {size}
        {slot.spiral ? ' · a return to an earlier stage' : ''}
      </span>
    </h3>
  )

  if (state.status !== 'ready') {
    return (
      <div className="question dfn-probe" aria-busy={state.status === 'loading'}>
        {head}
        {state.status === 'loading' ? <p className="question-later">Drawing a fresh question on a seed you have not met…</p> : null}
        {state.status === 'error' ? (
          <p className="question-later">
            No question could be drawn: {state.message}.{' '}
            <button
              type="button"
              className="gen-link"
              onClick={() => {
                probeHandoff = true
                setDraw((n) => n + 1)
              }}
            >
              Draw again
            </button>
          </p>
        ) : null}
      </div>
    )
  }

  const { mod, instance, seed } = state.drawn
  const parts = instance.item.parts
  const choicePart = parts.find((p): p is ChoicePart => p.kind === 'choice')
  const tfPart = choicePart === undefined ? parts.find((p): p is TrueFalsePart => p.kind === 'multi-tf') : undefined
  const chance = chanceOf(instance.item)
  const kcName = kcById(GRAPH, instance.kcs.primary)?.name
  const done = result !== undefined
  const answered = choicePart !== undefined ? choice !== undefined : tfPart !== undefined ? tfPart.statements.every((s) => typeof tf[s.id] === 'boolean') : false
  const blocked = !answered ? 'Answer first.' : conf === null ? 'Make your call: guess, think so or sure.' : null
  const name = `probe-${stage}-${attempt}-${slot.index}`

  const submit = async (): Promise<void> => {
    if (blocked !== null || done || busy || conf === null) return
    submitted.current = true
    setBusy(true)
    try {
      const port = portOf(mod)
      const key = await mod.generator.key(instance, port)
      if (isDiscard(key)) {
        setNote(`The checker could not settle this question now (${key.discard}), so it was not graded. Draw another.`)
        return
      }
      const answer: Record<string, Json> = choicePart !== undefined ? { [choicePart.id]: choice as string } : tfPart !== undefined ? { [tfPart.id]: tf } : {}
      const grade = await mod.generator.grade(instance, answer, key, port)
      onAnswering()
      setResult({ grade, key })
      if (store === null || store === undefined) {
        setNote('This browser is not keeping your record, so the probe was not saved.')
        return
      }
      const fields = instanceEventFields(instance)
      const engine = grade.engine ?? key.engine
      await store.record({
        kind: 'probe',
        ref: defenceRef(stage, 'A', attempt, slot.index),
        seed: fields.seed,
        ...(ENGINE.test(engine) ? { engine } : {}),
        provenance: help ? 'assisted' : 'own',
        exposure: 'unseen',
        ...(grade.ok === null ? {} : { ok: grade.ok }),
        conf,
        resp: answer,
        ...(grade.ok === false && grade.misconception !== undefined ? { mis: grade.misconception } : {}),
        ms: Math.max(0, Math.round(performance.now() - shownAt.current)),
        data: { stage, part: 'A', attempt, index: slot.index, size, family: slot.family, template: slot.template, band: 2, instance: fields.data.instance, kc: instance.kcs.primary, spiral: slot.spiral },
      })
    } catch (e) {
      setNote(`The probe was not saved: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const keyChoice = result?.key.choices.find((c) => c.part === choicePart?.id)?.answer
  const keyTruth = tfPart !== undefined ? result?.key.statements.find((s) => s.part === tfPart.id)?.truth : undefined

  return (
    <div className="question gen-item dfn-probe" data-family={slot.family} data-template={slot.template}>
      {head}
      <p className="gen-meta">
        <span>
          {slot.family} {slot.template}, band 2
        </span>
        <span>
          seed <code>{formatSeed(seed)}</code>, not met before
        </span>
        {chance !== 'none' ? <span>chance by guessing 1 in {chance.oneIn}</span> : null}
      </p>
      {kcName !== undefined ? (
        <p className="gen-kc">
          <span className="gen-kc-label">Skill</span> <InlineMd text={kcName} />
        </p>
      ) : null}
      <div id={`${name}-prompt`} className="question-prompt">
        <Markdown md={instance.item.stem} />
        {choicePart !== undefined ? <p className="gen-ask">{choicePart.prompt}</p> : tfPart !== undefined ? <p className="gen-ask">{tfPart.prompt}</p> : null}
      </div>
      {choicePart !== undefined ? (
        <fieldset className="question-options" aria-labelledby={`${name}-prompt`} disabled={done || busy}>
          {choicePart.options.map((o) => (
            <label key={o.id} className="question-option" data-picked={choice === o.id ? 'true' : undefined}>
              <input type="radio" name={name} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} />
              <span className="opt-id">{o.id}</span>
              <span className="question-option-text">
                <InlineMd text={o.text} />
              </span>
            </label>
          ))}
        </fieldset>
      ) : tfPart !== undefined ? (
        <fieldset className="dfn-tf" aria-labelledby={`${name}-prompt`} disabled={done || busy}>
          {tfPart.statements.map((s) => (
            <div key={s.id} className="dfn-tf-row">
              <p className="dfn-tf-text">
                <span className="opt-id">{s.id}</span> <InlineMd text={s.text} />
              </p>
              <div className="dfn-tf-pick" role="radiogroup" aria-label={`Statement ${s.id}`}>
                {([true, false] as const).map((v) => (
                  <label key={String(v)} className="dfn-tf-opt" data-picked={tf[s.id] === v || undefined}>
                    <input type="radio" name={`${name}-${s.id}`} checked={tf[s.id] === v} onChange={() => setTf((m) => ({ ...m, [s.id]: v }))} />
                    <span>{v ? 'true' : 'false'}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ) : (
        <p className="question-later">This question has a part this page cannot show yet.</p>
      )}
      {!done ? (
        <>
          <CallTaps name={`${name}-conf`} value={conf} onChange={setConf} disabled={busy} legend="Your call, before the checker answers" />
          <label className="dfn-help">
            <input type="checkbox" checked={help} onChange={(e) => setHelp(e.target.checked)} /> I had help on this one (it is kept, and scores 0)
          </label>
          <div className="actions">
            <button type="button" className="button button-primary" disabled={blocked !== null || busy} onClick={() => void submit()}>
              {busy ? 'Checking…' : 'Submit'}
            </button>
            {blocked !== null ? <span className="question-need">{blocked}</span> : null}
          </div>
        </>
      ) : null}
      <div ref={outcome} role="status" aria-live="polite" tabIndex={-1}>
        {done ? (
          <div className="dfn-result">
            <p className="question-result">
              <strong>{result.grade.ok === null ? 'Not graded.' : result.grade.ok ? 'Your answer matched.' : 'Your answer missed.'}</strong>{' '}
              {keyChoice !== undefined ? `The checker's answer is ${keyChoice}.` : ''}
              {keyTruth !== undefined
                ? `The checker's answers: ${Object.entries(keyTruth)
                    .map(([id, v]) => `${id} ${v ? 'true' : 'false'}`)
                    .join(', ')}.`
                : ''}{' '}
              {conf !== null ? `You called it ${conf === 'think' ? 'think so' : conf}.` : ''}
            </p>
            <dl className="gen-facts">
              {result.grade.bound !== undefined ? (
                <div>
                  <dt>Checked over</dt>
                  <dd>{result.grade.bound}; nothing outside it</dd>
                </div>
              ) : null}
              <div>
                <dt>Checked by</dt>
                <dd>
                  {result.grade.basis}
                  {result.grade.engine !== undefined ? (
                    <>
                      {' '}
                      (<code>{result.grade.engine}</code>)
                    </>
                  ) : null}
                </dd>
              </div>
            </dl>
            {choicePart !== undefined ? (
              <div className="whys">
                <p className="whys-head">Every option, and why</p>
                <ul className="whys-list">
                  {choicePart.options.map((o) => (
                    <li key={o.id} data-key={o.id === keyChoice ? 'true' : undefined}>
                      <p className="whys-option">
                        <span className="opt-id">{o.id}.</span> <InlineMd text={o.text} />
                        {o.id === keyChoice ? <span className="whys-key"> · the answer</span> : null}
                      </p>
                      <Markdown md={o.why} className="whys-why" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        {note !== undefined ? <p className="question-note">{note}</p> : null}
      </div>
      {done || note !== undefined ? (
        <p className="actions">
          {done ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                probeHandoff = true
                onDone()
              }}
            >
              Next probe
            </button>
          ) : (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                probeHandoff = true
                setDraw((n) => n + 1)
              }}
            >
              Draw another
            </button>
          )}
        </p>
      ) : null}
    </div>
  )
}
