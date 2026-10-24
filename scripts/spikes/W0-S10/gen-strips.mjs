#!/usr/bin/env node
// Goal Replay strip generator (W0-S10 spike).
//
// Reads Lean source files and a spec naming, for each theorem, the tactics at which to read the
// goal state, starts `lean --server` in the pinned image, and asks it `$/lean/plainGoal` at each
// tactic's start and at the end of the proof. The spec says where to look and never what Lean
// will answer: every goal in a strip is Lean's own output. A file that has an error or a warning
// produces no strips.
//
// Usage:
//   node gen-strips.mjs --out <dir> [--spec corpus/strips.json] [--corpus corpus]
//        [--image ss-lean:4.35.0] [--lean-bin lean] [--mount <host>:<container>] ...
//        [--lean-opt <name>=<value>] ... [--cpuset-cpus <list>] [--timeout-s 300]
//
// Exit codes: 0 strips written; 1 generation failed (anchor, elaboration or goal information);
// 2 usage or environment error (no Docker, unreadable spec, output directory not empty).
//
// The output is a pure function of (image, lean options, sources, spec): no timestamps, no paths,
// no timings. `--out` must not exist or must be empty, so a stale file can never survive a run.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withLeanServer } from './lib/lean-server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_STRIP = 'statespace/goal-strip-spike@0';
export const SCHEMA_MANIFEST = 'statespace/goal-strips-manifest-spike@0';
const REQUEST = '$/lean/plainGoal';
const SEVERITY = { 1: 'error', 2: 'warning', 3: 'information', 4: 'hint' };

class GenError extends Error {}
class UsageError extends Error {}

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

// ---------------------------------------------------------------------------------------------
// Anchors: where to read the goals. Pure functions of the source text.
// ---------------------------------------------------------------------------------------------

/** First and last line of `theorem <name>`: from its line to the line before the next column-0 line. */
export function theoremSpan(lines, name) {
  const re = new RegExp(`^theorem\\s+${escapeRe(name)}(?![\\w'.])`);
  const starts = lines.flatMap((l, i) => (re.test(l) ? [i] : []));
  if (starts.length !== 1) throw new GenError(`theorem ${name}: found ${starts.length} declarations, expected exactly 1`);
  const start = starts[0];
  let end = start;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] !== '' && !/^\s/.test(lines[i])) break;
    if (lines[i].trim() !== '') end = i;
  }
  return { start, end };
}

/**
 * Resolve each tactic text to the (line, character) where it starts, searching in order from the
 * proof's `:= by`, on one line each, at identifier boundaries, ignoring `--` comments.
 * Positions are 0-based; characters are UTF-16 code units, which is what the protocol counts.
 */
export function resolveAnchors(lines, span, tactics, label) {
  let line = -1;
  let col = 0;
  for (let i = span.start; i <= span.end && line < 0; i++) {
    const at = lines[i].indexOf(':= by');
    if (at >= 0) { line = i; col = at + ':= by'.length; }
  }
  if (line < 0) throw new GenError(`${label}: no ':= by' in the declaration`);
  return tactics.map((text) => {
    if (text === '' || text !== text.trim() || text.includes('\n')) throw new GenError(`${label}: tactic ${JSON.stringify(text)} must be one trimmed line`);
    const re = new RegExp(`${/^\w/.test(text) ? "(?<![\\w'.])" : ''}${escapeRe(text)}${/\w$/.test(text) ? "(?![\\w'.])" : ''}`, 'g');
    for (let i = line; i <= span.end; i++) {
      re.lastIndex = i === line ? col : 0;
      for (let m = re.exec(lines[i]); m; m = re.exec(lines[i])) {
        if (lines[i].slice(0, m.index).includes('--')) continue;
        line = i;
        col = m.index + text.length;
        return { text, line: i, character: m.index };
      }
    }
    throw new GenError(`${label}: tactic ${JSON.stringify(text)} not found after the previous one`);
  });
}

/** The end of the proof: the last non-blank character of the declaration. */
export function proofEnd(lines, span) {
  return { line: span.end, character: lines[span.end].trimEnd().length };
}

// ---------------------------------------------------------------------------------------------
// Rendering. One JSON file per strip (authoritative) and a plain-text view (derived, for review).
// ---------------------------------------------------------------------------------------------

