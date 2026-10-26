#!/usr/bin/env node
// W0-T11: the checks behind docs/waves/W0-exit.md that none of the fast lane's gates makes. Each reads the
// repository and says what it found, so the exit record cites a run rather than a hand count.
//
//   node scripts/spikes/W0-T11/exit-check.mjs queue [--with W0-T11]   the owner's review queue (OD-7)
//   node scripts/spikes/W0-T11/exit-check.mjs spikes                  decision records, and the runs W0's tasks name
//   node scripts/spikes/W0-T11/exit-check.mjs keepkill                the keep/kill rules: hashed, committed, before any event
//   node scripts/spikes/W0-T11/exit-check.mjs all [--with W0-T11]     the three, one after another
//
//   --root DIR   check the tree under DIR instead of this repository (the tests)
//   --json       print the report as JSON instead of lines
//
// What each check means.
//   queue     The queue is the sum of review_h over tasks with status review and owner_review true (tracker/README.md
//             section 5). --with adds a task that is not in review yet, as it will be once it files its record. A queue
//             at or above 10 h pauses every new task with owner review (OD-7).
//   spikes    A spike is a W0 task in the tracker's workstream "Spikes". Each names a decision record in docs/spikes/
//             that has a Decision section and a Fallback section with a paragraph in each. Every run any W0 task names
//             in its deliverables or acceptance has a record that parses, carries its own ID and matches runs/index.json;
//             and every run ID that spine section 9.5 lists as executed has a record on disk. GATE-runs validates the
//             records against run@1 and resolves every reference; this check does not repeat that.
//   keepkill  The rules file hashes to the SHA-256 that RUN-keepkill-rules records, in the working tree and in the last
//             commit; .gitattributes keeps its line endings as committed; its history is reported. No learner-zero
//             export exists: no RUN-lz-* or RUN-boot-firstsuccess record, and the tasks that produce them are not in
//             review or done. The repository cannot show the future, so "before the first learner-zero event" is shown
//             as far as it can be: nothing is recorded yet.
//
// Exit status: 0 every check holds, 1 one does not, 2 usage or an unreadable file.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The tracker is read with the package's own YAML subset, which is TypeScript; Node runs it as it is from 22.18,
// and before that needs a flag.
if (!process.features.typescript && !process.env.W0T11_STRIP) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, W0T11_STRIP: '1' },
  });
  process.exit(again.status ?? 1);
}

const SELF_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const QUEUE_GATE_H = 10;
export const RULES = 'content/governance/keepkill-rules.yaml';
export const RULES_RUN = 'runs/RUN-keepkill-rules.json';
/** The tasks that produce a learner-zero export (the event log's consumers); see the keepkill check. */
export const LEARNER_ZERO_TASKS = ['W1-T08', 'W1-T09'];

const RUN_ID = /\bRUN-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;
const r2 = (x) => Math.round(x * 100) / 100;
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const hours = (h) => `${h} h`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

class Unreadable extends Error {}

/** Read a repository file as text; a missing or unreadable file is exit status 2, never a pass. */
function readText(root, rel) {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch (e) {
    throw new Unreadable(`cannot read ${rel}: ${e.code ?? e.message}`);
  }
}
const readBytes = (root, rel) => fs.readFileSync(path.join(root, rel));
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

/** The tracker, read with tracker/tasks.yaml's own parser (packages/ids). */
export async function loadTracker(root) {
  const { parseYaml } = await import(pathToFileURL(path.join(SELF_ROOT, 'packages', 'ids', 'src', 'yaml-subset.ts')).href);
  const doc = parseYaml(readText(root, 'tracker/tasks.yaml'));
  if (!Array.isArray(doc.tasks) || !Array.isArray(doc.waves)) throw new Unreadable('tracker/tasks.yaml has no tasks or waves list');
  return { tasks: doc.tasks, waves: doc.waves };
}

// ------------------------------------------------------------------ queue
/**
 * The review queue of tracker/README.md section 5: status review and owner_review true. `assume` names tasks
 * that are not in review yet and are counted as if they were.
 */
