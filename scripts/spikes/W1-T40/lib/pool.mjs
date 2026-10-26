// The audit pool: how content/audit/AUD-n.k.yaml is read, normalized and checked (W1-T40). GATE-audit
// (scripts/verify-audit.mjs) applies every rule here; GATE-audit-blind (scripts/verify-audit-blind.mjs) needs only
// the fields its simulation reads, the `shape` level. The contract is written out in ../README.md, section 3.
//
// Sources: spine sections 6, 6.1, 6.2 and 11.2; docs/AUDIT-DESK.md sections 2.2-2.4 (classes, subclasses, overlaps),
// 3 (anchor cards), 4.1-4.3 (operators and the keying battery), 5.3 (pairs and one phrase bank) and 6.3 (evidence
// types). The ID registry generated from the spine (packages/ids/src/registry.json) supplies the anchors, their
// stages, the gap classes with their parents, KCs, lessons, labs and lab stages.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
export const POOL_DIR = 'content/audit';

// ------------------------------------------------------------------ vocabulary

/** Evidence types (AUDIT-DESK 6.3). The first three are anchored to lines only; the next three also need an artifact. */
export const EVIDENCE_TYPES = ['declaration', 'identifiers', 'verdict-line', 'witness', 'paired-states', 'scenario', 'restatement'];
export const LINE_ANCHORED = new Set(['declaration', 'identifiers', 'verdict-line']);
export const ARTIFACT_TYPES = new Set(['witness', 'paired-states', 'scenario']);

/**
 * The evidence a finding of each class may carry (AUDIT-DESK 2.2, 2.3 and 6.3). A subclass not listed takes its
 * parent's row. Where 2.2 and 6.3 name two types (G8: the mismatched identifiers or a departing trace step; G11: the
 * stamp against the method, with a distinguishing instance where one exists) both are allowed.
 */
export const EVIDENCE_BY_CLASS = {
  G1: ['scenario'],
  G1a: ['declaration', 'scenario'],
  G2: ['declaration'],
  G3: ['witness'],
  G3a: ['paired-states'],
  G4: ['witness'],
  G5: ['verdict-line'],
  G6: ['declaration'],
  G6d: ['verdict-line', 'declaration'],
  G7: ['witness'],
  G8: ['witness', 'identifiers'],
  G8a: ['identifiers', 'declaration'],
  G8b: ['declaration'],
  G8c: ['declaration'],
  G8d: ['declaration'],
  G9: ['witness'],
  G10: ['paired-states'],
  G11: ['verdict-line', 'witness'],
  G12: ['scenario'],
  G13: ['witness'],
};

/** The first type of each class's row: what a finding naming that class anchors when the case's own key is another class. */
export const DEFAULT_EVIDENCE = Object.fromEntries(Object.entries(EVIDENCE_BY_CLASS).map(([k, v]) => [k, v[0]]));

/**
 * The mutation operators of spine section 6.2 ("Variants"), by slug, with the classes each can key (AUDIT-DESK
 * 4.1 and 4.2, rolled up to G1-G13). An operator only proposes: the battery's key decides, and a flawed variant
 * whose key falls outside its operator's classes means the operator did something the spine does not list.
 */
export const OPERATORS = {
  'drop-parentheses': { phrase: 'drop parentheses', classes: ['G2', 'G1', 'G12'] },
  'swap-quantifiers': { phrase: 'swap ∀ and ∃', classes: ['G1', 'G12'] },
  'change-arithmetic': { phrase: 'ℤ → ℕ or BitVec 64', classes: ['G4'] },
  'add-contradictory-hypothesis': { phrase: 'add a contradictory hypothesis', classes: ['G2'] },
  'move-conclusion-into-premise': { phrase: 'move the conclusion into a premise', classes: ['G8'] },
  'insert-native-decide-or-sorry': { phrase: 'insert `native_decide` or `sorry`', classes: ['G6'] },
  'weaken-postcondition': { phrase: 'weaken a postcondition', classes: ['G1', 'G8'] },
  'drop-frame-conjunct': { phrase: 'drop a frame conjunct', classes: ['G8', 'G1'] },
  'drop-or-misplace-fairness': { phrase: 'drop or misplace fairness', classes: ['G7'] },
  'split-atomic-action': { phrase: 'split an atomic action', classes: ['G9'] },
  'widen-or-narrow-observer': { phrase: 'widen or narrow the observer', classes: ['G10'] },
  'change-isolation-level': { phrase: 'change an isolation level', classes: ['G6', 'G7', 'G9'] },
  'replace-proof-by-single-db-test': { phrase: 'replace a proof by a single-database test', classes: ['G11'] },
  'stamp-bounded-inductive-as-proof': { phrase: 'stamp a bounded inductive check as proof', classes: ['G5'] },
  'report-inconclusive-as-verdict': { phrase: 'report an inconclusive result as a verdict', classes: ['G5'] },
  'drop-verification-step': { phrase: 'drop a verification step and keep the claim', classes: ['G6'] },
  'redefine-or-stricter-copy': { phrase: 'redefine a definition the statement uses or point the theorem at a stricter copy', classes: ['G8'] },
  'edit-code-to-fit-proof': { phrase: 'edit the code so that a proof goes through', classes: ['G8', 'G13'] },
  'restate-property-kind': { phrase: 'restate an "eventually" property as an invariant or a pair property as a single-trace property', classes: ['G3'] },
  'pin-affected-version': { phrase: 'pin an affected engine version', classes: ['G6'] },
  'drop-declassification': { phrase: 'drop a declassification', classes: ['G12'] },
  'drop-environment-assumption': { phrase: 'drop an environment assumption other than fairness', classes: ['G7'] },
  'reorder-effects': { phrase: 'reorder two effects in the implementation', classes: ['G8'] },
  'drop-non-functional-requirement': { phrase: 'drop a non-functional requirement', classes: ['G1'] },
  'edit-pinned-statement': { phrase: 'edit a pinned statement file or `comparator.json`', classes: ['G8'] },
};

