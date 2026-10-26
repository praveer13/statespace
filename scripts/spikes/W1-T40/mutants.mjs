#!/usr/bin/env node
// Weaken one rule at a time in a scratch copy of the two gates and their library, and run that gate's self-check: each
// weakened gate must fail its own self-check (W1-T40). A rule that no self-check case pins could be weakened by a
// contributor or a refactor and nothing would notice; this harness is the guard against that.
//
//   node scripts/spikes/W1-T40/mutants.mjs                   every mutant (a few minutes)
//   node scripts/spikes/W1-T40/mutants.mjs --gate audit      only GATE-audit's (or blind)
//   node scripts/spikes/W1-T40/mutants.mjs --only ID,ID      only these mutants
//   node scripts/spikes/W1-T40/mutants.mjs --list            list the mutants and the rule each weakens
//   --jobs N (parallel self-checks, default 4), --json
//
// A mutant replaces one exact piece of source text, which must occur exactly once, in one file of a scratch copy. The
// copy holds the two gate scripts and lib/; packages/, docs/, tracker/, runs/, research/ and content/ are links to this
// repository. The unmutated copy must pass both self-checks first. A mutant is killed when its gate's self-check
// reports a case that did not hold, and survives when the self-check stays green; anything else (a crash, text not
// found) is an error. A mutant that only renames or reorders is not listed: each one weakens a rule that the gates'
// headers, scripts/spikes/W1-T40/README.md or the spine name, except those that make a rule stricter instead and show
// it is pinned from that side too: blind-mean-not-max (the maximum over the replicates for their mean), and the
// mutants named *-strict, each of which fails a valid value at the edge of a rule (exactly six exemplars, three
// scenarios, a reference at its bar, an advantage just below 2 SD, ...), which the self-check's case for that value
// must catch (README decision 13).
//
// Exit status: 0 every mutant killed, 1 a mutant survived or errored, 2 the harness could not run.

import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const A = 'scripts/verify-audit.mjs';
const B = 'scripts/verify-audit-blind.mjs';
const P = 'scripts/spikes/W1-T40/lib/pool.mjs';
const L = 'scripts/spikes/W1-T40/lib/blind.mjs';
const COPIED = [A, B, P, L, 'scripts/spikes/W1-T40/lib/fixtures.mjs'];
const LINKED = ['packages', 'docs', 'tracker', 'runs', 'research', 'content'];
const SCRIPT = { audit: A, blind: B };

/** An `if (...)` guard turned off: the finding it raises is never raised. */
const off = (cond, tail) => [`if (${cond}) ${tail}`, `if (false) ${tail}`];
/** A call whose finding is dropped: `add(` (or `push(`) becomes `void (`, the arguments still evaluated. */
const drop = (head, call = 'add(') => [`${call}${head}`, `void (${head}`];

