// The rules of GATE-numbers (scripts/verify-numbers.mjs). Dependency-free.
//
// UNITS. A document is cut into units: a sentence of a paragraph, list item or quote, or a table row.
// Headings and YAML title values name topics and are not read for tokens, but a tag in a heading covers
// its section.
//
// TOKENS. A tool-shaped token (ARCHITECTURE.md section 9.3) is a version string next to an engine name or
// with three parts, a number with a measuring unit, a TLC state or step count or search depth, a SQLSTATE
// code, a flag of TLC or of lake check and lake comparator, a verdict a tool printed (a solver verdict
// reported or with its model, or a TLC, Lean or PostgreSQL message), an exit code, an rlimit value, or a
// model value of ten or more digits.
//
// TAGS. A token passes when its unit is covered by a tag:
//   a run reference          [X RUN-id], [X RUN-a, RUN-b] or {{run:RUN-id}}; in a document, also a run
//                            ID named outright, as the spine's tables cite runs (GATE-runs resolves them)
//   a design value           [D] or [D: reason]
//   a primary-source fact    [V], a URL, or a source key that a source table defines ([lean435])
//   an executed-evidence key [X spikes], [X a5logs], [X a2logs], [X r1m] or [X RESULTS.md], the keys
//                            docs/LANDSCAPE.md defines for executed facts the spine has not registered
// Coverage: a tag covers its own sentence and the untagged sentences before it in the same paragraph, back
// to the previous tag ("Both jars gave these counts [X RUN-tlc-doublespend]."); a table row is covered by
// the tags of the paragraph or heading just before the table and of the paragraph just after it (its
// caption); a heading's tags cover its section.
//
// INTRODUCED. In a document, a token also passes when the same token is covered by a tag elsewhere in that
// document (the spine's rule: a tool fact carries its tag where it is introduced). A version passes when
// the same version is introduced with or without its engine name, and Lean 4.35.x when any 4.35 version
// is. Learner copy has no such allowance: every unit carries its own coverage.
//
// DENY. A unit fails, tagged or not, when it matches the deny-list (numbers-deny-list.json, BRIEF section
// 2.2: never write the left column).
//
// BASELINE. Untagged tokens that documents held when the gate was introduced are listed, each with its
// document and sentence, in numbers-baseline.json; they are reported as known debt and fail only under
// --strict (the release lane). A new untagged token, or a listed one whose sentence changed, fails.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const SCAN = ['README.md', 'docs', 'curriculum', 'tracker', 'labs', 'content/stages', 'design', 'runs/README.md'];
export const EXEMPT = ['docs/history/', 'design/canvas/'];
/** Learner copy: no introduced allowance and no bare run IDs. */
export const COPY = [/^content\/stages\//, /^labs\/LAB-[^/]+\//];
const EXTENSIONS = new Set(['.md', '.mdx', '.yaml', '.yml', '.txt']);
const SKIP_DIRS = new Set(['node_modules', '.git', '.lake', 'target', '_solutions', '__pycache__', '.venv']);
export const DENY_FILE = path.join(HERE, 'numbers-deny-list.json');
export const BASELINE_FILE = path.join(HERE, 'numbers-baseline.json');

/** Keys docs/LANDSCAPE.md defines for executed facts that the spine has not registered as runs. */
export const EVIDENCE_KEYS = ['spikes', 'a5logs', 'a2logs', 'r1m', 'RESULTS.md'];

// ------------------------------------------------------------------ engines and versions
/** Canonical engine name -> the spellings copy uses. */
const ENGINES = {
  z3: ['Z3', 'z3', 'z3-solver', 'z3_solver'],
  cvc5: ['cvc5', 'CVC5'],
  lean: ['Lean', 'Lake', 'lake', 'elan', 'lean4'],
  tlc: ['TLC', 'tla2tools', 'TLA\\+ tools'],
  postgresql: ['PostgreSQL', 'Postgres', 'PG'],
  pglite: ['PGlite'],
  pyodide: ['Pyodide'],
  souffle: ['Soufflé', 'Souffle', 'souffle'],
  apalache: ['Apalache'],
  alloy: ['Alloy'],
  java: ['Java', 'JDK', 'JRE', 'Temurin', 'Adoptium'],
  node: ['Node\\.js', 'Node', 'node'],
  chromium: ['Chromium', 'Chrome'],
  firefox: ['Firefox'],
  webkit: ['WebKit', 'Safari'],
  playwright: ['Playwright', 'playwright-core'],
  python: ['Python'],
  uv: ['uv'],
  rust: ['Rust', 'rustc', 'cargo'],
  psycopg: ['psycopg'],
  react: ['React'],
  vite: ['Vite'],
  typescript: ['TypeScript'],
  juliamono: ['JuliaMono'],
  kani: ['Kani'],
  verus: ['Verus'],
  carcara: ['Carcara'],
  dafny: ['Dafny'],
  coq: ['Coq', 'Rocq'],
  isabelle: ['Isabelle'],
  emscripten: ['Emscripten', 'emcc'],
  llvm: ['LLVM', 'clang'],
  bubblewrap: ['bubblewrap', 'bwrap'],
  docker: ['Docker'],
  ubuntu: ['Ubuntu'],
  debian: ['Debian'],
  linux: ['Linux'],
  macos: ['macOS'],
  axe: ['axe-core', 'axe'],
  jsonschema: ['jsonschema'],
  pyyaml: ['PyYAML'],
  'tokio-postgres': ['tokio-postgres'],
  testcontainers: ['testcontainers'],
  pg_query: ['pg_query'],
  proptest: ['proptest'],
};
const ALIAS = new Map();
for (const [canon, names] of Object.entries(ENGINES)) for (const n of names) ALIAS.set(n.replaceAll('\\', ''), canon);
const ENGINE_ALT = Object.values(ENGINES).flat().sort((a, b) => b.length - a.length).join('|');
const SUFFIX = String.raw`(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?`;
/** An engine name and a version: Z3 5.3.1, Lean 4.35.x, Java 21, PostgreSQL 18.6, Lean v4.36.0-rc1. Not a range. */
const ENGINE_VERSION = new RegExp(String.raw`(?<![\w.+-])(${ENGINE_ALT})(?:\s+(?:version\s+)?|\s*@|\s+v|v)(v?\d+(?:\.(?:\d+|x))*${SUFFIX})(?![\w]|\.\d|\s?[–-]\s?\d)`, 'g');
/** A bare version of three or more parts, or v-prefixed: 5.3.1.0, 2026.10.20.183001, v1.8.0, 1.4.2-modified. Not a range. */
const BARE_VERSION = new RegExp(String.raw`(?<![\w.§/:+–-]|\d[–-])(v?\d+\.\d+\.\d+(?:\.\d+)*${SUFFIX}|v\d+\.\d+${SUFFIX})(?![\w]|\.\d|\s?[–-]\s?\d)`, 'g');

// ------------------------------------------------------------------ other tokens
const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const RANGE = String.raw`${NUM}(?:\s?(?:–|-|to)\s?${NUM})?`;
/** A number with a measuring unit: 137.5 MB, 1.46–1.71 s, 594,481,375 bytes, 524–1,125 states/s. A lone s needs a space. */
const NUMBER_UNIT = new RegExp(String.raw`(?<![\w.,-])(${RANGE})(?:\s?(states\/s|ds\/min|s\/min|KiB|MiB|GiB|TiB|kB|KB|MB|GB|TB|bytes|ms|µs)|\s(s))(?![\w/])`, 'g');
/** TLC's counts: 11 distinct states, 10 distinct, 813 states generated, a 5-state, 4-action trace, at depth 5. */
const STATE_COUNT = new RegExp(
  String.raw`(?<![\w.,-])(${RANGE})(?:\s+distinct(?:\s+states?)?\b|\s+states?\b(?!\s+variables?\b)(?:\s+(?:generated|found|left))?|-state\b(?!\s+variables?\b)|-action\b)` +
    String.raw`|\b(?:at|search|graph) depth\s+(\d+)\b|\bdepth of the complete state graph search is (\d+)`,
  'g',
);
/** SQLSTATE codes of the classes the course meets: 22003, 23505, 23P01, 40001, 40P01, 42501. */
const SQLSTATE = /(?<![\w.-])((?:22|23|25|40|42|53|55|57|58)[0-9P][0-9][0-9A-Z])(?![\w-]|\.\d)/g;
/** An exit code: exit code 0, exits 2, exit=124, rc=1, exit 1. */
const EXIT_CODE = /\b(?:exit(?:s|ed)?(?:\s+(?:code|status))?(?:\s+(?:with|of))?\s*=?\s*|rc=)(\d{1,3})\b/g;
/** An rlimit value: rlimit 5e6, an `rlimit` of 5,000,000. */
const BUDGET = /\brlimit`?\s*(?:of\s+|=\s*|:\s*)?(\d[\d,.]*(?:e\d+)?)\b/g;
/** A model value: a number of ten or more digits, as solvers print (B = 9223372036850581504). */
const MODEL_VALUE = /(?<![\w.-])(\d{10,})(?![\w]|\.\d)/g;
/** A flag inside a code span. Only TOOL_FLAGS count. */
const FLAG = /(?:^|[\s(])(--?[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)(?=$|[\s=),])/g;
/**
 * The flags that count as tool facts: TLC's, from both jars' help texts (RUN-tlc-help), and those of lake
 * check and lake comparator, from the 4.35.0 binary's help text (RUN-lean-toolchain). A flag of another
 * program in a code span (a docker option, a CSS custom property) is not a tool number.
 */
export const TOOL_FLAGS = new Set([
  '-aril', '-checkpoint', '-cleanup', '-config', '-continue', '-coverage', '-deadlock', '-debug', '-debugger', '-depth',
  '-dfid', '-difftrace', '-dump', '-dumpTrace', '-fp', '-fpbits', '-fpmem', '-generateSpecTE', '-gzip', '-inv', '-invlevel',
  '-loadTrace', '-maxSetSize', '-messagesAsErrors', '-metadir', '-noGenerateSpecTE', '-nowarning', '-postCondition',
  '-recover', '-seed', '-simulate', '-suppressMessages', '-teSpecOutDir', '-terse', '-tool', '-userFile', '-view', '-workers',
  '--paranoid', '--inadvisably-no-sandbox', '--from-export', '--challenge-from-export', '--solution-from-export',
]);
/** A solver verdict in a code span. It is a tool's output when it carries a model or reason, or follows a reporting verb. */
const VERDICT_SPAN = /^(sat|unsat|unknown)(\s*(?:\[[^\]]*\]|\([^)]*\)))?$/;
const REPORTED = /(?:\b(?:answers?|answered|returns?|returned|gives?|gave|reports?|reported|prints?|printed|says|said|yields?|yielded|outputs?|replie[sd]|reply|got|gets|comes back|came back)|→|->|=>)\s*(?:an?\s+|with\s+)?$/i;
/** Tool messages quoted verbatim (TLC, Lean, Lake, PostgreSQL). */
const MESSAGES = [
  'Deadlock reached', 'No error has been found', 'Your solution is okay!', 'theorem statement do not match', 'Const does not match',
  'accepts the solution', 'SerializationFailure', 'DeadlockDetected', 'bigint out of range', 'could not serialize access',
  'declaration uses `sorry`', 'depends on axioms', 'does not depend on any axioms', 'Sandbox disabled',
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\`!]/g, '\\$&');
const MESSAGE_RE = new RegExp(`(${MESSAGES.map(escapeRe).join('|')}|(?:Invariant|Temporal property|Action property) \\w+ (?:is|was) violated)`, 'g');

// ------------------------------------------------------------------ tags
const RUN_REF = /\[X\s[^\]]*\bRUN-[a-z0-9]+(?:-[a-z0-9]+)*[^\]]*\]|\{\{run:[^}]*\}\}/;
/** A run ID named outright: (RUN-ci-fastlane), or a row of the spine's runs table. */
const BARE_RUN = /(?<![\w-])RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?![\w-])/;
const EVIDENCE_TAG = new RegExp(String.raw`\[X\s+(?:${EVIDENCE_KEYS.map(escapeRe).join('|')})(?:[\s,;][^\]]*)?\]`);
const DESIGN_TAG = /\[D(?:[\]:,;\s])/;
const VERIFIED_TAG = /\[V(?:[\],;\s])/;
const URL = /https?:\/\/[^\s)>\]]+/;
const SOURCE_KEY = /\[([A-Za-z][\w.+-]*)(?:\s[^\]]*)?\]/g;

/** The tags a piece of text carries, as a set of kinds; sourceKeys are the keys a source table defines. */
export function tagsOf(text, sourceKeys = new Set()) {
  const kinds = new Set();
  if (RUN_REF.test(text)) kinds.add('reference');
  else if (BARE_RUN.test(text)) kinds.add('named');
  if (EVIDENCE_TAG.test(text)) kinds.add('evidence');
  if (DESIGN_TAG.test(text)) kinds.add('design');
  if (VERIFIED_TAG.test(text)) kinds.add('verified');
  if (URL.test(text)) kinds.add('source');
  else if (sourceKeys.size > 0) {
    SOURCE_KEY.lastIndex = 0;
    let m;
    while ((m = SOURCE_KEY.exec(text)) !== null) if (sourceKeys.has(m[1])) kinds.add('source');
  }
  return kinds;
}

/** Source keys a source table defines: a row | [key] | https://... |, or a [key]: https://... definition. */
export function sourceKeysOf(text) {
  const keys = new Set();
  for (const m of text.matchAll(/^\|\s*\[([A-Za-z][\w.+-]*)\]\s*\|\s*<?https?:\/\//gm)) keys.add(m[1]);
  for (const m of text.matchAll(/^\[([A-Za-z][\w.+-]*)\]:\s*<?https?:\/\//gm)) keys.add(m[1]);
  return keys;
}

// ------------------------------------------------------------------ masking: spans that hold no tool numbers
const MASKS = [
  /<!--[\s\S]*?-->/g, // HTML comments
  /\]\([^)]*\)/g, // link targets
  /https?:\/\/[^\s)>\]]+/g, // URLs
  /\{\{run:[^}]*\}\}/g, // run references
  /\[X\s[^\]]*\]/g, // evidence tags
  /\[(?:D|V|U|KS)(?:[:,;\s][^\]]*)?\]/g, // tags
  /\b[0-9a-f]{7,64}\b/g, // hashes and commit SHAs: identifiers, not numbers
  /\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g, // dates and times
  /\b\d{1,2}:\d{2}(?::\d{2})?\b/g, // clock times
  /(?:[\w.@+~-]+\/)+[\w.@+~*-]*/g, // paths
  /\bRUN-[a-z0-9]+(?:-[a-z0-9]+)*\b/g, // run IDs
  /\b(?:W\d-[ST]\d{2}|S\d{1,2}\.L\d{1,2}|S\d{1,2}|LAB-\d+(?:\.c?\d+)?|CL-\d+\.\d+|SP-\d+\.\d+|KC-\d+\.[\w-]+|OD-\d+|V2-\d+|D-\d+|AUD-\d+(?:\.\d+)?|ER-\d+|SEAM-\d+|G\d+[a-z]?|I\d+|H\d{2}[ab]?|A\d+-\d+|[A-Z]\d\.\d{2})\b/g, // IDs
  /§\s?\d+(?:\.\d+)*/g, // section references
  /\b(?:WCAG|SC)(?:\s+2\.\d)?(?:\s+AA)?\s+\d+\.\d+\.\d+/g, // WCAG success criteria, named
  /\b[1-4]\.[1-5]\.\d{1,2}(?= [A-Z][a-z])/g, // WCAG success criteria in a criteria table: "1.4.3 Contrast"
  /\b(?:section|sections|item|items|issue|issues|step|steps|row|rows|column|rule|rules|phase|wave|chapter|part|page|line|lines|figure|table)\s+\d+(?:\.\d+)*(?:\s*(?:–|-|to|and|,)\s*\d+(?:\.\d+)*)*/gi,
  /#\d+\b/g, // issue and pull request numbers
  /\b\d+(?:\.\d+)?(?:\s?(?:–|-|to)\s?\d+(?:\.\d+)?)?\s?(?:h|hours?|min|minutes?|days?|weeks?|months?|years?)\b/gi, // study and calendar time
];

function mask(text) {
  let out = text;
  for (const re of MASKS) {
    re.lastIndex = 0;
    out = out.replace(re, (m) => ' '.repeat(m.length));
  }
  return out;
}

/** The inline code spans of a unit: [{start, end, text}]. */
function codeSpans(text) {
  const spans = [];
  const re = /(`+)([\s\S]*?[^`])\1(?!`)/g;
  let m;
  while ((m = re.exec(text)) !== null) spans.push({ start: m.index, end: m.index + m[0].length, text: m[2].trim() });
  return spans;
}

