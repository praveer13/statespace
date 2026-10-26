// How GATE-specimens re-executes a run from its record (W1-T42).
//
// "Reproduces" means: the record's own input is run again on the engine the record names, at the pin, and every
// verdict line the record states comes back, in order, once times and harness decorations are set aside. The same
// engine, version and input give the same lines (a witness included: this is not the cross-engine rule, which is
// GATE-conformance's and compares verdicts only). A tool bump therefore turns a specimen red until its run is
// re-recorded, which is what "a tool bump re-runs everything and opens a diff" asks of the nightly lane (spine 9.5).
//
// A recipe says how one shape of record is re-run. The records W0-S11 imported carry no argv (their `unrecorded`
// entry quotes the usage line of the script instead), so a recipe works from the engine, the version and the
// inputs, and refuses a script whose bytes are not the ones the record hashed. Later tasks add recipes: PostgreSQL
// through `statespace isorun` (W4-T02), Lean and TLC as their stages ship.
//
// Where a script runs: in a scratch directory made for that run and removed after it (withScratchDir), never in the
// directory the gate was started in. The W1-T12 scripts write smt2/<query>.smt2 beside themselves; run in the tree being
// checked they would fill it, and on a read-only checkout the night would go red for a reason that is no finding. A script
// that reads files beside itself would fail here and the error would name the file it could not open; none of the scripts
// that a recipe re-executes today does (the one that does, smtlib_tour.py, is run by a shell script, which no recipe covers).

import fs from 'node:fs';
import path from 'node:path';
import { sha256File, withScratchDir } from './engines.mjs';

