// Tests of exit-check.mjs (W0-T11). Each builds a small repository in a scratch directory, plants one fault, and
// shows that the check fails on it; the controls show that a sound tree passes. Run:
//   node --test scripts/spikes/W0-T11/exit-check.test.mjs

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkKeepKill, checkQueue, checkSpikes, loadTracker, reviewQueue, run, runsNamedBy, sectionWords, wavePlan } from './exit-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, 'exit-check.mjs');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const scratchBase = process.env.W0T11_SCRATCH ?? os.tmpdir();

// ------------------------------------------------------------------ a fixture repository
const RULES = 'content/governance/keepkill-rules.yaml';
const RULES_TEXT = 'rules: fixed\n';

/** Emit the YAML subset of tracker/tasks.yaml for the fields the checks read. */
function yamlOf(waves, tasks) {
  const scalar = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));
  const block = (obj, indent) =>
    Object.entries(obj)
      .map(([k, v], i) => {
        const lead = i === 0 ? `${indent}- ` : `${indent}  `;
        if (Array.isArray(v)) return `${lead}${k}:\n${v.map((x) => `${indent}    - ${scalar(x)}`).join('\n')}`;
        return `${lead}${k}: ${scalar(v)}`;
      })
      .join('\n');
  return `schema: "statespace/tracker@1"\nwaves:\n${waves.map((w) => block(w, '  ')).join('\n')}\ntasks:\n${tasks.map((t) => block(t, '  ')).join('\n')}\n`;
}

const DECISION = 'Decision\n\nThe instrument origin stays on its own subdomain behind the handshake, and every feature that reads untrusted input waits for it to be live in production.\n';
const FALLBACK = 'Fallback\n\nAnother static host serves the instrument origin, and the isolation rule is never relaxed, whatever the host offers or costs.\n';
const spikeDoc = (n) => `# W0-S0${n}\n\n**Status:** decision record.\n\n## 1. Question\n\nWhat?\n\n## 5. ${DECISION}\n## 6. ${FALLBACK}`;

/**
 * A sound tree: two spikes (each with a decision record and a run), one run-only task, one task in review, the keep/kill
 * rules with their record, and a registry that lists the three runs as executed.
 */
function makeTree(over = {}) {
  const root = fs.mkdtempSync(path.join(scratchBase, 'w0t11-'));
  const put = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  const tasks = over.tasks ?? [
    { id: 'W0-S01', wave: 'W0', workstream: 'Spikes', deliverables: ['docs/spikes/W0-S01.md', 'runs/RUN-alpha.json'], acceptance: ['RUN-alpha: it runs'], status: 'done', owner_review: true, review_h: 0.5 },
    { id: 'W0-S02', wave: 'W0', workstream: 'Spikes', deliverables: ['docs/spikes/W0-S02.md'], acceptance: ['RUN-beta recorded'], status: 'done', owner_review: true, review_h: 0.5 },
    { id: 'W0-S12', wave: 'W0', workstream: 'Platform', deliverables: ['vendor/x/'], acceptance: ['RUN-gamma recorded as a run@1 file'], status: 'done', owner_review: true, review_h: 1 },
    { id: 'W0-T11', wave: 'W0', workstream: 'Wave exit', deliverables: ['docs/waves/W0-exit.md'], acceptance: ['RUN-alpha under 5 minutes'], status: 'todo', owner_review: true, review_h: 0.25 },
    { id: 'W1-T08', wave: 'W1', workstream: 'Learner', status: 'todo', owner_review: true, review_h: 1 },
    { id: 'W1-T09', wave: 'W1', workstream: 'Learner', status: 'todo', owner_review: true, review_h: 1.5 },
  ];
  const waves = over.waves ?? [{ id: 'W0', review_h: 2.25 }, { id: 'W1', review_h: 2.5 }];
  put('tracker/tasks.yaml', yamlOf(waves, tasks));
  put('docs/spikes/W0-S01.md', over.spike1 ?? spikeDoc(1));
  put('docs/spikes/W0-S02.md', over.spike2 ?? spikeDoc(2));
  const runs = {};
  for (const id of ['RUN-alpha', 'RUN-beta', 'RUN-gamma']) {
    const text = `${JSON.stringify({ id, title: id, pass: true, exit_code: 0 }, null, 2)}\n`;
    runs[id] = text;
    if (!(over.missingRuns ?? []).includes(id)) put(`runs/${id}.json`, text);
  }
  const rulesRecord = `${JSON.stringify({ id: 'RUN-keepkill-rules', recorded_at: '2026-10-24T14:02:01Z', inputs: [{ path: RULES, sha256: sha(RULES_TEXT) }] }, null, 2)}\n`;
  put(RULES_RUN_FILE, rulesRecord);
  put(RULES, over.rules ?? RULES_TEXT);
  const index = Object.entries(runs).map(([id, text]) => ({ id, sha256: over.indexHash?.[id] ?? sha(text) }));
  index.push({ id: 'RUN-keepkill-rules', sha256: sha(rulesRecord) });
  put('runs/index.json', `${JSON.stringify({ count: index.length, runs: index }, null, 2)}\n`);
  put('packages/ids/src/registry.json', `${JSON.stringify({ entries: (over.executed ?? ['RUN-alpha', 'RUN-beta', 'RUN-gamma']).map((id) => ({ id, kind: 'run', status: 'executed' })) })}\n`);
  put('.gitattributes', over.gitattributes ?? `${RULES} -text\n`);
  for (const f of over.extraFiles ?? []) put(f, '{}\n');
  return { root, tasks, waves };
}
const RULES_RUN_FILE = 'runs/RUN-keepkill-rules.json';