// ------------------------------------------------------------------ tokens
/** Tool-shaped tokens in a unit: [{kind, key, text, index}]. */
export function tokensOf(text) {
  const masked = mask(text);
  const out = [];
  const seen = new Set();
  const add = (kind, key, index, raw) => {
    const id = `${index}:${kind}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ kind, key, text: raw, index });
  };
  const versions = [];
  let m;
  ENGINE_VERSION.lastIndex = 0;
  while ((m = ENGINE_VERSION.exec(masked)) !== null) {
    const engine = ALIAS.get(m[1]) ?? m[1].toLowerCase();
    const version = m[2].replace(/^v/, '');
    if (engine === 'lean' && version === '4') continue; // "Lean 4" names the language
    if (engine === 'python' && version === '3') continue; // "Python 3" names the language
    if (engine === 'juliamono' && !version.includes('.')) continue; // "JuliaMono 400" is a weight
    if (!version.includes('.') && Number(version) < 4 && engine !== 'java') continue; // "TLC 2", "Z3 1"
    add('version', `${engine} ${version}`, m.index, text.slice(m.index, m.index + m[0].length));
    versions.push([m.index, m.index + m[0].length]);
  }
  BARE_VERSION.lastIndex = 0;
  while ((m = BARE_VERSION.exec(masked)) !== null) {
    if (versions.some(([a, b]) => m.index >= a && m.index < b)) continue;
    add('version', m[1].replace(/^v/, ''), m.index, m[1]);
  }
  NUMBER_UNIT.lastIndex = 0;
  while ((m = NUMBER_UNIT.exec(masked)) !== null) add('measure', `${m[1].replace(/[\s,]/g, '')} ${m[2] ?? m[3]}`, m.index, m[0]);
  STATE_COUNT.lastIndex = 0;
  while ((m = STATE_COUNT.exec(masked)) !== null) {
    const n = (m[1] ?? m[2] ?? m[3]).replace(/[\s,]/g, '');
    const what = m[1] === undefined ? 'depth' : /action/.test(m[0]) ? 'actions' : 'states';
    add('count', `${n} ${what}`, m.index, m[0]);
  }
  SQLSTATE.lastIndex = 0;
  while ((m = SQLSTATE.exec(masked)) !== null) add('sqlstate', m[1], m.index, m[1]);
  EXIT_CODE.lastIndex = 0;
  while ((m = EXIT_CODE.exec(masked)) !== null) add('exit', `exit ${m[1]}`, m.index, m[0]);
  BUDGET.lastIndex = 0;
  while ((m = BUDGET.exec(masked)) !== null) add('budget', `rlimit ${m[1].replace(/,/g, '')}`, m.index, m[0]);
  MODEL_VALUE.lastIndex = 0;
  while ((m = MODEL_VALUE.exec(masked)) !== null) add('model', m[1], m.index, m[1]);
  MESSAGE_RE.lastIndex = 0;
  while ((m = MESSAGE_RE.exec(text)) !== null) add('verdict', m[1], m.index, m[1]);
  for (const span of codeSpans(text)) {
    const v = VERDICT_SPAN.exec(span.text);
    if (v && (v[2] || REPORTED.test(text.slice(Math.max(0, span.start - 40), span.start)))) add('verdict', v[1], span.start, span.text);
    const inner = masked.slice(span.start, span.end).replace(/^`+|`+$/g, '');
    FLAG.lastIndex = 0;
    let f;
    while ((f = FLAG.exec(inner)) !== null) if (TOOL_FLAGS.has(f[1])) add('flag', f[1], span.start + f.index, f[1]);
  }
  return out.sort((a, b) => a.index - b.index);
}

// ------------------------------------------------------------------ cutting a document into units
/** Split a paragraph into sentences: [{text, offset}]. Code spans are never split. */
export function sentencesOf(text) {
  const out = [];
  let start = 0;
  let inCode = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '`') inCode = !inCode;
    if (inCode || !'.!?'.includes(c)) continue;
    let j = i + 1;
    while (j < text.length && `"”'’)]*_`.includes(text[j])) j += 1;
    if (j >= text.length || !/\s/.test(text[j])) continue;
    let k = j;
    while (k < text.length && /\s/.test(text[k])) k += 1;
    if (k >= text.length || !/[A-Z0-9`*"“(\[_§]/.test(text[k])) continue;
    const before = text.slice(Math.max(0, i - 6), i);
    if (/(?:\be\.g|\bi\.e|\bvs|\bcf|\betc|\bapprox|\bNo|\bFig|\bal|\bSt|\bp|\bpp)$/i.test(before)) continue;
    out.push({ text: text.slice(start, j), offset: start });
    start = k;
    i = k - 1;
  }
  if (start < text.length) out.push({ text: text.slice(start), offset: start });
  return out.filter((s) => s.text.trim() !== '');
}

/**
 * Cut a Markdown or YAML document into blocks: {kind: 'row'|'heading'|'title'|'para'|'quote', level, text,
 * line, lineOf(offset)}. Fenced code blocks and HTML comments are skipped.
 */
export function blocksOf(text, file) {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const blocks = [];
  const yaml = /\.ya?ml$/.test(file);
  let fence = null;
  let comment = false;
  let para = null;
  const flush = () => {
    if (para) blocks.push(para);
    para = null;
  };
  const start = (kind, line, content, extra = {}) => {
    flush();
    para = { kind, line, parts: [{ line, content }], ...extra };
  };
  lines.forEach((raw, i) => {
    const line = i + 1;
    const t = raw.trim();
    if (fence) {
      if (t.startsWith(fence)) fence = null;
      return;
    }
    if (comment) {
      if (t.includes('-->')) comment = false;
      return;
    }
    if (/^(```|~~~)/.test(t)) {
      flush();
      fence = t.slice(0, 3);
      return;
    }
    if (t.startsWith('<!--') && !t.includes('-->')) {
      flush();
      comment = true;
      return;
    }
    if (t === '') {
      flush();
      return;
    }
    if (yaml) {
      if (t.startsWith('#')) return;
      const key = /^\s*(?:-\s+)?([\w"'.-]+):(?:\s|$)/.exec(raw);
      const item = /^\s*-\s+/.test(raw);
      if (key || item) {
        const content = raw.replace(/^\s*-\s+/, '').replace(/^\s*[\w"'.-]+:\s*(?:[>|][-+]?)?\s*/, '');
        start(key && key[1] === 'title' ? 'title' : 'para', line, content);
      } else if (para) para.parts.push({ line, content: t });
      else start('para', line, t);
      return;
    }
    if (t.startsWith('|')) {
      flush();
      if (/^\|[\s:|-]+\|?$/.test(t)) return; // a table's separator row
      blocks.push({ kind: 'row', line, parts: [{ line, content: t }] });
      return;
    }
    const heading = /^(#{1,6})\s/.exec(t);
    if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: heading[1].length, line, parts: [{ line, content: t }] });
      return;
    }
    if (/^(?:[-*+]|\d+[.)])\s+/.test(t)) {
      start('para', line, t.replace(/^(?:[-*+]|\d+[.)])\s+/, ''));
      return;
    }
    if (t.startsWith('>')) {
      const content = t.replace(/^>\s?/, '');
      if (para && para.kind === 'quote') para.parts.push({ line, content });
      else start('quote', line, content);
      return;
    }
    if (para && para.kind !== 'title') para.parts.push({ line, content: t });
    else start('para', line, t);
  });
  flush();
  return blocks.map((b) => {
    let joined = '';
    const starts = [];
    for (const p of b.parts) {
      if (joined !== '') joined += ' ';
      starts.push({ offset: joined.length, line: p.line });
      joined += p.content;
    }
    const lineOf = (offset) => {
      let l = b.line;
      for (const s of starts) if (s.offset <= offset) l = s.line;
      return l;
    };
    return { kind: b.kind, level: b.level ?? 0, text: joined, line: b.line, lineOf };
  });
}

