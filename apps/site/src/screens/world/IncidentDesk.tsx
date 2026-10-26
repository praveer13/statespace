// One incident, panel by panel (docs/WORLD.md sections 4.3, 4.4 and 6.3): the Audit Desk's five steps with the world's
// tools in the middle. Step 1 calls the claim alone; step 2 reveals the change and lets the learner run it in the world
// (INS-interp on a state they pick) or, for a gap-class incident, run the shown component under this week's event,
// with raw outputs and no rule flags; step 3 says what it establishes; step 4 names the kind of gap with nothing
// chosen; step 5 anchors one to three lines. No reference module runs on the incident before filing: the key is
// computed by `keyOf` only once the finding is written (WORLD.md section 3.1, item 4).

import { useId, useMemo, useRef, useState } from 'react'
import type { LedgerEvent } from '@statespace/ledger'
import { deriveStamp } from '@statespace/stamps'
import type { Val } from '@statespace/interp'
import { acctName, acctVal, balanceOf, callText, grade, holdVal, intVal, keyOf, outcomeText, PROPOSALS, ruleById, runCall, runShownComponent, sampleStates, user, withCommands } from '@statespace/world'
import type { CheckResult, Grade, Incident, Key, World } from '@statespace/world'
import type { LedgerStore } from '../../storage/index.ts'
import { Stamp } from '../../components/stamp/index.ts'
import { CaseFigure } from '../audit/Figure.tsx'
import type { Confidence, Finding } from './model.ts'
import { countsByTruth, filingEvent, findingOf } from './model.ts'

export interface GapClass {
  readonly id: string
  readonly name: string
  readonly kind: 'rebutting' | 'undermining' | 'undercutting'
}

const TAPS: ReadonlyArray<readonly [Confidence, string, string]> = [
  ['guess', 'guess', 'below 67%'],
  ['think', 'think so', '67–80%'],
  ['sure', 'sure', 'above 80%'],
]
const CONF_WORD: Record<Confidence, string> = { guess: 'guess', think: 'think so', sure: 'sure' }
const KIND_HEAD = { rebutting: 'It attacks the claim', undermining: 'It attacks the evidence', undercutting: 'It attacks the step between' } as const

export const cardLabel = (inc: Incident): string => (inc.kind === 'proposal' ? 'An agent proposes a change' : 'This week in the world')

/** The texts a finding may anchor, by part: the claim, the offered evidence, the change, the batch. */
function partsOf(inc: Incident): { part: string; name: string; lines: readonly string[] }[] {
  if (inc.kind === 'proposal') {
    return [
      { part: 'claim', name: 'The claim', lines: [inc.claim] },
      { part: 'evidence', name: 'Offered evidence', lines: [inc.evidence] },
      { part: 'diff', name: 'The change', lines: inc.diff },
    ]
  }
  return [
    { part: 'claim', name: 'The claim', lines: [inc.claim] },
    { part: 'batch', name: 'The batch', lines: inc.batch.map((c, i) => `${i + 1}  ${c}`) },
    { part: 'diff', name: 'The checker shown, against the reference', lines: inc.diff },
  ]
}

// ------------------------------------------------------------------------------------------------ the world tool

