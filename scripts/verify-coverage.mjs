#!/usr/bin/env node
// GATE-coverage (spine section 11.2; W1-T04). Dependency-free.
//
//   node scripts/verify-coverage.mjs              run the gate on this repository
//   node scripts/verify-coverage.mjs --json       print the findings as JSON
//   node scripts/verify-coverage.mjs --self-check plant faults in memory and require the gate to fail on each
//   node scripts/verify-coverage.mjs --root DIR   read the files under DIR (tests)
//
// Exit status: 0 green, 1 findings, 2 a required file could not be read.
//
// It parses docs/COVERAGE.md, the matrix that maps every clause of the roadmap to where the course covers it, and
// reads each table row's lesson, LAB (lab, lab stage, lab check), CL and SP IDs, with en-dash ranges between IDs
// of one prefix (SP-1.1–SP-1.3) read as every ID between. It fails when
//   unresolved  such an ID is not in the registry generated from the spine (packages/ids/src/registry.json), so it
//               no longer resolves; or
//   cut         a lesson the row cites was cut and the row names no receiving ID. A cut is applied in the spine's
//               section 14 table ("# | Bridge | Its KCs move to"): the bridge struck through (~~S4.L5~~) or its row
//               marked "cut" in the # cell. The receiving IDs are the lessons the row's last cell names; a
//               receiving lesson that is cut in turn passes on its own receivers. Spine section 14's criterion (4)
//               asks that the receiving lesson name every roadmap clause whose only home was the cut bridge; the
//               matrix row is that clause, so the row must name the receiving ID.
// A row is one line of a table in COVERAGE.md; the clause is its first cell, and IDs are read from every cell.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}
const { scanBlocks } = await import('../packages/ids/src/markdown.ts');
const { scanLine } = await import('../packages/ids/src/grammar.ts');

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const COVERAGE_PATH = 'docs/COVERAGE.md';
export const SPINE_PATH = 'docs/spine/SPINE.md';
export const REGISTRY_PATH = 'packages/ids/src/registry.json';
/** The ID kinds the gate checks, as the registry names them. */
export const KINDS = ['lesson', 'lab', 'lab-stage', 'lab-check', 'claim-template', 'specimen'];
const CUT_HEADER = ['#', 'Bridge', 'Its KCs move to'];

/** @param {string} path @returns {string | null} */
function readOrNull(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') return null;
    throw e;
  }
}

const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

/**
 * The IDs a range between two IDs of one prefix stands for (SP-1.1–SP-1.3, LAB-4.2–LAB-4.4, S9.L4–S9.L6,
 * LAB-2.c1–LAB-2.c3), or null for a range across prefixes (SP-1.1–SP-9.6), whose endpoints alone are read.
 * @param {string} a @param {string} b
 */
export function between(a, b) {
  const m1 = /^(.*?)([0-9]+)$/.exec(a);
  const m2 = /^(.*?)([0-9]+)$/.exec(b);
  if (m1 === null || m2 === null || m1[1] !== m2[1]) return null;
  const lo = Number(m1[2]);
  const hi = Number(m2[2]);
  if (hi < lo || hi - lo > 200) return null;
  return range(lo, hi).map((n) => `${m1[1]}${n}`);
}

/**
 * The checked IDs of one row, in order, with en-dash ranges expanded.
 * @param {readonly string[]} cells
 * @returns {{ id: string, kind: string, inRange: boolean }[]}
 */
export function rowIds(cells) {
  /** @type {{ id: string, kind: string, inRange: boolean }[]} */
  const out = [];
  const seen = new Set();
  const push = (id, kind, inRange) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, kind, inRange });
  };
  for (const cell of cells) {
    const toks = scanLine(cell);
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (!KINDS.includes(t.kind)) continue;
      push(t.id, t.kind, false);
      const next = toks[i + 1];
      // "A–B": the next token starts right after an en dash
      if (next !== undefined && next.kind === t.kind && cell.slice(t.col - 1 + t.id.length, next.col - 1) === '–') {
        for (const id of between(t.id, next.id) ?? []) push(id, t.kind, true);
      }
    }
  }
  return out;
}

