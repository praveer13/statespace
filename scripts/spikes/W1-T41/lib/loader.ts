// The rules the loader checks hold a page to (OD-6, changed 2026-10-25: no download asks first and none warns, and the loader
// shows each engine's size while it downloads; DESIGN.md section 6.2: "Downloading <engine> · <received> of <size>", the size
// from the build manifest). Pure functions over what e2e/engine-session.ts reads from the page, so they are tested without a
// browser (libs.test.mjs); e2e/loader.spec.ts applies them.

import { loaderTotal, parseSizes, sizeMatches } from './units.ts'

const SIZE_TEXT = '[\\d.,]+\\s?(?:[KMG]i?B|B|bytes)\\b'

/**
 * Wording of a consent sheet or a size warning (OD-6: none is shown before an engine downloads). "Downloads 3.0 MB" is a warning;
 * the loader's own "Downloading Z3 · 0 B of 3.0 MB" is not, and neither is a received figure followed by "of".
 */
export const PROMPT_COPY = new RegExp(
  [
    'are you sure',
    'continue\\?',
    'proceed\\?',
    'ok to download',
    'allow (the )?download',
    'before (it|we|this) (download|load)s?',
    `will (download|use|fetch|take) (about |around |roughly |up to |nearly )?${SIZE_TEXT}`,
    '\\b(large|big|heavy) (download|file)',
    'data (charges|usage|plan|allowance|cap)\\b',
    'metered',
    'mobile data',
    'wi-?fi\\b',
    'consent',
    'agree to',
    '\\bwarning\\b',
    '\\bheads[- ]up\\b',
    `\\bdownloads?\\s+(about\\s+|around\\s+|roughly\\s+|up to\\s+|nearly\\s+)?${SIZE_TEXT}(?!\\s+of\\b)`,
    `\\b${SIZE_TEXT} (download|file)\\b`,
  ].join('|'),
  'i',
)

/**
 * Why a line of the page reads as a prompt or a warning before the download starts, or null. `loaderLines` are the lines the
 * loader's own box (the progress bar's container) has shown since it appeared: the only place a size may be stated then, so a
 * live region that repeats the loader's line is the loader's text too. Before the tap nothing downloads, so no line may state a
 * size at all (DESIGN.md section 6.2: "no prompt and no warning first").
 */
export function promptReason(line: string, loaderLines: ReadonlySet<string> | null): string | null {
  if (PROMPT_COPY.test(line)) return 'consent or warning wording'
  if (parseSizes(line).length > 0 && !(loaderLines?.has(line) ?? false)) return loaderLines === null ? 'a size stated while no loader is on the page' : "a size stated outside the loader's box"
  return null
}

/** The loader's progress element as one snapshot reads it. */
export interface ProgressState {
  tag: string
  max: number | null
  now: number | null
  valueText: string | null
  label: string | null
  /** The text of the loader's box: the nearest ancestor of the bar whose text mentions a download, else its parent. */
  container: string
}

/** One state of the loader, from its first frame to the end of the download. */
export interface LoaderFrame {
  /** Milliseconds after the tap. */
  at: number
  progress: ProgressState
}

/** Where a loader frame states a total, as loader.size reads each: the bar's aria-valuetext, its aria-label, the text around it. */
export function loaderSources(p: ProgressState): [string, string | null][] {
  return [
    ['aria-valuetext', p.valueText],
    ['aria-label', p.label],
    ['the text around the bar', p.container],
  ]
}

/**
 * Where the loader disagrees with the manifest's figure, frame by frame: each place that states a total (loaderSources) must state
 * the figure to the digits it shows, and a bar that counts bytes (a maximum above 1) must have the figure as its maximum. One line
 * per disagreement, naming the place, the first frame it showed in and how many frames showed it.
 */
export function loaderMismatches(frames: readonly LoaderFrame[], figure: number): string[] {
  const seen = new Map<string, { first: number; frames: number }>()
  const note = (what: string, at: number): void => {
    const s = seen.get(what)
    if (s) s.frames += 1
    else seen.set(what, { first: at, frames: 1 })
  }
  for (const f of frames) {
    for (const [name, text] of loaderSources(f.progress)) {
      const total = text ? loaderTotal(text) : null
      if (total !== null && !sizeMatches(total, figure)) note(`${name} prints "${total.raw}"`, f.at)
    }
    const max = f.progress.max
    if (max !== null && max > 1 && max !== figure) {
      note(max === 100 && figure !== 100 ? 'the bar counts percent (its maximum is 100), where DESIGN.md section 6.2 asks for a bar by bytes whose maximum is the figure,' : `the bar's maximum is ${max}`, f.at)
    }
  }
  return [...seen].map(([what, s]) => `${what} from ${s.first} ms after the tap (${s.frames} frame${s.frames === 1 ? '' : 's'})`)
}