const union = (...sets) => new Set(sets.flatMap((s) => [...s]));

/** The units of a document with the tags that cover each: [{text, line, lineOf, tags, own, checked}]. */
export function unitsOf(text, file, sourceKeys = new Set()) {
  const blocks = blocksOf(text, file);
  const tagsOfBlock = blocks.map((b) => tagsOf(b.text, sourceKeys));
  // Table captions: the paragraph or heading just before a table, and the paragraph just after it.
  const caption = new Array(blocks.length).fill(null);
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i].kind !== 'row' || (i > 0 && blocks[i - 1].kind === 'row')) continue;
    let j = i;
    while (j + 1 < blocks.length && blocks[j + 1].kind === 'row') j += 1;
    const before = i > 0 && blocks[i - 1].kind !== 'row' ? tagsOfBlock[i - 1] : new Set();
    const after = j + 1 < blocks.length && blocks[j + 1].kind === 'para' ? tagsOfBlock[j + 1] : new Set();
    for (let k = i; k <= j; k += 1) caption[k] = union(before, after);
  }
  const units = [];
  const sections = []; // [{level, tags}]
  blocks.forEach((block, i) => {
    if (block.kind === 'heading') {
      while (sections.length > 0 && sections[sections.length - 1].level >= block.level) sections.pop();
      sections.push({ level: block.level, tags: tagsOfBlock[i] });
      return;
    }
    const section = union(...sections.map((s) => s.tags));
    if (block.kind === 'title') return; // a title names a topic
    if (block.kind === 'row') {
      units.push({ text: block.text, line: block.line, lineOf: block.lineOf, own: tagsOfBlock[i], tags: union(tagsOfBlock[i], caption[i] ?? new Set(), section) });
      return;
    }
    const sentences = sentencesOf(block.text).map((s) => ({ ...s, own: tagsOf(s.text, sourceKeys) }));
    let pending = [];
    for (const s of sentences) {
      pending.push(s);
      if (s.own.size > 0) {
        for (const p of pending) p.cover = s.own;
        pending = [];
      }
    }
    for (const p of pending) p.cover = new Set();
    for (const s of sentences) {
      units.push({ text: s.text, line: block.lineOf(s.offset), lineOf: (o) => block.lineOf(s.offset + o), own: s.own, tags: union(s.cover, section) });
    }
  });
  return units;
}