/**
 * The cut table of spine section 14, with which rows are applied and what each cut bridge's coverage moves to.
 * @param {string} spine
 */
export function readCuts(spine) {
  const blocks = scanBlocks(spine.replace(/\r\n?/g, '\n'));
  const tables = blocks.filter((b) => b.type === 'table' && b.section === '14' && b.header.length === CUT_HEADER.length && b.header.every((h, i) => h === CUT_HEADER[i]));
  /** @type {string[]} */
  const problems = [];
  if (tables.length !== 1) problems.push(`spine section 14 should hold one cut table headed "${CUT_HEADER.join(' | ')}", found ${tables.length}`);
  /** @type {Map<string, { row: string, receivers: string[], applied: boolean, line: number }>} */
  const cuts = new Map();
  for (const r of tables[0]?.rows ?? []) {
    const [num, bridgeCell, moveCell] = r.cells;
    const bridge = scanLine(bridgeCell ?? '').find((t) => t.kind === 'lesson')?.id;
    if (bridge === undefined) {
      problems.push(`spine section 14, line ${r.line}: the Bridge cell "${bridgeCell}" names no lesson`);
      continue;
    }
    const receivers = [...new Set(scanLine(moveCell ?? '').filter((t) => t.kind === 'lesson').map((t) => t.id))];
    if (receivers.length === 0) problems.push(`spine section 14, line ${r.line}: ${bridge}'s row names no receiving lesson`);
    const applied = /~~\s*S[0-9]+\.L[0-9]+\s*~~/.test(bridgeCell ?? '') || /\bcut\b/i.test(num ?? '');
    cuts.set(bridge, { row: (num ?? '').replace(/\D.*$/, ''), receivers, applied, line: r.line });
  }
  return { cuts, problems };
}

/**
 * GATE-coverage's checks. Pure: texts and the registry in, findings out.
 * @param {{ coverage: string, spine: string, registry: { id: string, kind: string }[] }} inputs
 */
export function checkCoverage(inputs) {
  /** @type {{ check: string, message: string, where: string }[]} */
  const failures = [];
  const known = new Map(inputs.registry.filter((e) => KINDS.includes(e.kind)).map((e) => [e.id, e.kind]));
  const { cuts, problems } = readCuts(inputs.spine);
  for (const p of problems) failures.push({ check: 'cut', message: p, where: SPINE_PATH });
  const applied = [...cuts.entries()].filter(([, c]) => c.applied).map(([id]) => id);
  /** Every lesson that stands in for a cut one, following a receiver that is cut in turn. */
  const receiversOf = (id, seen = new Set()) => {
    const c = cuts.get(id);
    if (c === undefined || !c.applied || seen.has(id)) return [];
    seen.add(id);
    return c.receivers.flatMap((r) => [r, ...receiversOf(r, seen)]);
  };

  const blocks = scanBlocks(inputs.coverage.replace(/\r\n?/g, '\n'));
  const tables = blocks.filter((b) => b.type === 'table');
  let rows = 0;
  let ids = 0;
  for (const t of tables) {
    for (const r of t.rows) {
      rows++;
      const where = `${COVERAGE_PATH}:${r.line}`;
      if (r.cells.length !== t.header.length) failures.push({ check: 'rows', message: `a row of the table under "${t.heading}" has ${r.cells.length} cells, not ${t.header.length}`, where });
      const clause = (r.cells[0] ?? '').replace(/\s+/g, ' ').slice(0, 90);
      const found = rowIds(r.cells);
      ids += found.length;
      for (const f of found) {
        if (!known.has(f.id)) {
          failures.push({ check: 'unresolved', message: `"${clause}": ${f.id}${f.inRange ? ' (inside a range)' : ''} does not resolve: the spine registers no ${f.kind} ${f.id}`, where });
        } else if (known.get(f.id) !== f.kind) {
          failures.push({ check: 'unresolved', message: `"${clause}": ${f.id} names a ${known.get(f.id)}, not a ${f.kind}`, where });
        }
      }
      const rowSet = new Set(found.map((f) => f.id));
      for (const f of found) {
        if (f.kind !== 'lesson' || !applied.includes(f.id)) continue;
        const receivers = [...new Set(receiversOf(f.id))].filter((x) => !applied.includes(x));
        if (!receivers.some((x) => rowSet.has(x))) {
          const c = cuts.get(f.id);
          failures.push({ check: 'cut', message: `"${clause}": ${f.id} was cut (spine section 14, row ${c?.row ?? '?'}) and the row names no receiving ID (${receivers.join(' or ') || 'none listed'})`, where });
        }
      }
    }
  }
  return {
    failures,
    summary: `${rows} rows in ${tables.length} tables of ${COVERAGE_PATH}: ${ids} lesson, LAB, CL and SP IDs, every one resolving against the registry; ${cuts.size} cut-eligible bridges in spine section 14, ${applied.length} cut${applied.length === 0 ? '' : ` (${applied.join(', ')}), each row that cites one naming its receiving ID`}`,
    rows,
    ids,
    applied,
  };
}

