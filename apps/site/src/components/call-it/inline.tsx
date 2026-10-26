// Learner copy in an item: plain text, `code` spans in the code face (a logic symbol is never set in the serif; DESIGN.md
// section 3.1) and {{run:RUN-id}} tokens as run ids. The parts are strings drawn as text nodes, never as markup, so nothing an
// item holds can add an element.

import { Fragment } from 'react'

export type InlinePart = { readonly kind: 'text' | 'code' | 'run'; readonly text: string }

const RUN_TOKEN = /\{\{run:(RUN-[a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g

/** One line of copy in its parts. A backtick with no partner stays text. */
export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  let last = 0
  const pushText = (s: string): void => {
    s.split(/(`[^`]+`)/).forEach((piece, i) => {
      if (piece === '') return
      parts.push(i % 2 === 1 ? { kind: 'code', text: piece.slice(1, -1) } : { kind: 'text', text: piece })
    })
  }
  for (const m of text.matchAll(RUN_TOKEN)) {
    const at = m.index as number
    if (at > last) pushText(text.slice(last, at))
    parts.push({ kind: 'run', text: m[1] as string })
    last = at + m[0].length
  }
  if (last < text.length) pushText(text.slice(last))
  return parts
}

/** The text a screen reader and a plain-text view get: code spans without their backticks. */
export const plainText = (text: string): string => inlineParts(text).map((p) => p.text).join('')

/** `codeClass` and `runClass` name the classes of the two code-face spans, so a screen with its own stylesheet can set them. */
export function Inline({ text, codeClass = 'ci-code', runClass = 'ci-run' }: { readonly text: string; readonly codeClass?: string; readonly runClass?: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) =>
        p.kind === 'text' ? (
          <Fragment key={i}>{p.text}</Fragment>
        ) : (
          <code key={i} className={p.kind === 'run' ? runClass : codeClass}>
            {p.text}
          </code>
        ),
      )}
    </>
  )
}