const ANCHOR_ID = /^AUD-[1-9][0-9]*\.[1-9][0-9]*$/;
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/;
const RUN_ID = /^RUN-[A-Za-z0-9][A-Za-z0-9.-]*$/;
const TASK_ID = /^W[0-9]+-[TS][0-9]{2,}$/;
const LINE_REF = /^(statement|diff|receipt):([1-9][0-9]*)$/;
const DATE = /^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$/;

// ------------------------------------------------------------------ reading the sources

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** The spine's ID registry, indexed. Throws when it cannot be read: neither gate runs without it. */
export function loadRegistry(root) {
  const reg = readJson(join(root, 'packages', 'ids', 'src', 'registry.json'));
  const byId = new Map();
  const classes = new Map(); // class or subclass -> its top-level class
  const labStages = new Map(); // lab -> its stages
  for (const e of reg.entries) {
    byId.set(e.id, e);
    if (e.kind === 'gap-class') classes.set(e.id, e.parent ?? e.id);
    if (e.kind === 'lab-stage') {
      if (!labStages.has(e.lab)) labStages.set(e.lab, []);
      labStages.get(e.lab).push(e);
    }
  }
  return {
    byId,
    classes,
    labStages,
    kind: (id) => byId.get(id)?.kind ?? null,
    top: (c) => classes.get(c) ?? null,
    topClasses: [...new Set(classes.values())].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))),
  };
}

/** The tracker's tasks with their status (tracker/tasks.yaml's `  - id:` and `    status:` lines), or null without a tracker. */
export function loadTracker(root) {
  let text;
  try {
    text = readFileSync(join(root, 'tracker', 'tasks.yaml'), 'utf8');
  } catch {
    return null;
  }
  const tasks = new Map();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const id = /^\s*-\s+id:\s*["']?(W[0-9]+-[TS][0-9]{2,})["']?\s*$/.exec(line);
    if (id) {
      current = id[1];
      tasks.set(current, { id: current, status: null });
      continue;
    }
    const st = /^\s+status:\s*["']?([a-z-]+)["']?\s*$/.exec(line);
    if (st && current && tasks.get(current).status === null) tasks.get(current).status = st[1];
  }
  return tasks;
}

/**
 * Spine section 6.2's anchor table: each anchor's class (the first class token of its Class cell, or "none" for a
 * sound anchor) and the runs its Key run cell cites. Returns null when the section cannot be found.
 */
export function loadSpineAnchors(root) {
  let text;
  try {
    text = readFileSync(join(root, 'docs', 'spine', 'SPINE.md'), 'utf8');
  } catch {
    return null;
  }
  const start = text.indexOf('### 6.2 Anchors');
  if (start < 0) return null;
  const end = text.indexOf('\n### ', start + 10);
  const section = text.slice(start, end < 0 ? undefined : end);
  const out = new Map();
  for (const line of section.split('\n')) {
    if (!line.startsWith('| AUD-')) continue;
    const cells = line.split('|').map((c) => c.trim());
    const id = cells[1];
    const klass = /^(G[0-9]+[a-e]?|none)/.exec(cells[3] ?? '')?.[1] ?? null;
    const runs = [...(cells.at(-2) ?? '').matchAll(/RUN-[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]/g)].map((m) => m[0]);
    out.set(id, { id, stage: cells[2], class: klass, runs });
  }
  return out;
}

/**
 * The anchors that spine section 6 ships without generated variants ("The five W1 anchors from later stages
 * (AUD-2.1–AUD-2.4 and AUD-5.3) ship keyed only by executed runs ..., without generated variants"): the only anchors
 * whose variants may be declared pending. Returns { ids, sentence }, ids empty when the spine names none, or null when
 * the spine cannot be read.
 */
export function loadSpineVariantless(root) {
  let text;
  try {
    text = readFileSync(join(root, 'docs', 'spine', 'SPINE.md'), 'utf8');
  } catch {
    return null;
  }
  const start = text.indexOf('## 6. The Audit Desk');
  if (start < 0) return null;
  const end = text.indexOf('\n### 6.1', start);
  const section = text.slice(start, end < 0 ? undefined : end);
  const m = /anchors from later stages \(([^)]*)\) ship keyed only by executed runs[\s\S]{0,800}?without generated variants/.exec(section);
  if (!m) return { ids: [], sentence: null };
  const ids = [];
  for (const r of m[1].matchAll(/AUD-([0-9]+)\.([0-9]+)(?:\s*[–-]\s*AUD-([0-9]+)\.([0-9]+))?/g)) {
    const [n, k, n2, k2] = [r[1], Number(r[2]), r[3], Number(r[4])];
    if (n2 === undefined) ids.push(`AUD-${n}.${k}`);
    else if (n2 === n && k2 >= k) for (let i = k; i <= k2; i++) ids.push(`AUD-${n}.${i}`);
    else ids.push(`AUD-${n}.${k}`, `AUD-${n2}.${k2}`);
  }
  return { ids, sentence: m[1] };
}