// ------------------------------------------------------------------ deny-list and baseline
export function loadDenyList(file = DENY_FILE) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  return doc.entries.map((e) => ({ ...e, re: new RegExp(e.pattern, 'iu') }));
}

export function loadBaseline(file = BASELINE_FILE) {
  if (!fs.existsSync(file)) return { entries: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Text as a reader sees it: code-span backticks and emphasis removed, whitespace collapsed. */
export const plain = (text) => text.replace(/`+/g, '').replace(/\*\*?|__?/g, '').replace(/\s+/g, ' ').trim();
export const unitHash = (text) => crypto.createHash('sha256').update(plain(text)).digest('hex').slice(0, 16);
const baselineKey = (f) => `${f.file}\u0000${f.key}\u0000${f.unit}`;

// ------------------------------------------------------------------ files
export function listFiles(root) {
  const out = [];
  const walk = (rel) => {
    const abs = path.join(root, rel);
    let st;
    try {
      st = fs.lstatSync(abs);
    } catch {
      return;
    }
    const posix = rel.split(path.sep).join('/');
    if (EXEMPT.some((e) => `${posix}/`.startsWith(e))) return;
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(abs))) return;
      for (const e of fs.readdirSync(abs).sort()) walk(path.join(rel, e));
    } else if (st.isFile() && EXTENSIONS.has(path.extname(abs))) out.push(posix);
  };
  for (const s of SCAN) walk(s);
  return out;
}

export const isCopy = (file) => COPY.some((re) => re.test(file));

// ------------------------------------------------------------------ the check
const versionPart = (key) => {
  const m = /^[a-z][\w-]* (\S+)$/.exec(key);
  return m ? m[1] : null;
};

function isIntroduced(introduced, key) {
  if (introduced.has(key)) return true;
  const v = versionPart(key);
  if (v && introduced.has(v)) return true;
  const family = /^(.*?)\.x$/.exec(key);
  if (family) for (const k of introduced) if (k.startsWith(`${family[1]}.`)) return true;
  return false;
}

export function checkFile(file, text, { deny, sourceKeys }) {
  const copy = isCopy(file);
  const units = unitsOf(text, file, sourceKeys);
  const findings = [];
  const log = [];
  const passed = { reference: 0, design: 0, verified: 0, source: 0, evidence: 0, introduced: 0 };
  let tokens = 0;
  const perUnit = units.map((u) => ({ u, toks: tokensOf(u.text) }));
  const covered = (u) => u.tags.has('reference') || u.tags.has('evidence') || u.tags.has('design') || u.tags.has('verified') || u.tags.has('source') || (!copy && u.tags.has('named'));
  const introduced = new Set();
  for (const { u, toks } of perUnit) {
    if (!covered(u)) continue;
    for (const t of toks) {
      introduced.add(t.key);
      const v = versionPart(t.key);
      if (t.kind === 'version' && v) introduced.add(v);
    }
  }
  for (const { u, toks } of perUnit) {
    const said = plain(u.text);
    for (const d of deny) if (d.re.test(said)) findings.push({ file, line: u.line, kind: 'deny', id: d.id, text: u.text.trim(), right: d.right, source: d.source });
    for (const t of toks) {
      tokens += 1;
      const line = u.lineOf(t.index);
      let how = null;
      if (u.tags.has('reference') || (!copy && u.tags.has('named'))) how = 'reference';
      else if (u.tags.has('evidence')) how = 'evidence';
      else if (u.tags.has('design')) how = 'design';
      else if (u.tags.has('verified')) how = 'verified';
      else if (u.tags.has('source')) how = 'source';
      else if (!copy && isIntroduced(introduced, t.key)) how = 'introduced';
      if (how) {
        passed[how] += 1;
        log.push({ file, line, kind: t.kind, text: t.text, how });
      } else {
        findings.push({ file, line, kind: 'untagged', token: t.text, tokenKind: t.kind, key: t.key, unit: unitHash(u.text), text: u.text.trim(), copy });
        log.push({ file, line, kind: t.kind, text: t.text, how: 'UNTAGGED' });
      }
    }
  }
  return { findings, log, passed, tokens, units: units.length, copy };
}

export function checkTree(root, { deny = loadDenyList(), baseline = loadBaseline() } = {}) {
  const files = listFiles(root);
  const texts = new Map(files.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
  const sourceKeys = new Set();
  for (const t of texts.values()) for (const k of sourceKeysOf(t)) sourceKeys.add(k);
  const report = {
    root,
    files: files.length,
    documents: 0,
    copy: 0,
    units: 0,
    tokens: 0,
    sourceKeys: sourceKeys.size,
    passed: { reference: 0, design: 0, verified: 0, source: 0, evidence: 0, introduced: 0 },
    all: [],
    findings: [],
    known: [],
    stale: [],
    notes: [],
    tokenLog: [],
  };
  for (const file of files) {
    const r = checkFile(file, texts.get(file), { deny, sourceKeys });
    if (r.copy) report.copy += 1;
    else report.documents += 1;
    report.units += r.units;
    report.tokens += r.tokens;
    for (const k of Object.keys(report.passed)) report.passed[k] += r.passed[k];
    report.all.push(...r.findings);
    report.tokenLog.push(...r.log);
  }
  // The baseline: known untagged tokens in documents (never copy, never the deny-list).
  const listed = new Map((baseline.entries ?? []).map((e) => [baselineKey(e), e]));
  const matched = new Set();
  for (const f of report.all) {
    const k = f.kind === 'untagged' && !f.copy ? baselineKey(f) : null;
    if (k && listed.has(k)) {
      report.known.push(f);
      matched.add(k);
    } else report.findings.push(f);
  }
  for (const [k, e] of listed) if (!matched.has(k)) report.stale.push(e);
  report.untagged = report.findings.filter((f) => f.kind === 'untagged').length;
  report.denied = report.findings.filter((f) => f.kind === 'deny').length;
  if (report.copy === 0) report.notes.push('no learner copy yet (content/stages/, labs/LAB-*/): the per-unit rule for copy has nothing to read');
  return report;
}

/** Baseline entries for a set of findings, sorted for a stable file. */
export function baselineOf(findings) {
  const entries = findings
    .filter((f) => f.kind === 'untagged' && !f.copy)
    .map((f) => ({ file: f.file, line: f.line, key: f.key, kind: f.tokenKind, token: f.token, unit: f.unit, text: f.text.length > 160 ? `${f.text.slice(0, 157)}...` : f.text }));
  const seen = new Set();
  return entries
    .filter((e) => {
      const k = baselineKey(e);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.file === b.file ? a.line - b.line || a.key.localeCompare(b.key) : a.file.localeCompare(b.file)));
}

export function formatFinding(f) {
  const excerpt = f.text.length > 220 ? `${f.text.slice(0, 217)}...` : f.text;
  if (f.kind === 'deny') return `${f.file}:${f.line}  deny-list ${f.id} (${f.source}): ${JSON.stringify(excerpt)}; write instead: ${f.right}`;
  return `${f.file}:${f.line}  untagged ${f.tokenKind} ${JSON.stringify(f.token)}${f.copy ? ' in learner copy' : ''}: ${JSON.stringify(excerpt)}`;
}
