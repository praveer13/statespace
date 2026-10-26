// A game for S7.L5, after "Two runs, one difference": send one request from frank to W0 and to a copy of W0 with one
// change to Birch's private data, and find a pair frank tells apart. Each run is checked alone by the monitor (check A,
// which always passes here) and the two together by comparing frank's responses (check B). "Show me" runs every pair
// in the toy's small menu for the chosen view and lists the ones that differ. Everything is computed in the page.

import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { CHANGES, VIEWS, W0, FRANK, applyChange, argsFor, canread, leaks, menuSize, runPair } from './model.ts'
import type { Change, PairResult, ViewId, World } from './model.ts'
import './pairs.css'

const viewOf = (id: ViewId) => VIEWS.find((v) => v.id === id) ?? VIEWS[0]!
const changeOf = (id: Change) => CHANGES.find((c) => c.id === id) ?? CHANGES[0]!

function callText(view: ViewId, arg: string): string {
  return viewOf(view).kind === 'open' ? `Open(frank, ${arg})` : `CreateDoc(frank, Growth, "${arg}")`
}

interface Ran {
  readonly view: ViewId
  readonly arg: string
  readonly change: Change
  readonly result: PairResult
  readonly n: number
}

function WorldList({ world, change, side }: { readonly world: World; readonly change: Change; readonly side: 'left' | 'right' }) {
  const ids = [...new Set([...W0.map((d) => d.id), ...world.map((d) => d.id)])]
  return (
    <ul className="tp-world" aria-label={side === 'left' ? 'Documents in W0' : `Documents in ${changeOf(change).right}`}>
      {ids.map((id) => {
        const d = world.find((x) => x.id === id) ?? W0.find((x) => x.id === id)
        if (d === undefined) return null
        const present = world.some((x) => x.id === id)
        const changed =
          side === 'right' &&
          ((change === 'no-memo' && id === 'layoffs-memo') || (change === 'memo-body' && id === 'layoffs-memo') || (change === 'budget' && id === 'budget'))
        const note = !present ? 'absent' : changed && change === 'memo-body' ? 'body differs' : changed ? 'added' : null
        const readable = present && canread(d, FRANK)
        return (
          <li key={id} className="tp-doc" data-changed={changed ? 'true' : undefined} data-absent={present ? undefined : 'true'}>
            <svg className="tp-mark" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
              {changed ? (
                <rect className="tp-mark-changed" x={-5} y={-5} width={10} height={10} />
              ) : readable ? (
                <circle className="tp-mark-read" r={4.5} />
              ) : (
                <circle className="tp-mark-hidden" r={4} />
              )}
            </svg>
            <code className="tp-doc-id">{id}</code>
            <span className="tp-doc-owner">
              {d.team}, {d.tenant}
              {readable ? ', frank may read' : ''}
            </span>
            {note !== null ? <span className="tp-doc-note">{note}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

function sayPair(view: ViewId, arg: string, change: Change, r: PairResult): ReactNode {
  const call = callText(view, arg)
  if (r.equal)
    return (
      <>
        <strong>Equal: frank cannot tell these two worlds apart with this request.</strong> Both runs answer{' '}
        <code>{r.left.text}</code>, and the monitor passed on each. Try another request or another change.
      </>
    )
  return (
    <>
      <strong>Told apart.</strong> The monitor passed on each run alone, and still <code>{call}</code> answers{' '}
      <code>{r.left.text}</code> in W0 and <code>{r.right.text}</code> in {changeOf(change).right}. The worlds differ only in
      Birch&apos;s private data, so this pair is a witness that frank&apos;s responses depend on it.
    </>
  )
}

/** Why a view does or does not tell the worlds apart, in the lesson's words. */
const REASON: Record<ViewId, string> = {
  'open-v0':
    'Version 0 has two refusals: forbidden when the document exists and frank may not read it, not_found when it does not exist. Which one he gets depends on whether Birch holds the id, and no page ever reaches him.',
  'open-v1':
    'Version 1 gives one answer to both refusals, so a document frank may not read looks the same as a missing one, and nothing in his response reads Birch\'s private data.',
  'create-global':
    'The slug check reads every tenant, so whether frank\'s insert succeeds depends on whether Birch already holds the slug.',
  'create-tenant':
    "The slug check reads only Acme's documents, so Birch's documents never change frank's outcome.",
}

export default function PairGame() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [view, setView] = useState<ViewId>('open-v0')
  const [arg, setArg] = useState<string>('roadmap')
  const [change, setChange] = useState<Change>('memo-body')
  const [ran, setRan] = useState<readonly Ran[]>([])
  const [status, setStatus] = useState<ReactNode>('Choose a view, a request and a change, then run the pair.')

  const args = argsFor(view)
  const current = ran.length > 0 ? ran[ran.length - 1] : undefined
  const fresh = current !== undefined && current.view === view && current.arg === arg && current.change === change
  const right = applyChange(W0, change)

  const pickView = (v: ViewId): void => {
    setView(v)
    const next = argsFor(v)
    if (!next.includes(arg)) setArg(next[0]!)
  }

  const runIt = (): void => {
    const result = runPair(view, arg, change)
    setRan((rs) => [...rs.slice(-7), { view, arg, change, result, n: (rs[rs.length - 1]?.n ?? 0) + 1 }])
    setStatus(sayPair(view, arg, change, result))
  }

  const showMe = (): void => {
    const found = leaks(view)
    const size = menuSize(view)
    const first = found[0]
    if (first === undefined) {
      setStatus(
        <>
          <strong>No pair in this menu is told apart.</strong> The page ran all {size} pairs for {viewOf(view).label}: every request
          against every change, and frank&apos;s two responses were equal each time. That covers this menu of {args.length} requests
          and {CHANGES.length} changes only, not every world. {REASON[view]}
        </>,
      )
      return
    }
    setArg(first.arg)
    setChange(first.change)
    const result = runPair(view, first.arg, first.change)
    setRan((rs) => [...rs.slice(-7), { view, arg: first.arg, change: first.change, result, n: (rs[rs.length - 1]?.n ?? 0) + 1 }])
    setStatus(
      <>
        <strong>Here is one:</strong> <code>{callText(view, first.arg)}</code> answers <code>{result.left.text}</code> in W0 and{' '}
        <code>{result.right.text}</code> in {changeOf(first.change).right}. Of the {size} pairs in this menu, {found.length} are told
        apart:{' '}
        {found.map((f, i) => (
          <span key={`${f.arg}-${f.change}`}>
            {i > 0 ? (i === found.length - 1 ? ' and ' : ', ') : ''}
            <code>{f.arg}</code> with &ldquo;{changeOf(f.change).label}&rdquo;
          </span>
        ))}
        . The monitor passed on every run. {REASON[view]}
      </>,
    )
  }

  const shown = fresh ? current.result : null

  return (
    <ToyFrame
      title="Tell frank's two worlds apart"
      kind="Game"
      caption={
        <>
          The page runs each view on W0 and on one changed copy, all in this tab; no solver or checker runs here. Every change in the menu
          touches only Birch&apos;s private data, so every pair is related. &ldquo;Show me&rdquo; covers this menu of requests and
          changes only, not every world or every view.
        </>
      }
    >
      <p className="toy-goal">Goal: find a request and a change to Birch&apos;s private data that give frank two different responses.</p>

      <fieldset className="toy-choice">
        <legend>The view</legend>
        {VIEWS.map((v) => (
          <label key={v.id}>
            <input type="radio" name={`${uid}-view`} checked={view === v.id} onChange={() => pickView(v.id)} />
            <span>{v.label}</span>
          </label>
        ))}
      </fieldset>
      <pre className="tp-code" tabIndex={0} aria-label={`${viewOf(view).label}, as code`}>
        <code>{viewOf(view).code}</code>
      </pre>

      <form
        className="toy-controls tp-controls"
        onSubmit={(e) => {
          e.preventDefault()
          runIt()
        }}
      >
        <label className="toy-field">
          <span className="toy-field-name">frank sends</span>
          <select className="tp-select" value={arg} onChange={(e) => setArg(e.target.value)}>
            {args.map((a) => (
              <option key={a} value={a}>
                {callText(view, a)}
              </option>
            ))}
          </select>
        </label>
        <label className="toy-field">
          <span className="toy-field-name">Run 2 changes</span>
          <select className="tp-select" value={change} onChange={(e) => setChange(e.target.value as Change)}>
            {CHANGES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="toy-actions">
          <button type="submit" className="toy-button" data-primary="true">
            Run the pair
          </button>
          <button type="button" className="toy-button" onClick={showMe}>
            Show me
          </button>
        </div>
      </form>

      <p className="toy-status" aria-live="polite">
        {status}
      </p>

      <div className="tp-pair">
        {(['left', 'right'] as const).map((side) => {
          const r = shown === null ? null : side === 'left' ? shown.left : shown.right
          const monitor = shown === null ? null : side === 'left' ? shown.monitorLeft : shown.monitorRight
          return (
            <section key={side} className="tp-run" aria-label={side === 'left' ? 'Run 1, in W0' : `Run 2, in ${changeOf(change).right}`}>
              <p className="tp-run-head">
                <span className="tp-run-n">Run {side === 'left' ? 1 : 2}</span> {side === 'left' ? 'W0' : changeOf(change).right}
              </p>
              <WorldList world={side === 'left' ? W0 : right} change={change} side={side} />
              <p className="tp-call">
                <code>{callText(view, arg)}</code>
              </p>
              <p className="tp-response">
                {r === null ? (
                  <span className="tp-pending">not run yet</span>
                ) : (
                  <code key={`${current?.n}-${side}`} className="tp-response-text toy-land">
                    {r.text}
                  </code>
                )}
              </p>
              <p className="tp-check">
                Check A, this run alone: {monitor === null ? 'not run' : monitor ? 'passes, no page returned fails canread' : 'fails'}
              </p>
            </section>
          )
        })}
      </div>

      <p className="tp-verdict" data-differ={shown !== null && !shown.equal ? 'true' : undefined}>
        <svg className="tp-verdict-mark" width="18" height="18" viewBox="-9 -9 18 18" aria-hidden="true">
          {shown === null ? (
            <circle className="tp-mark-hidden" r={5} />
          ) : shown.equal ? (
            <circle className="tp-mark-read" r={5.5} />
          ) : (
            <rect className="line-violation tp-mark-violation" x={-7} y={-7} width={14} height={14} />
          )}
        </svg>
        <span>
          Check B, the two runs together:{' '}
          <strong>{shown === null ? 'not run yet' : shown.equal ? 'equal responses' : 'different responses, a leak'}</strong>
        </span>
      </p>

      {ran.length > 0 ? (
        <div className="tp-log" tabIndex={0} role="region" aria-label="Pairs you ran">
          <table className="tp-table">
            <caption>Pairs you ran, newest last</caption>
            <thead>
              <tr>
                <th scope="col">View</th>
                <th scope="col">Request</th>
                <th scope="col">Run 2 changes</th>
                <th scope="col">Run 1</th>
                <th scope="col">Run 2</th>
                <th scope="col">Told apart</th>
              </tr>
            </thead>
            <tbody>
              {ran.map((r) => (
                <tr key={r.n}>
                  <td>{viewOf(r.view).label}</td>
                  <td>
                    <code>{r.arg}</code>
                  </td>
                  <td>{changeOf(r.change).label}</td>
                  <td>
                    <code>{r.result.left.text}</code>
                  </td>
                  <td>
                    <code>{r.result.right.text}</code>
                  </td>
                  <td>{r.result.equal ? 'no' : 'yes'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <ul className="toy-legend" aria-label="Key">
        <li>
          <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle className="tp-mark-read" r={4.5} />
          </svg>
          frank may read it
        </li>
        <li>
          <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle className="tp-mark-hidden" r={4} />
          </svg>
          frank may not read it
        </li>
        <li>
          <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <rect className="tp-mark-changed" x={-5} y={-5} width={10} height={10} />
          </svg>
          changed in run 2
        </li>
        <li>
          <svg className="toy-key" width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
            <rect className="line-violation tp-mark-violation" x={-6} y={-6} width={12} height={12} />
          </svg>
          responses differ
        </li>
      </ul>
    </ToyFrame>
  )
}