/** git, standing in for the real thing. */
const fakeGit = (over = {}) => ({
  blob: () => (over.blob === undefined ? Buffer.from(RULES_TEXT) : over.blob),
  history: (file) => (file === RULES ? (over.history ?? [{ hash: 'a'.repeat(40), committed_at: '2026-10-24T11:22:49-07:00' }]) : [{ hash: 'b'.repeat(40), committed_at: '2026-10-24T11:22:49-07:00' }]),
});

const clean = (root) => fs.rmSync(root, { recursive: true, force: true });
const failing = (report) => report.lines.filter((l) => l.startsWith('  FAIL'));

// ------------------------------------------------------------------ queue
test('the queue sums review_h over tasks in review with owner review, and only those', () => {
  const tasks = [
    { id: 'A', status: 'review', owner_review: true, review_h: 0.35 },
    { id: 'B', status: 'review', owner_review: true, review_h: 0.6 },
    { id: 'C', status: 'review', owner_review: false, review_h: 3 },
    { id: 'D', status: 'done', owner_review: true, review_h: 2 },
    { id: 'E', status: 'todo', owner_review: true, review_h: 1 },
  ];
  const q = reviewQueue(tasks);
  assert.deepEqual(q.in_review.map((t) => t.id), ['A', 'B']);
  assert.equal(q.hours, 0.95, 'the sum is rounded to hundredths, so 0.35 + 0.6 is 0.95 and not 0.9499999999999999');
});

test('--with counts a task that is not in review yet, once, and rejects an unknown task', () => {
  const tasks = [
    { id: 'A', status: 'review', owner_review: true, review_h: 1 },
    { id: 'B', status: 'todo', owner_review: true, review_h: 0.25 },
  ];
  assert.equal(reviewQueue(tasks, ['B']).hours_with_assumed, 1.25);
  assert.equal(reviewQueue(tasks, ['A']).hours_with_assumed, 1, 'a task already in review is not counted twice');
  assert.throws(() => reviewQueue(tasks, ['Z']), /does not have/);
  assert.throws(() => reviewQueue([{ id: 'A', status: 'review', owner_review: true }]), /review_h/);
});

test('the gate is "under 10 h": 9.75 passes and 10 fails, now or with the assumed task', () => {
  const waves = [{ id: 'W1', review_h: 0 }];
  const at = (h, extra = 0) => checkQueue({ tasks: [{ id: 'A', wave: 'W0', status: 'review', owner_review: true, review_h: h }, { id: 'B', wave: 'W0', status: 'todo', owner_review: true, review_h: extra }], waves, assume: extra > 0 ? ['B'] : [] });
  assert.equal(at(9.75).ok, true);
  assert.equal(at(10).ok, false);
  assert.equal(at(9.75, 0.25).ok, false, '9.75 h plus the 0.25 h task reaches the gate');
  assert.match(failing(at(10))[0], /under 10 h/);
});

test("a wave's planned review that disagrees with waves[].review_h fails", () => {
  const tasks = [{ id: 'W1-T01', wave: 'W1', status: 'todo', owner_review: true, review_h: 1 }, { id: 'W1-T02', wave: 'W1', status: 'todo', owner_review: false, review_h: 5 }];
  assert.equal(wavePlan(tasks, [{ id: 'W1', review_h: 1 }], 'W1').agrees, true, 'a task without owner review plans no review');
  const report = checkQueue({ tasks, waves: [{ id: 'W1', review_h: 2 }] });
  assert.equal(report.ok, false);
  assert.match(failing(report)[0], /plan/);
});

