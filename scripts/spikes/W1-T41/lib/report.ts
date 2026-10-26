// The result model shared by GATE-bundle's static checks, its Playwright suite and the printed report.
//
// A check ends in one of four states. `pass` and `fail` are verdicts. `pending` means the task that owns the
// feature the check exercises has not delivered it yet: the check reports it, names the task, and is not counted
// as a pass (it fails under --strict, which the wave-exit review uses). `skipped` means the environment cannot
// run the check (a build made without COURSE_DOMAIN embeds no instrument frame, for example); it is reported the
// same way and also fails under --strict.

export type Status = 'pass' | 'fail' | 'pending' | 'skipped'

export interface CheckResult {
  /** A stable ID: `budget.entry`, `lint.sandbox`, `route:/today`, `loader.size`. */
  id: string
  /** The group the report prints it under. */
  group: string
  status: Status
  /** One line: what was measured and against what, or why the check did not pass. */
  detail: string
  /** For `pending`: the task that builds what the check needs; several, comma-separated, when it waits on more than one. */
  owner?: string
  /** The engines a browser check ran in, when it ran in more than one. */
  engines?: string[]
  ms?: number
}

export interface Summary {
  passed: number
  failed: number
  pending: number
  skipped: number
  /** Pending checks per owning task, for the verdict line. */
  pendingByOwner: Record<string, number>
}

export function summarize(results: readonly CheckResult[]): Summary {
  const s: Summary = { passed: 0, failed: 0, pending: 0, skipped: 0, pendingByOwner: {} }
  for (const r of results) {
    if (r.status === 'pass') s.passed += 1
    else if (r.status === 'fail') s.failed += 1
    else if (r.status === 'skipped') s.skipped += 1
    else {
      s.pending += 1
      // a check can wait on several tasks (owner is then a comma-separated list); each is counted
      for (const owner of (r.owner ?? 'unowned').split(',').map((o) => o.trim())) s.pendingByOwner[owner] = (s.pendingByOwner[owner] ?? 0) + 1
    }
  }
  return s
}

/** The process exit status of a gate: 0 green, 1 a check failed (or, under --strict, a check did not run). */
export function exitCodeFor(results: readonly CheckResult[], strict: boolean): 0 | 1 {
  const s = summarize(results)
  if (s.failed > 0) return 1
  if (strict && (s.pending > 0 || s.skipped > 0)) return 1
  return 0
}

const LABEL: Record<Status, string> = { pass: 'pass   ', fail: 'FAIL   ', pending: 'pending', skipped: 'skipped' }

/** One line per check, grouped, in the order the checks were added. */
export function formatResults(results: readonly CheckResult[], opts: { onlyProblems?: boolean } = {}): string[] {
  const lines: string[] = []
  let group = ''
  for (const r of results) {
    if (opts.onlyProblems && r.status === 'pass') continue
    if (r.group !== group) {
      group = r.group
      lines.push(`  ${group}`)
    }
    const owner = r.status === 'pending' && r.owner ? ` (${r.owner})` : ''
    const engines = r.engines && r.engines.length > 0 ? ` [${r.engines.join(', ')}]` : ''
    lines.push(`    ${LABEL[r.status]}  ${r.id}${engines}${owner}  ${r.detail}`)
  }
  return lines
}

/** The last line a gate prints: the lane runner shows it as the step's verdict, so it carries the counts and nothing else. */
export function verdictLine(gate: string, results: readonly CheckResult[], strict: boolean, extra = ''): string {
  const s = summarize(results)
  const ok = exitCodeFor(results, strict) === 0
  const parts = [`${s.passed} passed`, `${s.failed} failed`]
  if (s.pending > 0) {
    const owners = Object.entries(s.pendingByOwner)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([o, n]) => `${o} ${n}`)
      .join(', ')
    parts.push(`${s.pending} pending, waiting on ${owners}`)
  }
  if (s.skipped > 0) parts.push(`${s.skipped} skipped`)
  return `${gate}: ${ok ? 'ok' : 'FAIL'} (${parts.join(', ')}${strict ? '; strict' : ''}${extra ? `; ${extra}` : ''})`
}
