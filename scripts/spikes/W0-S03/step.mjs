// W0-S03: run one command of the recorded run, log its argv, start time, duration and exit code.
//
//   node step.mjs <steps.jsonl> <name> -- <command> [args...]
//
// W0S03_PATHMAP (a JSON list of [from, to] pairs) rewrites absolute paths in the logged argv, so the
// record names repo-relative paths, <work> and <cache> and never a private directory.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const [log, name, sep, ...command] = process.argv.slice(2)
if (sep !== '--' || command.length === 0) throw new Error('usage: node step.mjs <steps.jsonl> <name> -- <command> [args...]')
const map = JSON.parse(process.env.W0S03_PATHMAP ?? '[]').sort((a, b) => b[0].length - a[0].length)
const normalize = (s) => map.reduce((acc, [from, to]) => acc.split(from).join(to), s)

const started = new Date()
const t0 = process.hrtime.bigint()
const r = spawnSync(command[0], command.slice(1), { stdio: 'inherit' })
const seconds = Number(process.hrtime.bigint() - t0) / 1e9
const exit = r.status ?? 128 + 15
fs.appendFileSync(log, JSON.stringify({ name, argv: command.map(normalize), started_at: started.toISOString(), duration_s: Math.round(seconds * 100) / 100, exit_code: exit }) + '\n')
process.exit(exit)