const runCache = new Map();
/** A run record from runs/, or null when it is not on disk (or not valid JSON). */
export function loadRun(root, id) {
  const key = `${root}\u0000${id}`;
  if (runCache.has(key)) return runCache.get(key);
  let rec = null;
  try {
    rec = readJson(join(root, 'runs', `${id}.json`));
  } catch {
    rec = null;
  }
  runCache.set(key, rec);
  return rec;
}

/** Every verdict line a run record states: its own and those of each configuration, with the configuration's id. */
export function verdictLinesOf(rec) {
  const out = [];
  for (const l of Array.isArray(rec?.verdict_lines) ? rec.verdict_lines : []) if (typeof l === 'string') out.push({ config: null, line: l });
  for (const c of Array.isArray(rec?.configs) ? rec.configs : []) {
    for (const l of Array.isArray(c?.verdict_lines) ? c.verdict_lines : []) if (typeof l === 'string') out.push({ config: typeof c.id === 'string' ? c.id : null, line: l });
  }
  return out;
}

const squash = (s) => s.replace(/\s+/g, ' ').trim();
const WORD = /[A-Za-z0-9_]/;

/**
 * Whether a key line is stated by a verdict line: after collapsing white space, the key line occurs in the verdict
 * line with no letter, digit or underscore touching either end, so "sat" never matches inside "unsat".
 */
export function lineStates(verdictLine, keyLine) {
  const hay = squash(verdictLine);
  const needle = squash(keyLine);
  if (needle === '') return false;
  let from = 0;
  for (;;) {
    const at = hay.indexOf(needle, from);
    if (at < 0) return false;
    const before = at === 0 ? '' : hay.charAt(at - 1);
    const after = hay.charAt(at + needle.length);
    const edgeOk = (ch, inner) => ch === '' || !WORD.test(ch) || !WORD.test(inner);
    if (edgeOk(before, needle.charAt(0)) && edgeOk(after, needle.charAt(needle.length - 1))) return true;
    from = at + 1;
  }
}

// ------------------------------------------------------------------ YAML

let yamlReaders = null;
async function readers() {
  if (yamlReaders) return yamlReaders;
  yamlReaders = {};
  try {
    yamlReaders.content = (await import(pathToFileURL(join(REPO, 'packages', 'content', 'src', 'records.ts')).href)).readYaml;
  } catch {
    yamlReaders.content = null;
  }
  try {
    yamlReaders.subset = (await import(pathToFileURL(join(REPO, 'packages', 'ids', 'src', 'yaml-subset.ts')).href)).parseYaml;
  } catch {
    yamlReaders.subset = null;
  }
  return yamlReaders;
}

/**
 * Read one record file: JSON, or YAML through the content package's strict reader (YAML 1.2, duplicate keys refused,
 * the line of every key), falling back to the repository's YAML subset. Returns { value, lineOf, error }.
 */
export async function readRecordText(text, name) {
  if (name.endsWith('.json')) {
    try {
      return { value: JSON.parse(text), lineOf: () => null, error: null };
    } catch (e) {
      return { value: null, lineOf: () => null, error: `not valid JSON: ${e.message}` };
    }
  }
  const r = await readers();
  if (r.content) {
    const read = r.content(text);
    const err = read.problems.find((p) => p.severity === 'error');
    if (err) return { value: null, lineOf: () => null, error: `${err.message}${err.line ? ` (line ${err.line})` : ''}` };
    return { value: read.value, lineOf: (pointer) => read.lines.get(pointer) ?? null, error: null };
  }
  if (r.subset) {
    try {
      return { value: r.subset(text), lineOf: () => null, error: null };
    } catch (e) {
      return { value: null, lineOf: () => null, error: `not valid YAML: ${e.message}` };
    }
  }
  return { value: null, lineOf: () => null, error: 'no YAML reader is available (packages/content or packages/ids)' };
}

// ------------------------------------------------------------------ normalization

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (x) => (typeof x === 'string' && x.trim() !== '' ? x : null);

/** A text field as its lines: one trailing line end removed, so a YAML block scalar's last newline adds no line. */
export function linesOf(text) {
  if (typeof text !== 'string' || text === '') return [];
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
}

/**
 * A numeric literal: decimal (with a fraction or an exponent), hexadecimal, binary or octal, digits grouped by
 * underscores (`5_000_000`, Python, Rust and Lean) and a Rust type suffix (`7u64`, `1.5f64`) included, with a unary
 * minus when one stands right before it; never a digit inside an identifier (`cl11_violation`, `BitVec64`, `G2`), and
 * never a projection (`(transfer a b amt).1`, `t.0`), though the bound after a range's `..` is one (`1..10`).
 */
