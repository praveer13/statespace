// `node scripts/verify-lessons.mjs --self-check`: plant one fault at a time (lib/plants.mjs), each in its own scratch copy
// of the fixture tree, run the gate on the copies through the command line, and require it to fail on each copy with
// every rule the plant names among the failing findings' rules (lib/rules.mjs). A plant whose rules did not all fire is
// missed, so a rule that is deleted, or weakened until its plant passes, fails the self-check. The unplanted copy must be
// green first, under --strict too, so a red result is the fault's and not the tree's.
//
// One command line checks a batch of copies (--root repeats, and each tree is checked on its own and reported with its
// own status), so the gate's start-up is paid once per batch; a few batches run at once (CONCURRENCY), and the results
// keep the plants' order. Then the copy rules are held to the corpora of fixtures/copy/ and to the lock rule's vocabulary
// matrix (lib/corpus.mjs), so a word taken out of the vocabulary fails the self-check as a deleted rule does.

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { checkCopyCorpora } from './corpus.mjs'
import { PLANTS, scratchTree } from './plants.mjs'

/** How many command lines run at once: the machine may be shared, so a few (LESSONS_SELF_CHECK_JOBS sets it). */
export const CONCURRENCY = Number(process.env.LESSONS_SELF_CHECK_JOBS) > 0 ? Math.floor(Number(process.env.LESSONS_SELF_CHECK_JOBS)) : Math.max(2, Math.min(4, os.availableParallelism() - 1))
/** How many planted copies one command line checks. */
export const BATCH = 16

/**
 * Whether a run of the gate caught a plant: the gate failed on its tree (status 1), and every rule the plant names is
 * among the rules of the failing findings (the errors, and the warnings too when the plant runs under --strict).
 * Returns {caught, fired}.
 */
export function judge(plant, status, findings) {
  const failing = (findings ?? []).filter((f) => f.severity === 'error' || plant.strict === true)
  const fired = [...new Set(failing.flatMap((f) => f.rules ?? [f.rule]))].sort()
  return { caught: status === 1 && plant.rules.every((r) => fired.includes(r)), fired }
}

/** The gate's command line over one or more trees. */
function runGate(script, dirs, strict) {
  return new Promise((resolve) => {
    const args = [script, ...dirs.flatMap((d) => ['--root', d]), '--json', ...(strict ? ['--strict'] : [])]
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (d) => (stdout += d))
    child.stderr.setEncoding('utf8').on('data', (d) => (stderr += d))
    child.on('close', (status) => {
      let report = null
      try {
        report = JSON.parse(stdout)
      } catch {
        report = null
      }
      resolve({ status, report, stdout, stderr })
    })
  })
}

const result = (plant, caught, detail) => ({ name: plant.name, check: plant.check, rules: plant.rules, caught, detail })

/** Plant each fault of a batch in its own copy, check the copies through one command line, and judge each. */
async function runBatch(batch, { repo, script }, results) {
  const planted = []
  try {
    for (const i of batch.plants) {
      const dir = scratchTree(repo)
      try {
        PLANTS[i].apply(dir, repo)
        planted.push({ i, dir })
      } catch (e) {
        fs.rmSync(dir, { recursive: true, force: true })
        results[i] = result(PLANTS[i], false, `the plant could not be made: ${e instanceof Error ? e.message : e}`)
      }
    }
    if (planted.length === 0) return
    const r = await runGate(script, planted.map((p) => p.dir), batch.strict)
    // one tree gives a report of its own; several give one report each, in the order of the trees
    const reports = planted.length === 1 ? [r.report === null ? null : { ...r.report, status: r.status }] : (r.report?.reports ?? [])
    planted.forEach(({ i, dir }, k) => {
      const report = reports[k]
      if (report === undefined || report === null || (planted.length > 1 && report.root !== dir)) {
        results[i] = result(PLANTS[i], false, `no report for its tree (exit ${r.status}): ${(r.stderr || r.stdout).slice(0, 300)}`)
        return
      }
      const { caught, fired } = judge(PLANTS[i], report.status, report.findings)
      const missing = PLANTS[i].rules.filter((rule) => !fired.includes(rule))
      results[i] = result(PLANTS[i], caught, report.status !== 1 ? `exit ${report.status}` : `${missing.join(', ')} did not fire (fired: ${fired.join(', ') || 'nothing'})`)
    })
  } finally {
    for (const { dir } of planted) fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * The self-check: {results} for the plants, in their order, and {copy} for the corpora and the matrix
 * (checkCopyCorpora), or {error} when the unplanted tree is not green. `env` is the gate's environment over the repository.
 */
export async function selfCheck({ repo, script, env }) {
  const base = scratchTree(repo)
  try {
    for (const strict of [false, true]) {
      const clean = await runGate(script, [base], strict)
      if (clean.status !== 0) return { error: `the unplanted copy of the fixture tree is not green${strict ? ' under --strict' : ''}: ${(clean.stdout || clean.stderr).slice(0, 1500)}` }
    }
  } finally {
    fs.rmSync(base, { recursive: true, force: true })
  }
  // batches of plants that run alike: --strict applies to a whole command line
  const batches = []
  for (const strict of [false, true]) {
    const plants = PLANTS.map((p, i) => i).filter((i) => (PLANTS[i].strict === true) === strict)
    for (let k = 0; k < plants.length; k += BATCH) batches.push({ strict, plants: plants.slice(k, k + BATCH) })
  }
  const results = new Array(PLANTS.length)
  let next = 0
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next]
      next += 1
      await runBatch(b, { repo, script }, results)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker))
  return { results, copy: checkCopyCorpora(env) }
}