export function reviewQueue(tasks, assume = []) {
  const counted = (t) => t.status === 'review' && t.owner_review === true;
  const hoursOf = (t) => {
    const h = t.review_h;
    if (typeof h !== 'number' || !Number.isFinite(h) || h < 0) throw new Unreadable(`task ${t.id} has no usable review_h (${JSON.stringify(h)})`);
    return h;
  };
  const inReview = tasks.filter(counted).map((t) => ({ id: t.id, review_h: hoursOf(t) }));
  const total = r2(inReview.reduce((a, t) => a + t.review_h, 0));
  const assumed = [];
  for (const id of assume) {
    const t = tasks.find((x) => x.id === id);
    if (t === undefined) throw new Unreadable(`--with names ${id}, which tracker/tasks.yaml does not have`);
    if (t.owner_review === true && !counted(t)) assumed.push({ id: t.id, status: t.status, review_h: hoursOf(t) });
  }
  const withAssumed = r2(total + assumed.reduce((a, t) => a + t.review_h, 0));
  return {
    in_review: inReview,
    hours: total,
    assumed,
    hours_with_assumed: withAssumed,
    gate_h: QUEUE_GATE_H,
    under_gate: total < QUEUE_GATE_H,
    under_gate_with_assumed: withAssumed < QUEUE_GATE_H,
  };
}

/** The planned review of one wave: the tasks with owner review, and the wave's own figure for comparison. */
export function wavePlan(tasks, waves, wave) {
  const own = tasks.filter((t) => t.wave === wave && t.owner_review === true);
  const sum = r2(own.reduce((a, t) => a + (typeof t.review_h === 'number' ? t.review_h : 0), 0));
  const declared = waves.find((w) => w.id === wave)?.review_h ?? null;
  return { wave, tasks: own.length, hours: sum, declared_h: declared, agrees: declared === null ? null : r2(declared) === sum };
}

export function checkQueue({ tasks, waves, assume = [] }) {
  const q = reviewQueue(tasks, assume);
  const statuses = {};
  for (const t of tasks) statuses[t.status] = (statuses[t.status] ?? 0) + 1;
  const w0 = tasks.filter((t) => t.wave === 'W0');
  const w1 = wavePlan(tasks, waves, 'W1');
  const lines = [];
  lines.push(`      queue  ${plural(q.in_review.length, 'task')} in review: ${hours(q.hours)}${q.in_review.length > 0 ? ` (${q.in_review.map((t) => `${t.id} ${t.review_h}`).join(', ')})` : ''}`);
  for (const a of q.assumed) lines.push(`      queue  ${a.id} (${a.status}) counted as in review: ${hours(a.review_h)}`);
  if (q.assumed.length > 0) lines.push(`      queue  with ${q.assumed.map((a) => a.id).join(', ')} in review: ${hours(q.hours_with_assumed)}`);
  lines.push(`${q.under_gate && q.under_gate_with_assumed ? '  ok  ' : '  FAIL'}  gate   the queue is under ${hours(q.gate_h)}${q.assumed.length > 0 ? ' now and with the assumed task' : ''} (OD-7)`);
  lines.push(`      tasks  ${tasks.length}: ${Object.entries(statuses).sort().map(([s, n]) => `${s} ${n}`).join(', ')}; W0 ${w0.length}: ${Object.entries(w0.reduce((a, t) => ({ ...a, [t.status]: (a[t.status] ?? 0) + 1 }), {})).sort().map(([s, n]) => `${s} ${n}`).join(', ')}`);
  lines.push(`${w1.agrees === false ? '  FAIL' : '  ok  '}  plan   W1 plans ${plural(w1.tasks, 'task')} with owner review and ${hours(w1.hours)}; waves[].review_h says ${w1.declared_h === null ? 'nothing' : hours(w1.declared_h)}`);
  const ok = q.under_gate && q.under_gate_with_assumed && w1.agrees !== false;
  const summary = `queue: ${hours(q.hours)} now${q.assumed.length > 0 ? `, ${hours(q.hours_with_assumed)} with ${q.assumed.map((a) => a.id).join(', ')} in review` : ''}; the gate is ${hours(q.gate_h)}; W1 plans ${hours(w1.hours)}`;
  return { id: 'queue', ok, lines, summary, data: { ...q, statuses, w0_tasks: w0.length, plan_w1: w1 } };
}

