// Part B, defend (ASSESSMENT.md sections 6.1 to 6.3): predict what each seeded mutation does to your own lab artifact,
// with your agent closed, then run them on the Bench and bring the receipt back. A prediction is written first, as
// prove-it:S{n}/B/{attempt}/{mutant}, and is ungraded until the defend receipt reports the run; it scores when the
// verdict matches and, for a mutant a check rejects, the check matches. The comparison is made at read time
// (packages/learner/signoff) and never stored.

import { useState } from 'react'
import type { LedgerEvent } from '@statespace/ledger'
import type { DefendOutcome, PartAttempt, Prediction, Verdict } from '@statespace/learner/signoff'
import { defenceRef, predictionMatches, predictionOf } from '@statespace/learner/signoff'
import { keepReceipt } from '../../app/ledger.ts'
import { claimName } from '../../app/content.ts'
import { InlineMd } from '../../components/markdown/Markdown.tsx'
import type { LedgerStore } from '../../storage/index.ts'
import { importData, provenanceOf, readReceipt } from '../bench/receipt-model.ts'
import type { Mutant } from './sample.ts'

const VERDICT_TEXT: Record<Verdict, string> = {
  passes: 'It passes `statespace check`',
  rejects: 'It builds, and a check rejects it',
  'no-build': 'It does not build or elaborate',
}

const OUTCOME_TEXT: Record<Verdict, string> = { passes: 'passed `statespace check`', rejects: 'built, and a check rejected it', 'no-build': 'did not build' }

export interface PartBProps {
  readonly stage: string
  readonly lab: string | null
  readonly checks: readonly string[]
  readonly attempt: number
  readonly mutants: readonly Mutant[]
  readonly latest: PartAttempt | null
  readonly outcomes: ReadonlyMap<string, DefendOutcome>
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[]
}

export function PartB({ stage, lab, checks, attempt, mutants, outcomes, store, events }: PartBProps) {
  const ref = (id: string) => defenceRef(stage, 'B', attempt, id)
  const written = new Map(events.filter((e) => e.kind === 'prove-it').map((e) => [e.ref, e] as const))
  const all = mutants.every((m) => written.has(ref(m.id)))
  if (lab === null) return <p className="dfn-plain">This stage has no lab, so Part B has no artifact to mutate.</p>
  if (mutants.length === 0) return <p className="dfn-plain">The mutations for {lab} are not written yet. Part B opens once they are; the other parts are open now.</p>
  const labSlug = lab.toLowerCase().replace('-', '')
  return (
    <div className="dfn-partb">
      <ol className="dfn-mutants">
        {mutants.map((m, i) => (
          <li key={m.id}>
            <MutantRow n={i + 1} stage={stage} attempt={attempt} size={mutants.length} m={m} checks={checks} event={written.get(ref(m.id))} outcome={outcomes.get(`${stage}/${m.id}`)} store={store} />
          </li>
        ))}
      </ol>
      <section className="dfn-run" aria-labelledby="dfn-run-h">
        <h4 id="dfn-run-h" className="dfn-h4">
          Run them on your laptop
        </h4>
        {all ? (
          <p className="dfn-plain">Every prediction is written. Run the mutations on a copy of your repository, and bring back the receipt it writes.</p>
        ) : (
          <p className="dfn-plain">Write every prediction first. The run comes after, so it cannot inform them.</p>
        )}
        <pre className="dfn-cmd">
          <code>
            statespace defend {labSlug} --defence {stage} --attempt {attempt} --only {mutants.map((m) => m.id).join(',')}
          </code>
        </pre>
        <p className="dfn-note">The defend command arrives with the Bench's next build. Until then, a receipt with the same outcomes can be written by hand from each checker's own output.</p>
        <DefendImport stage={stage} lab={lab} store={store} disabled={!all} />
      </section>
    </div>
  )
}