/** [id, gate, file, [find, replace], the rule it weakens] */
const LIST = [
  // ---------------------------------------------------------------- GATE-audit: the gate
  ['audit-six', 'audit', A, ['const SIX = 6;', 'const SIX = 5;'], 'six exemplars per class whose anchors have shipped'],
  ['audit-exemplar-label', 'audit', A, ['    if (counted.some((e) => e.label === label)) continue;\n', ''], "an exemplar's label (operator, artifact, medium) is new for its class"],
  ['audit-exemplar-structure', 'audit', A, ['const twin = counted.find((e) => e.structure === structure);', 'const twin = undefined;'], "an exemplar's texts differ from every counted exemplar's beyond numeric literals and white space"],
  ['audit-exemplar-repeat-finding', 'audit', A, drop("'exemplars', c.ref, `repeats ${t.ref}"), 'a relabeled or re-seeded copy is a finding'],
  ['audit-may-wait', 'audit', A, ['if (a.variantsPending && mayWait.has(a.id)) carried.get(k).pending.push(', 'if (a.variantsPending) carried.get(k).pending.push('], 'only the anchors spine section 6 ships without variants may wait'],
  ['audit-pending-not-allowed', 'audit', A, off('!mayWait.has(a.id)', "add('pending', a.id,"), 'variants pending on an anchor that ships with its variants is a finding'],
  ['audit-short', 'audit', A, off("status === 'short'", 'add('), 'a class short of six exemplars is a finding'],
  ['audit-strict-variants', 'audit', A, off("status === 'variants pending' && o.strict", 'add('), '--strict: pending variants fail'],
  ['audit-strict-empty', 'audit', A, off('anchors.length === 0 && o.strict', 'add('), '--strict: an empty pool fails'],
  ['audit-strict-rekey', 'audit', A, off('o.strict', "add('pending', c.ref,"), '--strict: pending re-keys fail'],
  ['audit-pool-problems', 'audit', A, drop('p.check, where, p.line ? '), 'every problem of the pool contract is a finding'],
  ['audit-key-primary', 'audit', A, off("(primary === null) !== (c.truth === 'sound') || (primary !== null && primary !== c.primary)", 'out.push('), "the battery's class equals the case's"],
  ['audit-key-sound-direction', 'audit', A, ["(primary === null) !== (c.truth === 'sound')", "(primary !== null && c.truth === 'sound')"], "a flawed case the battery keys sound is a changed key, as a sound case it keys flawed is"],
  ['audit-key-acceptable', 'audit', A, off('!sameSet(acc, c.acceptable)', 'out.push('), "the battery's acceptable set equals the case's"],
  ['audit-sameset-length', 'audit', A, ['const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));', 'const sameSet = (a, b) => a.every((x) => b.includes(x));'], "the key's sets (acceptable classes, load-bearing lines) are compared both ways"],
  ['audit-acceptable-subset', 'audit', A, ['if (!sameSet(acc, c.acceptable)) out.push(', 'if (!acc.every((x) => c.acceptable.includes(x))) out.push('], "a case's acceptable set wider than the battery's is a changed key"],
  ['audit-acceptable-superset', 'audit', A, ['if (!sameSet(acc, c.acceptable)) out.push(', 'if (!c.acceptable.every((x) => acc.includes(x))) out.push('], "a case's acceptable set narrower than the battery's is a changed key"],
  ['audit-key-evidence-type', 'audit', A, off("typeof ev.type === 'string' && ev.type !== c.evidence.type", 'out.push('), "the battery's evidence type equals the case's"],
  ['audit-key-load-bearing', 'audit', A, off('lb.length > 0 && !sameSet(lb, c.evidence.loadBearing)', 'out.push('), "the battery's load-bearing lines equal the case's"],
  ['audit-load-bearing-subset', 'audit', A, ['if (lb.length > 0 && !sameSet(lb, c.evidence.loadBearing)) out.push(', 'if (lb.length > 0 && !lb.every((x) => c.evidence.loadBearing.includes(x))) out.push('], "load-bearing lines beyond the battery's are a changed key"],
  ['audit-load-bearing-superset', 'audit', A, ['if (lb.length > 0 && !sameSet(lb, c.evidence.loadBearing)) out.push(', 'if (lb.length > 0 && !c.evidence.loadBearing.every((x) => lb.includes(x))) out.push('], "load-bearing lines short of the battery's are a changed key"],
  ['audit-key-subclass', 'audit', A, ['(primary !== null && primary !== c.primary)', "(primary !== null && primary.replace(/[a-e]$/, '') !== c.primary.replace(/[a-e]$/, ''))"], "the battery's class equals the case's to the subclass, not only rolled up"],
  ['audit-key-shape-primary', 'audit', A, off("typeof got.primary !== 'string' || got.primary === ''", 'return ['), "a key without its primary class is a finding, not a sound key"],
  ['audit-key-shape-also', 'audit', A, off("!Array.isArray(got.also) || got.also.some((x) => typeof x !== 'string')", 'out.push('), 'a flawed key without its also list is a finding'],
  ['audit-key-shape-evidence', 'audit', A, off('!evidenceShaped', 'out.push('), 'a flawed key without evidence {type, load_bearing} is a finding, not agreement'],
  ['audit-key-shape-g2-lines', 'audit', A, off("evidenceShaped && ev.load_bearing.length === 0 && got.primary === 'G2'", 'out.push('), 'a G2 key lists the unsat core it recomputed'],
  ['audit-key-shape-evidence-type', 'audit', A, ["typeof ev.type === 'string' && Array.isArray(ev.load_bearing)", 'Array.isArray(ev.load_bearing)'], "a flawed key's evidence carries its type, or the type comparison would be skipped"],
  ['audit-key-shape-lines-text', 'audit', A, [" && ev.load_bearing.every((x) => typeof x === 'string')", ''], "a flawed key's load-bearing lines are line references (text)"],
  ['audit-key-shape-also-text', 'audit', A, [" || got.also.some((x) => typeof x !== 'string')", ''], "a flawed key's acceptable classes are class names (text)"],
  ['audit-key-shape-primary-empty', 'audit', A, ["if (typeof got.primary !== 'string' || got.primary === '') return [\"names", "if (typeof got.primary !== 'string') return [\"names"], 'a key whose primary class is empty names no class, or the class comparison would be skipped'],
  ['audit-key-shape-reported', 'audit', A, drop("'battery', c.ref, `the battery's key ${p}"), "a malformed key's problems are findings"],
  ['audit-discard', 'audit', A, drop("'unknown', c.ref, `the battery discarded"), 'a check that returns unknown fails the gate'],
  ['audit-cannot-run', 'audit', A, drop("e?.code === 'unknown-engine' ? 'unknown' : 'battery', c.ref,"), 'a case the battery cannot run fails the gate'],
  ['audit-no-key', 'audit', A, ["add('battery', c.ref, 'the battery returned no key');", "void ('battery', c.ref, 'the battery returned no key');"], 'a battery that returns no key fails the gate'],
  ['audit-battery-input-statement', 'audit', A, ["    statement: c.text.statement.join('\\n'),", "    statement: c.text.diff.join('\\n'),"], 'the battery receives the case\'s statement as written'],
  ['audit-battery-input-key', 'audit', A, ['    key: { truth: c.truth, primary: c.primary, also: c.also },', '    key: { truth: c.truth, primary: c.primary, also: [] },'], "the battery receives the case's key with its acceptable classes"],
  ['audit-no-battery', 'audit', A, off('!battery && needBattery > 0', 'add('), 'without a battery the re-keyable cases fail'],
  ['audit-regenerate', 'audit', A, off('want !== have', "add('regenerate',"), 'a listed variant regenerates from its generator reference'],
  ['audit-regenerate-statement-only', 'audit', A, ["for (const f of ['statement', 'diff', 'receipt']) {", "for (const f of ['statement']) {"], "a listed variant's diff and receipt regenerate too, not only its statement"],
  ['audit-regenerate-exact', 'audit', A, ['if (want !== have) add(', 'if (want.trim() !== have.trim()) add('], "a listed variant's texts regenerate exactly, leading and trailing white space included"],
  ['audit-pending-no-task', 'audit', A, ["return add('pending', where, `${what}: pending, but no tracker task", "return void ('pending', where, `${what}: pending, but no tracker task"], 'a pending declaration names its landing task'],
  ['audit-pending-unknown-task', 'audit', A, off('st === null', "add('pending', where,"), "a pending declaration's task is in the tracker"],
  ['audit-pending-done-task', 'audit', A, ["else if (st === 'done') add('pending', where,", "else if (false) add('pending', where,"], "a pending declaration's task is not done"],
  ['audit-rekey-port-exists', 'audit', A, off('engine && portMap.has(engine)', "add('pending', c.ref,"), 'a re-key cannot wait once its engine has a port'],
  ['audit-ch-naive', 'audit', A, off('row.naive >= f.bar', 'findings.push('), "a Clearinghouse family's naive baseline stays below its bar"],
  ['audit-ch-naive-at-bar', 'audit', A, ['if (row.naive >= f.bar)', 'if (row.naive > f.bar)'], 'a naive baseline that meets the bar exactly fails (spine 11.2: "meets")'],
  ['audit-ch-reference', 'audit', A, off('row.reference < f.bar', 'findings.push('), "a Clearinghouse family's reference reaches its bar"],
  ['audit-ch-reference-margin', 'audit', A, ['if (row.reference < f.bar)', 'if (row.reference < f.bar - 0.1)'], 'a reference just short of the bar fails'],
  ['audit-ch-first-seed', 'audit', A, ['for (const s of f.seeds) xs.push(await f.score(policy, s));', 'for (const s of f.seeds.slice(0, 1)) xs.push(await f.score(policy, s));'], 'every recorded seed is re-executed'],
  ['audit-ch-best-seed', 'audit', A, ['naive: mean(naive), reference: mean(reference) };', 'naive: Math.min(...naive), reference: Math.max(...reference) };'], "a baseline's score is its mean over the recorded seeds, not its best seed"],
  ['audit-ch-repeat', 'audit', A, off('!again.every((x, i) => x === [...naive, ...reference][i])', 'findings.push('), "a Clearinghouse family's scores repeat on its recorded seeds"],
  ['audit-ch-repeat-reference', 'audit', A, ['if (!again.every((x, i) => x === [...naive, ...reference][i]))', 'if (!again.slice(0, naive.length).every((x, i) => x === naive[i]))'], "a Clearinghouse family's reference scores repeat too, not only its naive ones"],
  ['audit-ch-shape', 'audit', A, ["      findings.push({ check: 'clearinghouse', where, message: 'a family is {id, bar, seeds (non-empty), score(policy, seed)}' });", '      void 0;'], 'a Clearinghouse family is {id, bar, seeds, score}'],
  ['audit-ch-number', 'audit', A, [".every((x) => typeof x === 'number' && Number.isFinite(x))) findings.push(", ".every((x) => typeof x === 'number' && Number.isFinite(x))) void ("], "a Clearinghouse family's scores are numbers"],
  ['audit-only', 'audit', A, off('!loaded.anchors.some((a) => a.id === id)', "add('anchor', id,"), '--only names anchors the pool has'],

  // ---------------------------------------------------------------- GATE-audit: the pool contract (lib/pool.mjs)
  ['pool-anchor-id', 'audit', P, drop("'shape', 'anchor', `${file}: id must be an anchor ID"), 'an anchor ID is AUD-n.k'],
  ['pool-file-name', 'audit', P, off('id !== stem', "add('content', 'anchor',"), "an anchor's file is named after its ID"],
  ['pool-registry-anchor', 'audit', P, off("!entry || entry.kind !== 'anchor'", "add('content', 'anchor',"), "an anchor is one of the spine's registry"],
  ['pool-spine-stage', 'audit', P, ["else if (entry?.stage && entry.stage !== stage) add('content', 'anchor',", "else if (false) add('content', 'anchor',"], "an anchor's stage is the spine's"],
  ['pool-class-missing', 'audit', P, off('anchor.class === null', "add('content', 'fields',"), 'an anchor names its class'],
  ['pool-class-unknown', 'audit', P, ["else if (anchor.class !== 'none' && !registry.classes.has(anchor.class)) add('content', 'fields',", "else if (false) add('content', 'fields',"], "an anchor's class is a gap class"],
  ['pool-medium-artifact-claim', 'audit', P, ["['claim', anchor.claim]]) if (v === null) add(", "['claim', anchor.claim]]) if (false) add("], 'an anchor names its medium, artifact and claim'],
  ['pool-scheduled-after', 'audit', P, off('!Array.isArray(doc.scheduled_after) || anchor.scheduledAfter.length === 0 || anchor.scheduledAfter.length !== doc.scheduled_after.length', "add('shape', 'fields',"), 'an anchor lists what it is scheduled after'],
  ['pool-kcs', 'audit', P, off('!Array.isArray(doc.kcs) || anchor.kcs.length === 0 || anchor.kcs.length !== doc.kcs.length', "add('content', 'fields',"), 'an anchor lists its KCs'],
  ['pool-based-on-missing', 'audit', P, off('anchor.basedOn === null', "add('content', 'based-on',"), 'an anchor has a "based on" card'],
  ['pool-variants-pending-task', 'audit', P, off("!isObj(p) || typeof p.lands !== 'string' || !TASK_ID.test(p.lands)", "add('content', 'fields',"), 'pending variants name their task'],
  ['pool-variants-empty', 'audit', P, off('doc.variants.length === 0', "add('content', 'fields',"), 'an empty variants list is a finding'],
  ['pool-variants-missing', 'audit', P, drop("'content', 'fields', `${id}: variants must list"), 'an anchor lists its variants or says when they land'],
  ['pool-case-mapping', 'audit', P, ["    add('shape', 'fields', `${anchor.id}: ${pointer} is not a mapping`, pointer);", '    void 0;'], 'a case is a mapping'],
  ['pool-case-id', 'audit', P, drop("'shape', 'fields', `${anchor.id}: ${pointer}: a case needs an id"), 'a case has a valid id'],
  ['pool-case-id-twice', 'audit', P, drop("'shape', 'fields', `the id ${cid} is used twice", 'problem('), "a case's id is unique in its anchor"],
  ['pool-key', 'audit', P, off('key.error', "problem('shape', 'key', key.error, '/key');"), 'a case has a valid key'],
  ['pool-key-class', 'audit', P, off('!registry.classes.has(key.primary)', "problem('shape', 'key',"), "a key's class is a gap class"],
  ['pool-key-also', 'audit', P, off('!registry.classes.has(a)', "problem('shape', 'key',"), "a key's acceptable classes are gap classes"],
  ['pool-key-primary', 'audit', P, ["    if ('primary' in raw) return { truth: null, primary: null, also: [], error: 'write key: {class: G2, also: [G1]}; `primary` is a KC tag key that GATE-kc reads in every content record' };\n", ''], 'a key never writes primary, a KC tag key GATE-kc reads'],
  ['pool-key-sound-also', 'audit', P, ["error: Array.isArray(raw.also) && raw.also.length > 0 ? 'a sound key has no acceptable classes' : null };", 'error: null };'], 'a sound key has no acceptable classes'],
  ['pool-key-also-list', 'audit', P, ['const also = raw.also === undefined ? [] : Array.isArray(raw.also) ? raw.also : null;', 'const also = raw.also === undefined ? [] : Array.isArray(raw.also) ? raw.also : [];'], "a key's acceptable classes are a list"],
  ['pool-file-filter', 'audit', P, [".filter((n) => /\\.(ya?ml|json)$/.test(n) && !n.startsWith('_') && !/^readme/i.test(n))", '.filter((n) => /\\.(ya?ml|json)$/.test(n))'], 'files starting with an underscore, and readme files, are not anchors'],
  ['pool-statement', 'audit', P, off('text.statement.length === 0', "problem('shape', 'fields',"), 'a case has a statement'],
  ['pool-texts', 'audit', P, off("c[f] !== undefined && typeof c[f] !== 'string'", "problem('shape', 'fields',"), "a case's diff and receipt are text"],
  ['pool-evidence-missing', 'audit', P, drop("'shape', 'evidence', 'evidence is missing", 'problem('), 'a case has evidence'],
  ['pool-lb-reference', 'audit', P, drop("'shape', 'evidence', `load_bearing entries are", 'problem('), 'a load-bearing entry is a line reference'],
  ['pool-lb-line', 'audit', P, ["if (line === undefined || line.trim() === '') problem('shape', 'evidence',", "if (line === undefined || line.trim() === '') void ('shape', 'evidence',"], 'a load-bearing line is a non-blank line of the case'],
  ['pool-lb-twice', 'audit', P, ["else problem('shape', 'evidence', `${r} is listed twice", "else void ('shape', 'evidence', `${r} is listed twice"], 'a load-bearing line is listed once'],
  ['pool-variant-pair', 'audit', P, off("kind === 'variant' && out.pair === null", "problem('shape', 'pairs',"), 'a variant names its pair'],
  ['pool-variant-operator', 'audit', P, off("kind === 'variant' && out.operator === null", "problem('content', 'operator',"), 'a variant names its operator'],
  ['pool-spine-class', 'audit', P, off('spine && a.class && spine.class && a.class !== spine.class', "add('anchor',"), "an anchor's class is spine 6.2's"],
  ['pool-spine-key-run', 'audit', P, off('!spine.runs.some((r) => cited.has(r))', "add('key-run',"), "an anchor is keyed by a run of spine 6.2's Key run cell"],
  ['pool-schedule-unit', 'audit', P, off("!['lab', 'lab-stage', 'lesson'].includes(registry.kind(u))", "add('fields',"), 'a scheduling unit is a lab, lab stage or lesson'],
  ['pool-schedule-lab', 'audit', P, off('n && a.scheduledAfter.length > 0 && !a.scheduledAfter.some((u) => u === `LAB-${n}` || u.startsWith(`LAB-${n}.`))', "add('fields',"), "an anchor is scheduled after its stage's lab"],
  ['pool-kc-registry', 'audit', P, off("registry.kind(k) !== 'kc'", "add('fields',"), "an anchor's KCs are the registry's"],
  ['pool-pair-members', 'audit', P, off("!members.some((c) => c.truth === 'sound') || !members.some((c) => c.truth === 'flawed')", "add('pairs',"), 'an anchor is a matched pair'],
  ['pool-member-class', 'audit', P, off("a.class && a.class !== 'none' && !members.some((c) => c.truth === 'flawed' && c.primary === a.class)", "add('key',"), "a flawed member is keyed with the anchor's class"],
  ['pool-variant-pair-forms', 'audit', P, off("cs[0].kind === 'variant' && (!cs.some((c) => c.truth === 'sound') || !cs.some((c) => c.truth === 'flawed'))", "add('pairs',"), 'a variant pair holds its flawed and its sound form'],
  ['pool-pair-claims', 'audit', P, off('claims.size > 1', "add('pairs',"), "a pair's members carry one claim"],
  ['pool-bo-incident', 'audit', P, off('!str(b.incident)', 'add('), 'a "based on" card names its incident'],
  ['pool-bo-date', 'audit', P, off("typeof b.date !== 'string' || !DATE.test(b.date)", 'add('), 'a "based on" card has a quoted date'],
  ['pool-bo-date-marks', 'audit', P, off('!str(b.date_marks)', 'add('), 'a "based on" card says which event its date marks'],
  ['pool-bo-source', 'audit', P, off("sources.length === 0 || sources.some((s) => typeof s !== 'string' || s.trim() === '')", 'add('), 'a "based on" card has a source'],
  ['pool-bo-source-path', 'audit', P, off("!existsSync(join(root, s.replace(/\\/$/, '')))", 'add('), 'a "based on" source is a URL or a path in this repository'],
  ['pool-bo-code', 'audit', P, off("typeof v === 'string' && CODE_FENCE.test(v)", 'add('), 'a "based on" card ships no code'],
  ['pool-sound-restatement', 'audit', P, off("c.evidence.type && c.evidence.type !== 'restatement'", "add('evidence',"), "a sound case's evidence is its restatement"],
  ['pool-sound-scenarios', 'audit', P, off('!c.evidence.scenarios || c.evidence.scenarios.length < 3 || c.evidence.scenarios.some((s) => !isObj(s) || !str(s.text))', "add('evidence',"), 'a restatement holds three scenarios'],
  ['pool-scenarios-two', 'audit', P, ['c.evidence.scenarios.length < 3', 'c.evidence.scenarios.length < 2'], 'a restatement with two scenarios fails'],
  ['pool-evidence-class', 'audit', P, off('!allowed.includes(c.evidence.type)', "add('evidence',"), "a flawed case's evidence is of its class's type"],
  ['pool-lb-count', 'audit', P, off('c.evidence.loadBearing.length < 1 || c.evidence.loadBearing.length > 3', "add('evidence',"), 'a flawed case has one to three load-bearing lines'],
  ['pool-lb-max-four', 'audit', P, ['c.evidence.loadBearing.length > 3', 'c.evidence.loadBearing.length > 4'], 'four load-bearing lines fail'],
  ['pool-line-anchored-four', 'audit', P, off('LINE_ANCHORED.has(c.evidence.type) && c.selectable < 4', "add('evidence',"), 'line-anchored evidence needs four selectable lines'],
  ['pool-line-anchored-three', 'audit', P, ['LINE_ANCHORED.has(c.evidence.type) && c.selectable < 4', 'LINE_ANCHORED.has(c.evidence.type) && c.selectable < 3'], 'line-anchored evidence on three selectable lines fails'],
  ['pool-artifact-reference', 'audit', P, off("ARTIFACT_TYPES.has(c.evidence.type) && (c.evidence.reference === null || c.evidence.reference === '')", "add('evidence',"), 'artifact evidence carries its reference'],
  ['pool-member-key-run', 'audit', P, off("c.kind === 'member'", "add('key-run', 'a pair member names"), 'a pair member names its key run'],
  ['pool-key-run-id', 'audit', P, ["} else if (!RUN_ID.test(c.keyRun)) add('key-run',", "} else if (false) add('key-run',"], 'a key run is a run ID'],
  ['pool-key-run-disk', 'audit', P, ["if (!rec) add('key-run',", "if (!rec) void ('key-run',"], 'a key run is on disk'],
  ['pool-key-lines-form', 'audit', P, off('c.keyLinesMalformed', "add('key-run',"), 'a key line is a line or {config, line}'],
  ['pool-key-lines-empty', 'audit', P, off('c.keyLines.length === 0', "add('key-run',"), 'a key run comes with its key lines'],
  ['pool-key-line-stated', 'audit', P, ["else if (!pool.some((l) => lineStates(l.line, k.line))) add('key-run',", "else if (false) add('key-run',"], 'every key line is stated by its run'],
  ['pool-key-line-boundary', 'audit', P, ['if (edgeOk(before, needle.charAt(0)) && edgeOk(after, needle.charAt(needle.length - 1))) return true;', 'return true;'], 'a key line matches only at word boundaries'],
  ['pool-rekey-form', 'audit', P, off('c.rekeyMalformed', "add('pending',"), 'a re-keying declaration is {pending: {engine, lands}}'],
  ['pool-rekey-key-run', 'audit', P, off('c.rekeyPending && !c.keyRun', "add('pending',"), 'a case waiting for its engine is keyed by a run meanwhile'],
  ['pool-operator-listed', 'audit', P, ["if (!op) add('operator',", "if (!op) void ('operator',"], 'an operator is one of the spine'],
  ['pool-operator-class', 'audit', P, ["else if (c.truth === 'flawed' && c.top && !op.classes.includes(c.top)) add('operator',", "else if (false) add('operator',"], "a variant's class is one its operator can key"],
  ['pool-generator', 'audit', P, off('!/^t[1-4]$/.test(String(g.template)) || ![1, 2, 3].includes(g.band) || g.seed === null', "add('fields',"), 'a generator reference is {template, band, seed}'],
  ['pool-generator-template', 'audit', P, ['/^t[1-4]$/', '/^t[1-5]$/'], "a generator reference's template is t1-t4"],
  ['pool-generator-band', 'audit', P, ['![1, 2, 3].includes(g.band)', '![1, 2, 3, 4].includes(g.band)'], "a generator reference's band is 1-3"],
  ['pool-generator-seed', 'audit', P, ['x < 2 ** 32', 'x <= 2 ** 32'], "a generator reference's seed is a uint32"],
  ['pool-file-parse', 'audit', P, ["      problems.push({ level: 'shape', check: 'file', file: rel, line: null, anchor: null, case: null, message: `${rel}: ${read.error}` });", '      void 0;'], 'a pool file that does not parse is a finding'],
  ['pool-file-mapping', 'audit', P, drop("'shape', 'file', `${file} is not a mapping"), 'a pool file holds one anchor'],
  ['pool-anchor-twice', 'audit', P, ['if (seen.has(a.id)) problems.push(', 'if (seen.has(a.id)) void ('], 'one anchor is defined once'],
  ['pool-structure-numeric', 'audit', P, ["return text.replace(SMT_LITERAL, '#').replace(SMT_INDEXED, '#').replace(NUMERIC, '#').replace(/\\s+/g, ' ').trim();", "return text.replace(/\\s+/g, ' ').trim();"], 'an exemplar structure sets numeric literals aside'],
  ['pool-structure-space', 'audit', P, ["return text.replace(SMT_LITERAL, '#').replace(SMT_INDEXED, '#').replace(NUMERIC, '#').replace(/\\s+/g, ' ').trim();", "return text.replace(SMT_LITERAL, '#').replace(SMT_INDEXED, '#').replace(NUMERIC, '#').trim();"], 'an exemplar structure sets white space aside'],
  ['pool-structure-smt', 'audit', P, ["text.replace(SMT_LITERAL, '#').replace(SMT_INDEXED, '#').replace(NUMERIC, '#')", "text.replace(NUMERIC, '#')"], "an exemplar structure sets SMT-LIB's bit-vector literals aside"],
  ['pool-structure-smt-indexed', 'audit', P, [".replace(SMT_INDEXED, '#')", ''], "an exemplar structure sets an indexed bit-vector literal's value aside"],
  ['pool-structure-hex', 'audit', P, ['0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*|', ''], 'an exemplar structure sets hexadecimal literals aside'],
  ['pool-structure-suffix', 'audit', P, ['(?:_?(?:[ui](?:8|16|32|64|128|size)|f(?:32|64)))?', ''], 'an exemplar structure sets literals with a Rust type suffix aside'],
  ['pool-structure-sign', 'audit', P, ['(?:-(?=\\.?[0-9]))?', ''], "an exemplar structure sets a literal's unary minus aside with it"],

  // ---------------------------------------------------------------- GATE-audit: the value at an edge that passes
  // Each makes a rule stricter, so that a valid pool at the rule's edge would fail: the self-check's case for that value
  // must catch it (decision 13), as the cases one past each edge catch the weakenings above.
  ['audit-six-strict', 'audit', A, ['const SIX = 6;', 'const SIX = 7;'], 'a class with exactly six exemplars passes'],
  ['audit-ch-reference-strict', 'audit', A, ['if (row.reference < f.bar)', 'if (row.reference <= f.bar)'], 'a reference exactly at its bar passes'],
  ['pool-line-anchored-strict', 'audit', P, ['LINE_ANCHORED.has(c.evidence.type) && c.selectable < 4', 'LINE_ANCHORED.has(c.evidence.type) && c.selectable < 5'], 'line-anchored evidence on exactly four selectable lines passes'],
  ['pool-lb-three-strict', 'audit', P, ['c.evidence.loadBearing.length > 3', 'c.evidence.loadBearing.length > 2'], 'three load-bearing lines pass'],
  ['pool-scenarios-strict', 'audit', P, ['c.evidence.scenarios.length < 3', 'c.evidence.scenarios.length < 4'], 'a restatement with exactly three scenarios passes'],
  ['pool-generator-template-strict', 'audit', P, ['/^t[1-4]$/', '/^t[1-3]$/'], 'a generator reference to template t4 passes'],
  ['pool-generator-band-strict', 'audit', P, ['![1, 2, 3].includes(g.band)', '![1, 2].includes(g.band)'], 'a generator reference to band 3 passes'],
  ['pool-generator-seed-strict', 'audit', P, ['x < 2 ** 32', 'x < 2 ** 32 - 1'], 'a generator reference to seed 2^32 - 1 passes'],

  // ---------------------------------------------------------------- GATE-audit-blind: the verdict and the bound
  ['blind-margin', 'blind', L, ['  margin: 2, // fail when', '  margin: 3, // fail when'], "the margin is spine section 6's 2 SD"],
  ['blind-limit', 'blind', L, ['fail: adv > margin * sd + EPS', 'fail: adv > 2 * margin * sd + EPS'], 'a figure fails when its advantage exceeds the margin'],
  ['blind-limit-near', 'blind', L, ['fail: adv > margin * sd + EPS', 'fail: adv > 1.1 * margin * sd + EPS'], 'a figure fails just past the margin, not 10% beyond it'],
  ['blind-mean-not-min', 'blind', L, ['const adv = rows.reduce((a, r) => a + (r.obs[j] - r.mean[j]), 0) / rows.length;', 'const adv = Math.min(...rows.map((r) => r.obs[j] - r.mean[j]));'], 'the advantage is the mean over the replicates'],
  ['blind-mean-not-max', 'blind', L, ['const adv = rows.reduce((a, r) => a + (r.obs[j] - r.mean[j]), 0) / rows.length;', 'const adv = Math.max(...rows.map((r) => r.obs[j] - r.mean[j]));'], 'the advantage is the mean over the replicates'],
  ['blind-sd', 'blind', L, ['const sd = Math.sqrt(rows.reduce((a, r) => a + r.var[j], 0) / rows.length);', 'const sd = 2 * Math.sqrt(rows.reduce((a, r) => a + r.var[j], 0) / rows.length);'], "the SD is one stream's permutation SD"],
  ['blind-sd-pooling', 'blind', L, ['const sd = Math.sqrt(rows.reduce((a, r) => a + r.var[j], 0) / rows.length);', 'const sd = Math.sqrt(Math.max(...rows.map((r) => r.var[j])));'], "one stream's SD is the root mean of the replicates' permutation variances, not the widest replicate's"],
  ['blind-sd-mean-of-sds', 'blind', L, ['const sd = Math.sqrt(rows.reduce((a, r) => a + r.var[j], 0) / rows.length);', 'const sd = rows.reduce((a, r) => a + Math.sqrt(r.var[j]), 0) / rows.length;'], "one stream's SD is the root mean of the replicates' permutation variances, not the mean of their SDs"],
  ['blind-mean-not-median', 'blind', L, ['const adv = rows.reduce((a, r) => a + (r.obs[j] - r.mean[j]), 0) / rows.length;', 'const adv = ((xs) => (xs.length % 2 ? xs[xs.length >> 1] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2))(rows.map((r) => r.obs[j] - r.mean[j]).sort((a, b) => a - b));'], 'the advantage is the mean over the replicates, not their median'],
  ['blind-shown-half', 'blind', L, ['if (rows.length === 0 || rows.length * 2 < reps.length) continue;', 'if (rows.length === 0 || rows.length < reps.length) continue;'], 'a figure shown in half the replicates is tested'],
  ['blind-shown-exactly-half', 'blind', L, ['if (rows.length === 0 || rows.length * 2 < reps.length) continue;', 'if (rows.length === 0 || rows.length * 2 <= reps.length) continue;'], 'a figure shown in exactly half the replicates is tested'],
  ['blind-inflation', 'blind', L, ['  detectInflation: 1.3,', '  detectInflation: 1,'], 'the detection threshold allows the noise inflation the calibration measured'],
  ['blind-detect-formula', 'blind', L, ['const detectSd = margin + (Z95 * inflation) / Math.sqrt(R);', 'const detectSd = margin + (Z95 * inflation) / R;'], 'the detection threshold is margin + 1.645 × inflation / √replicates'],
  ['blind-bound-margin', 'blind', L, ['margin: margin * v.sd, detect: detectSd * v.sd,', 'margin: v.sd, detect: detectSd * v.sd,'], "the bound prints each figure's margin as the margin times its SD"],
  ['blind-bound-widest', 'blind', L, ['if (!cur || v.sd > cur.sd) widest.set(', 'if (!cur || v.sd < cur.sd) widest.set('], "the bound prints each figure's widest SD, not its narrowest"],
  ['blind-bound-every-stream', 'blind', L, ['if (!blocking.has(v.strategy) || !(v.sd > 0)) continue;', "if (!blocking.has(v.strategy) || !(v.sd > 0) || g.path !== 'default') continue;"], 'the bound reads the blocking tests on every stream, not one path\'s'],
  ['blind-bound-blocking', 'blind', L, ['if (!blocking.has(v.strategy) || !(v.sd > 0)) continue;', 'if (!(v.sd > 0)) continue;'], "the bound reads the blocking strategies' tests, not the advisory ones"],
  ['blind-bound-varied', 'blind', L, ['if (!blocking.has(v.strategy) || !(v.sd > 0)) continue;', 'if (!blocking.has(v.strategy)) continue;'], 'a test that could not vary is not part of the bound'],
  ['blind-bound-strict', 'blind', L, ['STRATEGIES.filter((s) => s.blocking || strict)', 'STRATEGIES.filter((s) => s.blocking)'], 'under --strict the bound reads the advisory strategies too'],
  ['blind-permutations', 'blind', L, ['  permutations: 1000,', '  permutations: 100,'], '1,000 permutations per strategy and figure'],
  ['blind-permutations-split', 'blind', L, ['const perms = Math.max(2, Math.round(cfg.permutations / R));', 'const perms = 2;'], 'the permutations are split across the replicates, not dropped'],
  ['blind-null-class', 'blind', L, ["    ['class', (d) => shuffleWithin(idx, S.stageGroups, d)],", "    ['class', (d) => shuffleAll(idx, d)],"], 'class figures are tested against the permutation within each stage'],
  ['blind-null-decision', 'blind', L, ["    ['decision', (d) => shuffleAll(idx, d)],", "    ['decision', (d) => shuffleWithin(idx, S.stageGroups, d)],"], 'decision figures are tested against the permutation across the stream'],
  ['blind-constant', 'blind', L, ['constant: { decision: constantOver(p, all), class: decisionOnly || constantOver(p, S.stageGroups) }', 'constant: { decision: true, class: true }'], 'a strategy whose picks a permutation moves is permuted'],

  // ---------------------------------------------------------------- GATE-audit-blind: the strategies
  ['blind-always-reject', 'blind', L, ["  { id: 'always-reject', blocking: true },\n", ''], 'always-reject is tested'],
  ['blind-always-accept', 'blind', L, ["  { id: 'always-accept', blocking: true },\n", ''], 'always-accept is tested'],
  ['blind-last-is-sound-blocks', 'blind', L, ["  { id: 'last-is-sound', blocking: true },", "  { id: 'last-is-sound', blocking: false },"], 'last-is-sound blocks'],
  ['blind-topic-is-class-blocks', 'blind', L, ["  { id: 'topic-is-class', blocking: true },", "  { id: 'topic-is-class', blocking: false },"], 'topic-is-class blocks'],
  ['blind-last-is-sound-rule', 'blind', L, ['        if (!S.last[i]) flag(i, B.poolTop);', '        flag(i, B.poolTop);'], 'last-is-sound accepts the last case of each sitting'],
  ['blind-hit-three', 'blind', L, ['Math.min(3, L)', 'Math.min(1, L)'], 'a blind flag selects up to three lines at random (AUDIT-DESK 7.2)'],
  ['blind-floor-stage-top', 'blind', L, ['flag(i, B.stageTop[P.stage[c]]);', 'flag(i, B.poolTop);'], "the stage-only floor names each case's own stage's most frequent class"],
  ['blind-reference-cap', 'blind', L, ['      options = options.filter((f) => f.stage !== topic || current < cap);\n', ''], 'the reference composer caps the topic stage at half a Desk session'],
  ['blind-reference-today-fresh', 'blind', L, ['const i = draw.pick(fresh.length > 0 ? fresh : all);', 'const i = draw.pick(all);'], 'the reference Today composer serves unseen cases first'],
  ['blind-reference-k', 'blind', L, ['  const k = draw.int(lo, hi);', '  const k = lo;'], 'the reference composer draws k uniformly from the share (AUDIT-DESK 5.2)'],
  ['blind-reference-part-c-k', 'blind', L, ["const [lo, hi] = surface === 'part-c' ? [1, 2] : soundRange(n);", "const [lo, hi] = surface === 'part-c' ? [1, 1] : soundRange(n);"], 'the reference composer draws one or two sound cases for Part C'],
  ['blind-reference-shuffle', 'blind', L, ["const slots = draw.shuffle([...Array(k).fill('sound'), ...Array(n - k).fill('flawed')]);", "const slots = [...Array(k).fill('sound'), ...Array(n - k).fill('flawed')];"], "the reference composer shuffles a sitting's slots (AUDIT-DESK 5.3)"],
  ['blind-reference-today-share', 'blind', L, ['const permille = draw.int(300, 599);', 'const permille = 300;'], "the reference Today composer draws each block's sound share from 30-60%"],
  ['blind-part-c-own-stage', 'blind', L, ['const own = pos.eligible.filter((i) => cases[i].stage === pos.defenceStage);', 'const own = pos.eligible;'], "a Part C draw takes the Defence stage's own cases"],
  ['blind-desk-sizes', 'blind', L, ['  desk: { sizes: [5, 6, 8], sessionsPerSize: 8 },', '  desk: { sizes: [5], sessionsPerSize: 8 },'], 'Desk sessions of 5, 6 and 8 cases are drawn'],
  ['blind-today-blocks', 'blind', L, ['  today: { blocksPerPosition: 12, serves: 10 },', '  today: { blocksPerPosition: 12, serves: 5 },'], 'a Today block holds 10 serves'],
  ['blind-part-c-draws', 'blind', L, ['  partC: { drawsPerPosition: 60, size: 4 },', '  partC: { drawsPerPosition: 6, size: 4 },'], '60 Part C draws per Defence'],
  ['blind-median-strict', 'blind', L, ['s.aboveMedian[i] = P.diffLines[s.caseIdx[i]] > median ? 1 : 0;', 's.aboveMedian[i] = P.diffLines[s.caseIdx[i]] >= median ? 1 : 0;'], "longest-diff-is-flawed flags diffs longer than the sitting's median, not equal to it"],
  ['blind-lab-stretch', 'blind', L, ["if (registry.kind(u) === 'lab') return (registry.labStages.get(u) ?? []).filter((s) => !s.stretch).every((s) => done.has(s.id));", "if (registry.kind(u) === 'lab') return (registry.labStages.get(u) ?? []).every((s) => done.has(s.id));"], 'a lab is done once its non-stretch stages are'],

  // ---------------------------------------------------------------- GATE-audit-blind: the reference scorer's definitions
  ['blind-score-artifact', 'blind', L, ['ownLineAnchored[i] = LINE_ANCHORED.has(c.evType) ? 1 : 0;', 'ownLineAnchored[i] = 1;'], 'an artifact evidence type never validates blind'],
  ['blind-score-hit', 'blind', L, ['if (P.truth[c] === 1 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) {', 'if (P.truth[c] === 1 && (P.acc[c] >> k) & 1 && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) {'], 'a correct finding needs its line choice to hit a load-bearing line'],
  ['blind-score-acceptable', 'blind', L, ['if (P.truth[c] === 1 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) {', 'if (P.truth[c] === 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) {'], 'a correct finding names an acceptable class'],
  ['blind-score-default-evidence', 'blind', L, ['if (P.truth[c] === 1 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) {', 'if (P.truth[c] === 1 && (P.acc[c] >> k) & 1 && S.hit[i] && P.ownLineAnchored[c]) {'], "a finding naming another acceptable class carries that class's evidence type"],
  ['blind-part-c-three', 'blind', L, ['if (hits >= 3) passed++;', 'if (hits >= 2) passed++;'], 'a Part C draw passes with at least 3 hits of 4 (AUDIT-DESK 6.6)'],
  ['blind-part-c-hit', 'blind', L, ['if (k >= 0 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) hits++;', 'if (k >= 0 && (P.acc[c] >> k) & 1 && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) hits++;'], 'a Part C hit on a flawed case needs its line choice to hit'],
  ['blind-part-c-acceptable', 'blind', L, ['if (k >= 0 && (P.acc[c] >> k) & 1 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) hits++;', 'if (k >= 0 && S.hit[i] && (k === P.top[c] ? P.ownLineAnchored[c] : P.defaultLineAnchored[k])) hits++;'], 'a Part C hit on a flawed case names an acceptable class'],
  ['blind-decision-evidence', 'blind', L, ['evidenceValid: Boolean(dec[i] && k >= 0 && S.hit[i] && ', 'evidenceValid: Boolean(dec[i] && k >= 0 && '], "the decision objects a Desk scorer receives say whether the evidence validated, the line choice's hit included"],
  ['blind-decision-acceptable', 'blind', L, ['acceptable: P.cases[c].acceptableTop,', 'acceptable: P.classes,'], "the decision objects a Desk scorer receives carry the case's acceptable classes"],
  ['blind-topic-rule', 'blind', L, ['  if (own >= 0) return own;', '  return B.poolTop;'], "topic-is-class names the topic stage's most frequent class"],
  ['blind-strict', 'blind', B, ['if (s.blocking || o.strict) findings.push(', 'if (s.blocking) findings.push('], '--strict: the advisory strategies block'],
  ['blind-pool-base-rates', 'blind', L, ["if (!c.scheduledAfter.includes('CLEARINGHOUSE')) poolIdx.push(i);", 'poolIdx.push(i);'], "a path stream's strategies know the pool's base rates only"],
  ['blind-world-base-rates', 'blind', L, ["export const baseRatesFor = (P, surface) => (surface === 'clearinghouse' ? P.base.clearinghouse : P.base.path);", 'export const baseRatesFor = (P) => P.base.path;'], "the Clearinghouse stream's strategies know the incidents' base rates"],
  ['blind-world-rates-computed', 'blind', L, ['base.clearinghouse = servedIdx.length > 0 ? ratesOver(servedIdx) : base.path;', 'base.clearinghouse = base.path;'], "the incidents' base rates are computed over the incidents served"],
  // Not listed: dropping stageOnlyFloor's own filter of the incidents. The floor's strategy reads base.path, which
  // already holds the pool's cases only (blind-pool-base-rates), and an incident is never eligible on a path, so the
  // filter is a second guard and that mutant changes nothing the gate prints.

  // ---------------------------------------------------------------- GATE-audit-blind: the scorer
  ['blind-constant-ba', 'blind', B, off("(v.strategy === 'always-reject' || v.strategy === 'always-accept') && v.figure === 'ba' && Math.abs(v.obs - 0.5) > 1e-9", '{'), "a constant strategy's ba is exactly 0.5"],
  ['blind-constant-ba-reject', 'blind', B, ["(v.strategy === 'always-reject' || v.strategy === 'always-accept') && v.figure === 'ba'", "(v.strategy === 'always-accept') && v.figure === 'ba'"], "always-reject's ba is exactly 0.5"],
  ['blind-constant-ba-tolerance', 'blind', B, ['Math.abs(v.obs - 0.5) > 1e-9', 'Math.abs(v.obs - 0.5) > 0.01'], "a constant strategy's ba is 0.5 exactly, not within a point"],
  ['blind-required', 'blind', L, ['const missing = requiredFigures(S, P, p.dec, p.named, shown, layout).filter((f) => f.j < 0 || !shown[f.j]);', 'const missing = [];'], 'the figures the Desk must show are shown'],
  ['blind-required-tpr', 'blind', L, off('F > 0', "need('tpr',"), 'tpr is shown'],
  ['blind-required-tnr', 'blind', L, off('Sd > 0', "need('tnr',"), 'tnr is shown'],
  ['blind-required-ba', 'blind', L, off('F > 0 && Sd > 0', "need('ba',"), 'ba is shown'],
  ['blind-required-ba-every-stream', 'blind', L, ["if (F > 0 && Sd > 0) need('ba',", "if (F > 0 && Sd > 0 && S.surface !== 'today') need('ba',"], 'ba is required on every stream, Today included'],
  ['blind-required-part-c', 'blind', L, off("S.surface === 'part-c' && S.sittings.length > 0", "need('part-c-pass',"), 'part-c-pass is shown on Part C'],
  ['blind-required-recall', 'blind', L, off('nK[ki] >= DISPLAY_N', 'need(`recall:${k}`,'), 'recall:Gk is shown at n >= 10'],
  ['blind-required-precision', 'blind', L, off('namedK[ki] >= DISPLAY_N', 'need(`precision:${k}`,'), 'precision:Gk is shown at n >= 10'],
  ['blind-required-macro', 'blind', L, off('recallShown', "need('recall-macro',"), 'recall-macro is shown once a recall is'],
  ['blind-display-n', 'blind', L, ['const DISPLAY_N = 10;', 'const DISPLAY_N = 11;'], 'per-class figures appear at n >= 10 (spine section 6)'],
  ['blind-required-recall-edge', 'blind', L, ['if (nK[ki] >= DISPLAY_N) need(', 'if (nK[ki] > DISPLAY_N) need('], 'recall:Gk is required from ten decisions of Gk, not eleven'],
  ['blind-required-precision-edge', 'blind', L, ['if (namedK[ki] >= DISPLAY_N) need(', 'if (namedK[ki] > DISPLAY_N) need('], 'precision:Gk is required once Gk has been named ten times, not eleven'],
  ['blind-shown-recall-edge', 'blind', L, ['shown[r] = nK[k] >= DISPLAY_N ? 1 : 0;', 'shown[r] = nK[k] > DISPLAY_N ? 1 : 0;'], 'the reference shows recall:Gk from ten decisions'],
  ['blind-shown-precision-edge', 'blind', L, ['shown[p] = namedK[k] >= DISPLAY_N ? 1 : 0;', 'shown[p] = namedK[k] > DISPLAY_N ? 1 : 0;'], 'the reference shows precision:Gk once Gk has been named ten times'],
  ['blind-shown-precision-none-edge', 'blind', L, ['shown[3] = acceptedAll >= DISPLAY_N ? 1 : 0;', 'shown[3] = acceptedAll > DISPLAY_N ? 1 : 0;'], 'the reference shows precision on acceptances from ten acceptances'],
  ['blind-missing-finding', 'blind', B, drop("{ check: 'scorer', where: m.where.join(', '), message: `the scorer shows no ${m.figure}", 'findings.push('), 'a required figure left out is a finding'],
  ['blind-untested-finding', 'blind', B, drop("{ check: 'scorer', where: u.where.join(', '), message: `the scorer shows ${u.figure} (kind", 'findings.push('), 'a figure the gate forms no null for is a finding'],
  ['blind-gate-kind', 'blind', L, ["if (which !== 'all' && layout.kinds[j] !== which) continue;", "if (which !== 'all' && f.kind !== which) continue;"], "a figure is tested against the gate's null for its id, not the scorer's kind"],
  ['blind-figure-finite', 'blind', L, ['if (f.value !== null && f.value !== undefined && Number.isFinite(f.value)) {', 'if (f.value !== null && f.value !== undefined) {'], 'a figure whose value is not a finite number is not shown, so a required one is missing'],

  // ---------------------------------------------------------------- GATE-audit-blind: the composer, the pool, the modules
  ['blind-sitting-eligible', 'blind', L, ["if (!Array.isArray(served) || served.some((i) => !Number.isInteger(i) || i < 0 || i >= cases.length)) return ['served a case that is not among the eligible ones'];", "if (!Array.isArray(served)) return ['served a case that is not among the eligible ones'];"], 'a sitting serves eligible cases'],
  ['blind-sitting-size', 'blind', L, off('served.length !== size', 'out.push('), 'a sitting has the size asked'],
  ['blind-sitting-size-long', 'blind', L, ['if (served.length !== size) out.push(', 'if (served.length < size) out.push('], 'a sitting over the size asked fails, as one short of it does'],
  ['blind-sitting-share', 'blind', L, off('k < lo || k > hi', 'out.push('), "a sitting keeps the seeded sound share"],
  ['blind-sitting-share-upper', 'blind', L, ['if (k < lo || k > hi) out.push(', 'if (k < lo || k > hi + 1) out.push('], 'one sound case more than the share allows fails'],
  ['blind-sitting-share-lower', 'blind', L, ['if (k < lo || k > hi) out.push(', 'if (k < lo - 1 || k > hi) out.push('], 'one sound case fewer than the share allows fails'],
  ['blind-part-c-share', 'blind', L, ["const [lo, hi] = surface === 'part-c' ? [1, 2] : soundRange(size);", "const [lo, hi] = surface === 'part-c' ? [0, 3] : soundRange(size);"], 'a four-case Part C holds one or two sound cases'],
  ['blind-sound-range', 'blind', L, ['export const soundRange = (n) => [Math.floor((3 * n + 9) / 10), Math.floor((6 * n) / 10)];', 'export const soundRange = (n) => [Math.floor((3 * n) / 10), Math.floor((6 * n) / 10)];'], "the share's range is [ceil(0.30 n), floor(0.60 n)]"],
  ['blind-sitting-twice', 'blind', L, off('new Set(served).size !== served.length', 'out.push('), 'no case twice in one sitting'],
  ['blind-sitting-pairs', 'blind', L, off('new Set(served.map((i) => cases[i].pair)).size !== served.length', 'out.push('), 'pairs apart'],
  ['blind-composer-threw', 'blind', L, drop('`${label} after ${pos.block}: the composer threw:', 'problems.push('), 'a composer that throws is a finding'],
  ['blind-composer-findings', 'blind', B, ["for (const p of result.problems) findings.push({ check: 'composer', where: '-', message: p });", 'for (const p of result.problems) void p;'], "a composer's broken sittings are findings"],
  ['blind-composer-trusted', 'blind', L, ['const checked = compose !== referenceCompose;', 'const checked = false;'], "a composer's nulls and the families it serves are checked"],
  ['blind-declined-reference', 'blind', L, ['if (filled && sittingProblems(ref, filled).length === 0) {', 'if (false) {'], 'a null where the reference composer fills the sitting is a declined sitting, not a skipped one'],
  ['blind-declined-finding', 'blind', B, drop("{ check: 'composer', where: d.where, message: `the composer returned no sitting", 'findings.push('), 'a declined sitting is a finding'],
  ['blind-declined-one', 'blind', L, ['if (refused.length > 0) declined.push(', 'if (refused.length > 1) declined.push('], 'a single declined sitting is a finding'],
  ['blind-composer-module-driven', 'blind', B, ['((surface) => (realSurfaces.has(surface) ? (args) => judgment.module.composeAuditSitting(args) : blind.referenceCompose));', '((surface) => blind.referenceCompose);'], "the Desk's composer is driven on every surface it lists"],
  ['blind-judgment-surfaces-all', 'blind', L, ['const surfaces = listed ? listed.filter((s) => SURFACES.includes(s)) : null;', "const surfaces = listed ? listed.filter((s) => SURFACES.includes(s) && s !== 'part-c') : null;"], 'every surface the module lists is driven, Part C included'],
  ['blind-never-served', 'blind', L, ['if (missed.length > 0) neverServed.push(', 'if (false) neverServed.push('], 'a family the composer was offered and never served is recorded'],
  ['blind-never-served-finding', 'blind', B, drop("{ check: 'composer', where: u.where, message: `the composer never served", 'findings.push('), 'a family the composer never serves is a finding'],
  ['blind-eligibility', 'blind', L, ['if (c.scheduledAfter.every((u) => unitDone(u, done, registry))) eligible.push(i);', 'eligible.push(i);'], 'a case is served only after its scheduled units'],
  ['blind-unserved', 'blind', B, ['for (const u of result.unserved) findings.push(', 'for (const u of result.unserved) void ('], 'a case never served on a path is a finding'],
  ['blind-unserved-every-path', 'blind', L, ['if (never.length > 0) unserved.push(', 'if (never.length > 0 && path === paths[0]) unserved.push('], 'a case never served is a finding on every path, not only the first'],
  ['blind-pool-shape', 'blind', B, ["for (const p of problems.filter((x) => x.level === 'shape')) findings.push({ check: 'pool',", "for (const p of problems.filter((x) => x.level === 'shape')) void ({ check: 'pool',"], "the pool's shape problems are findings"],
  ['blind-pool-problems', 'blind', B, ['for (const p of inject.poolProblems ?? []) findings.push(', 'for (const p of inject.poolProblems ?? []) void ('], 'shape problems handed in are findings'],
  ['blind-stage-id', 'blind', P, off("!stage || registry.kind(stage) !== 'stage'", "add('shape', 'anchor',"), "an anchor's stage is a stage (a shape problem)"],
  ['blind-key', 'blind', P, off('key.error', "problem('shape', 'key', key.error, '/key');"), 'a case without a key is a shape problem'],
  ['blind-line-anchored-four', 'blind', P, off('LINE_ANCHORED.has(c.evidence.type) && c.selectable < 4', "add('evidence',"), 'line-anchored evidence needs four selectable lines (a shape problem)'],
  ['blind-line-anchored-three', 'blind', P, ['LINE_ANCHORED.has(c.evidence.type) && c.selectable < 4', 'LINE_ANCHORED.has(c.evidence.type) && c.selectable < 3'], 'line-anchored evidence on three selectable lines fails (a shape problem)'],
  ['blind-judgment-problems', 'blind', B, ['for (const p of judgment.problems ?? []) findings.push(', 'for (const p of judgment.problems ?? []) void ('], "the judgment module's problems are findings"],
  ['blind-judgment-folder', 'blind', L, ['for (const d of JUDGMENT_DIRS.filter(isDir)) problems.push(', 'for (const d of JUDGMENT_DIRS.filter(isDir)) void ('], 'a judgment folder without its module fails closed'],
  ['blind-judgment-composer', 'blind', L, off("typeof mod.composeAuditSitting !== 'function' || surfaces === null", 'problems.push('), 'the judgment module exports its composer'],
  ['blind-judgment-scorer', 'blind', L, off("typeof mod.auditFigures !== 'function'", 'problems.push('), 'the judgment module exports its scorer'],
  ['blind-judgment-surfaces', 'blind', L, ["if (typeof mod.composeAuditSitting !== 'function' || surfaces === null) problems.push(", "if (typeof mod.composeAuditSitting !== 'function') problems.push("], 'the judgment module exports AUDIT_SURFACES'],
  ['blind-judgment-unknown-surface', 'blind', L, ['if (unknown.length > 0) problems.push(', 'if (false) problems.push('], 'AUDIT_SURFACES names only surfaces the gate drives'],
  ['blind-judgment-no-surface', 'blind', L, off("typeof mod.composeAuditSitting === 'function' && surfaces !== null && !surfaces.some((s) => s !== 'clearinghouse')", 'problems.push('), 'a composer listed for none of the surfaces the gate composes is a finding, not a module the gate never drives'],
  ['blind-judgment-export', 'blind', L, ['else problems.push(`packages/learner/package.json exports ./judgment as ${target}, which does not exist`);', 'else void 0;'], 'a ./judgment export names a file that exists'],
  ['blind-incident-stage', 'blind', B, ['if (!stage) {', 'if (false) {'], 'an incident names its stage'],
  ['blind-incident-stage-id', 'blind', B, ["typeof inc?.stage === 'string' && registry.kind(inc.stage) === 'stage' ? inc.stage : null", "typeof inc?.stage === 'string' ? inc.stage : null"], "an incident's stage is a stage ID, not a lesson or another unit"],
  ['blind-incident-shape', 'blind', B, ["for (const p of problems) findings.push({ check: 'clearinghouse', where: 'apps/instruments/src/engines/clearinghouse/audit.ts', message: p });", 'for (const p of problems) void p;'], "an incident's problems (no stage, a pool case's shape broken) are findings"],
  ['blind-incident-module', 'blind', B, ["for (const p of got.problems) findings.push({ check: 'clearinghouse', where: shown(got.file), message: p });", 'for (const p of got.problems) void p;'], "the Clearinghouse module's problems are findings"],
  ['blind-incident-blocks-shape', 'blind', L, ['if (shape !== null) return { blocks: null, file, problems: [', 'if (false) return { blocks: null, file, problems: ['], "what a Clearinghouse module returns is checked before it is read: nothing is a finding, not an empty world"],
  ['blind-incident-blocks-count', 'blind', L, ['got.length !== blocks ? `returned', 'false ? `returned'], 'a Clearinghouse module returns the blocks asked for'],
  ['blind-incident-blocks-empty', 'blind', L, ['got.some((b) => !Array.isArray(b) || b.length === 0) ?', 'false ?'], 'a Clearinghouse block is a non-empty list of incidents'],
  ['blind-incident-case-shape', 'blind', B, ['if (shape.length > 0) {', 'if (false) {'], "an incident is held to a pool case's shape (its key and class, evidence type, load-bearing lines and selectable lines)"],

  // ---------------------------------------------------------------- GATE-audit-blind: the value at an edge that passes
  ['blind-limit-strict', 'blind', L, ['fail: adv > margin * sd + EPS', 'fail: adv > 0.9 * margin * sd + EPS'], 'an advantage just below the margin passes'],
  ['blind-shown-half-strict', 'blind', L, ['if (rows.length === 0 || rows.length * 2 < reps.length) continue;', 'if (rows.length === 0 || rows.length * 2 < reps.length - 2) continue;'], 'a figure shown in fewer than half the replicates is not tested'],
  ['blind-display-n-strict', 'blind', L, ['const DISPLAY_N = 10;', 'const DISPLAY_N = 9;'], 'per-class figures are neither shown nor required at nine decisions'],
  ['blind-sitting-share-strict', 'blind', L, ['if (k < lo || k > hi) out.push(', 'if (k <= lo || k > hi) out.push('], "a sitting at the share's lower bound passes"],
];

