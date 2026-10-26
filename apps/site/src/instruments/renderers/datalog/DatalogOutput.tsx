// INS-datalog's live result: each .output relation the tab computed, as a ruled table (tuples in Souffle's
// order, the rule and the derivation height the adapter rebuilt for each), with the SHA-256 of its sorted tuples
// (LAB-7.c1's form). Where the cell's recorded run is Souffle's, the table says whether the tab's tuples equal
// the recorded ones, relation by relation, as sets. Everything renders through text (ARCHITECTURE.md section 5.7).

import { useLayoutEffect, useRef, useState } from 'react'
import type { RunReply } from '../../protocol.ts'
import './datalog.css'

type Value = string | number

interface Relation {
  readonly name: string
  readonly cols: readonly (readonly [string, string])[]
  readonly rows?: readonly (readonly Value[])[]
  /** [rule number among this relation's rules, source line, height] per row; null for a fact. */
  readonly why?: readonly ((readonly [number, number, number]) | null)[] | null
  readonly tuples: number
  readonly sha256: string
}

interface Witness {
  readonly ok: true
  readonly relations: readonly Relation[]
  readonly cut?: 'derivations' | 'rows'
}

function parseWitness(w: string | null): Witness | null {
  if (w === null) return null
  try {
    const v = JSON.parse(w) as Partial<Witness>
    return v.ok === true && Array.isArray(v.relations) ? (v as Witness) : null
  } catch {
    return null
  }
}

/** The relations in `souffle -D-` text: a rule of dashes, the name, the columns, a rule of =, tuples, a rule of =. */
export function parseSouffle(text: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const ls = text.split('\n')
  for (let i = 0; i + 3 < ls.length; i++) {
    if (!/^-{3,}$/.test(ls[i]) || !/^={3,}$/.test(ls[i + 3])) continue
    const name = ls[i + 1].trim()
    const rows: string[] = []
    let j = i + 4
    while (j < ls.length && !/^={3,}$/.test(ls[j])) rows.push(ls[j++])
    out.set(name, rows)
    i = j
  }
  return out
}

interface Recorded {
  readonly id: string
  readonly rels: Map<string, string[]>
}

/** The cell's recorded run, when it is Souffle's: read from the recorded panel the same figure shows above. */
function useRecordedSouffle(ref: React.RefObject<HTMLElement | null>): Recorded | null {
  const [rec, setRec] = useState<Recorded | null>(null)
  useLayoutEffect(() => {
    const fig = ref.current?.closest('figure')
    if (fig === null || fig === undefined) return
    for (const panel of fig.querySelectorAll('.cell-output:not([data-pending])')) {
      const label = panel.querySelector('.cell-output-label')?.textContent ?? ''
      if (!/souffl/i.test(label)) continue
      const rels = parseSouffle(panel.querySelector('pre')?.textContent ?? '')
      if (rels.size > 0) setRec({ id: panel.querySelector('.cell-output-label code')?.textContent ?? 'the recorded run', rels })
      return
    }
  }, [ref])
  return rec
}

const tupleKey = (row: readonly Value[]): string => row.map(String).join('\t')

function Compare({ rel, rec }: { readonly rel: Relation; readonly rec: Recorded | null }) {
  if (rec === null || rel.rows === undefined) return null
  const theirs = rec.rels.get(rel.name)
  if (theirs === undefined) return <p className="dl-compare">The recorded run {rec.id} prints no {rel.name}.</p>
  const mine = new Set(rel.rows.map(tupleKey))
  const there = new Set(theirs)
  const onlyHere = [...mine].filter((k) => !there.has(k))
  const onlyThere = [...there].filter((k) => !mine.has(k))
  if (onlyHere.length === 0 && onlyThere.length === 0)
    return (
      <p className="dl-compare" data-same="true">
        Same {there.size} {there.size === 1 ? 'tuple' : 'tuples'} as Soufflé's recorded run <code>{rec.id}</code>, compared as sets.
      </p>
    )
  const show = (ks: string[]): string => ks.slice(0, 6).map((k) => `(${k.split('\t').join(', ')})`).join(', ') + (ks.length > 6 ? ', …' : '')
  return (
    <p className="dl-compare" data-same="false">
      Not the recorded {rel.name}: Soufflé's run <code>{rec.id}</code> has {there.size}, this tab {mine.size}.
      {onlyHere.length > 0 ? ` Only here: ${show(onlyHere)}.` : ''}
      {onlyThere.length > 0 ? ` Only in the recorded run: ${show(onlyThere)}.` : ''}
      {' '}The recorded run is of the course's code; an edit changes what the tab computes.
    </p>
  )
}

function Table({ rel, rec }: { readonly rel: Relation; readonly rec: Recorded | null }) {
  const why = rel.why ?? null
  return (
    <div className="dl-rel">
      <div className="dl-table-wrap" role="region" aria-label={`The relation ${rel.name}`} tabIndex={0}>
        <table className="dl-table">
          <caption>
            <code>{rel.name}</code> · {rel.tuples.toLocaleString('en-US')} {rel.tuples === 1 ? 'tuple' : 'tuples'}
          </caption>
          <thead>
            <tr>
              {rel.cols.map(([c, ty]) => (
                <th key={c} scope="col">
                  {c} <span className="dl-type">{ty}</span>
                </th>
              ))}
              {why !== null ? <th scope="col">derived by</th> : null}
            </tr>
          </thead>
          <tbody>
            {rel.rows === undefined ? (
              <tr>
                <td colSpan={rel.cols.length + 1}>The rows are past the reply's size cap; the count and the digest are below.</td>
              </tr>
            ) : rel.rows.length === 0 ? (
              <tr>
                <td colSpan={rel.cols.length + (why !== null ? 1 : 0)} className="dl-empty">
                  No tuple is derivable.
                </td>
              </tr>
            ) : (
              rel.rows.map((r, i) => {
                const w = why?.[i] ?? null
                return (
                  <tr key={i}>
                    {r.map((v, k) => (
                      <td key={k}>
                        <code>{typeof v === 'string' ? v : String(v)}</code>
                      </td>
                    ))}
                    {why !== null ? <td className="dl-why">{w === null ? 'a fact' : `rule ${w[0]} (line ${w[1]}) · height ${w[2]}`}</td> : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="dl-digest">
        SHA-256 of the sorted tuples: <code>{rel.sha256}</code>
      </p>
      <Compare rel={rel} rec={rec} />
    </div>
  )
}

export function DatalogOutput({ reply }: { readonly reply: RunReply }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const rec = useRecordedSouffle(ref)
  const w = parseWitness(reply.witness)
  return (
    <div className="dl-out" ref={ref}>
      {w !== null ? w.relations.map((r) => <Table key={r.name} rel={r} rec={rec} />) : null}
      {w === null && reply.error === null ? (
        <div className="code-block cell-live-out" role="region" aria-label="What the engine printed in this tab" tabIndex={0}>
          <pre>{reply.output.map((l) => l.text).join('\n')}</pre>
        </div>
      ) : null}
      {w?.cut === 'derivations' ? <p className="dl-digest">The derivations are past the reply's size cap and are not shown.</p> : null}
      {reply.error !== null ? (
        <div className="code-block cell-live-err" role="region" aria-label="Why the program did not run" tabIndex={0}>
          <pre>{reply.error}</pre>
        </div>
      ) : null}
    </div>
  )
}