function MutantRow({ n, stage, attempt, size, m, checks, event, outcome, store }: { readonly n: number; readonly stage: string; readonly attempt: number; readonly size: number; readonly m: Mutant; readonly checks: readonly string[]; readonly event: LedgerEvent | undefined; readonly outcome: DefendOutcome | undefined; readonly store: LedgerStore | null | undefined }) {
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [locus, setLocus] = useState('')
  const [help, setHelp] = useState(false)
  const [state, setState] = useState<'idle' | 'writing' | 'failed'>('idle')
  const saved = event !== undefined ? predictionOf(event) : undefined
  const name = `dfn-b-${attempt}-${m.id}`
  const blocked = verdict === null ? 'Pick what happens.' : verdict === 'rejects' && locus === '' ? 'Pick the check that rejects it.' : null

  const write = async () => {
    if (blocked !== null || verdict === null || store === null || store === undefined) return
    setState('writing')
    try {
      const seedArr = new Uint32Array(1)
      crypto.getRandomValues(seedArr)
      const resp: Prediction = verdict === 'rejects' ? { verdict, locus } : { verdict }
      await store.record({
        kind: 'prove-it',
        ref: defenceRef(stage, 'B', attempt, m.id),
        seed: seedArr[0] ?? 0,
        provenance: help ? 'assisted' : 'own',
        exposure: 'unseen',
        resp: { ...resp },
        data: { stage, part: 'B', attempt, index: m.id, size, ...(m.stage !== undefined ? { appliedTo: m.stage } : {}) },
      })
      setState('idle')
    } catch {
      setState('failed')
    }
  }

  const matched = saved !== undefined && outcome !== undefined ? predictionMatches(saved, outcome) : undefined
  return (
    <div className="question dfn-mutant">
      <h3 className="exercise-head">
        <span className="exercise-word">Mutation</span> <span className="exercise-n">B.{n}</span>{' '}
        <span className="exercise-role">
          · <code>{m.id}</code>
          {m.stage !== undefined ? ` · after ${m.stage}` : ''}
        </span>
      </h3>
      <p className="dfn-what">
        <InlineMd text={m.what} />
      </p>
      <p className="gen-ask">
        <InlineMd text={m.question} />
      </p>
      {saved === undefined ? (
        <>
          <fieldset className="question-options" disabled={state === 'writing'}>
            <legend className="visually-hidden">What happens</legend>
            {(['passes', 'rejects', 'no-build'] as const).map((v) => (
              <label key={v} className="question-option" data-picked={verdict === v ? 'true' : undefined}>
                <input type="radio" name={name} value={v} checked={verdict === v} onChange={() => setVerdict(v)} />
                <span className="opt-id" aria-hidden="true" />
                <span className="question-option-text">
                  <InlineMd text={VERDICT_TEXT[v]} />
                </span>
              </label>
            ))}
          </fieldset>
          {verdict === 'rejects' ? (
            <label className="dfn-locus">
              <span className="dfn-legend">At which check</span>
              <select value={locus} onChange={(e) => setLocus(e.target.value)}>
                <option value="">Choose a check</option>
                {checks.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="dfn-help">
            <input type="checkbox" checked={help} onChange={(e) => setHelp(e.target.checked)} /> I had help on this one (it is kept, and scores 0)
          </label>
          <div className="actions">
            <button type="button" className="button button-primary" disabled={blocked !== null || state === 'writing'} onClick={() => void write()}>
              Write the prediction
            </button>
            {blocked !== null ? <span className="question-need">{blocked}</span> : null}
            {state === 'failed' ? <span className="question-need">The prediction was not saved. Try again.</span> : null}
          </div>
        </>
      ) : (
        <div role="status" aria-live="polite" className="dfn-predicted">
          <p className="dfn-plain">
            You predicted: <InlineMd text={VERDICT_TEXT[saved.verdict]} />
            {saved.locus !== undefined ? <>, at <code>{saved.locus}</code></> : null}.
          </p>
          {outcome === undefined ? (
            <p className="dfn-note">Waiting for the run. The prediction is kept as written.</p>
          ) : (
            <>
              <p className="question-result">
                <strong>{matched ? 'Your prediction matched.' : 'Your prediction missed.'}</strong> On your artifact the mutant <InlineMd text={OUTCOME_TEXT[outcome.verdict]} />
                {outcome.locus !== undefined ? <>, at <code>{outcome.locus}</code></> : null}, as your receipt reports.
              </p>
              {m.reference !== undefined ? (
                <p className="dfn-note">
                  On the course's reference solution: <InlineMd text={m.reference} />
                </p>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Bring back the defend receipt: a receipt@1 whose `ext.defend` lists each mutant's outcome. */
function DefendImport({ stage, lab, store, disabled }: { readonly stage: string; readonly lab: string; readonly store: LedgerStore | null | undefined; readonly disabled: boolean }) {
  const [text, setText] = useState('')
  const [problems, setProblems] = useState<readonly string[]>([])
  const [done, setDone] = useState<string | null>(null)

  const take = async (raw: string) => {
    setDone(null)
    const read = readReceipt(raw, (t) => claimName(t) !== undefined)
    if (!read.ok) return setProblems(read.problems)
    const r = read.imported.receipt
    const ext = (r.ext ?? {}) as Record<string, unknown>
    const d = (ext.defend ?? {}) as Record<string, unknown>
    const out: string[] = []
    if (r.lab !== lab) out.push(`This receipt is for ${r.lab}; Part B here mutates ${lab}.`)
    if (d.stage !== stage) out.push(`The receipt has no defend run for ${stage} (ext.defend.stage).`)
    const mutants = Array.isArray(d.mutants) ? d.mutants.filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object' && typeof (m as Record<string, unknown>).id === 'string' && ['passes', 'rejects', 'no-build'].includes(String((m as Record<string, unknown>).verdict))) : []
    if (mutants.length === 0) out.push('The receipt lists no mutant outcomes (ext.defend.mutants).')
    if (out.length > 0) return setProblems(out)
    if (store === null || store === undefined) return setProblems(['This browser is not keeping your record, so the receipt cannot be kept.'])
    setProblems([])
    await keepReceipt(store, {
      sha256: read.imported.sha256,
      path: read.imported.path,
      text: raw,
      provenance: provenanceOf(r),
      // a defend run's checks ran on mutated copies, so they never stand for the lab's own checks
      data: { ...importData(read.imported), checks: [], defend: { stage, mutants: mutants.map((m) => ({ id: m.id, verdict: m.verdict, ...(typeof m.locus === 'string' ? { locus: m.locus } : {}) })) } },
    })
    setText('')
    setDone(`Kept: ${mutants.length} outcomes from ${read.imported.path}.`)
  }

  return (
    <div className="dfn-import">
      <label className="dfn-legend" htmlFor="dfn-receipt">
        The defend receipt
      </label>
      <textarea id="dfn-receipt" className="dfn-textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the receipt's JSON here" spellCheck={false} disabled={disabled} />
      <div className="actions">
        <button type="button" className="button button-primary" disabled={disabled || text.trim() === ''} onClick={() => void take(text)}>
          Read the receipt
        </button>
        <label className="button button-secondary dfn-file" aria-disabled={disabled || undefined}>
          Choose a file
          <input
            type="file"
            accept="application/json,.json"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f !== undefined) void f.text().then(take)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      <div role="status" aria-live="polite">
        {problems.length > 0 ? (
          <ul className="dfn-problems">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
        {done !== null ? <p className="dfn-plain">{done}</p> : null}
      </div>
    </div>
  )
}
