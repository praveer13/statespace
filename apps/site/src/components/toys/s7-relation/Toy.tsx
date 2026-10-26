// An interactive figure for S7.L6, after "The observer and the relation": W0 on the left, a copy on the right in which
// the learner makes fields differ. The page says whether the pair is related under the chosen relation, names the clause
// each change breaks, and runs Open for the observer on both worlds. A related pair is a test the view must pass; "Find
// a leaking pair" searches every subset of the twelve fields, which is exhaustive for this toy and nothing more.

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToyFrame } from '../ToyFrame.tsx'
import { DOCS, FIELDS, GROUPS, PAIRS, RELATIONS, judge, leakFor } from './model.ts'
import type { Changes, DocId, FieldId, Group, Observer, RelationId, ViewId } from './model.ts'
import './relation.css'

const clause = (g: Group): string =>
  g === 'acme' ? "Acme's data must agree" : g === 'released' ? "Birch's releases to Acme must agree" : "Birch's private data must agree"

function list(xs: readonly string[]): string {
  if (xs.length <= 1) return xs.join('')
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
}

export default function RelationBench() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [changes, setChanges] = useState<Changes>(new Set<FieldId>(['memo.body']))
  const [rel, setRel] = useState<RelationId>('acme')
  const [observer, setObserver] = useState<Observer>('frank')
  const [view, setView] = useState<ViewId>('v0')
  const [doc, setDoc] = useState<DocId>('layoffs-memo')
  const [found, setFound] = useState<ReactNode>(null)

  const j = useMemo(() => judge(rel, view, observer, doc, changes), [rel, view, observer, doc, changes])
  const call = `Open(${observer}, ${doc})`
  const viewName = view === 'v0' ? 'version 0' : 'version 1'

  const toggle = (f: FieldId): void => {
    setFound(null)
    setChanges((c) => {
      const n = new Set(c)
      if (n.has(f)) n.delete(f)
      else n.add(f)
      return n
    })
  }

  const findLeak = (): void => {
    const s = leakFor(rel, view, observer)
    if (s.nonTrivial === 0) {
      setChanges(new Set())
      setFound(
        <>
          <strong>Nothing to compare.</strong> Under identical worlds no change at all keeps the pair related, so the page found no
          related pair that differs anywhere. Every view would pass, Open version 0 included, and the pass would say nothing.
          That is why the lesson asks for a premise witness: the relation must let Birch&apos;s data vary.
        </>,
      )
      return
    }
    if (s.smallest === null) {
      setFound(
        <>
          <strong>No leaking pair in this toy.</strong> The page tried all {PAIRS.toLocaleString('en')} sets of changes against Open
          on each of the four documents: {s.relatedCount} related pairs, and {observer} got equal responses in every one. That
          covers these twelve fields only. The relation still lets Birch&apos;s data vary in {s.nonTrivial} ways, so the search
          had something to compare.{' '}
          {view === 'v1'
            ? 'Version 1 gives one answer to both refusals, and every page it returns shows only data the relation holds fixed.'
            : 'Every page returned shows only data the relation holds fixed.'}
        </>,
      )
      return
    }
    const sm = s.smallest
    setChanges(new Set(sm.changes))
    setDoc(sm.doc)
    const names = FIELDS.filter((f) => sm.changes.has(f.id)).map((f) => `${f.label} to \u201c${f.differs}\u201d`)
    setFound(
      <>
        <strong>Found one.</strong> On the right, set {list(names)}, and send <code>Open({observer}, {sm.doc})</code>. Of{' '}
        {s.relatedCount} related pairs in this toy, {s.leaks} are told apart by {observer}.
        {rel === 'acme-only' && sm.changes.has('contract.share')
          ? ' This relation forgot the release, so a change to what Birch chose to share counts as a leak.'
          : sm.changes.has('memo.exists') && view === 'v0'
            ? ' Version 0 answers forbidden when layoffs-memo exists and not_found when it does not, so the refusal itself depends on Birch\'s private data.'
            : ''}
      </>,
    )
  }

  const verdict: ReactNode = !j.related ? (
    <>
      <strong>Not related, so not a test.</strong> {list(j.broken.map((b) => b.field.label))}{' '}
      {j.broken.length === 1 ? 'differs' : 'differ'}, and {list([...new Set(j.broken.map((b) => clause(b.group)))])}. A different
      response from such a pair would teach nothing about Birch&apos;s secrets.
    </>
  ) : j.equal ? (
    <>
      <strong>Related, and {observer} cannot tell them apart.</strong> <code>{call}</code> answers <code>{j.left}</code> in both
      worlds, so {viewName} passes this pair.
    </>
  ) : (
    <>
      <strong>Related, and told apart: a leaking pair.</strong> <code>{call}</code> answers <code>{j.left}</code> on the left and{' '}
      <code>{j.right}</code> on the right, though the worlds agree on everything {observer} may know.
    </>
  )

  return (
    <ToyFrame
      title="Related under ~Acme, or not"
      caption={
        <>
          The page decides the relation and runs Open on both worlds itself; no solver runs here. Twelve fields of W0 can differ,
          so the search covers {PAIRS.toLocaleString('en')} pairs of worlds for each request and nothing beyond them. A prime
          (&prime;) marks a value that differs on the right.
        </>
      }
    >
      <p className="toy-goal">
        Make fields of the right-hand world differ from W0. The page says whether the two worlds are related, and whether{' '}
        {observer} can tell them apart.
      </p>

      <div className="tr-fields">
        {GROUPS.map((g) => (
          <fieldset key={g.id} className="tr-group" data-group={g.id}>
            <legend>{g.label}</legend>
            {FIELDS.filter((f) => f.group === g.id).map((f) => {
              const bad = j.broken.some((b) => b.field.id === f.id)
              return (
                <label key={f.id} className="tr-field" data-on={changes.has(f.id) ? 'true' : undefined} data-bad={bad ? 'true' : undefined}>
                  <input type="checkbox" checked={changes.has(f.id)} onChange={() => toggle(f.id)} />
                  <span className="tr-field-name">{f.label}</span>
                  <span className="tr-field-state">{changes.has(f.id) ? `right: ${f.differs}${bad ? ', breaks the relation' : ''}` : 'same'}</span>
                </label>
              )
            })}
          </fieldset>
        ))}
      </div>

      <div className="tr-settings">
        <fieldset className="toy-choice">
          <legend>The relation</legend>
          {RELATIONS.map((r) => (
            <label key={r.id}>
              <input
                type="radio"
                name={`${uid}-rel`}
                checked={rel === r.id}
                onChange={() => {
                  setFound(null)
                  setRel(r.id)
                }}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="toy-controls">
          <fieldset className="toy-choice">
            <legend>Observer</legend>
            {(['frank', 'dana'] as const).map((o) => (
              <label key={o}>
                <input
                  type="radio"
                  name={`${uid}-obs`}
                  checked={observer === o}
                  onChange={() => {
                    setFound(null)
                    setObserver(o)
                  }}
                />
                <span>{o === 'frank' ? 'frank, Growth' : 'dana, Payments'}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="toy-choice">
            <legend>Open</legend>
            {(['v0', 'v1'] as const).map((v) => (
              <label key={v}>
                <input
                  type="radio"
                  name={`${uid}-view`}
                  checked={view === v}
                  onChange={() => {
                    setFound(null)
                    setView(v)
                  }}
                />
                <span>{v === 'v0' ? 'version 0: forbidden or not_found' : 'version 1: one answer'}</span>
              </label>
            ))}
          </fieldset>
          <label className="toy-field">
            <span className="toy-field-name">Document</span>
            <select
              className="tr-select"
              value={doc}
              onChange={(e) => {
                setFound(null)
                setDoc(e.target.value as DocId)
              }}
            >
              {DOCS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="toy-actions">
        <button type="button" className="toy-button" data-primary="true" onClick={findLeak}>
          Find a leaking pair
        </button>
        <button
          type="button"
          className="toy-button"
          onClick={() => {
            setFound(null)
            setChanges(new Set())
          }}
        >
          Make the worlds equal
        </button>
      </div>

      <div className="tr-pair" aria-hidden="true">
        {(['left', 'right'] as const).map((side) => (
          <div key={side} className="tr-side">
            <p className="tr-side-head">{side === 'left' ? 'W0' : changes.size === 0 ? 'W0, unchanged' : `W0 with ${changes.size} ${changes.size === 1 ? 'change' : 'changes'}`}</p>
            <p className="tr-call">
              <code>{call}</code>
            </p>
            <code key={`${side}-${side === 'left' ? j.left : j.right}`} className="tr-response toy-land">
              {side === 'left' ? j.left : j.right}
            </code>
          </div>
        ))}
        <svg className="tr-mark" width="20" height="20" viewBox="-10 -10 20 20">
          {!j.related ? (
            <circle className="tr-mark-unrelated" r={6} />
          ) : j.equal ? (
            <circle className="tr-mark-equal" r={6} />
          ) : (
            <rect className="line-violation tr-mark-leak" x={-7} y={-7} width={14} height={14} />
          )}
        </svg>
      </div>

      <p className="toy-status" aria-live="polite">
        {verdict}
        {found !== null ? <span className="tr-found"> {found}</span> : null}
      </p>

      <ul className="toy-legend" aria-label="Key">
        <li>
          <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle className="tr-mark-equal" r={5} />
          </svg>
          related, equal responses
        </li>
        <li>
          <svg className="toy-key" width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
            <rect className="line-violation tr-mark-leak" x={-6} y={-6} width={12} height={12} />
          </svg>
          related, told apart: a leak
        </li>
        <li>
          <svg className="toy-key" width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
            <circle className="tr-mark-unrelated" r={5} />
          </svg>
          not related, not a test
        </li>
      </ul>
    </ToyFrame>
  )
}