export const MUTANTS = LIST.map(([id, gate, file, [find, replace], rule]) => ({ id, gate, file, find, replace, rule }));

function parseArgs(argv) {
  const o = { gates: ['audit', 'blind'], only: null, jobs: 4, json: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--gate') {
      const g = value();
      if (!SCRIPT[g]) throw new Error('--gate is audit or blind');
      o.gates = [g];
    } else if (a === '--only') o.only = value().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--jobs') {
      o.jobs = Number(value());
      if (!Number.isInteger(o.jobs) || o.jobs < 1) throw new Error('--jobs needs a positive integer');
    } else if (a === '--json') o.json = true;
    else if (a === '--list') o.list = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

/** A scratch copy of the gates and lib/ under `dir`, with one mutation applied (or none). Returns an error string or null. */
function makeCopy(dir, mutant = null) {
  for (const f of COPIED) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    copyFileSync(join(REPO, f), join(dir, f));
  }
  for (const d of LINKED) symlinkSync(join(REPO, d), join(dir, d));
  if (!mutant) return null;
  const path = join(dir, mutant.file);
  const text = readFileSync(path, 'utf8');
  const n = text.split(mutant.find).length - 1;
  if (n !== 1) return `the text to replace occurs ${n} times in ${mutant.file}, not once`;
  writeFileSync(path, text.replace(mutant.find, () => mutant.replace));
  return null;
}

