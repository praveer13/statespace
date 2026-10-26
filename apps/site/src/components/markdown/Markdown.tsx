// Draws the tree of parse.ts as React elements: never as markup, so no text a page holds can add an element. A footnote
// reference is a sidenote (DESIGN.md section 6.15): in the right margin from 1100 px, and inline behind its number below,
// where the number is a button that opens it. Run and fact tokens read the page's tables through RefsContext.

import { createContext, Fragment, useContext, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { parseMarkdown } from './parse.ts'
import type { Block, Doc, Inline } from './parse.ts'
import './markdown.css'

export interface Refs {
  /** The runs the page cites, by ID (the page record's `runs`). */
  readonly runs: Readonly<Record<string, unknown>>
  /** The facts the page cites, by ID (the page record's `facts`). */
  readonly facts: Readonly<Record<string, { readonly value?: string | number; readonly unit?: string } | undefined>>
  /** The runs a draft cites that are not recorded yet. */
  readonly unresolved: readonly string[]
}

const NO_REFS: Refs = { runs: {}, facts: {}, unresolved: [] }

export const RefsContext = createContext<Refs>(NO_REFS)

/** What an unresolved reference renders as (packages/content: RUN_PENDING). */
export const RUN_PENDING = 'run not yet recorded'

function RunToken({ id, path }: { readonly id: string; readonly path?: string | undefined }) {
  const refs = useContext(RefsContext)
  if (path !== undefined || refs.unresolved.includes(id) || !(id in refs.runs)) {
    return (
      <span className="md-pending" title={id}>
        {RUN_PENDING}
      </span>
    )
  }
  return <code className="md-run">{id}</code>
}

function FactToken({ id }: { readonly id: string }) {
  const fact = useContext(RefsContext).facts[id]
  if (fact?.value === undefined) return <code className="md-run">{id}</code>
  return (
    <span className="md-fact">
      {String(fact.value)}
      {fact.unit !== undefined && fact.unit !== '' ? ` ${fact.unit}` : ''}
    </span>
  )
}

function Href({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  if (href.startsWith('/')) return <Link to={href}>{children}</Link>
  if (href.startsWith('#')) return <a href={href}>{children}</a>
  return (
    <a href={href} rel="noreferrer">
      {children}
    </a>
  )
}

interface NoteScope {
  readonly doc: Doc
  readonly number: (label: string) => number
}

function Sidenote({ label, scope }: { readonly label: string; readonly scope: NoteScope }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const n = scope.number(label)
  const body = scope.doc.notes.get(label)
  if (body === undefined) return <sup className="sn-ref">{n}</sup>
  return (
    <>
      <sup className="sn-ref">
        <button type="button" className="sn-toggle" aria-expanded={open} aria-controls={id} aria-label={`Sidenote ${n}`} onClick={() => setOpen((o) => !o)}>
          {n}
        </button>
        <span className="sn-num" aria-hidden="true">
          {n}
        </span>
      </sup>
      <span id={id} className="sidenote" data-open={open ? 'true' : 'false'} role="note">
        <span className="sn-mark" aria-hidden="true">
          {n}
        </span>{' '}
        <Inlines nodes={body} scope={null} />
      </span>
    </>
  )
}

function Inlines({ nodes, scope }: { readonly nodes: readonly Inline[]; readonly scope: NoteScope | null }) {
  return (
    <>
      {nodes.map((x, i) => {
        switch (x.t) {
          case 'text':
            return <Fragment key={i}>{x.v}</Fragment>
          case 'code':
            return <code key={i}>{x.v}</code>
          case 'em':
            return (
              <em key={i}>
                <Inlines nodes={x.c} scope={scope} />
              </em>
            )
          case 'strong':
            return (
              <strong key={i}>
                <Inlines nodes={x.c} scope={scope} />
              </strong>
            )
          case 'del':
            return (
              <del key={i}>
                <Inlines nodes={x.c} scope={scope} />
              </del>
            )
          case 'link':
            return (
              <Href key={i} href={x.href}>
                <Inlines nodes={x.c} scope={scope} />
              </Href>
            )
          case 'br':
            return <br key={i} />
          case 'run':
            return <RunToken key={i} id={x.id} path={x.path} />
          case 'fact':
            return <FactToken key={i} id={x.id} />
          case 'note':
            return scope === null ? <sup key={i}>{x.label}</sup> : <Sidenote key={i} label={x.label} scope={scope} />
        }
      })}
    </>
  )
}

function Blocks({ blocks, scope, tight = false }: { readonly blocks: readonly Block[]; readonly scope: NoteScope; readonly tight?: boolean }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return tight ? (
              <Fragment key={i}>
                <Inlines nodes={b.c} scope={scope} />
              </Fragment>
            ) : (
              <p key={i}>
                <Inlines nodes={b.c} scope={scope} />
              </p>
            )
          case 'h': {
            const H = `h${Math.min(6, b.level)}` as 'h3' | 'h4' | 'h5' | 'h6'
            return (
              <H key={i} className="md-h">
                <Inlines nodes={b.c} scope={scope} />
              </H>
            )
          }
          case 'code':
            return (
              <div key={i} className="md-code" role="region" aria-label={b.lang !== '' ? `${b.lang} code` : 'code'} tabIndex={0}>
                <pre>
                  <code>{b.v}</code>
                </pre>
              </div>
            )
          case 'list': {
            const items = b.items.map((it, k) => (
              <li key={k}>
                <Blocks blocks={it} scope={scope} tight={b.tight && it.length === 1} />
              </li>
            ))
            return b.ordered ? (
              <ol key={i} start={b.start === 1 ? undefined : b.start}>
                {items}
              </ol>
            ) : (
              <ul key={i}>{items}</ul>
            )
          }
          case 'quote':
            return (
              <blockquote key={i}>
                <Blocks blocks={b.c} scope={scope} />
              </blockquote>
            )
          case 'table':
            return (
              <div key={i} className="md-table" role="region" aria-label="table" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      {b.head.map((h, k) => (
                        <th key={k} scope="col" data-align={b.align[k] ?? undefined}>
                          <Inlines nodes={h} scope={scope} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, k) => (
                      <tr key={k}>
                        {r.map((c, j) => (
                          <td key={j} data-align={b.align[j] ?? undefined}>
                            <Inlines nodes={c} scope={scope} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'hr':
            return <hr key={i} />
        }
      })}
    </>
  )
}

/** How many sidenotes a block of Markdown numbers, so a page can number its notes across blocks. */
export const noteCount = (md: string): number => parseMarkdown(md).refs.length

/** A block of Markdown. `noteStart` is the number of its first sidenote (1 unless the page numbers notes across blocks). */
export function Markdown({ md, noteStart = 1, className }: { readonly md: string; readonly noteStart?: number; readonly className?: string }) {
  const doc = parseMarkdown(md)
  const scope: NoteScope = { doc, number: (label) => noteStart + Math.max(0, doc.refs.indexOf(label)) }
  return (
    <div className={className === undefined ? 'md' : `md ${className}`}>
      <Blocks blocks={doc.blocks} scope={scope} />
    </div>
  )
}

/** One line of Markdown with no blocks: a title, an option, a label. */
export function InlineMd({ text }: { readonly text: string }) {
  const doc = parseMarkdown(text)
  const first = doc.blocks[0]
  if (doc.blocks.length === 1 && first !== undefined && first.t === 'p') return <Inlines nodes={first.c} scope={null} />
  return <Fragment>{text}</Fragment>
}
