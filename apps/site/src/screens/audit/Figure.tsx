// A case's texts as numbered figures (DESIGN.md, Figure and instrument cell): a strip in the stage's ink naming the
// figure, then the lines on paper in a 1.5-px ink frame, each with its number. A diff marks added and removed lines
// by their sign and a band, never by colour alone.

import type { TextPart } from './pool.ts'

export interface FigureProps {
  readonly n: string
  readonly part: TextPart
  readonly title: string
  /** The figure's lane or source, at the strip's right: a run ID, or "the agent's change". */
  readonly lane?: string
  readonly lines: readonly string[]
  /** Lines the key names, marked after filing. */
  readonly marked?: readonly string[]
  /** Lines the learner anchored, marked after filing. */
  readonly picked?: readonly string[]
}

export function CaseFigure({ n, part, title, lane, lines, marked = [], picked = [] }: FigureProps) {
  const diff = part === 'diff'
  return (
    <figure className="adf no-margin">
      <figcaption className="adf-head">
        <span>
          <span className="adf-n">Figure {n}</span> <span className="adf-title">· {title}</span>
        </span>
        {lane !== undefined ? <code className="adf-lane">{lane}</code> : null}
      </figcaption>
      <div className="adf-body" tabIndex={0} role="group" aria-label={`Figure ${n}, ${title}, ${lines.length} lines`}>
        <table className="adf-lines">
          <tbody>
            {lines.map((text, i) => {
              const ref = `${part}:${i + 1}`
              const sign = diff && /^[+-]/.test(text) && !/^(\+\+\+|---) /.test(text) ? text[0] : ''
              const isMarked = marked.includes(ref)
              const isPicked = picked.includes(ref)
              return (
                <tr key={ref} data-sign={sign === '+' ? 'add' : sign === '-' ? 'del' : undefined} data-marked={isMarked || undefined} data-picked={isPicked || undefined}>
                  <th scope="row" className="adf-ln">
                    {i + 1}
                  </th>
                  <td className="adf-text">
                    <code>{text === '' ? ' ' : text}</code>
                    {isMarked || isPicked ? (
                      <span className="adf-note">
                        {isMarked ? 'carries the key' : ''}
                        {isMarked && isPicked ? ' · ' : ''}
                        {isPicked ? 'you anchored' : ''}
                      </span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
