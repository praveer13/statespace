// A line of a specimen record's words, drawn: plain text, `code` spans in the code face (a logic symbol is never set in the
// serif; DESIGN.md section 3.1) and {{run:RUN-id}} chips. The parts are strings and are drawn as text nodes, never as
// markup, so nothing in a record can add an element.

import { Fragment } from 'react'
import type { RichPart } from './model/label.ts'

export function RunId({ id }: { readonly id: string }) {
  return <code className="sp-run">{id}</code>
}

export function Rich({ parts }: { readonly parts: readonly RichPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === 'code' ? (
          <code key={i} className="sp-code">
            {p.text}
          </code>
        ) : p.kind === 'run' ? (
          <RunId key={i} id={p.text} />
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  )
}
