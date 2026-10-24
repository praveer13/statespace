#!/usr/bin/env node
// W0-S08: compare result files written by run-node.mjs and browser-run.mjs against a reference (PostgreSQL 18.6).
//
//   node compare.mjs --ref <pg.json> --out <summary.json> <other.json> [<other.json> ...]
//
// Equality is exact on statement outcomes (kind, rows, row count, SQLSTATE, message, detail) and on the per-world
// hashes of Part 2. Version strings and timings are not compared. A divergence listed in KNOWN is reported and
// explained; any other divergence makes the exit code 1.

import { parseArgs } from 'node:util'
import { readFileSync, writeFileSync } from 'node:fs'
import { canon } from './rls-spec.mjs'

const KNOWN = {
  'P1.18d': 'RESET SESSION AUTHORIZATION leaves the session user unchanged on PGlite; on PostgreSQL it returns to the connected role',
}

const { values: a, positionals } = parseArgs({ options: { ref: { type: 'string' }, out: { type: 'string' } }, allowPositionals: true })
const load = (f) => {
  const r = JSON.parse(readFileSync(f, 'utf8'))
  if (!r.rls) return r
  // a browser run: the specimens are in .rls, and the engine's name is the label
  if (r.error) throw new Error(`${f}: ${r.error}`)
  return { ...r.rls, label: r.engine, engine: 'pglite', browser: { name: r.engine, version: r.browser_version, user_agent: r.user_agent }, package: { name: '@electric-sql/pglite', version: r.pglite_version }, node: undefined }
}
const ref = load(a.ref)
const others = positionals.map(load)

const byId = (steps) => new Map(steps.map((s) => [s.id, s]))
const lines = []
const summary = { ref: ref.label, ref_server: ref.server_version, engines: {} }

function stepDiffs(refSteps, steps) {
  const r = byId(refSteps)
  const diffs = []
  for (const s of steps) {
    const x = r.get(s.id)
    if (!x) { diffs.push({ id: s.id, why: 'absent in reference' }); continue }
    if (canon(x.outcome) !== canon(s.outcome)) diffs.push({ id: s.id, claim: s.claim, reference: x.outcome, actual: s.outcome })
  }
  for (const x of refSteps) if (!steps.some((s) => s.id === x.id)) diffs.push({ id: x.id, why: 'absent in this run' })
  return diffs
}

function worldDiffs(refWorlds, worlds) {
  const diffs = []
  const keys = ['worldHash', 'matrixHash']
  for (const w of worlds) {
    const x = refWorlds.find((y) => y.seed === w.seed)
    if (!x) { diffs.push({ seed: w.seed, why: 'absent in reference' }); continue }
    const bad = keys.filter((k) => x[k] !== w[k])
    if (x.baseline.hash !== w.baseline.hash || x.baseline.disagreements !== w.baseline.disagreements) bad.push('baseline')
    for (const v of Object.keys(x.variants)) if (canon(x.variants[v]) !== canon(w.variants[v])) bad.push('variant:' + v)
    if (canon(x.ownerProbe) !== canon(w.ownerProbe)) bad.push('ownerProbe')
    if (bad.length) diffs.push({ seed: w.seed, fields: bad })
  }
  return diffs
}

const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0)
const median = (xs) => { const s = [...xs].sort((p, q) => p - q); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0 }

// generator statistics, from the reference run (the worlds are identical in every run: worldHash is compared)
const W = ref.part2.worlds
const stats = {
  worlds: W.length,
  users_per_world: { min: Math.min(...W.map((w) => w.stats.users)), max: Math.max(...W.map((w) => w.stats.users)) },
  docs_per_world: { min: Math.min(...W.map((w) => w.stats.docs)), max: Math.max(...W.map((w) => w.stats.docs)) },
  teams_per_world: { min: Math.min(...W.map((w) => w.stats.teams)), max: Math.max(...W.map((w) => w.stats.teams)) },
  worlds_with_nesting_pct: pct(W.filter((w) => w.stats.nested > 0).length, W.length),
  worlds_with_teamless_user_pct: pct(W.filter((w) => w.stats.teamless > 0).length, W.length),
  worlds_with_revoked_share_pct: pct(W.filter((w) => w.stats.revoked > 0).length, W.length),
  rule1_fires_pct: pct(W.filter((w) => w.stats.rule1).length, W.length),
  rule2_fires_pct: pct(W.filter((w) => w.stats.rule2).length, W.length),
  rule3_fires_pct: pct(W.filter((w) => w.stats.rule3).length, W.length),
  trivial_matrix_pct: pct(W.filter((w) => w.stats.trivial).length, W.length),
  matrix_cells: W.reduce((n, w) => n + w.stats.cells, 0),
  matrix_cells_allowed: W.reduce((n, w) => n + w.stats.allowed, 0),
  variant_distinguished_in_worlds: Object.fromEntries(['restrictive', 'subset', 'norevoke', 'missing'].map((v) => [v, W.filter((w) => w.variants[v].disagreements > 0).length])),
  owner_probe_noforce_disagreeing_worlds: W.filter((w) => w.ownerProbe.noforce > 0).length,
  owner_probe_force_disagreeing_worlds: W.filter((w) => w.ownerProbe.force > 0).length,
  baseline_disagreements_total: W.reduce((n, w) => n + w.baseline.disagreements, 0),
}
summary.generator_statistics = stats

