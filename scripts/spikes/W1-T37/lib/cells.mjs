// The authored cells GATE-calls reproduces (W1-T37), read the way GATE-items reads them: the same page files
// (content/stages/S{n}/S{n}.L{k}.md and content/drawers/D-{nn}.md, scripts/verify-items.mjs pageFiles), the content
// build's own reader (packages/content, parsePageSource), and the same reading of an option's verdict (verify-items'
// verdictOf, or the option's `verdict` field once lesson@1 carries one), so the two gates never disagree about what a
// call's key says.
//
// A cell's call is reproduced on its instrument's engine. What its key claims:
//   a verdict    the key option names one verdict: `sat`, "counterexample", "violated" (sat); `unsat`, "proved",
//                "holds" (unsat); `unknown`, "no verdict", "can't tell" (unknown)
//   a value      the key option is a number and nothing else (`1`): the optimum of the cell's one Optimize objective,
//                because an optimum is canonical and a model's values are not (spine section 8.4)
//   unreadable   anything else: GATE-calls cannot tell what the call claims, so it cannot reproduce it, and fails
// The call is about the first solver check the cell's code makes (Call It is committed on the cell's first run, and the
// first result shown is the one called); a lesson cell whose call is about a later query puts that query first.

import fs from 'node:fs';
import path from 'node:path';
import { contentReader, pageFiles, verdictOf } from '../../../verify-items.mjs';

/** The instruments a call can be on, and how GATE-calls reproduces each (spine section 11.2). */
export const INSTRUMENTS = Object.freeze({
  'INS-z3': { engine: 'z3', label: 'Pyodide-in-Node and native Z3', lane: 'fast' },
  'INS-goal-replay': { engine: 'lean', label: 'Lean 4.35.0 elaboration in the Bench image', lane: 'nightly', lands: 'W2-T03' },
  'INS-spectacle': { engine: 'spectacle', label: 'Spectacle', lane: 'fast', lands: 'W3-T08' },
  'INS-interp': { engine: 'interp', label: 'the reference interpreter', lane: 'fast', lands: 'W2-T08' },
});

/** The engines GATE-calls can run now. A later task adds its engine here and to lib/run.mjs's runners. */
export const ENGINES_BUILT = new Set(['z3']);

const VERDICT_OF_CLASS = Object.freeze({ violated: 'sat', holds: 'unsat', unknown: 'unknown' });
const CLASSES = ['violated', 'holds', 'unknown', 'value'];

/** A number and nothing else, as a canonical rational ("1", "-3", "1/2"), or null. */
export function canonicalNumber(text) {
  let t = String(text ?? '').trim();
  const span = /^`([^`]*)`\.?$/.exec(t);
  if (span) t = span[1].trim();
  t = t.replace(/\.$/, '');
  if (/^-?\d{1,3}(?:[,  ]\d{3})+$/.test(t)) t = t.replace(/[,  ]/g, '');
  let num;
  let den = 1n;
  if (/^-?\d+$/.test(t)) num = BigInt(t);
  else if (/^-?\d+\/\d+$/.test(t)) {
    const [a, b] = t.split('/');
    num = BigInt(a);
    den = BigInt(b);
    if (den === 0n) return null;
  } else if (/^-?\d+\.\d+$/.test(t)) {
    const [a, b] = t.replace('-', '').split('.');
    den = 10n ** BigInt(b.length);
    num = BigInt(a) * den + BigInt(b);
    if (t.startsWith('-')) num = -num;
  } else return null;
  const gcd = (x, y) => (y === 0n ? (x < 0n ? -x : x) : gcd(y, x % y));
  const g = gcd(num, den) || 1n;
  num /= g;
  den /= g;
  return den === 1n ? String(num) : `${num}/${den}`;
}

/** The verdict words a text names in code spans, for the message about a key that names more than one. */
const verdictsInCode = (text) => [...new Set([...String(text).matchAll(/`\s*(sat|unsat|unknown)\b[^`]*`/gi)].map((m) => m[1].toLowerCase()))];

/**
 * What a call's key claims: {kind: 'verdict', verdict, from} | {kind: 'value', value, from} | {kind: 'unreadable', why}.
 * `from` says where the reading came from, for the report.
 */