// ------------------------------------------------------------------ lines
/** Harness decorations that are not tool output: a leading "# " header or "=== " banner that a wrapper printed. */
export const isAnnotation = (line) => /^\s*(#|===)/.test(line);

const ISO_TIME = /\b\d{4}-\d\d-\d\dT[\d:.]+Z?\b/g;
const DURATION = /\b\d+(?:\.\d+)?\s?(?:ms|s)\b/g;

/** A line with its times masked and the "<n>ms py: " prefix of a harness log removed; trailing blanks dropped. */
export function normalizeLine(line) {
  return String(line)
    .replace(/\s+$/, '')
    .replace(ISO_TIME, '<ts>')
    .replace(DURATION, '<t>')
    .replace(/^<t> (?:py: )?/, '');
}

/**
 * Whether every recorded line comes back, in order, among the fresh lines. `fuzzy` lists lines whose tail depends on
 * how fast the machine is: { test: RegExp, canon: (line) => string } is applied to both sides before they are compared.
 * @returns {{ok: boolean, expected: number, matched: number, missing: {index: number, line: string} | null}}
 */
export function matchInOrder(recorded, fresh, fuzzy = []) {
  const canon = (line) => {
    const n = normalizeLine(line);
    for (const rule of fuzzy) if (rule.test.test(n)) return rule.canon(n);
    return n;
  };
  const want = recorded.filter((l) => !isAnnotation(l)).map(canon);
  const have = fresh.map(canon);
  let at = 0;
  let matched = 0;
  for (const [index, line] of want.entries()) {
    const found = have.indexOf(line, at);
    if (found < 0) return { ok: false, expected: want.length, matched, missing: { index, line } };
    at = found + 1;
    matched += 1;
  }
  return { ok: true, expected: want.length, matched, missing: null };
}

const linesOf = (stdout) => {
  const lines = String(stdout).replace(/\r\n/g, '\n').split('\n');
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  return lines;
};

// ------------------------------------------------------------------ runs that the gate does not re-execute, and why
/** Runs whose engine is a browser matrix: their own harness runs in the Playwright image, not in this gate. */
export const NOT_RE_EXECUTABLE = Object.freeze({
  'RUN-phone-pyodide': 'a browser matrix at emulated CPU tiers (W0-S02): its harness runs in the Playwright image on three engines, not in this gate',
  'RUN-z3-starter-pyodide': 'three browser engines (W0-S02, RUN-browser-origin): its harness runs in the Playwright image, not in this gate',
});

// ------------------------------------------------------------------ recipes
/**
 * Lines whose tail depends on the speed of the machine. The script asks Z3 for an answer within 5 s and Z3 gives up
 * at about 4.4 s here, with "incomplete quantifiers"; a slower machine reaches the 5 s limit first and reads "timeout".
 * The verdict (unknown) is what the run records, so only it is compared.
 */
const SPEED_DEPENDENT = [
  { test: /^\[Quantified: forall k\. f\(k\) > f\(k\+1\), f\(0\)=0\] unknown /, canon: (line) => line.replace(/unknown .*$/, 'unknown <reason depends on the machine: the script allows 5 s>') },
];

/** The scripts a record ran: a .py or .mjs input that is the script itself, not a harness, wheel or query beside it. */
const scriptInputs = (run) => (Array.isArray(run.inputs) ? run.inputs : []).filter((i) => i && typeof i.path === 'string' && /\.(py|mjs)$/.test(i.path) && (i.role === undefined || i.role === 'script'));

/** The Python of the two Node harnesses that W0 imported, taken from the script itself so that its hash guards it. */
export function extractHarnessPython(basename, text) {
  if (basename === 'z3unk.mjs') {
    const m = /py\.runPython\(`([\s\S]*?)`\)/.exec(text);
    return m ? { whole: m[1] } : null;
  }
  if (basename === 'z3py.mjs') {
    const cases = {};
    for (const m of text.matchAll(/^(\w+):\s*`([\s\S]*?)`,?\s*$/gm)) cases[m[1]] = m[2];
    return Object.keys(cases).length > 0 ? { cases, prelude: 'import z3, time\n' } : null;
  }
  return null;
}

/**
 * @typedef {object} Context
 * @property {string} root      the tree being checked
 * @property {{native: () => Promise<any>, pyodide: () => Promise<any>}} engines
 * @property {Map<string, Promise<any>>} memo   one execution per (engine, script, case), shared by the runs that use it
 */

/** The configurations of a record that a recipe does not re-run: the lines of the top level are the ones it compares. */
const otherConfigs = (run) => (Array.isArray(run.configs) ? run.configs.map((c) => c?.id).filter((id) => typeof id === 'string') : []);

function once(ctx, key, make) {
  if (!ctx.memo.has(key)) ctx.memo.set(key, make());
  return ctx.memo.get(key);
}

/**
 * A record whose argv runs something else (a shell script that drives the z3 command line) is not one these recipes
 * re-execute: its lines are that script's, not the .py beside it. A record with no argv (the imported ones) is judged by its inputs.
 */
function argvRunsScripts(run) {
  if (!Array.isArray(run.argv) || !run.argv.every((a) => typeof a === 'string')) return run.argv === null || run.argv === undefined;
  return scriptInputs(run).some((i) => run.argv.some((a) => path.basename(a) === path.basename(i.path)));
}

const tail = (r) => (r.stderr || '').trim().split('\n').at(-1) || 'no message';
const KNOWN_HARNESS = /(^|\/)(z3unk|z3py)\.mjs$/;

/** A z3py script, on native Z3. */
async function runPyScript(input, abs, now, ctx, out) {
  const engine = await ctx.engines.native();
  out.engines.add(engine);
  const r = await once(ctx, `native:${input.path}:${now}`, () => withScratchDir((cwd) => engine.run({ file: abs, timeoutS: 240, cwd })));
  if (r.timedOut) return `${input.path} did not finish within 240 s on native z3`;
  if (r.exitCode !== 0) return `${input.path} exited with ${r.exitCode ?? r.spawnError} on native z3: ${tail(r)}`;
  out.lines.push(...linesOf(r.stdout));
  return null;
}

/**
 * The Python inside z3unk.mjs and z3py.mjs, on Pyodide as the tab loads it. z3py.mjs takes a case name; the record's
 * configurations are named after the cases it ran. A case that hangs is stopped at the record's own limit.
 */
async function runHarnessScript(run, input, abs, now, ctx, out) {
  const text = fs.readFileSync(abs, 'utf8');
  const extracted = extractHarnessPython(path.basename(input.path), text);
  if (!extracted) return `cannot read the Python out of ${input.path}`;
  const engine = await ctx.engines.pyodide();
  out.engines.add(engine);
  if (extracted.whole) {
    const r = await once(ctx, `pyodide:${input.path}:${now}`, () => engine.run({ source: extracted.whole, timeoutS: 180 }));
    if (r.timedOut || r.exitCode !== 0) return `${input.path} did not run on Pyodide: ${r.timedOut ? 'timed out' : tail(r)}`;
    out.lines.push(...linesOf(r.stdout));
    return null;
  }
  const cases = otherConfigs(run).filter((id) => Object.hasOwn(extracted.cases, id));
  if (cases.length === 0) return `${input.path} runs one case at a time and the record's configurations name none of them`;
  const killS = Number(run.values?.external_kill_s ?? 25);
  for (const name of cases) {
    const source = `${extracted.prelude}${extracted.cases[name]}`;
    const ms = /s\.set\('timeout',\s*(\d+)\)/.exec(source)?.[1];
    const r = await once(ctx, `pyodide:${input.path}:${now}:${name}`, () => engine.run({ source, timeoutS: ms ? killS : 180 }));
    if (ms) {
      // Z3's timeout under Pyodide: the record is that it never returns, and an outside limit stops it.
      if (r.timedOut) out.lines.push(`${name}-case (s.set('timeout',${ms})): exit=124 after ${killS}s (124 = killed by external ${killS} s timeout; never returned)`);
      else out.lines.push(...linesOf(r.stdout), `(the ${name} case returned after ${(r.durationMs / 1000).toFixed(1)} s: it no longer hangs)`);
    } else {
      if (r.timedOut || r.exitCode !== 0) return `the ${name} case of ${input.path} did not run on Pyodide: ${r.timedOut ? 'timed out' : tail(r)}`;
      out.lines.push(...linesOf(r.stdout));
    }
  }
  return null;
}

/** The pyodide-node configuration of a record made the way W1-T12 makes them: one .py script, run natively and on Pyodide. */
const pyodideNodeConfigs = (run) => (Array.isArray(run.configs) ? run.configs : []).filter((c) => typeof c?.id === 'string' && /^pyodide-node/.test(c.id) && Array.isArray(c.verdict_lines));

/**
 * Every script input of the record, in order: a .py on native Z3, a known .mjs harness's Python on Pyodide. The lines
 * they print are what the record's own lines are compared with. A record that also names a pyodide-node configuration
 * has its .py re-run on Pyodide, and that configuration's lines are compared with what Pyodide prints.
 */
async function z3Inputs(run, ctx) {
  const out = { lines: [], notes: [], engines: new Set(), checks: [] };
  const all = scriptInputs(run);
  const mjs = all.filter((i) => i.path.endsWith('.mjs'));
  for (const input of all) {
    const abs = path.join(ctx.root, input.path);
    if (!fs.existsSync(abs)) return { error: `the input ${input.path} is not in the repository` };
    const now = sha256File(abs);
    if (typeof input.sha256 === 'string' && now !== input.sha256) out.notes.push(`${input.path} changed since the run (its hash is not the record's): re-record before release`);
    const error = input.path.endsWith('.py') ? await runPyScript(input, abs, now, ctx, out) : await runHarnessScript(run, input, abs, now, ctx, out);
    if (error) return { error };
  }
  out.checks.push({ label: null, recorded: Array.isArray(run.verdict_lines) ? run.verdict_lines : [], fresh: out.lines });

  const compared = new Set(run.primary_config === undefined ? [] : [run.primary_config]);
  const pyScripts = all.filter((i) => i.path.endsWith('.py'));
  if (mjs.length === 0 && pyScripts.length === 1) {
    for (const config of pyodideNodeConfigs(run)) {
      const input = pyScripts[0];
      const abs = path.join(ctx.root, input.path);
      const now = sha256File(abs);
      const engine = await ctx.engines.pyodide();
      out.engines.add(engine);
      const r = await once(ctx, `pyodide-script:${input.path}:${now}`, () => withScratchDir((cwd) => engine.run({ file: abs, timeoutS: 240, cwd })));
      if (r.timedOut || r.exitCode !== 0) return { error: `${input.path} did not run on Pyodide: ${r.timedOut ? 'timed out' : tail(r)}` };
      out.checks.push({ label: `configuration ${config.id}`, recorded: config.verdict_lines, fresh: linesOf(r.stdout) });
      compared.add(config.id);
    }
  }
  const z3pyMjs = mjs.length > 0 && mjs.every((i) => /z3py\.mjs$/.test(i.path));
  const others = otherConfigs(run).filter((id) => !compared.has(id) && !z3pyMjs);
  if (others.length > 0) out.notes.push(`the lines of the other configurations are not compared: ${others.join(', ')}`);
  return out;
}

/**
 * The recipes, tried in order. `applies` looks at the record only; `execute` returns fresh lines (and the engines that
 * ran) or an error. Add a recipe by adding a row: W4-T02's PostgreSQL rows, and the Lean and TLC rows, go here.
 */
export const RECIPES = [
  {
    id: 'z3-inputs',
    describe: 'each script input of a z3 record: a z3py script on native Z3, the Python of a Node harness (z3unk.mjs, z3py.mjs) on Pyodide',
    applies: (run) => run.engine === 'z3' && scriptInputs(run).length > 0 && scriptInputs(run).every((i) => i.path.endsWith('.py') || KNOWN_HARNESS.test(i.path)) && argvRunsScripts(run),
    execute: z3Inputs,
    fuzzy: SPEED_DEPENDENT,
  },
];

/**
 * Re-execute one run record and compare. Never throws for a failing run: the answer says what happened.
 * @returns {Promise<{state: 'reproduced'|'diverged'|'recorded-only'|'error', recipe: string|null, expected: number, matched: number, detail: string, notes: string[]}>}
 */
export async function reproduceRun(id, run, ctx) {
  const note = (state, detail, extra = {}) => ({ state, recipe: null, expected: 0, matched: 0, detail, notes: [], ...extra });
  if (NOT_RE_EXECUTABLE[id]) return note('recorded-only', NOT_RE_EXECUTABLE[id]);
  const recorded = Array.isArray(run.verdict_lines) ? run.verdict_lines.filter((l) => typeof l === 'string') : [];
  if (recorded.filter((l) => !isAnnotation(l)).length === 0) return note('recorded-only', 'the record states no verdict line to compare');
  const recipe = RECIPES.find((r) => r.applies(run));
  if (!recipe) {
    const inputs = scriptInputs(run).map((i) => i.path);
    const shown = inputs.length > 2 ? `${inputs.slice(0, 2).join(', ')} and ${inputs.length - 2} more` : inputs.join(', ');
    const engine = String(run.engine ?? 'unknown').split(' ')[0];
    return note('recorded-only', `no recipe re-executes engine ${engine}${inputs.length > 0 ? ` with ${shown}` : ''} yet`);
  }
  const out = await recipe.execute(run, ctx);
  if (out.error) return note('error', out.error, { recipe: recipe.id });
  const notes = [...(out.notes ?? [])];
  const drifted = [...(out.engines ?? [])].find((e) => typeof run.version === 'string' && e.probe.z3 !== run.version);
  if (drifted) return note('diverged', `the record was made on z3 ${run.version}; the pinned ${drifted.id} engine is z3 ${drifted.probe.z3}: re-record the run on the new pin`, { recipe: recipe.id, notes });
  let expected = 0;
  let matched = 0;
  for (const check of out.checks) {
    const m = matchInOrder(check.recorded, check.fresh, recipe.fuzzy);
    expected += m.expected;
    matched += m.matched;
    if (m.ok) continue;
    const want = m.missing.line;
    // The fresh line that opens with the same tag ("[1.5 BitVec64 ...]", or the first word) shows what changed.
    const tag = /^\[[^\]]*\]|^\S+/.exec(want)?.[0] ?? want;
    const near = check.fresh.find((l) => normalizeLine(l).startsWith(tag));
    const where = check.label ? `in the ${check.label}, ` : '';
    const detail = `${where}the recorded line ${JSON.stringify(want)} did not come back${near ? `; the run printed ${JSON.stringify(normalizeLine(near))}` : `; the run printed ${check.fresh.length} lines, the first ${JSON.stringify(check.fresh[0] ?? '')}`}`;
    return note('diverged', detail, { recipe: recipe.id, expected, matched, notes });
  }
  return note('reproduced', `${matched} of ${expected} recorded lines came back`, { recipe: recipe.id, expected, matched, notes });
}
