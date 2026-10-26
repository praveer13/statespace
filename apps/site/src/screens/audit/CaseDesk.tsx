// One case at the Desk: the five steps of docs/AUDIT-DESK.md section 5.4, in order, each an exercise under a 3-px ink
// rule. Call the statement alone (the call is final once recorded); read the change; say what the statement
// establishes; name the kind of gap, with nothing chosen for you; anchor the evidence to one to three lines. Filing
// writes one audit event (record.ts). The key, the pair and the "based on" card come after filing (Feedback.tsx).

import { useId, useRef, useState } from 'react'
import type { LedgerEvent } from '@statespace/ledger'
import type { LedgerStore } from '../../storage/index.ts'
import type { AuditAnchor, AuditCase, AuditPool, TextPart } from './pool.ts'
import { mediumName, PART_NAME, stageInk } from './pool.ts'
import { CaseFigure } from './Figure.tsx'
import type { Confidence, Finding, Graded, Sitting } from './record.ts'
import { auditEvent, grade } from './record.ts'

const TAPS: ReadonlyArray<readonly [Confidence, string, string]> = [
  ['guess', 'guess', 'below 67%'],
  ['think', 'think so', '67–80%'],
  ['sure', 'sure', 'above 80%'],
]
const CONF_WORD: Record<Confidence, string> = { guess: 'guess', think: 'think so', sure: 'sure' }
const KIND_HEAD = { rebutting: 'It attacks the claim', undermining: 'It attacks the evidence', undercutting: 'It attacks the step between' } as const

export interface CaseDeskProps {
  readonly pool: AuditPool
  readonly anchor: AuditAnchor
  readonly c: AuditCase
  /** The case's number on this screen: "3" in a session, "1" for a case opened on its own. */
  readonly n: number
  readonly sitting: Sitting
  readonly seed: number | null
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[]
  readonly onFiled: (finding: Finding, graded: Graded) => void
}