export function expectationOf(call) {
  const options = Array.isArray(call?.options) ? call.options : [];
  const key = options.find((o) => o?.id === call?.key);
  if (!key) return { kind: 'unreadable', why: `the key ${JSON.stringify(call?.key ?? null)} names no option of the call` };
  const field = CLASSES.includes(key.verdict) ? key.verdict : null;
  const cls = field ?? verdictOf(String(key.text ?? ''));
  const from = field ? `option ${key.id}'s verdict field` : `option ${key.id}'s text`;
  if (cls !== 'value') return { kind: 'verdict', verdict: VERDICT_OF_CLASS[cls], class: cls, from, keyText: key.text };
  const value = canonicalNumber(key.text);
  if (value !== null) return { kind: 'value', value, from, keyText: key.text };
  if (field === 'value') return { kind: 'unreadable', why: `option ${key.id}'s verdict field says it is a value, but its text "${key.text}" is no number`, keyText: key.text };
  const named = verdictsInCode(key.text);
  const why =
    named.length > 1
      ? `option ${key.id} ("${key.text}") names more than one verdict (${named.join(', ')})`
      : `option ${key.id} ("${key.text}") names no verdict GATE-calls reads (\`sat\`, \`unsat\` or \`unknown\` in code; proved, holds, counterexample, violated or no verdict in words) and is no number`;
  return { kind: 'unreadable', why, keyText: key.text };
}

/**
 * The cells of one page record. A cell is every instrument block; `call` is its Call It with what the key claims.
 * @returns {object[]}
 */
export function cellsOfRecord(record, rel, prefix = '') {
  const id = String(record?.id ?? '');
  const kind = /^D-\d+$/.test(id) ? 'drawer' : 'lesson';
  const out = [];
  for (const seg of record?.segments ?? []) {
    for (const block of seg?.blocks ?? []) {
      if (block?.type !== 'instrument') continue;
      const ins = String(block.ins ?? '');
      const call = block.call
        ? {
            key: block.call.key,
            keyRun: block.call.keyRun ?? null,
            prompt: String(block.call.prompt ?? ''),
            options: (block.call.options ?? []).map((o) => ({ id: o.id, text: String(o.text ?? ''), ...(o.verdict === undefined ? {} : { verdict: o.verdict }) })),
          }
        : null;
      if (call) call.expect = expectationOf(call);
      out.push({
        ref: `${prefix}cell:${id}#${block.cell}`,
        page: id,
        file: `${prefix}${rel}`,
        pageKind: kind,
        draft: record?.draft !== false,
        segment: seg.id ?? null,
        cell: block.cell,
        ins,
        instrument: INSTRUMENTS[ins] ?? null,
        lang: block.code?.lang ?? null,
        code: typeof block.code?.text === 'string' && block.code.text.trim() !== '' ? block.code.text : null,
        recorded: block.recorded ?? null,
        call,
      });
    }
  }
  return out;
}

/**
 * Every authored cell of a tree, read by the content build's reader. `problems` are pages that could not be read in
 * full, which the gate reports: a page with no front matter, whose cells cannot be seen, and a page where two cells
 * share a number, which share a ref and so cannot be told apart (those cells are left out; the rest of the page is
 * read). `prefix` marks the refs and files of a tree that is not the content (the planted fixtures), so they never
 * collide with a real page's.
 */
export async function collectCells(root, { prefix = '' } = {}) {
  const parsePageSource = await contentReader();
  const cells = [];
  const problems = [];
  const pages = [];
  for (const file of pageFiles(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (e) {
      // the error's code, not its message, which names the machine path
      problems.push({ file: `${prefix}${rel}`, detail: `the page file could not be read (${e?.code ?? 'error'}), so its cells cannot be seen` });
      continue;
    }
    let parsed;
    try {
      parsed = parsePageSource(text);
    } catch (e) {
      problems.push({ file: `${prefix}${rel}`, detail: `the content reader could not read it: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }
    if (!parsed.record) {
      problems.push({ file: `${prefix}${rel}`, detail: 'no front matter could be read, so its cells cannot be seen (the content build fails the page too)' });
      continue;
    }
    pages.push(`${prefix}${rel}`);
    const own = cellsOfRecord(parsed.record, rel, prefix);
    const count = new Map();
    for (const c of own) count.set(c.ref, (count.get(c.ref) ?? 0) + 1);
    const shared = [...count].filter(([, n]) => n > 1).map(([ref]) => ref);
    if (shared.length) {
      const numbers = shared.map((ref) => ref.slice(ref.lastIndexOf('#') + 1)).join(', ');
      problems.push({ file: `${prefix}${rel}`, detail: `more than one cell is numbered ${numbers}, so GATE-calls cannot tell those cells apart and checks none of them (the content build fails the page too)` });
    }
    cells.push(...own.filter((c) => count.get(c.ref) === 1));
  }
  return { cells, problems, pages };
}
