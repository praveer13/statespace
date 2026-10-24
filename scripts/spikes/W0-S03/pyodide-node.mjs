// W0-S03: the corpus through Pyodide 314.0.7 and the Z3 5.3.1 wheel under Node, the continuation of
// RUN-z3-fixedpoint's harness.
//
//   node pyodide-node.mjs --corpus <corpus.json> --wheel <z3 wheel> --out <replies.json> [--probes <probes.json>]
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { loadPyodide } from 'pyodide'
import { startEngine, runCorpus, runProbes } from './engine.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const opt = (name) => argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1]] : []))[0]
const corpus = JSON.parse(fs.readFileSync(path.resolve(opt('corpus')), 'utf8'))
const wheel = path.resolve(opt('wheel'))
const sources = Object.fromEntries(['ss_datalog.py', 'probes.py'].map((f) => [f, fs.readFileSync(path.join(here, f), 'utf8')]))
const start = () => startEngine({ loadPyodide, wheelURL: pathToFileURL(wheel).href, sources })

const started_at = new Date().toISOString()
const engine = await start()
const { replies, total_s } = runCorpus(engine, corpus)
const meta = { runtime: `Pyodide ${engine.pyodide} (CPython ${engine.python}) on Node ${process.version}, ${process.arch}`, z3: engine.z3, load_ms: engine.load_ms, total_s, started_at }
fs.writeFileSync(path.resolve(opt('out')), JSON.stringify({ meta, replies }))
console.log(`pyodide-node: ${replies.length} cases in ${total_s.toFixed(1)} s; ${meta.runtime}; z3 ${meta.z3}; load ${JSON.stringify(engine.load_ms)}`)

if (opt('probes')) {
  const probes = await runProbes(start, corpus)
  fs.writeFileSync(path.resolve(opt('probes')), JSON.stringify({ meta, probes }, null, 1))
  for (const p of probes) console.log(p.scenario.padEnd(42), p.outcome, JSON.stringify(p.result ?? p.error).slice(0, 150))
}
process.exit(0)