/** "Run it in the world": the proposed command on a state the learner picks from the week, through INS-interp. */
function RunInWorld({ world, inc }: { readonly world: World; readonly inc: Extract<Incident, { kind: 'proposal' }> }) {
  const week = world.weeks.find((x) => x.input.k === inc.k)
  const states = useMemo(() => (week ? sampleStates(week.run) : []), [week])
  const users = world.standing.tenants.flatMap((t) => t.users)
  const [at, setAt] = useState(0)
  const [args, setArgs] = useState<string[]>(() => inc.command.params.map((p, i) => (p.ty === 'account' ? (users[i % users.length] ?? '') : p.ty === 'hold' ? '0' : '5')))
  const [out, setOut] = useState<{ text: string; outcome: string; changes: { acct: string; before: string; after: string }[] } | null>(null)
  if (week === undefined) return null
  const run = () => {
    const s = states[at]?.state ?? week.run.start
    const vals: Val[] = inc.command.params.map((p, i) => {
      const a = args[i] ?? ''
      if (p.ty === 'account') return acctVal(a === 'mint' || a === 'sink' ? { tag: a } : user(a))
      if (p.ty === 'hold') return holdVal(Number(a) || 0)
      return intVal(/^-?\d+$/.test(a.trim()) ? BigInt(a.trim()) : 0n)
    })
    const call = { name: inc.command.name, args: vals }
    const r = runCall(withCommands(week.program, [inc.command]), s, call)
    const names = new Set([...s.bals, ...r.after.bals].map((b) => acctName(b.acct)))
    const changes = [...names]
      .map((n) => {
        const a = n === 'mint' || n === 'sink' ? { tag: n } : n.startsWith('escrow ') ? { tag: 'escrow' as const, hold: Number(n.slice(7)) } : user(n)
        return { acct: n, before: balanceOf(s, a as never).toString(), after: balanceOf(r.after, a as never).toString() }
      })
      .filter((c) => c.before !== c.after)
    setOut({ text: callText(call), outcome: outcomeText(r.outcome), changes })
  }
  return (
    <div className="wtool">
      <p className="afield-legend">Run it in the world</p>
      <div className="wtool-row">
        <label className="wtool-field">
          <span>State</span>
          <select value={at} onChange={(e) => setAt(Number(e.target.value))}>
            {states.map((s, i) => (
              <option key={s.label} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {inc.command.params.map((p, i) => (
          <label key={p.name} className="wtool-field">
            <span>{p.name}</span>
            {p.ty === 'account' ? (
              <select value={args[i]} onChange={(e) => setArgs((a) => a.map((x, j) => (j === i ? e.target.value : x)))}>
                {[...users, 'mint', 'sink'].map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            ) : (
              <input inputMode="numeric" value={args[i]} onChange={(e) => setArgs((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
            )}
          </label>
        ))}
        <button type="button" className="button button-secondary" onClick={run}>
          Run {inc.command.name}
        </button>
      </div>
      <div aria-live="polite" className="wtool-out">
        {out === null ? (
          <p className="anote">INS-interp runs the proposed command on the state you pick. You see the outcome and the postings; the rules’ flags appear after you file.</p>
        ) : (
          <>
            <p>
              <code>{out.text}</code> · {out.outcome}
            </p>
            {out.changes.length > 0 ? (
              <table className="atable wtable">
                <caption className="visually-hidden">Balances the call changed</caption>
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col" className="num">
                      Before
                    </th>
                    <th scope="col" className="num">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {out.changes.map((c) => (
                    <tr key={c.acct}>
                      <th scope="row">{c.acct}</th>
                      <td className="num">{c.before}</td>
                      <td className="num">{c.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="anote">No balance changed.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** "Run it under this week's event": the shown checker on the batch, its raw outputs only. */
function RunShown({ world, inc }: { readonly world: World; readonly inc: Extract<Incident, { kind: 'gap' }> }) {
  const [rows, setRows] = useState<ReturnType<typeof runShownComponent> | null>(null)
  return (
    <div className="wtool">
      <p className="afield-legend">Run the checker shown under this week’s event</p>
      <button type="button" className="button button-secondary" onClick={() => setRows(runShownComponent(world, inc))}>
        Run it on the batch
      </button>
      <div aria-live="polite" className="wtool-out">
        {rows === null ? (
          <p className="anote">The checker shown runs in this tab on the batch, over a sample of this week’s states. Its outputs appear as a table, without the rules’ flags.</p>
        ) : (
          <table className="atable wtable">
            <caption>What the checker shown reports</caption>
            <thead>
              <tr>
                <th scope="col">Command</th>
                <th scope="col">It says</th>
                <th scope="col" className="num">
                  Runs
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.command}>
                  <th scope="row">{r.command}</th>
                  <td>{r.says}</td>
                  <td className="num">{r.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------------------------------------ the reveal

function verdictStamp(r: CheckResult) {
  if (r.verdict === 'refute' && r.witness) {
    const d = deriveStamp({ kind: 'clearinghouse-fires', rule: ruleById(r.witness.rule).text, witness: { length: 1, unit: 'calls' }, replay: 'replayed' }, { lane: 'rechecked-here', source: 'INS-interp' })
    return d.kind === 'stamp' ? <Stamp stamp={d.stamp} /> : null
  }
  if (r.verdict === 'admit') {
    const d = deriveStamp({ kind: 'clearinghouse-quiet', rule: 'every world rule', calls: r.runs }, { lane: 'rechecked-here', source: 'INS-interp' })
    return d.kind === 'stamp' ? <Stamp stamp={d.stamp} /> : null
  }
  if (r.verdict === 'statement-changed') {
    const d = deriveStamp({ kind: 'statement-hash-changed', path: 'the world’s pinned rules' }, { lane: 'rechecked-here', source: 'the pinned rule hashes' })
    return d.kind === 'stamp' ? <Stamp stamp={d.stamp} /> : null
  }
  return null
}

function verdictWords(r: CheckResult, label?: string): string {
  const who = label ?? r.command
  switch (r.verdict) {
    case 'admit':
      return `${who}: no rule fired over ${r.runs} runs on ${r.states} states, and the guard held on ${r.guardHeld ?? '?'} of them.`
    case 'vacuous':
      return `${who}: no rule fired over ${r.runs} runs, but the guard held on none of them. No premise witness, so it is refused.`
    case 'refute':
      return `${who}: a rule fires on ${r.witness?.call ?? 'a run'} from ${r.witness?.state ?? 'a sampled state'}.`
    case 'statement-changed':
      return `${who}: the change edits a pinned rule. Its hash moved from ${r.hashes?.pinned ?? ''} to ${r.hashes?.edited ?? ''}, so the check ran against a different rule and nothing ran.`
  }
}

function Witness({ r }: { readonly r: CheckResult }) {
  if (r.witness === null) return null
  return (
    <div className="wwit">
      <p className="afb-key">If admitted</p>
      <table className="atable wtable">
        <caption>
          {r.witness.call}, from {r.witness.state}
        </caption>
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col" className="num">
              Before
            </th>
            <th scope="col" className="num">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {r.witness.changes.map((c) => (
            <tr key={c.acct} className={c.acct === 'mint' && BigInt(c.after) < BigInt(c.before) ? 'wfire line-violation' : undefined}>
              <th scope="row">{c.acct}</th>
              <td className="num">{c.before}</td>
              <td className="num">{c.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="wfire-note">
        First step at which a rule fires: <strong>{ruleById(r.witness.rule).text}</strong>.
      </p>
    </div>
  )
}

function Reveal({ inc, finding, keyed: key, g, events }: { readonly inc: Incident; readonly finding: Finding; readonly keyed: Key; readonly g: Grade; readonly events: readonly LedgerEvent[] }) {
  const c = countsByTruth(events)
  const fam = inc.kind === 'proposal' ? PROPOSALS.find((p) => p.id === inc.family.id) : undefined
  return (
    <section className="afb wreveal" aria-label="After filing">
      <p className="afb-call" role="status">
        {g.callMatched ? 'Your call matched.' : 'Your call missed.'} You called it {finding.call === 'sound' ? 'sound' : 'a gap'} ({CONF_WORD[finding.conf]}); the reference pipeline keys it {key.truth}.
      </p>
      <p className="wcounts">
        In the Clearinghouse so far · sound: {c.soundAccepted} of {c.soundSeen} accepted · flawed: {c.flawedFound} of {c.flawedSeen} found, {c.flawedFull} with the right kind and evidence
      </p>
      <div className="wverdicts">
        <p className="afb-key">The reference pipeline</p>
        {inc.kind === 'proposal'
          ? key.reference.map((r, i) => (
              <div key={i} className="wverdict">
                <p>{verdictWords(r, inc.family.edits)}</p>
                {verdictStamp(r)}
                <Witness r={r} />
              </div>
            ))
          : key.reference.map((r, i) => (
              <div key={i} className="wverdict">
                <p>
                  {verdictWords(r, `Command ${i + 1}`)} The checker shown said: {key.shown?.[i]?.verdict === 'admit' ? 'admitted' : 'refused'}.
                </p>
              </div>
            ))}
        {inc.kind === 'gap' && key.bar ? (
          <p className="anote">
            The bar: {inc.family.bar} On this instance the naive version {key.bar.naiveMet ? 'met' : 'missed'} it and the reference {key.bar.referenceMet ? 'met' : 'missed'} it.
          </p>
        ) : null}
      </div>
      <div className="wverdicts">
        <p className="afb-key">The key</p>
        <p>
          {key.truth === 'sound' ? 'Sound: none.' : `A gap: ${key.primary}.`} {key.truth === 'flawed' ? inc.why : ''} Your answer: {finding.named === 'none' ? 'none: sound' : finding.named}
          {key.truth === 'flawed' ? ` · kind ${g.classRight ? 'matched' : 'missed'} · lines ${g.evidenceValid ? 'carry the gap' : 'miss the load-bearing line'}` : ''}.
        </p>
        <p className="anote">
          Scenarios: {g.restatementRight} of {g.restatementOf} as the world’s engine evaluates them.
        </p>
        <ol className="wscen-key">
          {inc.scenarios.map((s, i) => (
            <li key={s.id}>
              <code>{s.text}</code> · {key.answers[i] ? 'yes' : 'no'}
              {finding.scenarios[i] === key.answers[i] ? '' : ' (you said ' + (finding.scenarios[i] ? 'yes' : 'no') + ')'}
            </li>
          ))}
        </ol>
      </div>
      {inc.kind === 'gap' ? (
        <div className="wverdicts">
          <p className="afb-key">Your checker under the same event</p>
          <p>Your checker is not built yet (LAB-4). The reference module ran on this event after you filed, and earns nothing: it met the bar over {key.reference.reduce((t, r) => t + r.runs, 0)} runs.</p>
        </div>
      ) : null}
      {fam !== undefined ? (
        <div className="atwins">
          <p className="afb-key">The other member of the pair</p>
          <div className="atwins-grid">
            <CaseFigure n="A" part="diff" title={inc.member === 'sound' ? 'This change · sound' : 'This change · flawed'} lines={inc.member === 'sound' ? fam.sound.diff : fam.flawed.diff} />
            <CaseFigure n="B" part="diff" title={inc.member === 'sound' ? 'Its twin · flawed' : 'Its twin · sound'} lines={inc.member === 'sound' ? fam.flawed.diff : fam.sound.diff} />
          </div>
        </div>
      ) : null}
      {inc.kind === 'proposal' && inc.member === 'sound' && finding.named === 'none' ? <p className="wjoin">You admitted a sound change: it joins the world next week.</p> : null}
      {inc.kind === 'proposal' && inc.member === 'flawed' && finding.named === 'none' ? <p className="wjoin">You admitted a flawed change. It is replayed above and never adopted, so the world carries no known flaw forward.</p> : null}
      <p className="anote">
        This finding counts toward the Clearinghouse’s share of audit accuracy only when it is your own, unseen, and its kind of gap has been taught on your path. Nothing here moves a sign-off.
      </p>
    </section>
  )
}

// ------------------------------------------------------------------------------------------------ the desk

export interface IncidentDeskProps {
  readonly world: World
  readonly inc: Incident
  readonly n: number
  readonly size: number
  readonly classes: readonly GapClass[]
  readonly store: LedgerStore | null | undefined
  readonly events: readonly LedgerEvent[]
  readonly filed: LedgerEvent | undefined
  readonly firstContact: boolean
  readonly retired: boolean
}

export function IncidentDesk({ world, inc, n, size, classes, store, events, filed, firstContact, retired }: IncidentDeskProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const started = useRef(Date.now())
  const [call, setCall] = useState<'sound' | 'gap' | null>(null)
  const [conf, setConf] = useState<Confidence | null>(null)
  const [help, setHelp] = useState(false)
  const [called, setCalled] = useState(false)
  const [proves, setProves] = useState('')
  const [answers, setAnswers] = useState<Array<boolean | undefined>>(() => inc.scenarios.map(() => undefined))
  const [named, setNamed] = useState<string | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [filing, setFiling] = useState<'idle' | 'writing' | 'failed'>('idle')
  const [local, setLocal] = useState<{ finding: Finding; key: Key; g: Grade } | null>(null)

  const done = useMemo(() => {
    if (local !== null) return local
    if (filed === undefined) return null
    const finding = findingOf(filed)
    const key = keyOf(world, inc)
    return { finding, key, g: grade(key, finding) }
  }, [local, filed, world, inc])

  const scenariosDone = answers.every((a) => a !== undefined)
  const linesDone = named === 'none' || (lines.length >= 1 && lines.length <= 3)
  const blocked = named === null ? 'Choose a kind of gap, or none: sound.' : !scenariosDone ? `Answer every scenario in exercise ${n}.3.` : !linesDone ? `Anchor one to three lines in exercise ${n}.5.` : null

  const file = async () => {
    if (blocked !== null || call === null || conf === null || named === null || store === undefined) return
    const finding: Finding = { call, conf, proves: proves.trim(), scenarios: answers.map((a) => a === true), named, lines: named === 'none' ? [] : lines, help }
    setFiling('writing')
    // The key is computed here, after the finding is final, and the event is written with it.
    const key = keyOf(world, inc)
    const g = grade(key, finding)
    if (store !== null) {
      try {
        await store.record(filingEvent(inc, finding, key, g, { firstContact, size, ms: Date.now() - started.current, events }))
      } catch {
        setFiling('failed')
        return
      }
    }
    setLocal({ finding, key, g })
  }

  const toggleLine = (ref: string) => setLines((ls) => (ls.includes(ref) ? ls.filter((l) => l !== ref) : ls.length >= 3 ? ls : [...ls, ref]))
  const groups = (['rebutting', 'undermining', 'undercutting'] as const).map((k) => ({ k, classes: classes.filter((g) => g.kind === k) }))
  const parts = partsOf(inc)

  return (
    <article className="acase wcase" aria-labelledby={`${uid}-h`}>
      <header className="acase-head">
        <h2 id={`${uid}-h`} className="acase-title">
          <span className="acase-n">Incident {n}</span> {inc.subject}
        </h2>
        <p className="acase-meta">
          {cardLabel(inc)} · week {inc.k} · ledger
          {firstContact ? ' · first-contact practice' : ''}
        </p>
      </header>

      {done !== null ? (
        <Reveal inc={inc} finding={done.finding} keyed={done.key} g={done.g} events={events} />
      ) : retired ? (
        <p className="aplain">This incident was not filed before its week ended, so it was retired unscored. It counts toward nothing, and its seed is not reused.</p>
      ) : (
        <>
          <section className="ax" aria-labelledby={`${uid}-x1`}>
            <h3 id={`${uid}-x1`} className="exercise-head">
              <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.1</span> <span className="exercise-role">· Call the claim alone</span>
            </h3>
            {inc.kind === 'gap' ? (
              <p className="wevent">
                <span className="areq-key">This week in the world</span> {inc.family.event}
              </p>
            ) : null}
            <div className="aclaim">
              <p className="aclaim-who">
                {inc.kind === 'proposal' ? 'An agent proposes' : 'A claim about it'} <span className="aclaim-tag">{inc.kind === 'proposal' ? 'unreviewed' : 'under audit'}</span>
              </p>
              <blockquote className="aclaim-text">
                <p>“{inc.claim}”</p>
              </blockquote>
              {inc.kind === 'proposal' ? (
                <p className="woffered">
                  <span className="areq-key">Offered</span> “{inc.evidence}”
                </p>
              ) : null}
            </div>
            <fieldset className="afield" disabled={called}>
              <legend className="afield-legend">Sound or gap?</legend>
              <div className="arows">
                {(
                  [
                    ['sound', 'Sound: the claim holds as stated'],
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
                <input type="checkbox" checked={help} onChange={(e) => setHelp(e.target.checked)} /> I had help with this incident
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
              <section className="ax" aria-labelledby={`${uid}-x2`}>
                <h3 id={`${uid}-x2`} className="exercise-head">
                  <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.2</span> <span className="exercise-role">· Read the change, and run it</span>
                </h3>
                {inc.kind === 'gap' ? <CaseFigure n={`${n}.1`} part="statement" title="The batch · three proposed commands" lines={inc.batch.map((c, i) => `${i + 1}  ${c}`)} /> : null}
                <CaseFigure n={`${n}.2`} part="diff" title={inc.kind === 'proposal' ? 'Change · the agent’s diff, toy syntax' : 'The checker shown, against the reference'} lines={inc.diff} />
                {inc.kind === 'proposal' ? <RunInWorld world={world} inc={inc} /> : <RunShown world={world} inc={inc} />}
                <div className="wtool">
                  <p className="afield-legend">Run your checker</p>
                  <p className="anote">Your checker is not built yet (LAB-4). The course’s reference checker runs only after you file, so the key never shows before your finding.</p>
                </div>
                <p className="anote">Nothing is stamped yet. A stamp appears only once you file.</p>
              </section>

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
                  <legend className="afield-legend">Which of these does the world’s engine say is so?</legend>
                  <table className="ascen">
                    <thead>
                      <tr>
                        <th scope="col">Scenario</th>
                        <th scope="col">Yes</th>
                        <th scope="col">No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inc.scenarios.map((s, i) => (
                        <tr key={s.id}>
                          <th scope="row">
                            <code>{s.text}</code>
                          </th>
                          {([true, false] as const).map((v) => (
                            <td key={String(v)}>
                              <label className="ayn">
                                <input type="radio" name={`${uid}-s${i}`} checked={answers[i] === v} onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))} aria-label={`${s.text}: ${v ? 'yes' : 'no'}`} />
                              </label>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="anote">
                    {inc.scenarios.length} scenarios · all by guessing: 1 in {2 ** inc.scenarios.length}
                  </p>
                </fieldset>
              </section>

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
                    {groups.map(({ k, classes: cs }) => (
                      <div key={k} className="akind" role="group" aria-label={KIND_HEAD[k]}>
                        <p className="akind-head">{KIND_HEAD[k]}</p>
                        {cs.map((g) => (
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

              <section className="ax" aria-labelledby={`${uid}-x5`}>
                <h3 id={`${uid}-x5`} className="exercise-head">
                  <span className="exercise-word">Exercise</span> <span className="exercise-n">{n}.5</span> <span className="exercise-role">· Point at the lines</span>
                </h3>
                {named === null ? (
                  <p className="anote">Name a kind of gap first, or none: sound.</p>
                ) : named === 'none' ? (
                  <p className="aplain">A sound finding’s evidence is what you said it establishes, in exercise {n}.3. There are no lines to anchor.</p>
                ) : (
                  <fieldset className="afield">
                    <legend className="afield-legend">Select one to three lines that carry the gap ({lines.length} of 3 chosen).</legend>
                    {parts.map(({ part, name, lines: ls }) => (
                      <div key={part} className="apick" role="group" aria-label={name}>
                        <p className="akind-head">{name}</p>
                        {ls.map((text, i) => {
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
                    ))}
                  </fieldset>
                )}
              </section>

              <div className="aact afile">
                <button type="button" className="button button-primary" disabled={blocked !== null || filing === 'writing' || store === undefined} onClick={() => void file()}>
                  File this finding
                </button>
                <p className="anote" role="status">
                  {filing === 'failed' ? 'The finding could not be written to this browser’s record. Try again.' : store === null ? 'This browser keeps no record, so the finding is graded here and not kept.' : (blocked ?? '')}
                </p>
              </div>
            </>
          ) : null}
        </>
      )}
    </article>
  )
}
