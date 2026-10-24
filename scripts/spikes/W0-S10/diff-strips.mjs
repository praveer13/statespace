#!/usr/bin/env node
// Compare two sets of generated Goal Replay strips and print a reviewable diff (W0-S10 spike).
//
// Usage: node diff-strips.mjs <committed-dir> <regenerated-dir> [--names <a>,<b>]
// Exit codes: 0 every file is byte-identical; 1 the sets differ; 2 usage or read error.
//
// The check is byte equality over every file in both directories, which is the equality GATE-replay
// needs. When the sets differ, the report is organised for a reader: what changed in the manifest
// (toolchain, options, spec, sources, code points), then, strip by strip and state by state, each
// changed goal shown whole with its removed and added lines marked. Unchanged states are not printed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

export function readSet(dir) {
  const files = new Map();
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isFile()) files.set(name, fs.readFileSync(full));
  }
  return files;
}

/** sha256sum-style listing of a set, and the hash of that listing. */
export function setDigest(files) {
  const listing = [...files].map(([name, data]) => `${sha256(data)}  ${name}\n`).join('');
  return { listing, sha256: sha256(listing) };
}

/** Line diff by longest common subsequence: [[' ' | '-' | '+', line], ...]. */
export function diffLines(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push([' ', a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(['-', a[i++]]);
    else ops.push(['+', b[j++]]);
  }
  while (i < n) ops.push(['-', a[i++]]);
  while (j < m) ops.push(['+', b[j++]]);
  return ops;
}

const flatten = (goals) => (goals.length === 0 ? ['no goals'] : goals.length === 1 ? goals[0] : goals.flatMap((g, k) => [`[goal ${k + 1} of ${goals.length}]`, ...g]));

export function compare(a, b, names = ['committed', 'regenerated']) {
  const report = [];
  const stats = { strips: 0, stripsChanged: 0, states: 0, statesChanged: 0, added: 0, removed: 0 };
  const onlyA = [...a.keys()].filter((k) => !b.has(k));
  const onlyB = [...b.keys()].filter((k) => !a.has(k));
  const differing = [...a.keys()].filter((k) => b.has(k) && !a.get(k).equals(b.get(k)));
  if (onlyA.length) report.push(`files only in ${names[0]}: ${onlyA.join(', ')}`);
  if (onlyB.length) report.push(`files only in ${names[1]}: ${onlyB.join(', ')}`);
  report.push(`files that differ: ${differing.length === 0 ? 'none' : differing.length} of ${new Set([...a.keys(), ...b.keys()]).size}`);

  // Manifest: what produced the strips.
  const manifests = ['manifest.json'].filter((f) => a.has(f) && b.has(f)).map((f) => [JSON.parse(a.get(f)), JSON.parse(b.get(f))]);
  if (manifests.length) {
    const [ma, mb] = manifests[0];
    const field = (label, x, y) => { if (JSON.stringify(x) !== JSON.stringify(y)) report.push(`manifest ${label}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`); };
    field('toolchain.banner', ma.toolchain.banner, mb.toolchain.banner);
    field('toolchain.binarySha256', ma.toolchain.binarySha256, mb.toolchain.binarySha256);
    field('leanOptions', ma.leanOptions, mb.leanOptions);
    field('spec.sha256', ma.spec?.sha256, mb.spec?.sha256);
    for (const sa of ma.sources) {
      const sb = mb.sources.find((s) => s.file === sa.file);
      if (!sb) { report.push(`manifest source ${sa.file}: only in ${names[0]}`); continue; }
      field(`source ${sa.file} sha256`, sa.sha256, sb.sha256);
      field(`source ${sa.file} diagnostics`, sa.diagnostics, sb.diagnostics);
    }
    const added = mb.codePoints.filter((c) => !ma.codePoints.includes(c));
    const removed = ma.codePoints.filter((c) => !mb.codePoints.includes(c));
    if (added.length || removed.length) report.push(`manifest codePoints: added ${added.join(' ') || 'none'}; removed ${removed.join(' ') || 'none'} (GATE-glyphs reads this list)`);
    field('maxGoalLineLength', ma.maxGoalLineLength, mb.maxGoalLineLength);
    field('warnings', ma.warnings, mb.warnings);
  }

  // Strips, in manifest order.
  const ids = new Set();
  for (const f of [...a.keys(), ...b.keys()]) if (f.endsWith('.strip.json')) ids.add(f.slice(0, -'.strip.json'.length));
  for (const id of [...ids].sort()) {
    const fa = `${id}.strip.json`;
    if (!a.has(fa) || !b.has(fa)) { report.push(`strip ${id}: only in ${a.has(fa) ? names[0] : names[1]}`); continue; }
    stats.strips++;
    const sa = JSON.parse(a.get(fa));
    const sb = JSON.parse(b.get(fa));
    stats.states += Math.max(sa.states.length, sb.states.length);
    if (a.get(fa).equals(b.get(fa))) continue;
    stats.stripsChanged++;
    const lines = [];
    if (JSON.stringify(sa.tactics) !== JSON.stringify(sb.tactics)) lines.push(`  tactics: ${JSON.stringify(sa.tactics)} -> ${JSON.stringify(sb.tactics)}`);
    if (sa.source.sha256 !== sb.source.sha256) lines.push(`  source sha256: ${sa.source.sha256.slice(0, 16)} -> ${sb.source.sha256.slice(0, 16)}`);
    let changed = 0;
    for (let i = 0; i < Math.max(sa.states.length, sb.states.length); i++) {
      const x = sa.states[i];
      const y = sb.states[i];
      const tactic = (sb.tactics[i] ?? sa.tactics[i]);
      const heading = y?.when === 'end' || x?.when === 'end' ? 'end of proof' : `before \`${tactic}\``;
      if (!x || !y) { changed++; lines.push(`  state ${i} (${heading}): only in ${x ? names[0] : names[1]}`); continue; }
      const moved = x.line !== y.line || x.character !== y.character;
      const sameGoals = JSON.stringify(x.goals) === JSON.stringify(y.goals);
      if (sameGoals && !moved) continue;
      changed++;
      lines.push(`  state ${i} (${heading})${moved ? `, position (${x.line}, ${x.character}) -> (${y.line}, ${y.character})` : ''}`);
      if (sameGoals) continue;
      const body = [];
      const show = (a, b) => body.push(...diffLines(a, b).map(([op, line]) => `    ${op} ${line}`));
      if (x.goals.length === y.goals.length && x.goals.length > 0) {
        // Same number of goals: show each changed goal whole, so the reader keeps its context.
        x.goals.forEach((gx, k) => {
          const label = x.goals.length > 1 ? `[goal ${k + 1} of ${x.goals.length}]` : null;
          if (JSON.stringify(gx) === JSON.stringify(y.goals[k])) { if (label) body.push(`    ${label} unchanged`); return; }
          if (label) body.push(`    ${label}`);
          show(gx, y.goals[k]);
        });
      } else {
        show(flatten(x.goals), flatten(y.goals));
      }
      stats.added += body.filter((l) => l[4] === '+').length;
      stats.removed += body.filter((l) => l[4] === '-').length;
      lines.push(...body);
    }
    stats.statesChanged += changed;
    report.push(`strip ${id}: ${changed} of ${Math.max(sa.states.length, sb.states.length)} states changed`, ...lines);
  }
  return { report, stats, identical: onlyA.length === 0 && onlyB.length === 0 && differing.length === 0 };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let names = ['committed', 'regenerated'];
  const at = args.indexOf('--names');
  if (at >= 0) { names = args[at + 1].split(','); args.splice(at, 2); }
  if (args.length !== 2 || names.length !== 2) {
    console.error('usage: node diff-strips.mjs <committed-dir> <regenerated-dir> [--names <a>,<b>]');
    process.exit(2);
  }
  let a;
  let b;
  try { a = readSet(args[0]); b = readSet(args[1]); } catch (error) { console.error(`diff-strips: ${error.message}`); process.exit(2); }
  const { report, stats, identical } = compare(a, b, names);
  if (identical) {
    console.log(`IDENTICAL: ${a.size} files, ${stats.strips} strips, ${stats.states} states, set sha256 ${setDigest(a).sha256}`);
    process.exit(0);
  }
  console.log(report.join('\n'));
  const kind = stats.stripsChanged === 0 && stats.statesChanged === 0 ? ' (every strip identical; only the manifest differs)' : '';
  console.log(`DIFF${kind}: ${stats.strips} strips compared, ${stats.stripsChanged} differ; ${stats.statesChanged} of ${stats.states} states changed; ${stats.added} goal lines added, ${stats.removed} removed`);
  process.exit(1);
}