const goalText = (goals, indent) => {
  if (goals.length === 0) return [`${indent}no goals`];
  if (goals.length === 1) return goals[0].map((l) => (l === '' ? '' : indent + l));
  return goals.flatMap((g, k) => [`${indent}goal ${k + 1} of ${goals.length}`, ...g.map((l) => (l === '' ? '' : `${indent}  ${l}`))]);
};

export function renderText(strip) {
  const out = [
    `${strip.id}   theorem ${strip.theorem}   source ${strip.source.file} (sha256 ${strip.source.sha256.slice(0, 16)})`,
    `${strip.request}; positions are 0-based line and character`,
    '',
  ];
  for (const s of strip.states) {
    const where = s.when === 'before' ? `before \`${strip.tactics[s.index]}\`` : 'end of proof';
    out.push(`[${s.index}] ${where}   (line ${s.line}, character ${s.character})`, ...goalText(s.goals, '    '), '');
  }
  return `${out.join('\n').trimEnd()}\n`;
}

// ---------------------------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { spec: path.join(HERE, 'corpus/strips.json'), corpus: path.join(HERE, 'corpus'), image: 'ss-lean:4.35.0', leanBin: 'lean', mounts: [], leanOptions: [], cpusetCpus: null, timeoutS: 300, out: null };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => { if (i + 1 >= argv.length) throw new UsageError(`${flag} needs a value`); return argv[++i]; };
    switch (flag) {
      case '--out': o.out = path.resolve(value()); break;
      case '--spec': o.spec = path.resolve(value()); break;
      case '--corpus': o.corpus = path.resolve(value()); break;
      case '--image': o.image = value(); break;
      case '--lean-bin': o.leanBin = value(); break;
      case '--mount': o.mounts.push(value()); break;
      case '--lean-opt': o.leanOptions.push(value()); break;
      case '--cpuset-cpus': o.cpusetCpus = value(); break;
      case '--timeout-s': o.timeoutS = Number(value()); break;
      default: throw new UsageError(`unknown argument ${flag}`);
    }
  }
  if (!o.out) throw new UsageError('--out <dir> is required');
  if (fs.existsSync(o.out) && fs.readdirSync(o.out).length > 0) throw new UsageError(`${o.out} is not empty`);
  return o;
}

/** Read the spec and the sources it names; resolve every tactic to a position. Pure: no Lean needed. */
export function loadJobs(o) {
  const spec = JSON.parse(fs.readFileSync(o.spec, 'utf8'));
  const texts = new Map();
  const shas = new Map();
  const jobs = [];
  for (const [file, theorems] of Object.entries(spec.sources)) {
    const bytes = fs.readFileSync(path.join(o.corpus, file));
    const text = bytes.toString('utf8');
    if (text.includes('\r')) throw new GenError(`${file}: carriage return found; sources must use LF so positions and hashes agree across platforms`);
    texts.set(file, text);
    shas.set(file, sha256(bytes));
    const lines = text.split('\n');
    for (const [theorem, tactics] of Object.entries(theorems)) {
      const span = theoremSpan(lines, theorem);
      jobs.push({ file, theorem, id: `${path.basename(file, '.lean')}.${theorem}`, anchors: resolveAnchors(lines, span, tactics, `${file}:${theorem}`), end: proofEnd(lines, span) });
    }
  }
  return { spec, texts, shas, jobs };
}