/**
 * Read the gate's inputs from a repository root.
 * @param {string} root
 */
export function loadInputs(root) {
  const coverage = readOrNull(join(root, COVERAGE_PATH));
  const spine = readOrNull(join(root, SPINE_PATH));
  const registryText = readOrNull(join(root, REGISTRY_PATH));
  if (coverage === null) return { missing: COVERAGE_PATH };
  if (spine === null) return { missing: SPINE_PATH };
  if (registryText === null) return { missing: REGISTRY_PATH };
  return { coverage, spine, registry: JSON.parse(registryText).entries };
}

/** The table of section 4's Stage 1 matrix, where the self-check plants a row. */
const STAGE1 = '### Stage 1 — Find a bug mathematically (S1)';

/**
 * Planted faults: each must fail its check, beside whatever the unplanted tree already reports.
 * @type {{ name: string, check: string, text: RegExp, edit: (i: { coverage: string, spine: string, registry: any[] }) => { coverage: string, spine: string, registry: any[] } }[]}
 */
export const PLANTS = [
  {
    name: 'a lesson ID that does not resolve',
    check: 'unresolved',
    text: /S1\.L9 does not resolve/,
    edit: (i) => ({ ...i, coverage: addRow(i.coverage, STAGE1, '| Planted: a clause homed in a lesson that does not exist | S1.L9 | C | |') }),
  },
  {
    name: 'a lab check that does not resolve',
    check: 'unresolved',
    text: /LAB-1\.c9 does not resolve/,
    edit: (i) => ({ ...i, coverage: addRow(i.coverage, STAGE1, '| Planted: a check that does not exist | LAB-1.c9 | C | |') }),
  },
  {
    name: 'a specimen inside a range that does not resolve',
    check: 'unresolved',
    text: /SP-1\.11 \(inside a range\) does not resolve/,
    edit: (i) => ({ ...i, coverage: addRow(i.coverage, STAGE1, '| Planted: a range past the last specimen | SP-1.9–SP-1.12 | C | |') }),
  },
  {
    name: 'a claim template that does not resolve',
    check: 'unresolved',
    text: /CL-1\.6 does not resolve/,
    edit: (i) => ({ ...i, coverage: addRow(i.coverage, STAGE1, '| Planted: a claim that does not exist | CL-1.6 | C | |') }),
  },
  {
    name: 'a cut bridge whose clause names no receiving ID',
    check: 'cut',
    text: /S3\.L8 was cut \(spine section 14, row 5\) and the row names no receiving ID \(S3\.L7\)/,
    edit: (i) => ({ ...i, spine: i.spine.replace('| 5 | S3.L8 | S3.L7 |', '| 5 (cut) | ~~S3.L8~~ | S3.L7 |') }),
  },
];

/**
 * Add a row after the last row of the first table that follows a heading.
 * @param {string} text @param {string} heading @param {string} row
 */
