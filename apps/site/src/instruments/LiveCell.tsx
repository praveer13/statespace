// The live parts of an instrument cell: the editable code figure with Run, Stop and Reset, and the result panel
// that shows the download (its size from the build manifest, no prompt: OD-6), the engine starting, the output as
// it streams, and the finished run labeled as run in this tab with the engine version it printed. Replies render
// as text only (ARCHITECTURE.md section 5.7). The recorded run stays above as the course's evidence.

import type { ReactNode } from 'react'
import { LIMITS, type OutLine, type RunReply } from './protocol.ts'
import type { LiveInstrument } from './registry.ts'
import type { LiveRun, LiveState } from './useLiveRun.ts'

const mb = (b: number): string => `${(b / 1e6).toFixed(1)} MB`
const n = (x: number): string => x.toLocaleString('en-US')

/** The live state in a word or two, for the figure's strip. */
export function liveStatus(state: LiveState, name: string): string {
  switch (state.s) {
    case 'idle':
      return 'live'
    case 'connecting':
      return 'live · connecting'
    case 'download':
      return `live · downloading ${state.total > 0 ? Math.floor((100 * state.loaded) / state.total) : 0}%`
    case 'init':
      return `live · starting ${name}`
    case 'running':
      return 'live · running'
    case 'result':
      return 'live · ran in this tab'
    case 'stopped':
      return 'live · stopped'
    case 'error':
      return state.fallback ? 'live · unavailable' : 'live · error'
  }
}

export function LiveCode({ run, lang, live, revealed }: { readonly run: LiveRun; readonly lang: string; readonly live: LiveInstrument; readonly revealed: boolean }) {
  const rows = Math.min(30, Math.max(4, run.code.split('\n').length + 1))
  const runLabel = run.state.s === 'result' || run.state.s === 'stopped' || run.state.s === 'error' ? 'Run again' : 'Run'
  return (
    <div className="cell-live-code">
      <textarea
        className="cell-editor"
        aria-label={`${lang} code, editable`}
        value={run.code}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="off"
        onChange={(e) => run.setCode(e.target.value)}
      />
      <div className="cell-live-actions">
        {revealed ? (
          <button type="button" className="button button-primary" onClick={run.run} disabled={run.busy}>
            {runLabel} in this tab
          </button>
        ) : null}
        {run.busy ? (
          <button type="button" className="button button-secondary" onClick={run.stop}>
            Stop
          </button>
        ) : null}
        <button type="button" className="button button-secondary" onClick={run.reset} disabled={!run.edited}>
          Reset the code
        </button>
        <span className="cell-live-note">{run.edited ? 'Edited: runs your version.' : `The course's code. Edit it and run it on ${live.name}.`}</span>
      </div>
    </div>
  )
}

function Lines({ lines, label }: { readonly lines: readonly OutLine[]; readonly label: string }) {
  let left = LIMITS.shownChars
  const shown: OutLine[] = []
  for (const l of lines) {
    if (left <= 0) break
    shown.push(l.text.length > left ? { stream: l.stream, text: `${l.text.slice(0, left)}…` } : l)
    left -= l.text.length
  }
  return (
    <div className="code-block cell-live-out" role="region" aria-label={label} tabIndex={0}>
      <pre>
        {shown.map((l, i) => (
          <span key={i} className={l.stream === 'stderr' ? 'cell-live-line cell-live-stderr' : 'cell-live-line'}>
            {l.text}
            {'\n'}
          </span>
        ))}
        {left <= 0 ? <span className="cell-live-cut">[output cut at {n(LIMITS.shownChars)} characters]</span> : null}
      </pre>
    </div>
  )
}

function ResultBody({ reply, live }: { readonly reply: RunReply; readonly live: LiveInstrument }) {
  if (live.Output !== undefined) return <live.Output reply={reply} />
  return (
    <>
      {reply.output.length > 0 ? <Lines lines={reply.output} label={`What ${live.name} printed in this tab`} /> : <p className="cell-pending">The program printed nothing.</p>}
      {reply.error !== null ? (
        <div className="code-block cell-live-err" role="region" aria-label="The program's error" tabIndex={0}>
          <pre>{reply.error}</pre>
        </div>
      ) : null}
    </>
  )
}

export function LiveResult({ run, live, recorded, word }: { readonly run: LiveRun; readonly live: LiveInstrument; readonly recorded: string; readonly word: string }) {
  const st = run.state
  const engine = `${live.name} ${run.caps?.version ?? live.version}`
  let body: ReactNode
  let label: ReactNode
  switch (st.s) {
    case 'idle':
      label = <>Run in this tab · {engine}</>
      body = <p className="cell-pending">{run.caps?.cached === true ? `${live.name} is cached in this browser.` : `${live.name} runs in this tab when you run the code.`}</p>
      break
    case 'connecting':
      label = <>Run in this tab · {engine}</>
      body = <p className="cell-pending">Connecting to the instruments.</p>
      break
    case 'download':
      label = <>Downloading {live.name}</>
      body = (
        <div className="cell-live-load">
          <progress max={st.total || 1} value={st.loaded} aria-label={`Downloading ${live.name}`} />
          <p className="cell-live-bytes">
            {mb(st.loaded)} of {mb(st.total)} <span className="cell-live-exact">({n(st.total)} bytes, the engine's first load)</span>
          </p>
          <p className="cell-pending">Until it is ready, the recorded {word} above is what this cell shows.</p>
        </div>
      )
      break
    case 'init':
      label = <>Starting {engine}</>
      body = <p className="cell-pending">The engine is downloaded and starting.</p>
      break
    case 'running':
      label = <>Running in this tab · {engine}</>
      body = st.lines.length > 0 ? <Lines lines={st.lines} label={`What ${live.name} is printing`} /> : <p className="cell-pending">Running.</p>
      break
    case 'stopped':
      label = <>Stopped · {engine}</>
      body = (
        <>
          {st.lines.length > 0 ? <Lines lines={st.lines} label="What it printed before it stopped" /> : null}
          <p className="cell-pending">You stopped the run. The engine restarts on the next run.</p>
        </>
      )
      break
    case 'error':
      label = st.fallback ? <>Showing the recorded {word}</> : <>Run in this tab did not finish · {engine}</>
      body = (
        <>
          {st.lines.length > 0 ? <Lines lines={st.lines} label="What it printed before the error" /> : null}
          <p className="cell-live-why">
            {st.fallback ? `${live.name} could not start in this tab, so this cell shows the recorded ${word} ${recorded} above. ` : ''}
            <code>{st.code}</code>: {st.detail}
          </p>
        </>
      )
      break
    case 'result': {
      const p = st.reply.provenance
      const budget = live.budgetLine(p.budget)
      label = (
        <>
          Run in this tab · {live.name} {p.printed}
          {budget !== '' ? ` · ${budget}` : ''} · {n(st.reply.stats.runMs)} ms
        </>
      )
      body = (
        <>
          <ResultBody reply={st.reply} live={live} />
          <p className="cell-live-prov">
            {live.name} printed its version as {p.printed} ({p.runtime}). {st.code !== run.code || run.edited ? 'This ran your edited code. ' : ''}
            This run stays in this tab; the recorded {word} <code>{recorded}</code> is the course's evidence.
          </p>
        </>
      )
      break
    }
  }
  return (
    <div className="cell-live" data-state={st.s} data-fallback={st.s === 'error' && st.fallback ? 'true' : undefined}>
      <p className="cell-output-label cell-live-label" aria-live="polite">
        {label}
      </p>
      {body}
    </div>
  )
}
