// Run INS-pairs on the S7 cells, or INS-interp's S7 extension on a command file, and print the verdict lines.
// record-s7-runs.mjs runs this inside the pinned Playwright image (Node, --network none) and records the output.
//
//   node scripts/spikes/W4-T27/run-cells.ts pairs <cell.pair> ...
//   node scripts/spikes/W4-T27/run-cells.ts interp <commands.txt> [--lag N]

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { readPair } from '../../../apps/instruments/src/engines/pairs/notation.ts'
import { judge, judgmentLines } from '../../../apps/instruments/src/engines/pairs/pairs.ts'
import { W0, interpret, sNew, sPast, showStep, type Command, type Field } from '../../../apps/instruments/src/engines/pairs/s7.ts'

function commands(text: string): Command[] {
  const out: Command[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (line === '') continue
    const m = /^(\w+) ([\w-]+) ([\w-]+)(?: ([\w-]+))?(?: "([^"]*)")?$/.exec(line)
    if (!m) throw new Error(`cannot read the command "${line}"`)
    const [, kind, a, b, c, value] = m as unknown as [string, string, string, string, string | undefined, string | undefined]
    if (kind === 'Share' || kind === 'Revoke') out.push({ kind, by: a, doc: b, user: c! })
    else if (kind === 'Edit') out.push({ kind, by: a, doc: b, field: c as Field, value: value ?? '' })
    else if (kind === 'Open') out.push({ kind, user: a, doc: b })
    else throw new Error(`unknown command ${kind}`)
  }
  return out
}

const [mode, ...rest] = process.argv.slice(2)
if (mode === 'pairs') {
  for (const file of rest) {
    const pair = readPair(readFileSync(file, 'utf8'))
    for (const line of judgmentLines(basename(file, '.pair'), pair, judge(pair))) console.log(line)
  }
} else if (mode === 'interp') {
  const file = rest[0]!
  const at = rest.indexOf('--lag')
  const lag = at >= 0 ? Number(rest[at + 1]) : 0
  const trace = interpret(W0, commands(readFileSync(file, 'utf8')), lag)
  console.log(`trace ${basename(file)} on W0, ${lag > 0 ? `replicated model, ACL replica ${lag} steps behind the primary` : 'single copy'}`)
  for (const s of trace) console.log(`  ${showStep(s)}`)
  const n = sNew(trace)
  const p = sPast(trace)
  console.log(`S-new (after revocation, no new read succeeds): ${n.holds ? 'holds' : `refuted at step ${n.step}`}`)
  console.log(`S-past (revocation removes what was already read): ${p.holds ? 'holds' : `refuted at step ${p.step}: ${p.kept} is still delivered`}`)
} else {
  console.error('usage: run-cells.ts pairs <cell.pair>... | interp <commands.txt> [--lag N]')
  process.exit(2)
}