export function addRow(text, heading, row) {
  const lines = text.split('\n');
  let i = lines.indexOf(heading);
  if (i < 0) throw new Error(`no heading "${heading}"`);
  while (i < lines.length && !lines[i].startsWith('|')) i++;
  while (i < lines.length && lines[i].startsWith('|')) i++;
  lines.splice(i, 0, row);
  return lines.join('\n');
}

/** @param {{ coverage: string, spine: string, registry: any[] }} inputs */
export function selfCheck(inputs) {
  const base = new Set(checkCoverage(inputs).failures.map((f) => `${f.check}\u0000${f.message}`));
  const results = PLANTS.map((p) => {
    const r = checkCoverage(p.edit(inputs));
    const fresh = r.failures.filter((f) => f.check === p.check && !base.has(`${f.check}\u0000${f.message}`));
    const hit = fresh.find((f) => p.text.test(f.message));
    return { name: p.name, ok: hit !== undefined, detail: hit?.message ?? fresh[0]?.message ?? `no new ${p.check} failure` };
  });
  // and the receiving ID clears the cut: the same planted cut, with S3.L7 added to the termination row
  const cleared = PLANTS[PLANTS.length - 1].edit(inputs);
  const fixed = { ...cleared, coverage: cleared.coverage.replace('| Theory: termination | S3.L8 (KC-3.termination-fuel) |', '| Theory: termination | S3.L8 (KC-3.termination-fuel), now in S3.L7 |') };
  const leftover = checkCoverage(fixed).failures.filter((f) => f.check === 'cut' && !base.has(`${f.check}\u0000${f.message}`) && /S3\.L8 was cut/.test(f.message) && /termination/.test(f.message));
  results.push({ name: 'naming the receiving ID clears the cut', ok: leftover.length === 0, detail: leftover[0]?.message ?? '' });
  return results;
}

/**
 * @param {string[]} argv
 * @param {{ out?: (s: string) => void, err?: (s: string) => void }} [io]
 * @returns {number} the exit code
 */
export function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  let root = defaultRoot;
  const flags = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') root = resolve(argv[++i] ?? '');
    else if (a === '--json' || a === '--self-check') flags.add(a);
    else if (a === '--help' || a === '-h') {
      out('usage: node scripts/verify-coverage.mjs [--json] [--self-check] [--root dir]');
      return 0;
    } else {
      err(`usage: node scripts/verify-coverage.mjs [--json] [--self-check] [--root dir]\nunknown argument: ${a}`);
      return 2;
    }
  }
  const inputs = loadInputs(root);
  if ('missing' in inputs) {
    err(`GATE-coverage: cannot read ${inputs.missing}`);
    return 2;
  }
  if (flags.has('--self-check')) {
    out('GATE-coverage self-check: plant each fault in memory, run the gate, require it to fail on the right check');
    const results = selfCheck(inputs);
    for (const r of results) out(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.ok ? '' : `: ${r.detail}`}`);
    const bad = results.filter((r) => !r.ok).length;
    out(`GATE-coverage self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
    return bad === 0 ? 0 : 1;
  }
  const report = checkCoverage(inputs);
  if (flags.has('--json')) {
    out(JSON.stringify({ green: report.failures.length === 0, failures: report.failures, summary: report.summary }, null, 2));
    return report.failures.length === 0 ? 0 : 1;
  }
  out(`GATE-coverage: ${COVERAGE_PATH} against ${REGISTRY_PATH} and spine section 14`);
  if (report.failures.length === 0) out(`OK    coverage    ${report.summary}`);
  for (const f of report.failures) out(`FAIL  ${(f.check + ' '.repeat(12)).slice(0, 12)}${f.message}  [${f.where}]`);
  out(`GATE-coverage: ${report.failures.length === 0 ? 'green' : `red (${report.failures.length} failure${report.failures.length === 1 ? '' : 's'})`}`);
  return report.failures.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.on('error', (e) => {
    if (/** @type {NodeJS.ErrnoException} */ (e).code !== 'EPIPE') throw e;
  });
  process.exitCode = main(process.argv.slice(2));
}