const NUMERIC = /(?<![A-Za-z0-9_])(?<!(?<!\.)\.)(?:-(?=\.?[0-9]))?(?:0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|(?:[0-9](?:_?[0-9])*(?:\.[0-9](?:_?[0-9])*)?|(?<![)\]])\.[0-9](?:_?[0-9])*)(?:[eE][-+]?[0-9]+)?)(?:_?(?:[ui](?:8|16|32|64|128|size)|f(?:32|64)))?(?![A-Za-z0-9_])/g;
/** SMT-LIB's bit-vector literals: `#x0000000000000007`, `#b0101`, and the value of an indexed one, `(_ bv7 64)`. */
const SMT_LITERAL = /(?<![A-Za-z0-9_#])#(?:x[0-9a-fA-F]+|b[01]+)(?![A-Za-z0-9_])/g;
const SMT_INDEXED = /(?<=\(_\s+bv)[0-9]+(?![A-Za-z0-9_])/g;

/** A text with what re-seeding changes set aside: every numeric literal replaced by #, white space collapsed. */
export function structureText(text) {
  return text.replace(SMT_LITERAL, '#').replace(SMT_INDEXED, '#').replace(NUMERIC, '#').replace(/\s+/g, ' ').trim();
}

/**
 * A case's structure, for the exemplar count (AUDIT-DESK 4: an exemplar "differs structurally from the class's other
 * cases ..., not one with re-seeded constants"): its statement, diff and receipt, each through structureText. Two
 * cases with one structure differ at most in their constants and their spacing.
 */
export function structureOf(c) {
  return JSON.stringify(['statement', 'diff', 'receipt'].map((f) => structureText(c.text[f].join('\n'))));
}

/** The size of a diff: its changed lines when it is a unified diff (headers aside), else its non-blank lines. */
export function diffSize(lines) {
  const changed = lines.filter((l) => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++ ') && !l.startsWith('--- '));
  return changed.length > 0 ? changed.length : lines.filter((l) => l.trim() !== '').length;
}

/** A seed written as a number or a 0x string. */
function seedOf(x) {
  if (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 2 ** 32) return x;
  if (typeof x === 'string' && /^0x[0-9a-fA-F]{1,8}$/.test(x)) return Number.parseInt(x.slice(2), 16);
  return null;
}

/**
 * Read a key: `none` (a sound case), a class (`G2`), or `{class: G2, also: [G1]}`. The acceptable set is the class
 * plus `also` (AUDIT-DESK 2.4). The field is `class`, not `primary`: GATE-kc reads `primary` as a KC tag key in
 * every record under content/. Returns { truth, primary, also, error }.
 */
export function readKey(raw) {
  if (raw === 'none' || raw === 'none: sound') return { truth: 'sound', primary: null, also: [], error: null };
  if (typeof raw === 'string') return { truth: 'flawed', primary: raw, also: [], error: null };
  if (isObj(raw)) {
    if ('primary' in raw) return { truth: null, primary: null, also: [], error: 'write key: {class: G2, also: [G1]}; `primary` is a KC tag key that GATE-kc reads in every content record' };
    if (raw.class === 'none') return { truth: 'sound', primary: null, also: [], error: Array.isArray(raw.also) && raw.also.length > 0 ? 'a sound key has no acceptable classes' : null };
    if (typeof raw.class !== 'string') return { truth: null, primary: null, also: [], error: 'key.class must be a gap class or none' };
    const also = raw.also === undefined ? [] : Array.isArray(raw.also) ? raw.also : null;
    if (also === null || also.some((c) => typeof c !== 'string')) return { truth: null, primary: null, also: [], error: 'key.also must be a list of gap classes' };
    return { truth: 'flawed', primary: raw.class, also: [...new Set(also.filter((c) => c !== raw.class))], error: null };
  }
  return { truth: null, primary: null, also: [], error: 'a case needs a key: none, a gap class, or {class, also}' };
}

/**
 * Load the pool under content/audit: every AUD-n.k.(yaml|yml|json) file, normalized. Files whose names start with an
 * underscore, and README files, are not anchors. Returns { anchors, problems, files, present }.
 *
 * A problem is { level, check, file, line, anchor, case, message }. Level `shape` marks what GATE-audit-blind
 * cannot simulate without (a key, a pair, the stage, the texts, the evidence lines); level `content` the rest,
 * which only GATE-audit enforces.
 */
export async function loadPool(root, registry, opts = {}) {
  const dir = join(root, opts.dir ?? POOL_DIR);
  const problems = [];
  const anchors = [];
  if (!existsSync(dir)) return { anchors, problems, files: [], present: false };
  const files = readdirSync(dir)
    .filter((n) => /\.(ya?ml|json)$/.test(n) && !n.startsWith('_') && !/^readme/i.test(n))
    .filter((n) => statSync(join(dir, n)).isFile())
    .sort();
  for (const name of files) {
    const rel = `${opts.dir ?? POOL_DIR}/${name}`;
    const read = await readRecordText(readFileSync(join(dir, name), 'utf8'), name);
    if (read.error) {
      problems.push({ level: 'shape', check: 'file', file: rel, line: null, anchor: null, case: null, message: `${rel}: ${read.error}` });
      continue;
    }
    const anchor = normalizeAnchor(read.value, { file: rel, name, lineOf: read.lineOf, registry, problems });
    if (anchor) anchors.push(anchor);
  }
  // A case's reference is unique in the pool: two files that define one anchor would make it ambiguous.
  const seen = new Map();
  for (const a of anchors) {
    if (seen.has(a.id)) problems.push({ level: 'shape', check: 'anchor', file: a.file, line: null, anchor: a.id, case: null, message: `${a.id} is defined twice: ${seen.get(a.id)} and ${a.file}` });
    else seen.set(a.id, a.file);
  }
  return { anchors, problems, files: files.map((n) => `${opts.dir ?? POOL_DIR}/${n}`), present: true };
}

/** Normalize one anchor document; push its problems. Returns the anchor, or null when it cannot be read as one. */
export function normalizeAnchor(doc, ctx) {
  const { file, name, registry, problems } = ctx;
  const lineOf = ctx.lineOf ?? (() => null);
  const stem = name.replace(/\.(ya?ml|json)$/, '');
  const add = (level, check, message, pointer = '', caseId = null) =>
    problems.push({ level, check, file, line: lineOf(pointer), anchor: isObj(doc) && typeof doc.id === 'string' ? doc.id : stem, case: caseId, message });
  if (!isObj(doc)) {
    add('shape', 'file', `${file} is not a mapping: an anchor file holds one anchor`);
    return null;
  }
  const id = typeof doc.id === 'string' ? doc.id : null;
  if (!id || !ANCHOR_ID.test(id)) {
    add('shape', 'anchor', `${file}: id must be an anchor ID (AUD-n.k), got ${JSON.stringify(doc.id ?? null)}`, '/id');
    return null;
  }
  if (id !== stem) add('content', 'anchor', `${id} lives in ${file}: an anchor's file is named after its ID (content/audit/${id}.yaml)`, '/id');
  const entry = registry.byId.get(id);
  if (!entry || entry.kind !== 'anchor') add('content', 'anchor', `${id} is not an audit anchor of the spine's registry (spine section 6.2)`, '/id');
  const stage = typeof doc.stage === 'string' ? doc.stage : null;
  if (!stage || registry.kind(stage) !== 'stage') add('shape', 'anchor', `${id}: stage must be a stage ID (S1-S10), got ${JSON.stringify(doc.stage ?? null)}`, '/stage');
  else if (entry?.stage && entry.stage !== stage) add('content', 'anchor', `${id} belongs to ${entry.stage} in the spine, not ${stage}`, '/stage');

  const anchor = {
    file,
    id,
    stage: stage ?? entry?.stage ?? null,
    class: typeof doc.class === 'string' ? doc.class : null,
    medium: str(doc.medium),
    artifact: str(doc.artifact),
    claim: str(doc.claim),
    scheduledAfter: Array.isArray(doc.scheduled_after) ? doc.scheduled_after.filter((x) => typeof x === 'string') : [],
    kcs: Array.isArray(doc.kcs) ? doc.kcs.filter((x) => typeof x === 'string') : [],
    basedOn: isObj(doc.based_on) ? doc.based_on : null,
    cases: [],
    variantsPending: null,
    raw: doc,
  };
  if (anchor.class === null) add('content', 'fields', `${id}: class is missing (the anchor's class in spine section 6.2, or none for a sound anchor)`, '/class');
  else if (anchor.class !== 'none' && !registry.classes.has(anchor.class)) add('content', 'fields', `${id}: class ${anchor.class} is not a gap class of spine section 6.1`, '/class');
  for (const [field, v] of [['medium', anchor.medium], ['artifact', anchor.artifact], ['claim', anchor.claim]]) if (v === null) add('content', 'fields', `${id}: ${field} is missing`, `/${field}`);
  if (!Array.isArray(doc.scheduled_after) || anchor.scheduledAfter.length === 0 || anchor.scheduledAfter.length !== doc.scheduled_after.length) add('shape', 'fields', `${id}: scheduled_after must list the labs, lab stages or lessons the case is scheduled after, as IDs (AUDIT-DESK 3.1)`, '/scheduled_after');
  if (!Array.isArray(doc.kcs) || anchor.kcs.length === 0 || anchor.kcs.length !== doc.kcs.length) add('content', 'fields', `${id}: kcs must list the anchor's KCs, as IDs`, '/kcs');
  if (anchor.basedOn === null) add('content', 'based-on', `${id}: the "based on" card (based_on: incident, date, date_marks, source) is missing`, '/based_on');

  const memberDocs = Array.isArray(doc.cases) ? doc.cases : null;
  if (memberDocs === null) add('shape', 'fields', `${id}: cases must list the pair's members (one sound, one flawed at least)`, '/cases');
  const ids = new Set();
  (memberDocs ?? []).forEach((c, i) => {
    const k = normalizeCase(c, { anchor, kind: 'member', pointer: `/cases/${i}`, registry, add, ids });
    if (k) anchor.cases.push(k);
  });
  if (isObj(doc.variants)) {
    const p = doc.variants.pending;
    if (!isObj(p) || typeof p.lands !== 'string' || !TASK_ID.test(p.lands)) add('content', 'fields', `${id}: variants: {pending: {lands: <task>}} names the tracker task its variants land with`, '/variants');
    else anchor.variantsPending = { lands: p.lands };
  } else if (Array.isArray(doc.variants)) {
    // An empty list would make the anchor look shipped with no variant at all, which no class's exemplar count reads.
    if (doc.variants.length === 0) add('content', 'fields', `${id}: variants is an empty list: list the anchor's variants, or, for an anchor that spine section 6 ships without them, say when they land ({pending: {lands: <task>}})`, '/variants');
    doc.variants.forEach((c, i) => {
      const k = normalizeCase(c, { anchor, kind: 'variant', pointer: `/variants/${i}`, registry, add, ids });
      if (k) anchor.cases.push(k);
    });
  } else {
    add('content', 'fields', `${id}: variants must list the anchor's variants, or say when they land ({pending: {lands: <task>}})`, '/variants');
  }
  return anchor;
}

/** Normalize one case (a pair member or a variant). Returns the case, or null when it has no usable id. */
function normalizeCase(c, ctx) {
  const { anchor, kind, pointer, registry, add, ids } = ctx;
  if (!isObj(c)) {
    add('shape', 'fields', `${anchor.id}: ${pointer} is not a mapping`, pointer);
    return null;
  }
  const cid = typeof c.id === 'string' ? c.id : null;
  if (!cid || !CASE_ID.test(cid)) {
    add('shape', 'fields', `${anchor.id}: ${pointer}: a case needs an id (lower case, digits and hyphens)`, `${pointer}/id`);
    return null;
  }
  const ref = `${anchor.id}/${cid}`;
  const problem = (level, check, message, at = '') => add(level, check, `${ref}: ${message}`, `${pointer}${at}`, cid);
  if (ids.has(cid)) {
    problem('shape', 'fields', `the id ${cid} is used twice in ${anchor.id}`, '/id');
    return null;
  }
  ids.add(cid);

  const key = readKey(c.key);
  if (key.error) problem('shape', 'key', key.error, '/key');
  if (key.truth === 'flawed') {
    if (!registry.classes.has(key.primary)) problem('shape', 'key', `${key.primary} is not a gap class of spine section 6.1`, '/key');
    for (const a of key.also) if (!registry.classes.has(a)) problem('shape', 'key', `the acceptable class ${a} is not a gap class of spine section 6.1`, '/key');
  }
  const text = { statement: linesOf(c.statement), diff: linesOf(c.diff), receipt: linesOf(c.receipt) };
  if (text.statement.length === 0) problem('shape', 'fields', 'statement is missing: the Desk shows the statement first (AUDIT-DESK 5.4, step 1)', '/statement');
  for (const f of ['diff', 'receipt']) if (c[f] !== undefined && typeof c[f] !== 'string') problem('shape', 'fields', `${f} must be text`, `/${f}`);
  const selectable = [...text.statement, ...text.diff, ...text.receipt].filter((l) => l.trim() !== '').length;

  const ev = isObj(c.evidence) ? c.evidence : null;
  const evidence = {
    type: typeof ev?.type === 'string' ? ev.type : null,
    loadBearing: Array.isArray(ev?.load_bearing) ? ev.load_bearing : [],
    reference: ev?.reference ?? null,
    scenarios: Array.isArray(ev?.scenarios) ? ev.scenarios : null,
  };
  if (ev === null) problem('shape', 'evidence', 'evidence is missing: {type, load_bearing, ...} (AUDIT-DESK 6.3)', '/evidence');
  else if (!EVIDENCE_TYPES.includes(evidence.type)) problem('shape', 'evidence', `evidence.type must be one of ${EVIDENCE_TYPES.join(', ')}, got ${JSON.stringify(ev.type ?? null)}`, '/evidence/type');

  // Load-bearing lines: one to three distinct references to non-blank lines of the case's own texts.
  const lb = [];
  for (const r of evidence.loadBearing) {
    const m = typeof r === 'string' ? LINE_REF.exec(r) : null;
    if (!m) {
      problem('shape', 'evidence', `load_bearing entries are statement:N, diff:N or receipt:N, got ${JSON.stringify(r)}`, '/evidence/load_bearing');
      continue;
    }
    const line = text[m[1]][Number(m[2]) - 1];
    if (line === undefined || line.trim() === '') problem('shape', 'evidence', `${r} is not a non-blank line of the case's ${m[1]}`, '/evidence/load_bearing');
    else if (!lb.includes(r)) lb.push(r);
    else problem('shape', 'evidence', `${r} is listed twice in load_bearing`, '/evidence/load_bearing');
  }
  evidence.loadBearing = lb;

  const generator = isObj(c.generator) ? { template: c.generator.template, band: c.generator.band, seed: seedOf(c.generator.seed), raw: c.generator } : null;
  const rekey = isObj(c.rekey) && isObj(c.rekey.pending) ? { engine: str(c.rekey.pending.engine), lands: str(c.rekey.pending.lands) } : null;
  const keyLines = Array.isArray(c.key_lines) ? c.key_lines.map((k) => (typeof k === 'string' ? { config: null, line: k } : isObj(k) && typeof k.line === 'string' ? { config: typeof k.config === 'string' ? k.config : null, line: k.line } : null)) : [];
  const out = {
    anchor: anchor.id,
    stage: anchor.stage,
    id: cid,
    ref,
    kind,
    pointer,
    truth: key.error ? null : key.truth,
    primary: key.primary,
    also: key.also,
    acceptable: key.truth === 'flawed' ? [key.primary, ...key.also] : [],
    top: key.truth === 'flawed' ? registry.top(key.primary) : null,
    acceptableTop: key.truth === 'flawed' ? [...new Set([key.primary, ...key.also].map((x) => registry.top(x)).filter(Boolean))] : [],
    pair: kind === 'member' ? `${anchor.id}/${typeof c.pair === 'string' ? c.pair : 'pair'}` : typeof c.pair === 'string' ? `${anchor.id}/${c.pair}` : null,
    operator: typeof c.operator === 'string' ? c.operator : kind === 'member' ? 'anchor' : null,
    medium: str(c.medium) ?? anchor.medium,
    artifact: str(c.artifact) ?? anchor.artifact,
    claim: str(c.claim) ?? anchor.claim,
    text,
    selectable,
    diffLines: diffSize(text.diff),
    evidence,
    keyRun: typeof c.key_run === 'string' ? c.key_run : null,
    keyLines: keyLines.filter(Boolean),
    keyLinesMalformed: keyLines.some((k) => k === null),
    rekeyPending: rekey,
    rekeyMalformed: c.rekey !== undefined && rekey === null,
    generator,
    raw: c,
  };
  if (kind === 'variant' && out.pair === null) problem('shape', 'pairs', 'a variant names its pair (pair: <id>): the flawed form and its matched sound form share it', '/pair');
  if (kind === 'variant' && out.operator === null) problem('content', 'operator', 'a variant names the operator that made it (operator: <slug>)', '/operator');
  return out;
}

// ------------------------------------------------------------------ content rules (GATE-audit)

/**
 * Every content rule of the pool contract, beyond the shape checks loadPool already made: the anchor against the
 * spine, scheduling, the "based on" card, keys and their runs, typed evidence, pairs and one phrase bank,
 * operators. Returns the problems found (all of level `content` unless they block the simulation).
 */
export function contentProblems(pool, ctx) {
  const { root, registry, spineAnchors } = ctx;
  const out = [];
  for (const a of pool.anchors) {
    const add = (check, message, caseId = null, level = 'content') => out.push({ level, check, file: a.file, line: null, anchor: a.id, case: caseId, message });
    const spine = spineAnchors?.get(a.id) ?? null;
    if (spine && a.class && spine.class && a.class !== spine.class) add('anchor', `${a.id}: class ${a.class} differs from spine section 6.2, which gives ${spine.class}`);
    if (spine && spine.runs.length > 0) {
      const cited = new Set(a.cases.map((c) => c.keyRun).filter(Boolean));
      if (!spine.runs.some((r) => cited.has(r))) add('key-run', `${a.id}: no case is keyed by a run of spine section 6.2's Key run cell (${spine.runs.join(', ')})`);
    }
    // Scheduling: after a lab or lab stage of the anchor's own stage (AUDIT-DESK 3.1, 5.1).
    const n = a.stage ? a.stage.slice(1) : null;
    for (const u of a.scheduledAfter) if (!['lab', 'lab-stage', 'lesson'].includes(registry.kind(u))) add('fields', `${a.id}: scheduled_after names ${u}, which is not a lab, lab stage or lesson of the registry`);
    if (n && a.scheduledAfter.length > 0 && !a.scheduledAfter.some((u) => u === `LAB-${n}` || u.startsWith(`LAB-${n}.`))) add('fields', `${a.id}: scheduled_after names no lab or lab stage of ${a.stage}; a case is scheduled after the lab that teaches its class (AUDIT-DESK 5.1)`);
    for (const k of a.kcs) if (registry.kind(k) !== 'kc') add('fields', `${a.id}: ${k} is not a KC of the registry`);
    out.push(...basedOnProblems(a, root));
    // The pair: at least one sound and one flawed member, and the headline member of the spine's class.
    const members = a.cases.filter((c) => c.kind === 'member');
    if (!members.some((c) => c.truth === 'sound') || !members.some((c) => c.truth === 'flawed')) add('pairs', `${a.id}: an anchor is a matched pair: its cases need a sound and a flawed member (AUDIT-DESK 3)`, null, 'shape');
    if (a.class && a.class !== 'none' && !members.some((c) => c.truth === 'flawed' && c.primary === a.class)) add('key', `${a.id}: no flawed member is keyed ${a.class}, the anchor's class`);
    if (a.variantsPending) {
      if (a.cases.some((c) => c.kind === 'variant')) add('fields', `${a.id}: variants are either listed or pending, not both`);
    }
    for (const c of a.cases) out.push(...caseProblems(a, c, ctx));
    // Pairs: every pair holds a sound and a flawed case, and one claim (one phrase bank, AUDIT-DESK 5.3 item 6).
    const pairs = new Map();
    for (const c of a.cases) {
      if (!c.pair) continue;
      if (!pairs.has(c.pair)) pairs.set(c.pair, []);
      pairs.get(c.pair).push(c);
    }
    for (const [p, cs] of pairs) {
      if (cs[0].kind === 'variant' && (!cs.some((c) => c.truth === 'sound') || !cs.some((c) => c.truth === 'flawed'))) add('pairs', `${p}: a variant pair needs its flawed form and its matched sound form (AUDIT-DESK 4)`, cs[0].id, 'shape');
      const claims = new Set(cs.map((c) => c.claim));
      if (claims.size > 1) add('pairs', `${p}: the members of a pair carry different claims; the claim comes from one phrase bank, so its wording cannot cue the key (AUDIT-DESK 5.3)`, cs[0].id);
    }
  }
  return out;
}

const CODE_FENCE = /```|~~~|<script/i;

function basedOnProblems(a, root) {
  const out = [];
  const add = (message) => out.push({ level: 'content', check: 'based-on', file: a.file, line: null, anchor: a.id, case: null, message: `${a.id}: ${message}` });
  const b = a.basedOn;
  if (!b) return out;
  if (!str(b.incident)) add('based_on.incident is missing: the dated incident the case is based on');
  if (typeof b.date !== 'string' || !DATE.test(b.date)) add(`based_on.date must be a quoted date (YYYY-MM-DD, YYYY-MM or YYYY), got ${JSON.stringify(b.date ?? null)}`);
  if (!str(b.date_marks)) add('based_on.date_marks is missing: the card says which event its date marks (spine section 6)');
  const sources = typeof b.source === 'string' ? [b.source] : Array.isArray(b.source) ? b.source : [];
  if (sources.length === 0 || sources.some((s) => typeof s !== 'string' || s.trim() === '')) add('based_on.source is missing: a URL, or a path in this repository');
  for (const s of sources) {
    if (typeof s !== 'string' || /^https?:\/\/\S+$/.test(s)) continue;
    if (!existsSync(join(root, s.replace(/\/$/, '')))) add(`based_on.source ${s} is neither a URL nor a path in this repository`);
  }
  for (const [k, v] of Object.entries(b)) if (typeof v === 'string' && CODE_FENCE.test(v)) add(`based_on.${k} holds code; a "based on" card cites its incident and never ships exploit code (AUDIT-DESK 1.3)`);
  return out;
}

function caseProblems(a, c, ctx) {
  const { root, registry } = ctx;
  const out = [];
  const add = (check, message, level = 'content') => out.push({ level, check, file: a.file, line: null, anchor: a.id, case: c.id, message: `${c.ref}: ${message}` });
  // Typed evidence (AUDIT-DESK 6.3).
  if (c.truth === 'sound') {
    if (c.evidence.type && c.evidence.type !== 'restatement') add('evidence', `a sound case's evidence is its restatement (type: restatement), not ${c.evidence.type}`, 'shape');
    if (!c.evidence.scenarios || c.evidence.scenarios.length < 3 || c.evidence.scenarios.some((s) => !isObj(s) || !str(s.text))) add('evidence', 'a restatement holds at least three scenarios, each with its text (AUDIT-DESK 5.4, step 3)');
  } else if (c.truth === 'flawed' && c.evidence.type) {
    const allowed = EVIDENCE_BY_CLASS[c.primary] ?? EVIDENCE_BY_CLASS[registry.top(c.primary)] ?? [];
    if (!allowed.includes(c.evidence.type)) add('evidence', `a ${c.primary} finding carries ${allowed.join(' or ')} evidence, not ${c.evidence.type} (AUDIT-DESK 6.3)`, 'shape');
    if (c.evidence.loadBearing.length < 1 || c.evidence.loadBearing.length > 3) add('evidence', 'load_bearing lists the one to three lines that carry the class (AUDIT-DESK 6.3)', 'shape');
    if (LINE_ANCHORED.has(c.evidence.type) && c.selectable < 4) add('evidence', `the case has ${c.selectable} selectable lines; line-anchored evidence needs at least 4, so that selecting every line cannot validate it (AUDIT-DESK 6.3)`, 'shape');
    if (ARTIFACT_TYPES.has(c.evidence.type) && (c.evidence.reference === null || c.evidence.reference === '')) add('evidence', `${c.evidence.type} evidence needs a reference artifact from the key run (evidence.reference), which the replay validates`);
  }
  // The key run and the lines in it that carry the key.
  if (c.keyRun === null) {
    if (c.kind === 'member') add('key-run', 'a pair member names the executed run that keys it (key_run: RUN-...)');
  } else if (!RUN_ID.test(c.keyRun)) add('key-run', `key_run must be a run ID, got ${JSON.stringify(c.keyRun)}`);
  else {
    const rec = loadRun(root, c.keyRun);
    if (!rec) add('key-run', `${c.keyRun} is not on disk (runs/${c.keyRun}.json): every key is set by an executed run (spine section 6)`);
    else {
      if (c.keyLinesMalformed) add('key-run', 'key_lines entries are a line, or {config, line}');
      if (c.keyLines.length === 0) add('key-run', `key_lines quotes the verdict lines of ${c.keyRun} that carry the key`);
      const lines = verdictLinesOf(rec);
      for (const k of c.keyLines) {
        const pool = k.config ? lines.filter((l) => l.config === k.config) : lines;
        if (k.config && pool.length === 0) add('key-run', `${c.keyRun} has no configuration ${k.config}`);
        else if (!pool.some((l) => lineStates(l.line, k.line))) add('key-run', `${c.keyRun}${k.config ? ` (${k.config})` : ''} states no verdict line ${JSON.stringify(k.line)}`);
      }
    }
  }
  if (c.rekeyMalformed) add('pending', 'rekey: {pending: {engine, lands}} names the engine the battery waits for and the task it lands with');
  if (c.rekeyPending && !c.keyRun) add('pending', 'a case whose re-keying waits for an engine is keyed by an executed run meanwhile (key_run)');
  // Operators (spine section 6.2 Variants).
  if (c.kind === 'variant' && c.operator !== null) {
    const op = OPERATORS[c.operator];
    if (!op) add('operator', `${c.operator} is not an operator of spine section 6.2 (the slugs are listed in scripts/spikes/W1-T40/README.md)`);
    else if (c.truth === 'flawed' && c.top && !op.classes.includes(c.top)) add('operator', `${c.operator} keys ${op.classes.join(', ')}, but the case is keyed ${c.primary}`);
  }
  if (c.generator) {
    const g = c.generator;
    if (!/^t[1-4]$/.test(String(g.template)) || ![1, 2, 3].includes(g.band) || g.seed === null) add('fields', 'generator is {template: t1-t4, band: 1-3, seed: a uint32}');
  }
  return out;
}

// ------------------------------------------------------------------ the simulation's view

/**
 * The cases as GATE-audit-blind simulates them: one object per pool case whose shape is sound, with the rolled-up
 * classes (scoring counts classes, AUDIT-DESK 2.3), the evidence lines and the diff size. Cases with a shape
 * problem are left out; the caller reports those problems.
 */
export function blindCases(pool, problems) {
  const broken = new Set(problems.filter((p) => p.level === 'shape' && p.case).map((p) => `${p.anchor}/${p.case}`));
  const brokenAnchors = new Set(problems.filter((p) => p.level === 'shape' && !p.case && p.check !== 'pairs').map((p) => p.anchor));
  const out = [];
  for (const a of pool.anchors) {
    if (brokenAnchors.has(a.id) || !a.stage) continue;
    for (const c of a.cases) {
      if (broken.has(c.ref) || c.truth === null || c.pair === null) continue;
      out.push({
        id: c.ref,
        anchor: a.id,
        stage: a.stage,
        pair: c.pair,
        truth: c.truth,
        top: c.top,
        acceptableTop: c.acceptableTop,
        evType: c.evidence.type,
        selectable: c.selectable,
        loadBearing: c.evidence.loadBearing.length,
        diffLines: c.diffLines,
        medium: c.medium,
        scheduledAfter: a.scheduledAfter,
      });
    }
  }
  return out;
}