// ------------------------------------------------------------------ spikes
test('sectionWords finds numbered and plain headings, stops at the next ## heading and skips ### headings', () => {
  const md = '# T\n\n### 4.9 The fallback works\n\nthis is a subsection.\n\n## 5. Decision\n\none two three\n\n## 6. The fallback W5 builds on\n\nfour five\n\n## 7. Next\n\nmany many many many\n';
  assert.deepEqual(sectionWords(md, /^##\s+(?:\d+\.\s+)?(?:The\s+)?decision\b/i), { line: 7, words: 3 });
  assert.deepEqual(sectionWords(md, /^##\s+(?:\d+\.\s+)?(?:The\s+)?fallback\b/i), { line: 11, words: 2 });
  assert.deepEqual(sectionWords('# nothing\n', /^##\s+decision\b/i), { line: null, words: 0 });
});

test('runsNamedBy reads deliverables and acceptance, not the description', () => {
  assert.deepEqual(
    runsNamedBy({ description: 'mentions RUN-ignored', deliverables: ['runs/RUN-a.json', 'x'], acceptance: ['RUN-a and RUN-b-2 recorded'] }),
    ['RUN-a', 'RUN-b-2'],
  );
});

test('a sound tree passes the spikes check', async () => {
  const { root, tasks } = makeTree();
  try {
    const report = checkSpikes({ root, tasks });
    assert.equal(report.ok, true, report.lines.join('\n'));
    assert.equal(report.data.spikes, 2);
    assert.equal(report.data.runs_checked, 3, 'alpha (W0-S01), beta (W0-S02) and gamma (W0-S12); the exit task itself is not checked against its own record');
    assert.equal(report.data.executed_runs, 3);
  } finally {
    clean(root);
  }
});

test('planted: a spike without its Fallback section fails', () => {
  const { root, tasks } = makeTree({ spike2: '# W0-S02\n\n## 5. Decision\n\nWe decided something with enough words to count as a decision paragraph for the checker to read.\n' });
  try {
    const report = checkSpikes({ root, tasks });
    assert.equal(report.ok, false);
    assert.match(failing(report).join('\n'), /W0-S02.*no fallback section/);
  } finally {
    clean(root);
  }
});

test('planted: a Decision section with a stub of a paragraph fails', () => {
  const { root, tasks } = makeTree({ spike1: '# W0-S01\n\n## 5. Decision\n\nYes.\n\n## 6. Fallback\n\nAnother static host serves the instrument origin, and the isolation rule is never relaxed, whatever the host offers or costs.\n' });
  try {
    const report = checkSpikes({ root, tasks });
    assert.equal(report.ok, false);
    assert.match(failing(report).join('\n'), /W0-S01.*decision section has/);
  } finally {
    clean(root);
  }
});

test('planted: a named run without a record, or with a record the index does not match, fails', () => {
  for (const [over, pattern] of [
    [{ missingRuns: ['RUN-beta'] }, /RUN-beta.*does not exist/],
    [{ indexHash: { 'RUN-alpha': 'f'.repeat(64) } }, /another hash for RUN-alpha/],
  ]) {
    const { root, tasks } = makeTree(over);
    try {
      const report = checkSpikes({ root, tasks });
      assert.equal(report.ok, false, report.lines.join('\n'));
      assert.match(failing(report).join('\n'), pattern);
    } finally {
      clean(root);
    }
  }
});

test('planted: an executed run of the spine with no record fails the registry line', () => {
  const { root, tasks } = makeTree({ executed: ['RUN-alpha', 'RUN-beta', 'RUN-gamma', 'RUN-delta'] });
  try {
    const report = checkSpikes({ root, tasks });
    assert.equal(report.ok, false);
    assert.match(failing(report).join('\n'), /registry.*missing: RUN-delta/);
  } finally {
    clean(root);
  }
});

test('planted: a W0 task that is not done fails', async () => {
  const { root, tasks } = makeTree();
  try {
    tasks.find((t) => t.id === 'W0-S12').status = 'review';
    const report = checkSpikes({ root, tasks });
    assert.equal(report.ok, false);
    assert.match(failing(report).join('\n'), /W0-S12.*status is review/);
  } finally {
    clean(root);
  }
});

// ------------------------------------------------------------------ keepkill
test('the keep/kill check passes on rules that match the record, in the tree and in the commit', async () => {
  const { root } = makeTree();
  try {
    const { tasks } = await loadTracker(root);
    const report = checkKeepKill({ root, tasks, git: fakeGit() });
    assert.equal(report.ok, true, report.lines.join('\n'));
    assert.equal(report.data.sha256, sha(RULES_TEXT));
  } finally {
    clean(root);
  }
});

test('planted: rules edited after they were hashed fail, in the tree and in the commit', async () => {
  const edited = makeTree({ rules: 'rules: changed\n' });
  const committed = makeTree();
  try {
    const a = checkKeepKill({ root: edited.root, tasks: (await loadTracker(edited.root)).tasks, git: fakeGit({ blob: Buffer.from('rules: changed\n') }) });
    assert.equal(a.ok, false);
    assert.match(failing(a).join('\n'), /working tree hash/);
    const b = checkKeepKill({ root: committed.root, tasks: (await loadTracker(committed.root)).tasks, git: fakeGit({ blob: Buffer.from(`${RULES_TEXT}\n`) }) });
    assert.equal(b.ok, false);
    assert.match(failing(b).join('\n'), /last commit/);
    const c = checkKeepKill({ root: committed.root, tasks: (await loadTracker(committed.root)).tasks, git: fakeGit({ blob: null }) });
    assert.match(failing(c).join('\n'), /not in the last commit/);
  } finally {
    clean(edited.root);
    clean(committed.root);
  }
});

test('planted: rules whose line endings a checkout may convert fail', async () => {
  for (const gitattributes of ['# nothing here\n', `${RULES} text\n`, `docs/other.md -text\n`]) {
    const { root } = makeTree({ gitattributes });
    try {
      const report = checkKeepKill({ root, tasks: (await loadTracker(root)).tasks, git: fakeGit() });
      assert.equal(report.ok, false, gitattributes);
      assert.match(failing(report).join('\n'), /\.gitattributes does not mark/);
    } finally {
      clean(root);
    }
  }
  const { root } = makeTree({ gitattributes: `${RULES} text eol=lf\n` });
  try {
    assert.equal(checkKeepKill({ root, tasks: (await loadTracker(root)).tasks, git: fakeGit() }).ok, true, 'eol=lf pins the endings too');
  } finally {
    clean(root);
  }
});

test('planted: a learner-zero record, or a finished task that records one, fails', async () => {
  const withRecord = makeTree({ extraFiles: ['runs/RUN-lz-boot-w1.json'] });
  const finished = makeTree();
  try {
    const a = checkKeepKill({ root: withRecord.root, tasks: (await loadTracker(withRecord.root)).tasks, git: fakeGit() });
    assert.equal(a.ok, false);
    assert.match(failing(a).join('\n'), /RUN-lz-boot-w1/);
    const tasks = (await loadTracker(finished.root)).tasks;
    tasks.find((t) => t.id === 'W1-T09').status = 'review';
    const b = checkKeepKill({ root: finished.root, tasks, git: fakeGit() });
    assert.equal(b.ok, false);
    assert.match(failing(b).join('\n'), /W1-T09 review/);
    tasks.find((t) => t.id === 'W1-T09').status = 'in-progress';
    assert.equal(checkKeepKill({ root: finished.root, tasks, git: fakeGit() }).ok, true, 'a task that is under way has recorded nothing yet');
  } finally {
    clean(withRecord.root);
    clean(finished.root);
  }
});

// ------------------------------------------------------------------ the command line
test('the command line exits 0 on a sound queue, 1 on a full one, 2 on a tree it cannot read', async () => {
  const sound = makeTree();
  const full = makeTree({ tasks: [{ id: 'W0-S01', wave: 'W0', status: 'review', owner_review: true, review_h: 10 }], waves: [{ id: 'W1', review_h: 0 }] });
  const empty = fs.mkdtempSync(path.join(scratchBase, 'w0t11-empty-'));
  try {
    const exec = (root, ...args) => spawnSync(process.execPath, [SCRIPT, 'queue', '--root', root, ...args], { encoding: 'utf8' });
    assert.equal(exec(sound.root).status, 0);
    assert.equal(exec(full.root).status, 1);
    const unreadable = exec(empty);
    assert.equal(unreadable.status, 2);
    assert.match(unreadable.stderr, /cannot read tracker\/tasks\.yaml/);
    const json = JSON.parse(exec(sound.root, '--with', 'W0-T11', '--json').stdout);
    assert.equal(json.checks[0].data.hours_with_assumed, 0.25);
    assert.equal(spawnSync(process.execPath, [SCRIPT, 'nonsense'], { encoding: 'utf8' }).status, 2);
  } finally {
    clean(sound.root);
    clean(full.root);
    clean(empty);
  }
});

test('run() on the fixture runs the three checks, with git as the real one reads the scratch directory (no repository: keepkill fails)', async () => {
  const { root } = makeTree();
  try {
    const { checks } = await run(['all', '--root', root]);
    assert.deepEqual(checks.map((c) => c.id), ['queue', 'spikes', 'keepkill']);
    assert.equal(checks[0].ok, true);
    assert.equal(checks[1].ok, true);
    assert.equal(checks[2].ok, false, 'a directory that is not a git repository has no last commit');
  } finally {
    clean(root);
  }
});