async function generate(o) {
  const { spec, texts, shas, jobs } = loadJobs(o);
  const started = Date.now();
  let toolchain;
  const sources = [];
  const strips = [];
  await withLeanServer(o, async (server, info) => {
    toolchain = info.toolchain;
    console.log(`gen: toolchain ${toolchain.banner}`);
    console.log(`gen: toolchain bin/lean sha256 ${toolchain.binarySha256}`);
    console.log(`gen: server argv ${info.argv}`);
    for (const file of Object.keys(spec.sources)) {
      const raw = await server.open(file, texts.get(file));
      const diagnostics = raw
        .map((d) => ({ severity: SEVERITY[d.severity] ?? String(d.severity), line: d.range.start.line, character: d.range.start.character, message: d.message }))
        .sort((a, b) => a.line - b.line || a.character - b.character || (a.message < b.message ? -1 : a.message > b.message ? 1 : 0));
      const bad = diagnostics.filter((d) => d.severity === 'error' || d.severity === 'warning');
      if (bad.length > 0) {
        const shown = bad.slice(0, 5).map((d) => `${file}:${d.line}:${d.character}: ${d.severity}: ${d.message.split('\n')[0]}`).join('\n  ');
        throw new GenError(`${file} does not elaborate cleanly (${bad.length} error or warning diagnostics); no strips from a broken file:\n  ${shown}`);
      }
      sources.push({ file, sha256: shas.get(file), diagnostics });
    }
    for (const job of jobs) {
      const label = `${job.file}:${job.theorem}`;
      const states = [];
      for (const [i, a] of job.anchors.entries()) {
        const goals = await server.plainGoal(job.file, a.line, a.character);
        if (goals === null) throw new GenError(`${label}: Lean reports no goal information before tactic ${i} (${JSON.stringify(a.text)}) at line ${a.line}, character ${a.character}`);
        states.push({ when: 'before', index: i, line: a.line, character: a.character, goals: goals.map((g) => g.replace(/\r\n/g, '\n').split('\n')) });
      }
      const endGoals = await server.plainGoal(job.file, job.end.line, job.end.character);
      if (endGoals === null) throw new GenError(`${label}: Lean reports no goal information at the end of the proof (line ${job.end.line}, character ${job.end.character})`);
      if (endGoals.length > 0) throw new GenError(`${label}: the proof ends with ${endGoals.length} open goal(s); a strip needs a finished proof`);
      states.push({ when: 'end', index: job.anchors.length, line: job.end.line, character: job.end.character, goals: [] });
      strips.push({
        schema: SCHEMA_STRIP,
        id: job.id,
        theorem: job.theorem,
        source: { file: job.file, sha256: shas.get(job.file) },
        request: REQUEST,
        tactics: job.anchors.map((a) => a.text),
        states,
      });
    }
  });

  // Everything below is derived from the strips alone.
  const points = new Set();
  const warnings = [];
  for (const s of strips) {
    const text = [...s.tactics, ...s.states.flatMap((st) => st.goals.flat())].join('\n');
    for (const ch of text) if (ch.codePointAt(0) > 0x7e) points.add(ch.codePointAt(0));
    const hazard = s.states.filter((st) => st.goals.flat().some((l) => /\?m\.\d+|_uniq\.\d+|_hyg\.\d+/.test(l))).map((st) => st.index);
    if (hazard.length > 0) warnings.push(`${s.id}: states ${hazard.join(', ')} show generated metavariable or hygiene names, whose numbering is not stable under edits`);
  }
  const files = new Map();
  for (const s of strips) {
    files.set(`${s.id}.strip.json`, json(s));
    files.set(`${s.id}.strip.txt`, renderText(s));
  }
  const manifest = {
    schema: SCHEMA_MANIFEST,
    request: REQUEST,
    toolchain,
    leanOptions: o.leanOptions,
    spec: { file: path.basename(o.spec), sha256: sha256(fs.readFileSync(o.spec)) },
    sources,
    strips: strips.map((s) => ({ id: s.id, file: `${s.id}.strip.json`, sha256: sha256(files.get(`${s.id}.strip.json`)), tactics: s.tactics.length, states: s.states.length })),
    codePoints: [...points].sort((a, b) => a - b).map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`),
    maxGoalLineLength: strips.flatMap((s) => s.states.flatMap((st) => st.goals.flat().map((l) => [...l].length))).reduce((m, n) => Math.max(m, n), 0),
    warnings,
  };
  files.set('manifest.json', json(manifest));
  fs.mkdirSync(o.out, { recursive: true });
  for (const [name, content] of files) fs.writeFileSync(path.join(o.out, name), content);
  for (const w of warnings) console.error(`gen: warning: ${w}`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`gen: ${strips.length} strips, ${strips.reduce((n, s) => n + s.states.length, 0)} states, ${sources.length} sources, ${manifest.codePoints.length} non-ASCII code points, ${seconds} s`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await generate(parseArgs(process.argv.slice(2)));
  } catch (error) {
    if (error instanceof UsageError) { console.error(`gen: ${error.message}`); process.exit(2); }
    if (error instanceof GenError) { console.error(`gen: FAILED: ${error.message}`); process.exit(1); }
    console.error(`gen: ERROR: ${error.stack ?? error}`);
    process.exit(2);
  }
}