let unknown = 0
const engines = [ref, ...others]
for (const r of engines) {
  const isRef = r === ref
  const e = { label: r.label, server_version: r.server_version, package: r.package, browser: r.browser ?? null, statements: r.statements, duration_s: r.duration_s }
  // Part 1 steps and checks
  const sd = isRef ? [] : stepDiffs(ref.part1.steps, r.part1.steps)
  const failed = r.part1.checks.filter((c) => !c.pass)
  e.part1 = { steps: r.part1.steps.length, checks: r.part1.checks.length, checks_pass: r.part1.checks.length - failed.length, failed_checks: failed.map((c) => c.id), step_divergences: sd.map((d) => d.id) }
  // Part 2
  e.part2 = {
    worlds: r.part2.worlds.length,
    baseline_disagreements: r.part2.worlds.reduce((n, w) => n + w.baseline.disagreements, 0),
    owner_probe_force_disagreements: r.part2.worlds.reduce((n, w) => n + w.ownerProbe.force, 0),
    divergent_worlds: isRef ? [] : worldDiffs(ref.part2.worlds, r.part2.worlds).map((d) => d.seed),
    ms_per_world_median: Math.round(median(r.part2.worlds.map((w) => w.ms.total)) * 10) / 10,
    ms_per_world_load_median: Math.round(median(r.part2.worlds.map((w) => w.ms.load)) * 10) / 10,
    ms_per_world_baseline_median: Math.round(median(r.part2.worlds.map((w) => w.ms.baseline)) * 10) / 10,
    // what the tab's SET ROLE rerun would cost: load each world and run the baseline differential, nothing else
    set_role_rerun_total_s: Math.round(r.part2.worlds.reduce((n, w) => n + w.ms.load + w.ms.baseline, 0) / 10) / 100,
  }
  // single-session specimens
  const ssd = isRef ? [] : stepDiffs(ref.single_session, r.single_session)
  e.single_session = { steps: r.single_session.length, divergences: ssd.map((d) => d.id) }
  e.serialize = r.serialize ?? null
  // classify divergences
  const all = [...sd.map((d) => d.id), ...e.part2.divergent_worlds.map((s) => 'world ' + s), ...ssd.map((d) => d.id), ...failed.map((c) => c.id).filter((id) => isRef)]
  const failedUnknown = failed.map((c) => c.id).filter((id) => !KNOWN[id])
  const stepUnknown = sd.map((d) => d.id).filter((id) => !KNOWN[id])
  e.known_divergences = [...new Set([...sd.map((d) => d.id), ...failed.map((c) => c.id)].filter((id) => KNOWN[id]))].map((id) => ({ id, why: KNOWN[id] }))
  e.unexplained = [...new Set([...failedUnknown, ...stepUnknown, ...e.part2.divergent_worlds.map((s) => 'world ' + s), ...ssd.map((d) => d.id)])]
  e.details = isRef ? [] : [...sd.filter((d) => KNOWN[d.id]), ...ssd]
  unknown += e.unexplained.length
  summary.engines[r.label] = e
  void all
}

// verdict lines (every number below is computed from the result files)
const refE = summary.engines[ref.label]
lines.push(`reference ${ref.label}: ${ref.server_version.split(' on ')[0]}; Part 1 ${refE.part1.checks_pass}/${refE.part1.checks} checks pass; Part 2 ${refE.part2.worlds} worlds, ${refE.part2.baseline_disagreements} baseline disagreements with the matrix`)
lines.push(`${ref.label}: SET ROLE rerun only (load each world, then the baseline differential): ${refE.part2.worlds} worlds in ${refE.part2.set_role_rerun_total_s} s, median ${refE.part2.ms_per_world_load_median} + ${refE.part2.ms_per_world_baseline_median} ms per world`)
for (const r of others) {
  const e = summary.engines[r.label]
  lines.push(`${r.label}: SET ROLE rerun only (load each world, then the baseline differential): ${e.part2.worlds} worlds in ${e.part2.set_role_rerun_total_s} s, median ${e.part2.ms_per_world_load_median} + ${e.part2.ms_per_world_baseline_median} ms per world`)
  lines.push(`${r.label}: ${r.server_version.split(' on ')[0]}; Part 1 ${e.part1.checks_pass}/${e.part1.checks} checks pass (failed: ${e.part1.failed_checks.join(', ') || 'none'}); ${e.part1.steps - e.part1.step_divergences.length}/${e.part1.steps} Part 1 steps equal PostgreSQL; ${e.part2.worlds - e.part2.divergent_worlds.length}/${e.part2.worlds} worlds equal; ${e.single_session.steps - e.single_session.divergences.length}/${e.single_session.steps} single-session steps equal; baseline disagreements ${e.part2.baseline_disagreements}; unexplained ${e.unexplained.length}`)
}
lines.push(`generator: ${stats.worlds} worlds, ${stats.matrix_cells} matrix cells of which ${stats.matrix_cells_allowed} allowed; trivial matrices ${stats.trivial_matrix_pct}%; rules 1/2/3 fire in ${stats.rule1_fires_pct}/${stats.rule2_fires_pct}/${stats.rule3_fires_pct}% of worlds; nesting ${stats.worlds_with_nesting_pct}%, teamless user ${stats.worlds_with_teamless_user_pct}%, revoked share ${stats.worlds_with_revoked_share_pct}%`)
lines.push(`variants distinguished from the matrix in (of ${stats.worlds} worlds): ${Object.entries(stats.variant_distinguished_in_worlds).map(([k, v]) => `${k} ${v}`).join(', ')}`)
lines.push(`owner probe over ${stats.worlds} worlds: without FORCE the owner disagrees with the matrix in ${stats.owner_probe_noforce_disagreeing_worlds} worlds, with FORCE in ${stats.owner_probe_force_disagreeing_worlds}`)
summary.verdict_lines = lines
summary.unexplained_divergences = unknown

writeFileSync(a.out, JSON.stringify(summary, null, 2) + '\n')
for (const l of lines) console.log(l)
process.exit(unknown ? 1 : 0)
