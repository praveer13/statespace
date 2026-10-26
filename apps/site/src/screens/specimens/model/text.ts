// Learner copy in a specimen record: one line of text with `code` spans and {{run:RUN-id}} chips (DESIGN.md section 3.1:
// a logic symbol is never set in the serif, so the screen sets a code span in the code face). Pure.

export type RichPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  /** A run chip: `{{run:RUN-id}}`, which the screen draws from the run's facts. */
  | { readonly kind: 'run'; readonly text: string }

const RUN_TOKEN = /\{\{run:(RUN-[a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g

/**
 * One line of record text in its parts: `code` for a backtick span, which the screen sets in the code face (a logic
 * symbol is never set in the serif; DESIGN.md section 3.1), and `run` for a `{{run:RUN-id}}` token. An unmatched
 * backtick is text.
 */
export function rich(text: string): RichPart[] {
  const parts: RichPart[] = []
  let last = 0
  const pushText = (s: string): void => {
    // a split with a capturing group alternates text and matched `code` spans; a backtick with no partner stays text
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

/** The run IDs a line of record text cites with `{{run:RUN-id}}` tokens. */
export function runTokens(text: string): string[] {
  return [...text.matchAll(RUN_TOKEN)].map((m) => m[1] as string)
}