// ------------------------------------------------------------------ spikes
const SECTION = { decision: /^##\s+(?:\d+\.\s+)?(?:The\s+)?decision\b/i, fallback: /^##\s+(?:\d+\.\s+)?(?:The\s+)?fallback\b/i };

/** The words of the section whose heading matches `re`: from that heading to the next `## ` heading. */
export function sectionWords(markdown, re) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const start = lines.findIndex((l) => re.test(l));
  if (start < 0) return { line: null, words: 0 };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const body = lines.slice(start + 1, end).join(' ').replace(/[#|*_`>-]/g, ' ');
  return { line: start + 1, words: body.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length };
}

/** The run IDs a task names in its deliverables and acceptance (its description names others for context). */
export function runsNamedBy(task) {
  const text = [...(task.deliverables ?? []), ...(task.acceptance ?? [])].join('\n');
  return [...new Set(text.match(RUN_ID) ?? [])];
}

function checkRun(root, id, index) {
  const file = `runs/${id}.json`;
  if (!exists(root, file)) return { id, ok: false, why: `${file} does not exist` };
  const bytes = readBytes(root, file);
  let rec;
  try {
    rec = JSON.parse(bytes.toString('utf8'));
  } catch {
    return { id, ok: false, why: `${file} does not parse` };
  }
  if (rec.id !== id) return { id, ok: false, why: `${file} says its id is ${JSON.stringify(rec.id)}` };
  if (rec.pass === false) return { id, ok: false, why: `${file} says pass false` };
  const entry = index.get(id);
  if (entry === undefined) return { id, ok: false, why: `${id} is not in runs/index.json (regenerate it with scripts/runs/build-index.mjs)` };
  if (entry !== sha256(bytes)) return { id, ok: false, why: `runs/index.json holds another hash for ${id} (regenerate it with scripts/runs/build-index.mjs)` };
  return { id, ok: true, exit_code: rec.exit_code ?? null, configs: Array.isArray(rec.configs) ? rec.configs.length : 0 };
}

export function checkSpikes({ root, tasks }) {
  const w0 = tasks.filter((t) => t.wave === 'W0' && t.id !== 'W0-T11');
  const indexDoc = JSON.parse(readText(root, 'runs/index.json'));
  const index = new Map((indexDoc.runs ?? []).map((r) => [r.id, r.sha256]));
  const lines = [];
  const rows = [];
  let ok = true;
  const say = (good, text) => {
    if (!good) ok = false;
    lines.push(`${good ? '  ok  ' : '  FAIL'}  ${text}`);
  };

  for (const t of w0) {
    const row = { task: t.id, status: t.status, spike: t.workstream === 'Spikes', record: null, decision: null, fallback: null, runs: [] };
    const problems = [];
    if (t.status !== 'done') problems.push(`status is ${t.status}, not done`);
    if (row.spike) {
      const path_ = (t.deliverables ?? []).find((d) => /^docs\/spikes\/W0-S\d{2}\.md$/.test(d));
      if (path_ === undefined) problems.push('names no decision record in docs/spikes/');
      else {
        row.record = path_;
        if (!exists(root, path_)) problems.push(`${path_} does not exist`);
        else {
          const md = readText(root, path_);
          for (const [key, re] of Object.entries(SECTION)) {
            const s = sectionWords(md, re);
            row[key] = s;
            if (s.line === null) problems.push(`${path_} has no ${key} section`);
            else if (s.words < 20) problems.push(`${path_}: the ${key} section has ${s.words} words`);
          }
        }
      }
    }
    const named = runsNamedBy(t);
    if (row.spike && named.length === 0) problems.push('names no run in its deliverables or acceptance');
    for (const id of named) {
      const r = checkRun(root, id, index);
      row.runs.push(r);
      if (!r.ok) problems.push(r.why);
    }
    rows.push({ ...row, problems });
    const parts = [];
    if (row.spike) parts.push(row.record === null ? 'no decision record' : `${row.record}: decision l.${row.decision?.line ?? '-'}, fallback l.${row.fallback?.line ?? '-'}`);
    if (named.length > 0) parts.push(`${plural(named.length, 'run')} ${named.length <= 3 ? named.join(', ') : `${named.slice(0, 2).join(', ')} and ${named.length - 2} more`}`);
    if (row.spike || named.length > 0) say(problems.length === 0, `${t.id} ${parts.join('; ')}${problems.length > 0 ? `: ${problems.join('; ')}` : ''}`);
  }

  // Spine section 9.5's executed runs, as the generated registry holds them, against the records on disk.
  const registry = JSON.parse(readText(root, 'packages/ids/src/registry.json'));
  const executed = (registry.entries ?? []).filter((e) => e.kind === 'run' && e.status === 'executed').map((e) => e.id);
  const missing = executed.filter((id) => !exists(root, `runs/${id}.json`));
  say(missing.length === 0, `registry: ${executed.length} run IDs are executed in spine section 9.5, ${executed.length - missing.length} have a record in runs/${missing.length > 0 ? `; missing: ${missing.join(', ')}` : ''}`);

  const decisionTasks = rows.filter((r) => r.spike);
  const runsChecked = rows.reduce((a, r) => a + r.runs.length, 0);
  const summary = `spikes: ${ok ? 'PASS' : 'FAIL'} (${plural(decisionTasks.length, 'spike')} with a decision record and a fallback, ${plural(runsChecked, 'named run')} resolved, ${executed.length - missing.length} of ${executed.length} executed runs on disk)`;
  return { id: 'spikes', ok, lines, summary, data: { spikes: decisionTasks.length, tasks: rows, runs_checked: runsChecked, executed_runs: executed.length, executed_runs_missing: missing } };
}

// ------------------------------------------------------------------ keepkill
/** The git calls the keepkill check needs, as an object so that the tests can stand in for git. */
export function realGit(root) {
  const git = (args) => spawnSync('git', ['-C', root, ...args], { encoding: 'buffer', maxBuffer: 1 << 26 });
  return {
    blob: (ref, file) => {
      const r = git(['show', `${ref}:${file}`]);
      return r.status === 0 ? r.stdout : null;
    },
    history: (file) => {
      const r = git(['log', '--format=%H%x09%cI', '--', file]);
      if (r.status !== 0) return null;
      return r.stdout.toString('utf8').split('\n').filter(Boolean).map((l) => {
        const [hash, committed_at] = l.split('\t');
        return { hash, committed_at };
      });
    },
  };
}

export function checkKeepKill({ root, tasks, git = realGit(root) }) {
  const lines = [];
  let ok = true;
  const say = (good, text) => {
    if (!good) ok = false;
    lines.push(`${good ? '  ok  ' : '  FAIL'}  ${text}`);
  };
  const info = (text) => lines.push(`        ${text}`);

  const record = JSON.parse(readText(root, RULES_RUN));
  const recorded = (record.inputs ?? []).find((i) => i.path === RULES)?.sha256 ?? null;
  const rules = readBytes(root, RULES);
  const working = sha256(rules);
  say(recorded !== null && working === recorded, `rules in the working tree hash to ${working.slice(0, 12)}, the SHA-256 that ${RULES_RUN} records${recorded === null ? ' (the record names none)' : recorded === working ? '' : ` (${recorded.slice(0, 12)})`}`);

  const committed = git.blob('HEAD', RULES);
  say(committed !== null && sha256(committed) === recorded, committed === null ? `${RULES} is not in the last commit` : `rules in the last commit hash to ${sha256(committed).slice(0, 12)}, byte for byte what the record holds`);

  const history = git.history(RULES);
  const recordHistory = git.history(RULES_RUN);
  say(history !== null && history.length > 0, history === null ? 'git history of the rules is unreadable' : `rules committed: the file has ${plural(history.length, 'commit')}${history.length > 0 ? `, first ${history.at(-1).hash.slice(0, 7)} at ${history.at(-1).committed_at}, last ${history[0].hash.slice(0, 7)}` : ''}`);
  if (recordHistory !== null && recordHistory.length > 0) info(`record committed: first ${recordHistory.at(-1).hash.slice(0, 7)} at ${recordHistory.at(-1).committed_at}; hashed ${record.recorded_at}`);

  // A checkout that converts line endings changes the file's bytes and so its hash: .gitattributes must say -text (or eol=lf).
  const attributes = exists(root, '.gitattributes') ? readText(root, '.gitattributes').split('\n') : [];
  const rule = attributes.map((l) => l.trim().split(/\s+/)).find((parts) => parts[0] === RULES);
  const pinned = rule !== undefined && rule.slice(1).some((a) => a === '-text' || a === 'binary' || a === 'eol=lf');
  say(pinned, pinned ? `.gitattributes keeps the rules' line endings as committed (${rule.slice(1).join(' ')})` : '.gitattributes does not mark the rules file -text or eol=lf, so a checkout that converts line endings would change its hash');

  const lzRecords = fs.readdirSync(path.join(root, 'runs')).filter((f) => /^RUN-(?:lz-|boot-firstsuccess)/.test(f)).sort();
  say(lzRecords.length === 0, lzRecords.length === 0 ? 'no learner-zero export exists: no RUN-lz-* record and no RUN-boot-firstsuccess record' : `learner-zero records exist: ${lzRecords.join(', ')}`);
  const producers = tasks.filter((t) => LEARNER_ZERO_TASKS.includes(t.id));
  const past = producers.filter((t) => t.status === 'review' || t.status === 'done');
  say(past.length === 0, `the tasks that record learner-zero's runs are not finished: ${producers.map((t) => `${t.id} ${t.status}`).join(', ')}`);
  info('limit: events accrue on the learner\'s device and no repository shows the future, so the ordering is shown as far as it can be, and W1 confirms it when its first learner-zero run is recorded');

  const summary = `keepkill: ${ok ? 'PASS' : 'FAIL'} (rules ${working.slice(0, 12)}; ${history === null ? 'no history' : plural(history.length, 'commit')}; ${lzRecords.length === 0 ? 'no learner-zero record' : `${lzRecords.length} learner-zero records`})`;
  return { id: 'keepkill', ok, lines, summary, data: { line_endings_pinned: pinned, sha256: working, recorded_sha256: recorded, committed_sha256: committed === null ? null : sha256(committed), history, record_history: recordHistory, recorded_at: record.recorded_at ?? null, learner_zero_records: lzRecords, producer_statuses: Object.fromEntries(producers.map((t) => [t.id, t.status])) } };
}

// ------------------------------------------------------------------ command line
function parseArgs(argv) {
  const out = { command: null, root: SELF_ROOT, json: false, assume: [] };
  const rest = argv.slice();
  while (rest.length > 0) {
    const a = rest.shift();
    if (a === '--root') out.root = path.resolve(rest.shift() ?? '');
    else if (a === '--json') out.json = true;
    else if (a === '--with') out.assume.push(rest.shift() ?? '');
    else if (a.startsWith('--')) throw new Unreadable(`unknown option ${a}`);
    else if (out.command === null) out.command = a;
    else throw new Unreadable(`unexpected argument ${a}`);
  }
  if (!['queue', 'spikes', 'keepkill', 'all'].includes(out.command ?? '')) throw new Unreadable('usage: exit-check.mjs queue|spikes|keepkill|all [--with TASK] [--root DIR] [--json]');
  return out;
}

export async function run(argv) {
  const opts = parseArgs(argv);
  const { tasks, waves } = await loadTracker(opts.root);
  const checks = [];
  if (opts.command === 'queue' || opts.command === 'all') checks.push(checkQueue({ tasks, waves, assume: opts.assume }));
  if (opts.command === 'spikes' || opts.command === 'all') checks.push(checkSpikes({ root: opts.root, tasks }));
  if (opts.command === 'keepkill' || opts.command === 'all') checks.push(checkKeepKill({ root: opts.root, tasks }));
  const ok = checks.every((c) => c.ok);
  return { ok, checks, opts };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { ok, checks, opts } = await run(process.argv.slice(2));
    if (opts.json) console.log(JSON.stringify({ ok, checks: checks.map(({ id, ok: o, summary, lines, data }) => ({ id, ok: o, summary, lines, data })) }, null, 2));
    else {
      for (const c of checks) {
        console.log(`W0 exit: ${c.id}`);
        for (const l of c.lines) console.log(l);
        console.log(c.summary);
      }
    }
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error(`exit-check: ${e instanceof Error ? e.message : e}`);
    process.exit(2);
  }
}