/** Run one gate's self-check in a copy; classify the outcome from its last line. */
function selfCheck(dir, gate) {
  return new Promise((done) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join(dir, SCRIPT[gate]), '--self-check'], { cwd: dir, env: process.env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => {
      const lines = out.trim().split('\n');
      const last = lines.at(-1) ?? '';
      const failed = lines.filter((l) => l.startsWith('FAIL  ')).map((l) => l.replace(/^FAIL {2}\S+\s+/, '').replace(/: .*$/, ''));
      const outcome = /self-check: FAIL \(/.test(last) && code === 1 ? 'killed' : /self-check: green \(/.test(last) && code === 0 ? 'survived' : 'error';
      done({ outcome, failed, code, ms: Date.now() - t0, tail: outcome === 'error' ? lines.slice(-5).join(' | ').slice(0, 600) : null });
    });
  });
}

async function pool(items, jobs, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

export async function main(argv) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`mutants: ${e.message}\nusage: mutants.mjs [--gate audit|blind] [--only ID,...] [--jobs N] [--json] [--list]\n`);
    return 2;
  }
  let chosen = MUTANTS.filter((m) => o.gates.includes(m.gate));
  if (o.only) {
    const unknown = o.only.filter((id) => !MUTANTS.some((m) => m.id === id));
    if (unknown.length > 0) {
      process.stderr.write(`mutants: no mutant ${unknown.join(', ')}\n`);
      return 2;
    }
    chosen = chosen.filter((m) => o.only.includes(m.id));
  }
  if (o.list) {
    for (const m of chosen) process.stdout.write(`${m.gate.padEnd(5)}  ${m.id.padEnd(30)}  ${m.rule}\n`);
    return 0;
  }
  const ids = new Set();
  for (const m of MUTANTS) {
    if (ids.has(m.id)) {
      process.stderr.write(`mutants: the id ${m.id} is used twice\n`);
      return 2;
    }
    ids.add(m.id);
  }
  const base = mkdtempSync(join(tmpdir(), 'w1t40-mutants-'));
  try {
    // The unmutated copy: both self-checks green, or nothing can be judged.
    const controlDir = join(base, 'control');
    makeCopy(controlDir);
    const gates = [...new Set(chosen.map((m) => m.gate))];
    const control = Object.fromEntries(await Promise.all(gates.map(async (g) => [g, await selfCheck(controlDir, g)])));
    const controlOk = gates.every((g) => control[g].outcome === 'survived');
    if (!controlOk) {
      for (const g of gates) process.stderr.write(`mutants: the unmutated ${g} self-check is not green (${control[g].outcome}${control[g].failed.length ? `: ${control[g].failed.join('; ')}` : ''}${control[g].tail ? `: ${control[g].tail}` : ''})\n`);
      return 2;
    }
    // One line per mutant, in the list's order whatever order the self-checks finish in, so that a log is reproducible.
    const lineOf = (m, r) => `${r.outcome.padEnd(8)}  ${m.gate.padEnd(5)}  ${m.id.padEnd(30)}  ${m.rule}${r.outcome === 'killed' ? ` (caught by ${r.failed.length}: ${r.failed.slice(0, 2).join('; ')}${r.failed.length > 2 ? '; ...' : ''})` : r.tail ? `: ${r.tail}` : ''}`;
    const finished = new Array(chosen.length);
    let printed = 0;
    const results = await pool(chosen, o.jobs, async (m, i) => {
      const dir = join(base, `m${i}`);
      const problem = makeCopy(dir, m);
      const r = problem ? { outcome: 'error', failed: [], code: null, ms: 0, tail: problem } : await selfCheck(dir, m.gate);
      rmSync(dir, { recursive: true, force: true });
      finished[i] = lineOf(m, r);
      while (!o.json && printed < finished.length && finished[printed] !== undefined) process.stdout.write(`${finished[printed++]}\n`);
      return { id: m.id, gate: m.gate, file: m.file, rule: m.rule, ...r };
    });
    const count = (outcome, gate = null) => results.filter((r) => r.outcome === outcome && (!gate || r.gate === gate)).length;
    const summary = `mutants: ${count('killed')} of ${results.length} killed, ${count('survived')} survived, ${count('error')} errors (${gates.map((g) => `${g === 'audit' ? 'GATE-audit' : 'GATE-audit-blind'} ${count('killed', g)} of ${results.filter((r) => r.gate === g).length}`).join(', ')})`;
    if (o.json) process.stdout.write(`${JSON.stringify({ control: Object.fromEntries(gates.map((g) => [g, { outcome: 'green', ms: control[g].ms }])), mutants: results, summary }, null, 2)}\n`);
    else process.stdout.write(`${summary}\n`);
    return count('killed') === results.length ? 0 : 1;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