export function CaseDesk({ pool, anchor, c, n, sitting, seed, store, events, onFiled }: CaseDeskProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const started = useRef(Date.now())
  const [call, setCall] = useState<'sound' | 'gap' | null>(null)
  const [conf, setConf] = useState<Confidence | null>(null)
  const [help, setHelp] = useState(false)
  const [called, setCalled] = useState(false)
  const [proves, setProves] = useState('')
  const [answers, setAnswers] = useState<Array<boolean | undefined>>(() => c.restatement.scenarios.map(() => undefined))
  const [named, setNamed] = useState<string | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [filing, setFiling] = useState<'idle' | 'writing' | 'failed'>('idle')

  const scenariosDone = answers.every((a) => a !== undefined)
  const linesDone = named === 'none' || (lines.length >= 1 && lines.length <= 3)
  const blocked = named === null ? 'Choose a kind of gap, or none: sound.' : !scenariosDone ? 'Answer every scenario in exercise 3.' : !linesDone ? 'Anchor one to three lines in exercise 5.' : null

  const file = async () => {
    if (blocked !== null || call === null || conf === null || named === null || store === undefined) return
    const finding: Finding = { call, conf, proves: proves.trim(), scenarios: answers.map((a) => a === true), named, lines: named === 'none' ? [] : lines, help }
    const graded = grade(c, finding)
    if (store !== null) {
      setFiling('writing')
      try {
        await store.record(auditEvent(c, finding, graded, sitting, seed, Date.now() - started.current, events))
      } catch {
        setFiling('failed')
        return
      }
    }
    onFiled(finding, graded)
  }

  const toggleLine = (ref: string) => setLines((ls) => (ls.includes(ref) ? ls.filter((l) => l !== ref) : ls.length >= 3 ? ls : [...ls, ref]))
  const groups = (['rebutting', 'undermining', 'undercutting'] as const).map((k) => ({ k, classes: pool.classes.filter((g) => g.kind === k) }))
  const runOf = (id: string) => pool.runs[id]

  return (
    <article className="acase" style={{ ['--vol' as string]: stageInk(anchor.stage) }} aria-labelledby={`${uid}-h`}>
      <header className="acase-head">
        <h2 id={`${uid}-h`} className="acase-title">
          <span className="acase-n">{sitting.id === 'open' ? 'The case' : `Case ${n}`}</span> {anchor.subject}
        </h2>
        <p className="acase-meta">
          <span className="stage-chip" aria-hidden="true" />
          {anchor.stage} · {mediumName(c.medium)}
        </p>
      </header>

      {/* 1. Call the statement alone */}
      <section className="ax" aria-labelledby={`${uid}-x1`}>
        <h3 id={`${uid}-x1`} className="exercise-head">
          <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.1</span> <span className="exercise-role">· Call the statement alone</span>
        </h3>
        <div className="aclaim">
          <p className="aclaim-who">
            The agent says <span className="aclaim-tag">unreviewed</span>
          </p>
          <blockquote className="aclaim-text">
            <p>“{c.claim}”</p>
          </blockquote>
        </div>
        <div className="areq">
          <p className="areq-key">The requirement</p>
          <p className="areq-text">{anchor.requirement}</p>
        </div>
        <CaseFigure n={`${n}.1`} part="statement" title={`Statement · ${mediumName(c.medium)}`} lines={c.statement} />
        <fieldset className="afield" disabled={called}>
          <legend className="afield-legend">Does the statement justify the claim?</legend>
          <div className="arows">
            {(
              [
                ['sound', 'Sound: the statement justifies the claim'],
                ['gap', 'A gap: it does not'],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="arow" data-picked={call === v || undefined}>
                <input type="radio" name={`${uid}-call`} value={v} checked={call === v} onChange={() => setCall(v)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="anote">2 options · chance 1 in 2</p>
          {call !== null ? (
            <>
              <p className="afield-sub" id={`${uid}-conf`}>
                How likely is your call right?
              </p>
              <div className="ataps" role="radiogroup" aria-labelledby={`${uid}-conf`}>
                {TAPS.map(([v, word, band]) => (
                  <label key={v} className="atap" data-picked={conf === v || undefined}>
                    <input type="radio" name={`${uid}-conf`} value={v} checked={conf === v} onChange={() => setConf(v)} />
                    <span className="atap-word">{word}</span>
                    <span className="atap-band">{band}</span>
                  </label>
                ))}
              </div>
              <p className="anote">Feedback only, never credit: guess +1 / 0 · think so +2 / −2 · sure +3 / −6.</p>
            </>
          ) : null}
          <label className="ahelp">
            <input type="checkbox" checked={help} onChange={(e) => setHelp(e.target.checked)} /> I had help with this case
          </label>
        </fieldset>
        {called ? (
          <p className="adone" role="status">
            Recorded: {call === 'sound' ? 'sound' : 'a gap'} · {conf === null ? '' : CONF_WORD[conf]}. Only this first call counts.
          </p>
        ) : (
          <div className="aact">
            <button type="button" className="button button-primary" disabled={call === null || conf === null} onClick={() => setCalled(true)}>
              Record my call and show the change
            </button>
            {call === null || conf === null ? <p className="anote">Make a call and choose how sure you are.</p> : null}
          </div>
        )}
      </section>

      {called ? (
        <>
          {/* 2. Reveal the change */}
          <section className="ax" aria-labelledby={`${uid}-x2`}>
            <h3 id={`${uid}-x2`} className="exercise-head">
              <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.2</span> <span className="exercise-role">· Read the change</span>
            </h3>
            <div className="aclaim">
              <p className="aclaim-who">
                The agent says <span className="aclaim-tag">unreviewed</span>
              </p>
              <blockquote className="aclaim-text">
                <p>“{c.description}”</p>
              </blockquote>
            </div>
            <CaseFigure n={`${n}.2`} part="diff" title="Change · the agent’s diff" lines={c.diff} />
            {c.receipt.length > 0 ? (
              <CaseFigure
                n={`${n}.3`}
                part="receipt"
                title={`Receipt · ${runOf(c.receiptRun)?.engine ?? ''} ${runOf(c.receiptRun)?.version ?? ''} · recorded run`.replace(/\s+/g, ' ')}
                lane={c.receiptRun}
                lines={c.receipt}
              />
            ) : null}
            <p className="anote">Nothing is stamped yet. A stamp appears only once you file.</p>
          </section>

          {/* 3. This proves: ___ */}
          <section className="ax" aria-labelledby={`${uid}-x3`}>
            <h3 id={`${uid}-x3`} className="exercise-head">
              <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.3</span> <span className="exercise-role">· Say what it establishes</span>
            </h3>
            <label className="aproves">
              <span className="aproves-key">This proves:</span>
              <input type="text" value={proves} onChange={(e) => setProves(e.target.value)} autoComplete="off" spellCheck />
            </label>
            <p className="anote">One line in your own words. It stays on this device and is never graded.</p>
            <fieldset className="afield">
              <legend className="afield-legend">{anchor.scenarioQuestion}</legend>
              <table className="ascen">
                <thead>
                  <tr>
                    <th scope="col">Scenario</th>
                    <th scope="col">Yes</th>
                    <th scope="col">No</th>
                  </tr>
                </thead>
                <tbody>
                  {c.restatement.scenarios.map((s, i) => (
                    <tr key={s.id}>
                      <th scope="row">
                        <code>{s.text}</code>
                      </th>
                      {([true, false] as const).map((v) => (
                        <td key={String(v)}>
                          <label className="ayn">
                            <input
                              type="radio"
                              name={`${uid}-s${i}`}
                              checked={answers[i] === v}
                              onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                              aria-label={`${s.text}: ${v ? 'yes' : 'no'}`}
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="anote">
                {c.restatement.scenarios.length} scenarios · all by guessing: 1 in {2 ** c.restatement.scenarios.length}
              </p>
            </fieldset>
          </section>

          {/* 4. The kind of gap */}
          <section className="ax" aria-labelledby={`${uid}-x4`}>
            <h3 id={`${uid}-x4`} className="exercise-head">
              <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.4</span> <span className="exercise-role">· Name the kind of gap</span>
            </h3>
            <fieldset className="afield">
              <legend className="afield-legend">Which kind of gap does the claim have, if any? Nothing is chosen for you.</legend>
              <div className="arows">
                <label className="arow arow-none" data-picked={named === 'none' || undefined}>
                  <input type="radio" name={`${uid}-class`} value="none" checked={named === 'none'} onChange={() => setNamed('none')} />
                  <span>None: sound</span>
                </label>
              </div>
              <div className="akinds">
                {groups.map(({ k, classes }) => (
                  <div key={k} className="akind" role="group" aria-label={KIND_HEAD[k]}>
                    <p className="akind-head">{KIND_HEAD[k]}</p>
                    {classes.map((g) => (
                      <label key={g.id} className="arow" data-picked={named === g.id || undefined}>
                        <input type="radio" name={`${uid}-class`} value={g.id} checked={named === g.id} onChange={() => setNamed(g.id)} />
                        <span>
                          <code className="aclass-id">{g.id}</code> {g.name}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </fieldset>
          </section>

          {/* 5. Anchor the evidence */}
          <section className="ax" aria-labelledby={`${uid}-x5`}>
            <h3 id={`${uid}-x5`} className="exercise-head">
              <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.5</span> <span className="exercise-role">· Point at the lines</span>
            </h3>
            {named === null ? (
              <p className="anote">Name a kind of gap first, or none: sound.</p>
            ) : named === 'none' ? (
              <p className="aplain">A sound case’s evidence is what you said it establishes, in exercise {n}.3. There are no lines to anchor.</p>
            ) : (
              <fieldset className="afield">
                <legend className="afield-legend">Select one to three lines that carry the gap ({lines.length} of 3 chosen).</legend>
                {(['statement', 'diff', 'receipt'] as const satisfies readonly TextPart[]).map((part) =>
                  c[part].length === 0 ? null : (
                    <div key={part} className="apick" role="group" aria-label={PART_NAME[part]}>
                      <p className="akind-head">{PART_NAME[part]}</p>
                      {c[part].map((text, i) => {
                        if (text.trim() === '') return null
                        const ref = `${part}:${i + 1}`
                        const on = lines.includes(ref)
                        return (
                          <label key={ref} className="apick-row" data-picked={on || undefined}>
                            <input type="checkbox" checked={on} disabled={!on && lines.length >= 3} onChange={() => toggleLine(ref)} />
                            <span className="apick-ln">{i + 1}</span>
                            <code>{text}</code>
                          </label>
                        )
                      })}
                    </div>
                  ),
                )}
              </fieldset>
            )}
          </section>

          <div className="aact afile">
            <button type="button" className="button button-primary" disabled={blocked !== null || filing === 'writing' || store === undefined} onClick={() => void file()}>
              File this finding
            </button>
            <p className="anote" role="status">
              {filing === 'failed'
                ? 'The finding could not be written to this browser’s record. Try again.'
                : store === null
                  ? 'This browser keeps no record, so the finding is graded here and not kept.'
                  : (blocked ?? '')}
            </p>
          </div>
        </>
      ) : null}
    </article>
  )
}
