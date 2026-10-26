#!/usr/bin/env node
// GATE-items (spine section 11.2; ASSESSMENT.md sections 5.5, 7.2 and 7.3; invariant I10; W1-T39). Every item a learner
// answers, authored or generated, is checked for the cues a blind learner could use in place of the knowledge the item
// tests, and for the metadata every option needs. It is kernelspace's vendored item lints
// (vendor/kernelspace/scripts/item-cues.ts: the length-rank, lexical and surface-feature strategies and the odd-one-out
// flags, imported unchanged) plus statespace's rules on top:
//
//   structure      two or more options, exactly one key, option ids unique; no page names a template that is pending;
//                  every family is sampled at 200 seeds per template and band or more (ASSESSMENT.md section 7.3),
//                  so a run on a smaller sample (--seeds, or the default or the run's sampling changed) fails
//   why-tag        every option and statement carries a "why"; every distractor and every false statement a
//                  misconception key (dp:) registered from docs/EVIDENCE.md section 6; the key carries none
//   distinct       no two options of an item read the same once Markdown and case are set aside
//   length         the key is strictly the longest option in at most 30% of a family's sampled items (and of a
//                  pool's authored items, from 10 items on), and no key exceeds 1.3 times its distractors' mean length
//   blind          ASSESSMENT.md section 7.3's blind strategies stay within chance + 2 SD: always the longest, the
//                  first or the last option; for calls, always the majority verdict, always reject ("sat",
//                  "violated"), always accept ("unsat", "holds"), the narrative-blind strategy and last-is-sound;
//                  for true/false sets, all true and all false
//   convergence    the centroid strategy (the option sharing the most tokens with the others) within chance + 2 SD
//   absolutes      the hedged option and the absolute option, over natural-language options, within chance + 2 SD
//   calls          at least 30% of a stage's calls are genuine surprises under the narrative-blind definition
//                  (ASSESSMENT.md section 5.5), and no verdict keys more than 60% of a stage's calls, authored or
//                  generated
//   multi-tf       between 1 and m - 1 true statements in every set of m; a stage's true share between 40% and 60%,
//                  its authored sets and its generated sets each
//   cti            from W3 on (once GEN-cti-or-bug exists, or a page names it), at least four GEN-cti-or-bug items
//                  across the pages of S4 to S9 (spine section 4.1)
//   bound          a verdict that rests on a bound prints it (I10): a generated item whose key is bounded carries its
//                  bound, and an authored call keyed by a budget-stopped run states that budget
//   runtime-model  no stem, option, key or why comes from a model at run time: no model SDK or endpoint in the
//                  generators' code
//   cue            the vendored single-feature strategies within chance + 15 points on pools of 100 or more items,
//                  and no binary feature singles out the key of an authored item of three or more options
//
// Pools. A family's pool is a seeded sample of 200 graded seeds per live template and band (ASSESSMENT.md section
// 7.3), served through the family's own engine when it runs one as plain code (the draw redraws past discarded seeds,
// as a learner's would) and otherwise as make() offers it, the reference option being the key GATE-generators
// confirms. A stage's pools are its authored items (its calls among them), and its authored items with the generated
// templates its pages name, 200 seeds per template and band (the spine's pool). Drawers form one authored pool. Every
// family is also judged on its own pool, so a template's cue cannot hide among a stage's other templates, and the
// templates no page names yet are held to the stage rules there, so nothing escapes the gate before its content lands [D].
//
// Statistics. A strategy that scores X over a pool of N decisions with chance rates c_i fails when
// X > sum(c_i) + 2 sqrt(sum(c_i (1 - c_i))). An authored pool is the fixed set of items a learner meets, so its score is
// exact. A generated pool is a sample, and on one sample an unbiased generator beats that bar about 1 time in 44 per
// strategy, so a generated pool fails a strategy only when it beats the bar on the primary sample and again on a
// disjoint replicate sample of the same size [D]; the share rules (length, verdicts, true share) replicate the same way.
//
// Readings the sources leave open, each [D]:
//   - Calls. A stage's calls are its cells' calls after instruction: Boot's first-contact call is pre-instruction and
//     stays outside the call rules (ASSESSMENT.md section 5.1; curriculum/S01-counterexample.md section 2.7 tallies
//     eleven), and a prequestion is an item, not a call. A value key (an amount) counts in a stage's calls but is no
//     verdict, so it neither raises a verdict's share nor counts as a surprise.
//   - Scenes. A call may state its scene (`scene` on the call, once the lesson schema carries it); otherwise the first
//     call of a segment opens a scene, and a later call is a fix when the narrative since the previous call frames an
//     edit as one: that call's @after, the prose, cards and free-run cells between the two, and the cell's own text,
//     @direction and prompt, never code (an item is a question, a @tap the property a run tested and an option's why
//     feedback on its own call, none of them narrative). The first call of a segment is a first run whatever its
//     words, because a segment's opening often names the fix it builds to ("before the fix lands"); the cost is that a
//     segment that opens on a fix reads as a first run until its call can state the scene. The verbose report prints
//     every call's scene, why it was read so, its verdict and the author's forecast, so the computed figure can be
//     reviewed.
//   - Verdict items (every option a short verdict: `sat`, "proved: `unsat`", "no verdict: `unknown`") skip the per-item
//     length rules, because verdict words differ in length by vocabulary; always-longest and the balance judge them.
//   - The vendored strategies are judged from 100 single-key items, where 15 points is at least 3 SD at any chance up to
//     1/2, so dozens of correlated strategies do not trip on noise; below that they are printed only. A family is judged
//     on its pool and, with two or more live templates, on each template's, since a pooled rate can hide a leaking
//     template. Odd-one-out is judged per authored item of three or more options (with two, a feature that tells them
//     apart is symmetric) and, for generated pools, as one strategy per flag.
//   - The strictly-longest share is read on an authored pool from 10 items, and a stage's authored true share from 10
//     statements: below that one item moves the share by 10 points or more. As with calls, a stage's authored sets and
//     its generated sets are each held to the share, so their union is too.
//   - Not carried over from kernelspace: the lesson-pass bars (statespace has no pass-at-80% quizzes), the shuffle and
//     export checks (an instance's option order is its own, drawn by @statespace/rng), and the options-only adversary
//     and composite rules, which belong with the cue-ablation sweep (W6-T06).
//
// Pending templates (TemplateSpec.pending) are never made; the report names each with its landing task ("pending: t2
// until W3-T27").
//
// Planted fixtures. CHECKS lists every rule/check pair a finding can carry, and finding() refuses any other pair. Every
// pair has a planted fixture that must trip it, and every pool a rule is read on (a family, one template of a family, a
// stage's authored items, a stage's pool, the drawers) has a fixture that trips a check there. The fixtures are built
// so that only the lint as written trips them [D]:
//   - a fixture of a limit sits just past it: a key 1.31 times its distractors' mean length (1.13 times the longer
//     one), the key strictly the longest in 91 of 300 items, 11 genuine surprises in 37 calls, 31 of 51 calls one
//     verdict, 181 of 300 generated calls one verdict, 60.25% and 39.75% true, an authored share read from exactly 10
//     items and 10 statements, 100 items for the vendored strategies, a score 0.1 over chance + 2 SD, and 199 seeds per
//     template and band; so loosening a limit, the bar or its variance fails the self-check;
//   - a strategy's fixture is one its neighbours do not trip: the second length rank, always accept in place of
//     last-is-sound, nothing in place of the uniform pick where an item offers no option of the kind (always reject,
//     always accept, the absolute option, the odd one out); and a strategy that reads two halves (last-is-sound:
//     accept each page's last call, reject the rest; narrative-blind: violated on a first run, holds after a fix;
//     odd-one-out: the option alone with a flag, the option alone without it) has a fixture that each half alone
//     stays under;
//   - where a rule counts verdicts (the balance of authored calls and of generated calls, the majority verdict), each
//     verdict has a fixture of its own, and the call rules apply from a stage's first call; the CTI dose counts S4 to
//     S9 alone and turns on with GEN-cti-or-bug's module, a family that loaded or a page that names it;
//   - each word of a vocabulary the gate reads has a fixture of its own (the verdict and fix words, the hedge words, the
//     budget-stop words, each model marker and each SDK it names), written out apart from the gate's lists, and the
//     coverage check fails a word a list gains without one; a capitalized verdict, fix, hedge and budget-stop word is
//     read too;
//   - lesson pages (one of them S10.L10), a drawer, a run record and generator sources are written to a scratch tree and
//     read back by the gate's own discovery and the content build's reader, so finding pages, runs and sources, and
//     reading scenes (a fix framed in the cell's own text, its @direction or its call's prompt, or before the cell in
//     a prose block, a card's title or text, a free-run cell's text, @direction or @after, or the previous call's
//     @after; the narrative read afresh after each call, never from code; the first call of a segment a first run
//     whatever its words), verdicts, last calls, the run a key rests on (the call's run, else the cell's recorded run),
//     budgets and the CTI dose, run too;
//   - each branch of a reader has a fixture of its own where a branch alone can carry a cue: the centroid's tokens from
//     words (one-edit mutants of a phrase) and from symbols alone (one-edit mutants of a formula's comparisons, which
//     differ in no word); the odd-one-out lint on an authored item, a drawer item and an authored call, the key alone
//     with a flag and alone without one;
//   - instances shaped like GEN-call-it's (three-way calls, true/false sets) go through the gate's own sampler and
//     instance reader, as a family's do, so reading calls, statements, whys and tags runs too; one defect sits in the
//     replicate sample alone;
//   - the sample: GEN-fixture with the t3 cue it shipped with trips always-longest at the gate's 200 seeds per template
//     and band and not at 100; the default sample (the command line's and the sampler's) is checked against 200,
//     written out; and every family a run samples carries the seeds it was drawn from, so a run sampled below 200
//     fails structure/sample, whichever way the sample was lowered.
// Every gate run proves them all with the clean controls, and fails when a fixture no longer trips its check or a pair
// has no fixture, so a weakened lint cannot pass silently (--self-check prints the detail).
//
//   node scripts/verify-items.mjs                  the fast lane: every family, every page, the planted fixtures
//   node scripts/verify-items.mjs --family GEN-x   only these families (comma-separated or repeated); pages still run
//   node scripts/verify-items.mjs --self-check     only the planted fixtures, with what each tripped
//   --seeds N        seeds per template and band (default 200; below 200 every family fails structure/sample, so a
//                    smaller run is a preview, never a pass)         --json, --verbose, --root DIR
//
// Exit status: 0 green, 1 findings (or a planted fixture that no longer trips its rule), 2 the gate could not run.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The families, the content reader and the vendored strategies are TypeScript, which Node runs as it is from 22.18.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 2);
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (rel) => import(pathToFileURL(join(REPO, rel)).href);

// The vendored strategies (vendor/kernelspace/VENDOR.md, module verify): never edited, imported as they are.
const cues = await mod('vendor/kernelspace/scripts/item-cues.ts');
const core = await mod('packages/generators/src/core/index.ts');
const rng = await mod('packages/rng/src/index.ts');
// GATE-generators' discovery, so the two gates see the same families and the same registry.
const generatorsGate = await mod('scripts/verify-generators.mjs');

// ------------------------------------------------------------------ constants [D unless a source is named]

/** ASSESSMENT.md section 7.3: 200 seeded instances per template and band. */
export const SEEDS_PER_CELL = 200;
/** The seeds of the two samples come from these labels, so they are fixed, graded and disjoint. */
export const SAMPLE_LABELS = { primary: 'GATE-items/primary', replicate: 'GATE-items/replicate' };
/** ASSESSMENT.md section 7.3: chance + 2 SD. */
export const SD_MULTIPLE = 2;
/** kernelspace's item-level cue limit (vendored MAX_HIT_OVER_CHANCE, 15 points). */
export const CUE_MARGIN = cues.MAX_HIT_OVER_CHANCE;
/** The vendored strategies are judged from this many single-key items: there 15 points is at least 3 SD at any chance up to 1/2. */
export const CUE_MIN_ITEMS = 100;
/** ASSESSMENT.md section 7.2, kernelspace's thresholds. */
export const MAX_KEY_LONGEST_SHARE = 0.3;
export const MAX_LENGTH_RATIO = 1.3;
/** The share rule is read on an authored pool from this many items; below it one item moves the share by 10 points or more. */
export const MIN_SHARE_ITEMS = 10;
/** A stage's authored true/false sets are held to the true share from this many statements, for the same reason. */
export const MIN_SHARE_STATEMENTS = 10;
/** ASSESSMENT.md section 5.5. */
export const MIN_SURPRISE_SHARE = 0.3;
export const MAX_VERDICT_SHARE = 0.6;
/** ASSESSMENT.md section 7.2: a stage's true share between 40% and 60%. */
export const TRUE_SHARE_RANGE = [0.4, 0.6];
/** Spine section 4.1: at least four CTI items, interleaved through S9. */
export const MIN_CTI_ITEMS = 4;
export const CTI_FAMILY = 'GEN-cti-or-bug';
export const CTI_STAGES = ['S4', 'S5', 'S6', 'S7', 'S8', 'S9'];
/** The family whose items are calls (spine section 8.3). */
export const CALL_FAMILY = 'GEN-call-it';

export const RULES = ['structure', 'why-tag', 'distinct', 'length', 'blind', 'convergence', 'absolutes', 'calls', 'multi-tf', 'cti', 'bound', 'runtime-model', 'cue'];

// ------------------------------------------------------------------ text

/** What a learner reads: code spans, emphasis and links reduced to their text, whitespace collapsed. */
export function plain(text) {
  return String(text ?? '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The natural-language part of a text: code spans and math removed, since operators inside formulas are exempt (ASSESSMENT.md section 7.2). */
export const proseOf = (text) => String(text ?? '').replace(/`[^`]*`/g, ' ').replace(/\$[^$\n]*\$/g, ' ');

/** True when a text holds at least one word of two or more letters outside its code. */
export const isProse = (text) => /\p{L}{2,}/u.test(proseOf(text));

/** An option's length as the vendored lints measure it (trimmed UTF-16 length), on the text the learner reads. */
export const textLength = (text) => cues.len(plain(text));

/** The text two options are compared by: plain, lower case, end punctuation dropped. */
export const normalized = (text) => plain(text).toLowerCase().replace(/[\s.!?;:,]+$/u, '');

/** Tokens for the centroid: words and numbers, and each other symbol on its own (so formulas tokenize too). */
export const tokensOf = (text) => new Set(plain(text).toLowerCase().match(/[\p{L}\p{N}_′']+|[^\s\p{L}\p{N}]/gu) ?? []);

/** Absolute words, the vendored list (kernelspace's ABSOLUTE): a distractor that claims too much, or a key that hedges with "just". */
const ABSOLUTE = cues.ABSOLUTE;
/** Hedge words: test-wise learners prefer the option that qualifies its claim [D]. */
export const HEDGE_WORDS = ['may', 'might', 'could', 'possibly', 'perhaps', 'probably', 'likely', 'usually', 'often', 'sometimes', 'typically', 'generally', 'tends', 'tend'];
const HEDGE = new RegExp(`\\b(${HEDGE_WORDS.join('|')})\\b`, 'i');

// ------------------------------------------------------------------ verdicts and scenes (ASSESSMENT.md section 5.5)

/** The verdict an option names: violated (sat), holds (unsat), unknown, or value (anything else, such as an amount). */
export function verdictOf(text) {
  const raw = String(text ?? '');
  const classes = new Set();
  for (const m of raw.matchAll(/`([^`]+)`/g)) {
    const t = m[1].trim().toLowerCase();
    if (/^unsat\b/.test(t)) classes.add('holds');
    else if (/^sat\b/.test(t)) classes.add('violated');
    else if (/^unknown\b/.test(t)) classes.add('unknown');
  }
  if (classes.size === 0) {
    const t = plain(raw).toLowerCase();
    if (/\bunsat\b/.test(t)) classes.add('holds');
    if (/(^|[^\w-])sat\b/.test(t.replace(/\bunsat\b/g, ''))) classes.add('violated');
    if (/\bunknown\b|\bcan(?:no|')?t tell\b|\bno verdict\b|\bundecided\b|\binconclusive\b/.test(t)) classes.add('unknown');
    const negated = /\bno (?:counterexample|violation|bug)\b/.test(t);
    if (negated || /\bholds\b|\bproved\b|\bproven\b|\bverified\b/.test(t)) classes.add('holds');
    if (!negated && /\bcounterexample\b|\bviolated\b|\bviolates\b|\brefuted\b|\bfails\b(?!\s+closed)|\bbroken\b/.test(t)) classes.add('violated');
  }
  return classes.size === 1 ? [...classes][0] : 'value';
}

/** A run that a narrative frames as a fix: words in the text the learner reads before the call, never in code. */
export const FIX_WORDS = ['fix', 'fixed', 'fixes', 'fixing', 'patch', 'patched', 'patches', 'repair', 'repaired', 'repairs', 'corrected'];
const FIX_CUE = new RegExp(`\\b(${FIX_WORDS.join('|')})\\b`, 'i');

/**
 * The narrative a block shows the learner, never its code: a prose block's Markdown, a card's title and text, and a
 * free-run cell's text, @direction and @after (a cell without a call; its @tap names the property a run tested). A call's
 * own cell is read by sceneOf; an item is a question, not narrative, and a claim or a specimen has no text.
 */
export function narrativeOf(block) {
  if (block?.type === 'prose') return [block.md];
  if (block?.type === 'card') return [block.title, block.md];
  if (block?.type === 'instrument' && !block.call) return [block.md, block.direction, block.after];
  return [];
}

/**
 * The scene a call sits in, which the narrative-blind strategy reads: "violated or sat on a scene's first run; holds or
 * unsat after an edit framed as a fix". A call states it when the content can (`scene` on the call); otherwise the first
 * call of a segment opens a scene, and a later one is a fix when the narrative since the previous call frames it as one
 * [D]: `lead` (the texts of the previous call's @after and of the prose, cards and free-run cells between the two, from
 * narrativeOf; one text or a list), and the cell's own text, @direction and prompt. Each text is read without its code.
 */
export function sceneOf(block, callsBeforeInSegment, lead = []) {
  const stated = block?.call?.scene;
  if (stated === 'first-run' || stated === 'fix' || stated === 'none') return { scene: stated, why: 'stated on the call' };
  if (callsBeforeInSegment === 0) return { scene: 'first-run', why: 'the first call of its segment' };
  const words = [...(Array.isArray(lead) ? lead : [lead]), block?.md, block?.direction, block?.call?.prompt].filter(Boolean).map((t) => proseOf(t)).join('\n');
  const m = FIX_CUE.exec(words);
  if (m) return { scene: 'fix', why: `the narrative since the previous call frames an edit as a fix ("${m[0]}")` };
  return { scene: 'first-run', why: 'a new query in its segment' };
}

/** What the narrative-blind strategy predicts in a scene. */
export const narrativePrediction = (scene) => (scene === 'first-run' ? 'violated' : scene === 'fix' ? 'holds' : null);

/** A call is a genuine surprise when the narrative-blind strategy predicts the wrong verdict (a value key has none to mispredict). */
export function isSurprise(item) {
  const p = narrativePrediction(item.scene?.scene);
  return p !== null && item.keyVerdict !== 'value' && item.keyVerdict !== p;
}

// ------------------------------------------------------------------ items

/**
 * An item, reduced to what the rules read. A choice: `options` [{id, text, why, mis}] and `keys`, the indices of the
 * options keyed right (exactly one is valid). A true/false set: `statements` [{id, text, why, mis, truth}].
 */
const choiceItem = (fields) => ({ kind: 'choice', call: false, preInstruction: false, stage: null, sample: null, ...fields, key: fields.keys.length === 1 ? fields.keys[0] : -1 });

/** The items of one generated instance: one per choice or true/false part; constructed parts have no options to lint. */
export function itemsOfInstance(inst, sample) {
  const items = [];
  let constructed = 0;
  const base = `gen:${inst.family}:${inst.template}:b${inst.band}:${core.formatSeed(inst.seed)}`;
  const parts = Array.isArray(inst?.item?.parts) ? inst.item.parts : [];
  for (const part of parts) {
    const common = { ref: `${base}#${part.id}`, source: 'generated', sample, family: inst.family, template: inst.template, band: inst.band, seed: inst.seed, bound: inst.bound, stem: String(inst.item?.stem ?? ''), prompt: String(part.prompt ?? '') };
    if (part.kind === 'choice') {
      const options = (part.options ?? []).map((o) => ({ id: o.id, text: String(o.text ?? ''), why: o.why, mis: o.origin?.kind === 'mutant' ? o.origin.tag : undefined }));
      const keys = (part.options ?? []).flatMap((o, i) => (o.origin?.kind === 'reference' ? [i] : []));
      const item = choiceItem({ ...common, options, keys, call: inst.family === CALL_FAMILY });
      if (item.call) withVerdicts(item);
      items.push(item);
    } else if (part.kind === 'multi-tf') {
      items.push({ ...common, kind: 'multi-tf', stage: null, statements: (part.statements ?? []).map((s) => ({ id: s.id, text: String(s.text ?? ''), why: s.why, mis: s.origin?.kind === 'mutant' ? s.origin.tag : undefined, truth: s.origin?.kind === 'reference' })) });
    } else constructed += 1;
  }
  return { items, constructed };
}

function withVerdicts(item) {
  item.verdicts = item.options.map((o) => verdictOf(o.text));
  item.keyVerdict = item.key >= 0 ? item.verdicts[item.key] : 'value';
  return item;
}

/** The stage of a page: S{n} for a lesson, null for a drawer. */
export const stageOfPage = (id) => /^(S\d+)\.L\d+$/.exec(String(id))?.[1] ?? null;

const choiceOfBlock = (choice, fields) => {
  const options = (choice?.options ?? []).map((o) => ({ id: o.id, text: String(o.text ?? ''), why: o.why, mis: o.mis, verdict: o.verdict }));
  const keys = options.flatMap((o, i) => (o.id === choice?.key ? [i] : []));
  return choiceItem({ ...fields, prompt: String(choice?.prompt ?? ''), stem: '', options, keys });
};

/**
 * A page's items: its cells' calls (refs `cell:{page}#{n}`, ASSESSMENT.md section 2.7), its fixed items (prequestions
 * `pre:{page}#{n}`, others `item:{page}#{n}`, n counting the page's item blocks), the generated templates it names,
 * and its GEN-cti-or-bug items.
 */
export function itemsOfPage(record, file = '') {
  const id = String(record?.id ?? '');
  const stage = stageOfPage(id);
  const preInstruction = record?.tier === 'boot';
  const calls = [];
  const items = [];
  const uses = [];
  let cti = 0;
  let itemN = 0;
  for (const seg of record?.segments ?? []) {
    let callsInSegment = 0;
    // The narrative since the previous call of the segment: that call's @after, then the blocks between (narrativeOf).
    let lead = [];
    for (const block of seg?.blocks ?? []) {
      if (block?.type === 'instrument' && block.call) {
        const item = choiceOfBlock(block.call, { ref: `cell:${id}#${block.cell}`, source: 'authored', file, page: id, stage, segment: seg.id, tier: record.tier, call: true, preInstruction });
        item.verdicts = item.options.map((o) => (['violated', 'holds', 'unknown', 'value'].includes(o.verdict) ? o.verdict : verdictOf(o.text)));
        item.keyVerdict = item.key >= 0 ? item.verdicts[item.key] : 'value';
        item.scene = sceneOf(block, callsInSegment, lead);
        lead = [block.after];
        item.cellText = [block.md, block.direction, block.tap?.property, block.code?.text, block.call.prompt, ...item.options.flatMap((o) => [o.text, o.why]), block.after].filter(Boolean).join('\n');
        item.keyRun = block.call.keyRun ?? block.recorded;
        item.surprise = block.call.surprise;
        callsInSegment += 1;
        calls.push(item);
        items.push(item);
        continue;
      }
      lead.push(...narrativeOf(block));
      if (block?.type === 'item') {
        itemN += 1;
        if (block.family === CTI_FAMILY) cti += 1;
        if (block.choice) {
          const ref = `${block.role === 'prequestion' ? 'pre' : 'item'}:${id}#${itemN}`;
          items.push(choiceOfBlock(block.choice, { ref, source: 'authored', file, page: id, stage, segment: seg.id, tier: record.tier, role: block.role, family: block.family, template: block.template }));
        } else uses.push({ family: block.family, template: block.template, band: block.band, role: block.role, ref: `${id}/${seg.id} ${block.role} ${block.family} ${block.template}` });
      }
    }
  }
  // last-is-sound reads the last call of each page.
  const post = calls.filter((c) => !c.preInstruction);
  if (post.length > 0) post[post.length - 1].lastInPage = true;
  return { id, file, stage, tier: record?.tier, calls, items, uses, cti };
}

// ------------------------------------------------------------------ strategies

/** An item as the vendored strategies read it: the stem, the option texts and the key's index. */
const cueQ = (item) => ({ q: plain(`${item.stem} ${item.prompt}`), options: item.options.map((o) => plain(o.text)), correct: [item.key] });

/** Chance for one decision: 1/k for a choice, 1/2^m for a true/false set (spine section 8.5). */
export const chanceOf = (item) => (item.kind === 'multi-tf' ? 1 / 2 ** item.statements.length : 1 / item.options.length);

/** The pick among the options of one verdict class; uniform when the item offers none of it (the strategy says nothing). */
function pickVerdict(item, cls) {
  const offered = item.verdicts.flatMap((v, i) => (v === cls ? [i] : []));
  if (offered.length === 0) return 1 / item.options.length;
  return offered.includes(item.key) ? 1 / offered.length : 0;
}

/** The pick among the options a test accepts, on their raw text; uniform when it accepts none or all (the cue says nothing). */
function pickWhere(item, test) {
  const hit = item.options.flatMap((o, i) => (test(o.text) ? [i] : []));
  if (hit.length === 0) return 1 / item.options.length;
  return hit.includes(item.key) ? 1 / hit.length : 0;
}

/** The option with the highest mean token overlap (Jaccard) with the others; ties uniform. */
export function pickCentroid(item) {
  const sets = item.options.map((o) => tokensOf(o.text));
  const jac = (a, b) => {
    let inter = 0;
    for (const t of a) if (b.has(t)) inter += 1;
    const union = a.size + b.size - inter;
    return union === 0 ? 1 : inter / union;
  };
  const score = sets.map((s, i) => sets.reduce((acc, o, j) => (j === i ? acc : acc + jac(s, o)), 0) / (sets.length - 1));
  const best = Math.max(...score);
  const group = score.flatMap((s, i) => (best - s <= 1e-12 ? [i] : []));
  return group.includes(item.key) ? 1 / group.length : 0;
}

const isChoice = (i) => i.kind === 'choice' && i.key >= 0;
const isCall = (i) => isChoice(i) && i.call && !i.preInstruction;
const isNl = (i) => isChoice(i) && i.options.filter((o) => isProse(o.text)).length >= 2;

/**
 * The blind strategies of ASSESSMENT.md section 7.3. `applies` picks the decisions a strategy is scored on; `pick`
 * gives the probability that one blind pick hits the key; `choose` fixes a data-dependent choice (the majority verdict)
 * on the primary sample, which the replicate then tests unbiased.
 */
export const STRATEGIES = [
  { id: 'always-longest', rule: 'blind', label: 'always the longest option', applies: isChoice, pick: (i) => cues.pickRank(cueQ(i), 0, true) },
  { id: 'always-first', rule: 'blind', label: 'always the first option', applies: isChoice, pick: (i) => (i.key === 0 ? 1 : 0) },
  { id: 'always-last', rule: 'blind', label: 'always the last option', applies: isChoice, pick: (i) => (i.key === i.options.length - 1 ? 1 : 0) },
  { id: 'centroid', rule: 'convergence', label: 'the centroid (most tokens shared with the other options)', applies: isChoice, pick: pickCentroid },
  { id: 'absolute-option', rule: 'absolutes', label: 'the option with an absolute word', applies: isNl, pick: (i) => pickWhere(i, (t) => ABSOLUTE.test(proseOf(t))) },
  { id: 'hedged-option', rule: 'absolutes', label: 'the option with a hedge word', applies: isNl, pick: (i) => pickWhere(i, (t) => HEDGE.test(proseOf(t))) },
  {
    id: 'majority-verdict',
    rule: 'blind',
    label: 'always the majority verdict',
    applies: isCall,
    choose: (items) => {
      const n = { violated: 0, holds: 0, unknown: 0 };
      for (const i of items) if (i.keyVerdict in n) n[i.keyVerdict] += 1;
      return Object.entries(n).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    },
    pick: (i, cls) => pickVerdict(i, cls),
  },
  { id: 'always-reject', rule: 'blind', label: 'always reject ("sat", "violated")', applies: isCall, pick: (i) => pickVerdict(i, 'violated') },
  { id: 'always-accept', rule: 'blind', label: 'always accept ("unsat", "holds")', applies: isCall, pick: (i) => pickVerdict(i, 'holds') },
  {
    id: 'narrative-blind',
    rule: 'blind',
    label: 'narrative-blind: violated on a first run, holds after a fix',
    authoredOnly: true,
    applies: (i) => isCall(i) && i.source === 'authored',
    pick: (i) => {
      const p = narrativePrediction(i.scene?.scene);
      return p === null ? 1 / i.options.length : pickVerdict(i, p);
    },
  },
  { id: 'last-is-sound', rule: 'blind', label: "last-is-sound: accept each page's last call, reject the rest", authoredOnly: true, applies: (i) => isCall(i) && i.source === 'authored', pick: (i) => pickVerdict(i, i.lastInPage ? 'holds' : 'violated') },
  { id: 'all-true', rule: 'blind', label: 'all true', applies: (i) => i.kind === 'multi-tf', pick: (i) => (i.statements.every((s) => s.truth) ? 1 : 0) },
  { id: 'all-false', rule: 'blind', label: 'all false', applies: (i) => i.kind === 'multi-tf', pick: (i) => (i.statements.every((s) => !s.truth) ? 1 : 0) },
];

/** The vendored single-feature strategies, plus one odd-one-out strategy per vendored binary flag (pick the option it isolates). */
export const CUE_STRATEGIES = [
  ...cues.CUE_STRATEGIES,
  ...cues.BINARY_FLAGS.map((f) => ({
    name: `odd-one-out: ${f.name}`,
    pick: (q) => {
      const has = q.options.map(f.has);
      const n = has.filter(Boolean).length;
      const odd = n === 1 ? has.indexOf(true) : n === q.options.length - 1 && q.options.length >= 3 ? has.indexOf(false) : -1;
      return odd < 0 ? 1 / q.options.length : odd === q.correct[0] ? 1 : 0;
    },
  })),
];

// ------------------------------------------------------------------ the checks

/**
 * Every rule/check pair of statespace's own rules, written out rather than derived from the code that emits them, so
 * removing a check from the code leaves its pair here, untripped, and the self-check fails.
 */
export const OWN_CHECKS = [
  'structure/options', 'structure/key', 'structure/ids', 'structure/text', 'structure/statements', 'structure/pending', 'structure/module', 'structure/sample',
  'why-tag/why', 'why-tag/key-tag', 'why-tag/tag', 'why-tag/registered',
  'distinct/text',
  'length/ratio', 'length/share',
  'blind/always-longest', 'blind/always-first', 'blind/always-last', 'blind/majority-verdict', 'blind/always-reject', 'blind/always-accept', 'blind/narrative-blind', 'blind/last-is-sound', 'blind/all-true', 'blind/all-false',
  'convergence/centroid',
  'absolutes/absolute-option', 'absolutes/hedged-option',
  'calls/surprises', 'calls/balance', 'calls/generated-balance',
  'multi-tf/count', 'multi-tf/share',
  'cti/dose',
  'bound/generated', 'bound/authored',
  'runtime-model/source',
  'cue/odd-one-out',
];

/** The cue rule's pairs, one per vendored strategy and one per vendored binary flag, named from the vendored module (which vendor:verify pins). */
export const VENDORED_CHECKS = [...cues.CUE_STRATEGIES.map((s) => `cue/${s.name}`), ...cues.BINARY_FLAGS.map((f) => `cue/odd-one-out: ${f.name}`)];

/** Every rule/check pair a finding can carry; each needs a planted fixture that trips it. */
export const CHECKS = [...OWN_CHECKS, ...VENDORED_CHECKS];
const CHECK_SET = new Set(CHECKS);

// ------------------------------------------------------------------ statistics

/** ASSESSMENT.md section 7.3's bar: the score, chance's mean and SD, and whether the score is above chance + 2 SD. */
export function sdBar(items, pick) {
  let x = 0;
  let mu = 0;
  let v = 0;
  for (const i of items) {
    const c = chanceOf(i);
    x += pick(i);
    mu += c;
    v += c * (1 - c);
  }
  const sd = Math.sqrt(v);
  const bar = mu + SD_MULTIPLE * sd;
  return { n: items.length, x, mu, sd, bar, fail: items.length > 0 && x > bar + 1e-9 };
}

const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'n/a');
const pct = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : 'n/a');
const barText = (r) => `${fmt(r.x)} of ${r.n} (chance ${fmt(r.mu)} + ${SD_MULTIPLE} SD ${fmt(SD_MULTIPLE * r.sd)} = ${fmt(r.bar)})`;

/**
 * A strategy over a pool, both samples when the pool has a replicate. Returns the primary row, the replicate row and
 * whether the strategy fails: on an authored pool when it beats the bar, on a generated one when it beats it twice.
 */
function scoreStrategy(s, pool) {
  const prim = pool.items.filter(s.applies);
  if (prim.length === 0) return null;
  const choice = s.choose ? s.choose(prim) : undefined;
  const primary = sdBar(prim, (i) => s.pick(i, choice));
  let replicate = null;
  if (pool.replicate) {
    const rep = pool.replicate.filter(s.applies);
    replicate = rep.length > 0 ? sdBar(rep, (i) => s.pick(i, choice)) : null;
  }
  const fail = primary.fail && (pool.replicate ? replicate !== null && replicate.fail : true);
  return { strategy: s.id, label: s.label, rule: s.rule, choice, primary, replicate, fail };
}

// ------------------------------------------------------------------ rules

/** A finding. Its rule/check pair must be one of CHECKS, so no check can be added without a planted fixture that trips it. */
export function finding(rule, check, pool, message, ref) {
  if (!CHECK_SET.has(`${rule}/${check}`)) throw new Error(`${rule}/${check} is not one of GATE-items' CHECKS: register it and plant a fixture that trips it`);
  return { rule, check, pool, message, ...(ref ? { ref } : {}) };
}

/** structure, why-tag and distinct: per item, both samples. Generated findings are grouped per template and band. */
export function itemFindings(items, poolId, registry) {
  const out = [];
  const grouped = new Map();
  const add = (item, rule, check, message) => {
    if (item.source !== 'generated') {
      out.push(finding(rule, check, poolId, message, item.ref));
      return;
    }
    const k = `${rule}|${check}|${item.template}/b${item.band}|${message}`;
    const g = grouped.get(k) ?? { rule, check, cell: `${item.template}/b${item.band}`, message, refs: [] };
    g.refs.push(item.ref);
    grouped.set(k, g);
  };
  const tagged = (mis) => typeof mis === 'string' && /^dp:\S+$/.test(mis);
  for (const item of items) {
    if (item.kind === 'choice') {
      if (item.options.length < 2) add(item, 'structure', 'options', `${item.options.length} option(s); a choice has at least two`);
      if (item.keys.length !== 1) add(item, 'structure', 'key', `${item.keys.length} keyed options; a choice has exactly one`);
      if (new Set(item.options.map((o) => o.id)).size !== item.options.length) add(item, 'structure', 'ids', 'two options share an id');
      item.options.forEach((o, i) => {
        if (!plain(o.text)) add(item, 'structure', 'text', `option ${o.id} has no text`);
        if (typeof o.why !== 'string' || !o.why.trim()) add(item, 'why-tag', 'why', `option ${o.id} has no why`);
        if (item.keys.includes(i)) {
          if (o.mis !== undefined && item.source === 'authored') add(item, 'why-tag', 'key-tag', `the key ${o.id} carries a misconception key (${o.mis}); only distractors do`);
        } else if (!tagged(o.mis)) add(item, 'why-tag', 'tag', `option ${o.id} carries no misconception key (dp:)`);
        else if (registry && !registry.misconceptions.has(o.mis)) add(item, 'why-tag', 'registered', `option ${o.id}'s ${o.mis} is not a misconception key of docs/EVIDENCE.md section 6`);
      });
      const seen = new Map();
      for (const o of item.options) {
        const n = normalized(o.text);
        if (!n) continue;
        if (seen.has(n)) add(item, 'distinct', 'text', `options ${seen.get(n)} and ${o.id} read the same ("${plain(o.text).slice(0, 60)}")`);
        else seen.set(n, o.id);
      }
    } else if (item.kind === 'multi-tf') {
      const m = item.statements.length;
      if (m < 2) add(item, 'structure', 'statements', `${m} statement(s); a true/false set has at least two`);
      if (new Set(item.statements.map((s) => s.id)).size !== m) add(item, 'structure', 'ids', 'two statements share an id');
      const trues = item.statements.filter((s) => s.truth).length;
      if (m >= 2 && (trues < 1 || trues > m - 1)) add(item, 'multi-tf', 'count', `${trues} of ${m} statements true; a set keeps between 1 and ${m - 1}, so "all true" and "all false" score nothing`);
      for (const s of item.statements) {
        if (typeof s.why !== 'string' || !s.why.trim()) add(item, 'why-tag', 'why', `statement ${s.id} has no why`);
        if (!s.truth) {
          if (!tagged(s.mis)) add(item, 'why-tag', 'tag', `false statement ${s.id} carries no misconception key (dp:)`);
          else if (registry && !registry.misconceptions.has(s.mis)) add(item, 'why-tag', 'registered', `statement ${s.id}'s ${s.mis} is not a misconception key of docs/EVIDENCE.md section 6`);
        }
      }
      const seen = new Map();
      for (const s of item.statements) {
        const n = normalized(s.text);
        if (n && seen.has(n)) add(item, 'distinct', 'text', `statements ${seen.get(n)} and ${s.id} read the same`);
        else if (n) seen.set(n, s.id);
      }
    }
  }
  for (const g of grouped.values()) {
    out.push(finding(g.rule, g.check, poolId, `${g.cell}: ${g.message} (${g.refs.length} instance${g.refs.length === 1 ? '' : 's'}, first ${g.refs[0]})`, g.refs[0]));
  }
  return out;
}

/**
 * A verdict item: every option is a short verdict (`sat`, "proved: `unsat`", "no verdict: `unknown`"). Verdict words are
 * a fixed vocabulary whose lengths differ, so the key's length follows from which verdict is right; the per-item length
 * rules skip such items, and the always-longest strategy and the verdict balance judge them over the pool [D].
 */
export const isVerdictItem = (item) => item.kind === 'choice' && item.options.every((o) => verdictOf(o.text) !== 'value' && plain(o.text).split(' ').length <= 5);

/** Key length over the distractors' mean length (vendored rule 13); NaN without distractors. */
export function lengthRatio(item) {
  const key = textLength(item.options[item.key].text);
  const others = item.options.filter((_, i) => i !== item.key).map((o) => textLength(o.text));
  return others.length ? key / (others.reduce((a, b) => a + b, 0) / others.length) : NaN;
}

/** Whether the key is strictly the longest option (vendored keyIsLongest). */
export function keyStrictlyLongest(item) {
  const top = cues.longestIndices(cueQ(item));
  return top.length === 1 && top[0] === item.key;
}

/** length: the ratio per item (both samples) and the strictly-longest share per pool (replicated on a generated pool). */
export function lengthFindings(pool) {
  const out = [];
  const all = [...pool.items, ...(pool.replicate ?? [])].filter((i) => isChoice(i) && !isVerdictItem(i));
  const over = new Map();
  for (const item of all) {
    const r = lengthRatio(item);
    if (!(r > MAX_LENGTH_RATIO + 1e-9)) continue;
    if (item.source !== 'generated') {
      out.push(finding('length', 'ratio', pool.id, `the key is ${r.toFixed(2)} times its distractors' mean length (limit ${MAX_LENGTH_RATIO}); lengthen the distractors or shorten the key`, item.ref));
      continue;
    }
    const k = `${item.template}/b${item.band}`;
    const g = over.get(k) ?? { n: 0, max: 0, ref: '' };
    g.n += 1;
    if (r > g.max) Object.assign(g, { max: r, ref: item.ref });
    over.set(k, g);
  }
  for (const [cell, g] of over) {
    const total = all.filter((i) => `${i.template}/b${i.band}` === cell).length;
    out.push(finding('length', 'ratio', pool.id, `${cell}: ${g.n} of ${total} keys exceed ${MAX_LENGTH_RATIO} times their distractors' mean length (largest ${g.max.toFixed(2)}, ${g.ref}); a key longer than its distractors is a cue, whether the key is elaborated or a distractor cut short`, g.ref));
  }
  const share = (items) => {
    const rows = items.filter((i) => isChoice(i) && !isVerdictItem(i));
    return { n: rows.length, k: rows.filter(keyStrictlyLongest).length };
  };
  const p = share(pool.items);
  const minItems = pool.generated ? 1 : MIN_SHARE_ITEMS;
  const overShare = (s) => s.n >= minItems && s.k / s.n > MAX_KEY_LONGEST_SHARE + 1e-12;
  if (overShare(p)) {
    const r = pool.replicate ? share(pool.replicate) : null;
    if (!r || overShare(r)) {
      out.push(finding('length', 'share', pool.id, `the key is strictly the longest option in ${p.k} of ${p.n} items (${pct(p.k / p.n)}${r ? `; replicate ${r.k} of ${r.n}, ${pct(r.k / r.n)}` : ''}; limit ${MAX_KEY_LONGEST_SHARE * 100}%); shorten the key or lengthen distractors`));
    }
  }
  return out;
}

/** A family's score split by template, so the finding names the template that carries the cue. */
function byTemplate(s, items, choice) {
  const ts = [...new Set(items.filter(s.applies).map((i) => i.template))].sort();
  if (ts.length < 2) return '';
  return `; by template: ${ts.map((t) => {
    const r = sdBar(items.filter((i) => i.template === t && s.applies(i)), (i) => s.pick(i, choice));
    return `${t} ${fmt(r.x)} of ${r.n} (chance ${fmt(r.mu)})`;
  }).join(', ')}`;
}

/** blind, convergence and absolutes: every strategy of ASSESSMENT.md section 7.3 that applies to the pool. */
export function strategyFindings(pool, rows = []) {
  const out = [];
  for (const s of STRATEGIES) {
    if (pool.combined && s.authoredOnly) continue;
    const r = scoreStrategy(s, pool);
    if (!r) continue;
    rows.push({ pool: pool.id, ...r });
    if (!r.fail) continue;
    const choice = r.choice ? ` (${r.choice})` : '';
    out.push(finding(s.rule, s.id, pool.id, `${s.label}${choice} scores ${barText(r.primary)}${r.replicate ? `; replicate ${barText(r.replicate)}` : ''}${pool.family ? byTemplate(s, pool.items, r.choice) : ''}`));
  }
  return out;
}

/**
 * cue: the vendored strategies at chance + 15 points (pools of 100 items or more), and odd-one-out per authored item of
 * 3+ options. `strategies` defaults to every one; a planted fixture passes the one it plants.
 */
export function cueFindings(pool, rows = [], strategies = CUE_STRATEGIES) {
  const out = [];
  const rate = (items, pick) => {
    const rs = items.filter(isChoice);
    if (rs.length === 0) return null;
    const chance = rs.reduce((a, i) => a + 1 / i.options.length, 0) / rs.length;
    const hit = rs.reduce((a, i) => a + pick(cueQ(i)), 0) / rs.length;
    return { n: rs.length, chance, hit, over: hit > chance + CUE_MARGIN + 1e-12 };
  };
  for (const s of strategies) {
    const p = rate(pool.items, s.pick);
    if (!p) continue;
    const r = pool.replicate ? rate(pool.replicate, s.pick) : null;
    const judged = p.n >= CUE_MIN_ITEMS;
    rows.push({ pool: pool.id, cue: s.name, primary: p, replicate: r, judged });
    if (judged && p.over && (!pool.replicate || (r && r.over))) {
      out.push(finding('cue', s.name, pool.id, `the vendored strategy '${s.name}' hits ${pct(p.hit)} of ${p.n} items (chance ${pct(p.chance)} + ${CUE_MARGIN * 100} points)${r ? `; replicate ${pct(r.hit)}` : ''}; rewrite the options so the feature does not separate the key`));
    }
  }
  for (const item of pool.items) {
    if (item.source !== 'authored' || !isChoice(item) || item.options.length < 3) continue;
    const v = cues.oddOneOut(cueQ(item));
    if (v.length) out.push(finding('cue', 'odd-one-out', pool.id, `${v.join('; ')}; rewrite the options so no binary feature isolates the key`, item.ref));
  }
  return out;
}

/** The verdict counts of a set of calls; value keys count in the denominator only, since a value is not a verdict. */
function verdictShare(calls) {
  const n = { violated: 0, holds: 0, unknown: 0 };
  for (const c of calls) if (c.keyVerdict in n) n[c.keyVerdict] += 1;
  const [top, k] = Object.entries(n).reduce((a, b) => (b[1] > a[1] ? b : a));
  return { n: calls.length, top, k, share: calls.length ? k / calls.length : 0, counts: n };
}

/** calls: the surprise share and the verdict balance of a stage's authored calls (post-instruction). */
export function authoredCallFindings(stage, calls, poolId = `stage:${stage}/authored`) {
  const out = [];
  if (calls.length === 0) return out;
  const surprises = calls.filter(isSurprise);
  const share = surprises.length / calls.length;
  if (share < MIN_SURPRISE_SHARE - 1e-12) {
    const predicted = calls.filter((c) => !isSurprise(c)).map((c) => `${c.ref} (${c.keyVerdict}, ${c.scene?.scene})`);
    out.push(finding('calls', 'surprises', poolId, `${surprises.length} of ${calls.length} calls are genuine surprises (${pct(share)}; at least ${MIN_SURPRISE_SHARE * 100}%): the narrative-blind strategy predicts ${predicted.slice(0, 6).join(', ')}${predicted.length > 6 ? ', ...' : ''}`));
  }
  const v = verdictShare(calls);
  if (v.share > MAX_VERDICT_SHARE + 1e-12) {
    out.push(finding('calls', 'balance', poolId, `${v.top} keys ${v.k} of ${calls.length} calls (${pct(v.share)}; at most ${MAX_VERDICT_SHARE * 100}%): violated ${v.counts.violated}, holds ${v.counts.holds}, unknown ${v.counts.unknown}`));
  }
  return out;
}

/** calls: the verdict balance of generated calls (GATE-items balances generated keys per stage), replicated. */
export function generatedCallFindings(poolId, calls, replicate) {
  if (calls.length === 0) return [];
  const p = verdictShare(calls);
  if (!(p.share > MAX_VERDICT_SHARE + 1e-12)) return [];
  const r = replicate ? verdictShare(replicate) : null;
  if (r && !(r.share > MAX_VERDICT_SHARE + 1e-12)) return [];
  return [finding('calls', 'generated-balance', poolId, `generated calls: ${p.top} keys ${p.k} of ${p.n} (${pct(p.share)}${r ? `; replicate ${r.top} ${pct(r.share)}` : ''}; at most ${MAX_VERDICT_SHARE * 100}%)`)];
}

/**
 * multi-tf: a stage's true share between 40% and 60%, replicated on generated sets. A stage's authored sets are judged
 * on their own, exactly, from MIN_SHARE_STATEMENTS statements (`minStatements`), as its authored calls are.
 */
export function trueShareFindings(poolId, sets, replicate, minStatements = 1) {
  const share = (xs) => {
    let t = 0;
    let n = 0;
    for (const s of xs) for (const st of s.statements) {
      n += 1;
      if (st.truth) t += 1;
    }
    return { n, t, share: n ? t / n : NaN };
  };
  const out = (s) => s.n >= minStatements && s.n > 0 && (s.share < TRUE_SHARE_RANGE[0] - 1e-12 || s.share > TRUE_SHARE_RANGE[1] + 1e-12);
  const p = share(sets);
  if (!out(p)) return [];
  const r = replicate ? share(replicate) : null;
  if (r && !out(r)) return [];
  return [finding('multi-tf', 'share', poolId, `${p.t} of ${p.n} statements are true (${pct(p.share)}${r ? `; replicate ${pct(r.share)}` : ''}); a stage's true share stays between ${TRUE_SHARE_RANGE[0] * 100}% and ${TRUE_SHARE_RANGE[1] * 100}%`)];
}

/** Digits in a text, with the separators between them dropped, so 5,000,000 and 5 000 000 match 5000000. */
const digitsOf = (text) => String(text ?? '').replace(/(\d)[\s,_ ’'](?=\d)/g, '$1');
/** The words of a run's verdict lines that say it stopped on its budget, not on a verdict. */
export const BUDGET_WORDS = ['canceled', 'cancelled', 'timeout', 'timed out', 'rlimit', 'resource limit', 'budget'];
const BUDGET_STOP = new RegExp(`\\b(${BUDGET_WORDS.join('|')})\\b`, 'i');

/** The numeric limits of a run's budget, its configurations' included (memory sizes and worker counts aside). */
function budgetNumbers(run) {
  const out = new Set();
  const walk = (v, key = '') => {
    if (typeof v === 'number' && Number.isFinite(v) && !/memory|workers|cpus?/i.test(key)) out.add(String(v));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(run?.budget);
  for (const c of run?.configs ?? []) walk(c?.budget);
  return [...out].filter((s) => s.length >= 2);
}

/** bound, for an authored call: a key that rests on a budget stop states the budget in the cell (I10). */
export function authoredBoundFindings(stage, calls, runs, notes, poolId = `stage:${stage}/authored`) {
  const out = [];
  for (const c of calls) {
    if (c.keyVerdict !== 'unknown' || !c.keyRun) continue;
    const run = runs.get(c.keyRun);
    if (!run) {
      notes.push(`bound: ${c.ref} is keyed by ${c.keyRun}, which runs/ does not hold yet, so its bound was not checked`);
      continue;
    }
    const lines = [...(run.verdict_lines ?? []), ...(run.configs ?? []).flatMap((x) => x?.verdict_lines ?? [])].join('\n');
    if (!BUDGET_STOP.test(lines)) continue;
    const limits = budgetNumbers(run);
    const text = digitsOf(c.cellText);
    const printed = limits.some((v) => new RegExp(`(^|\\D)${v}(\\D|$)`).test(text)) || text.includes(`{{run:${c.keyRun}#values.`);
    if (!printed) {
      out.push(finding('bound', 'authored', poolId, `the key rests on a budget stop in ${c.keyRun}, and the cell states no budget (${limits.length ? `the run's limits: ${limits.join(', ')}` : 'the run records none'}); print the bound the verdict rests on (I10)`, c.ref));
    }
  }
  return out;
}

/** Model SDKs and endpoints: a generator that names one (imported, imported at run time or required) would produce item text at run time [D]. */
export const MODEL_MARKERS = [
  /\bapi\.anthropic\.com\b/i,
  /\bapi\.openai\.com\b/i,
  /\bgenerativelanguage\.googleapis\.com\b/i,
  /\bapi\.mistral\.ai\b/i,
  /\bapi\.cohere\.(?:ai|com)\b/i,
  /\/v1\/(?:chat\/completions|completions|messages|responses)\b/i,
  /(?:from|import\(?|require\()\s*['"](?:@anthropic-ai\/[\w./-]+|openai(?:\/[\w./-]+)?|@google\/generative-ai|@google\/genai|cohere-ai|@mistralai\/[\w./-]+|ollama(?:\/[\w./-]+)?|langchain(?:\/[\w./-]+)?|@langchain\/[\w./-]+)['"]/,
];

/** runtime-model: no generator source names a model SDK or endpoint. */
export function runtimeModelFindings(sources) {
  const out = [];
  for (const s of sources) {
    s.text.split('\n').forEach((line, i) => {
      const m = MODEL_MARKERS.find((re) => re.test(line));
      if (m) out.push(finding('runtime-model', 'source', 'generators', `${s.path}:${i + 1} names a language model (${line.trim().slice(0, 80)}); no stem, option, key or why may come from a model at run time`));
    });
  }
  return out;
}

/** cti: at least four GEN-cti-or-bug items across S4 to S9, once the rule is active. */
export function ctiFindings(pages, active) {
  if (!active) return [];
  const counts = new Map(CTI_STAGES.map((s) => [s, 0]));
  for (const p of pages) if (counts.has(p.stage)) counts.set(p.stage, counts.get(p.stage) + p.cti);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total >= MIN_CTI_ITEMS) return [];
  return [finding('cti', 'dose', 'S4-S9', `${total} GEN-cti-or-bug item(s) across S4 to S9 (${[...counts].map(([s, n]) => `${s} ${n}`).join(', ')}); at least ${MIN_CTI_ITEMS}, interleaved through S9 (spine section 4.1)`)];
}

// ------------------------------------------------------------------ the model and its pools

/** A family's own pool: both samples, judged as a generated pool. */
export const familyPool = (f) => ({ id: `family:${f.id}`, generated: true, family: f.id, items: f.items, replicate: f.replicate });

/**
 * Every rule over a model of the items. The model is plain data:
 *   families  [{ id, fixture, mode, items, replicate, pending: [{template, engine, lands}], boundIssues: [message], notes,
 *               seedsPerCell }] (seedsPerCell: the seeds each template and band was drawn from, as sampleFamily
 *               records it; a family built from items, as a planted one is, has none)
 *   pages     the result of itemsOfPage for every lesson and drawer
 *   registry  { misconceptions: Set, generators: Map } or null;  ctiActive;  sources [{path, text}];  runs Map
 * Returns the findings, the strategy rows (for --verbose and --json), the pools and notes.
 */
export function checkModel(model) {
  const findings = [];
  const rows = [];
  const notes = [...(model.notes ?? [])];
  const pools = [];
  const families = new Map((model.families ?? []).map((f) => [f.id, f]));
  const pages = model.pages ?? [];
  const runs = model.runs ?? new Map();

  // Families: per item, length, strategies and the vendored cues on each family's own pool.
  const named = new Set(pages.flatMap((p) => p.uses.map((u) => `${u.family}/${u.template}`)));
  for (const f of families.values()) {
    const pool = familyPool(f);
    pools.push({ id: pool.id, kind: 'family', n: f.items.length, replicate: f.replicate?.length ?? 0, mode: f.mode });
    // ASSESSMENT.md section 7.3's pool is 200 seeded instances per template and band: a smaller sample is not the gate.
    if (f.seedsPerCell !== undefined && !(f.seedsPerCell >= SEEDS_PER_CELL)) {
      findings.push(finding('structure', 'sample', pool.id, `sampled at ${f.seedsPerCell} seed(s) per template and band; the gate's pool is ${SEEDS_PER_CELL} (ASSESSMENT.md section 7.3), so this run is a preview, not a pass`));
    }
    findings.push(...itemFindings([...f.items, ...(f.replicate ?? [])], pool.id, model.registry));
    findings.push(...lengthFindings(pool), ...strategyFindings(pool, rows), ...cueFindings(pool, rows));
    // The vendored strategies on each template's pool too: a pooled rate can hide a leaking template (kernelspace held
    // its sub-pools to the bar on their own for the same reason). With one live template that pool is the family's.
    for (const t of (f.live?.length ?? 0) > 1 ? f.live : []) {
      const of = (xs) => xs?.filter((i) => i.template === t);
      findings.push(...cueFindings({ id: `family:${f.id}/${t}`, generated: true, items: of(f.items), replicate: of(f.replicate) }, rows));
    }
    for (const m of f.boundIssues ?? []) findings.push(finding('bound', 'generated', pool.id, m));
    // The templates no page names yet are held to the stage rules on the family's own pool.
    const unnamed = (i) => !named.has(`${f.id}/${i.template}`);
    const rest = f.items.filter(unnamed);
    const restR = f.replicate?.filter(unnamed);
    if (rest.length > 0) {
      findings.push(...generatedCallFindings(pool.id, rest.filter(isCall), restR?.filter(isCall)));
      findings.push(...trueShareFindings(pool.id, rest.filter((i) => i.kind === 'multi-tf'), restR?.filter((i) => i.kind === 'multi-tf')));
    }
  }

  // Pages: per item, then per stage and for the drawers.
  for (const p of pages) findings.push(...itemFindings(p.items, `page:${p.id}`, model.registry));
  for (const p of pages) {
    for (const u of p.uses) {
      const f = families.get(u.family);
      if (!f) {
        notes.push(`absent: ${u.ref} names ${u.family}, which has no family under packages/generators/src yet; its items were not checked`);
        continue;
      }
      const pend = (f.pending ?? []).find((x) => x.template === u.template);
      if (pend) findings.push(finding('structure', 'pending', `page:${p.id}`, `${u.ref}: ${u.family} ${u.template} is pending until ${pend.lands} and is never served; name a live template`, u.ref));
      else if (!f.live?.includes(u.template)) notes.push(`template: ${u.ref} names ${u.family} ${u.template}, which the family does not define`);
    }
  }
  const stages = [...new Set(pages.map((p) => p.stage).filter(Boolean))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  for (const stage of stages) {
    const sp = pages.filter((p) => p.stage === stage);
    const authored = sp.flatMap((p) => p.items);
    const calls = sp.flatMap((p) => p.calls).filter((c) => !c.preInstruction);
    // The stage's authored items, judged exactly.
    const ap = { id: `stage:${stage}/authored`, generated: false, items: authored };
    pools.push({ id: ap.id, kind: 'authored', n: authored.length, calls: calls.length, surprises: calls.filter(isSurprise).length });
    findings.push(...lengthFindings(ap), ...strategyFindings(ap, rows), ...cueFindings(ap, rows));
    findings.push(...authoredCallFindings(stage, calls), ...authoredBoundFindings(stage, calls, runs, notes));
    findings.push(...trueShareFindings(ap.id, authored.filter((i) => i.kind === 'multi-tf'), null, MIN_SHARE_STATEMENTS));
    // The stage's pool: its authored items and the generated templates its pages name (ASSESSMENT.md section 7.3).
    const uses = new Map();
    for (const u of sp.flatMap((p) => p.uses)) {
      const f = families.get(u.family);
      if (f && f.live?.includes(u.template)) uses.set(`${u.family}/${u.template}`, u);
    }
    if (uses.size > 0) {
      const pick = (sample) => [...uses.values()].flatMap((u) => (families.get(u.family)[sample] ?? []).filter((i) => i.template === u.template));
      const primary = pick('items');
      const replicate = pick('replicate');
      const pool = { id: `stage:${stage}`, generated: true, combined: true, items: [...authored, ...primary], replicate: [...authored, ...replicate] };
      pools.push({ id: pool.id, kind: 'stage', n: pool.items.length, replicate: pool.replicate.length, templates: [...uses.keys()] });
      findings.push(...strategyFindings(pool, rows));
      findings.push(...generatedCallFindings(pool.id, primary.filter(isCall), replicate.filter(isCall)));
      findings.push(...trueShareFindings(pool.id, primary.filter((i) => i.kind === 'multi-tf'), replicate.filter((i) => i.kind === 'multi-tf')));
    }
  }
  const drawerItems = pages.filter((p) => p.stage === null).flatMap((p) => p.items);
  if (drawerItems.length > 0) {
    const dp = { id: 'drawers', generated: false, items: drawerItems };
    pools.push({ id: dp.id, kind: 'authored', n: drawerItems.length });
    findings.push(...lengthFindings(dp), ...strategyFindings(dp, rows), ...cueFindings(dp, rows));
  }

  findings.push(...ctiFindings(pages, model.ctiActive), ...runtimeModelFindings(model.sources ?? []));
  return { findings, rows, pools, notes };
}

// ------------------------------------------------------------------ discovery

/** The seeds of one sample: fixed, in the graded half, distinct. */
export function sampleSeeds(label, n) {
  const draw = rng.createDraw(rng.deriveSeed(0, label));
  const out = new Set();
  while (out.size < n) out.add(draw.u32() & 0x7fffffff);
  return [...out];
}

/**
 * A family's two samples. Served through the family's own ports when they cover every engine its live templates
 * consult (a draw redraws past discarded seeds, and a seed already served in the cell is not counted twice);
 * otherwise as make() offers it. The served keys are also read for I10: a bounded key needs an instance that prints it.
 */
export async function sampleFamily(gen, ports, opts = {}) {
  const n = opts.seeds ?? SEEDS_PER_CELL;
  const live = core.liveTemplates(gen);
  const pending = core.pendingTemplates(gen).map((t) => ({ template: t.id, engine: t.pending.engine, lands: t.pending.lands }));
  const own = new Map(Object.entries(ports ?? {}));
  const engines = Array.isArray(gen.engines) ? gen.engines : [];
  const served = engines.length > 0 && engines.every((e) => own.has(e));
  const port = served ? { run: (req) => own.get(req.engine).run(req) } : null;
  const notes = [];
  const boundIssues = [];
  let constructed = 0;
  const samples = {};
  let unbounded = null;
  // The seeds every template and band of both samples is drawn from, which structure/sample holds to the gate's 200.
  let seedsPerCell = Infinity;
  for (const sample of ['primary', 'replicate']) {
    const seeds = opts.seedLists?.[sample] ?? sampleSeeds(SAMPLE_LABELS[sample], n);
    seedsPerCell = Math.min(seedsPerCell, new Set(seeds).size);
    const items = [];
    for (const t of live) {
      for (const band of core.BANDS) {
        const seen = new Set();
        let exhausted = 0;
        let thrown = 0;
        for (const seed of seeds) {
          let inst;
          let key = null;
          try {
            if (port) {
              const d = await core.drawInstance(gen, port, { seed, band, template: t.id });
              if (d.status !== 'drawn') {
                exhausted += 1;
                continue;
              }
              if (seen.has(d.seed)) continue;
              seen.add(d.seed);
              inst = d.instance;
              key = d.key;
            } else inst = gen.make(seed, band, t.id);
          } catch (e) {
            thrown += 1;
            if (thrown === 1) notes.push(`${t.id}/b${band}: make or key threw (${e instanceof Error ? e.message : String(e)}); GATE-generators reports it`);
            continue;
          }
          if (key && key.bound !== undefined && (typeof inst.bound !== 'string' || !/\d/.test(inst.bound))) {
            unbounded ??= { ref: `gen:${gen.id}:${t.id}:b${band}:${core.formatSeed(inst.seed)}`, bound: key.bound, count: 0 };
            unbounded.count += 1;
          }
          const r = itemsOfInstance(inst, sample);
          constructed += r.constructed;
          items.push(...r.items);
        }
        if (exhausted > 0) notes.push(`${sample} ${t.id}/b${band}: ${exhausted} draw(s) found no keyable seed`);
      }
    }
    samples[sample] = items;
  }
  if (unbounded) boundIssues.push(`${unbounded.count} served instance(s) have a bounded key ("${unbounded.bound}") but print no bound of their own with its numbers (first ${unbounded.ref}); the item must show the bound its verdict rests on (I10)`);
  if (constructed > 0) notes.push(`${constructed} constructed part(s) have no options to lint`);
  return {
    id: String(gen.id),
    fixture: gen.fixture === true,
    mode: served ? 'served' : 'offered',
    live: live.map((t) => t.id),
    pending,
    items: samples.primary,
    replicate: samples.replicate,
    boundIssues,
    notes,
    seedsPerCell,
  };
}

/** The lessons and drawers of a tree: content/stages/S{n}/S{n}.L{k}.md and content/drawers/D-{nn}.md. */
export function pageFiles(root) {
  const out = [];
  const list = (dir) => {
    try {
      return readdirSync(dir).sort();
    } catch {
      return [];
    }
  };
  for (const s of list(join(root, 'content', 'stages'))) {
    const dir = join(root, 'content', 'stages', s);
    if (!/^S\d+$/.test(s)) continue;
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const f of list(dir)) if (/^S\d+\.L\d+\.md$/.test(f)) out.push(join(dir, f));
  }
  for (const f of list(join(root, 'content', 'drawers'))) if (/^D-\d{2}\.md$/.test(f)) out.push(join(root, 'content', 'drawers', f));
  return out;
}

/** The content build's reader of page sources (packages/content), so the gate reads what the build reads. */
export const contentReader = async () => (await mod('packages/content/src/build/index.ts')).parsePageSource;

/** One page source read by the content build's reader into the items the rules read. Every page goes through here, the planted pages too. */
export function readPage(parsePageSource, text, rel) {
  const notes = [];
  const parsed = parsePageSource(text);
  const errors = (parsed.problems ?? []).filter((p) => p.severity === 'error' || p.level === 'error');
  if (errors.length) notes.push(`${rel}: the content reader reports ${errors.length} error(s); GATE-items lints what it parsed (the content build fails the page)`);
  if (!parsed.record) notes.push(`${rel}: no front matter could be read, so its items were not checked (the content build fails the page)`);
  return { page: parsed.record ? itemsOfPage(parsed.record, rel) : null, errors, notes };
}

/** Every page of a tree, read by readPage; `errors` are the content reader's, with their file. */
export async function loadPages(root) {
  const parsePageSource = await contentReader();
  const pages = [];
  const notes = [];
  const errors = [];
  for (const file of pageFiles(root)) {
    const rel = relative(root, file).split(sep).join('/');
    try {
      const r = readPage(parsePageSource, readFileSync(file, 'utf8'), rel);
      notes.push(...r.notes);
      errors.push(...r.errors.map((e) => ({ file: rel, line: e.line, message: e.message })));
      if (r.page) pages.push(r.page);
    } catch (e) {
      notes.push(`${rel}: could not be read (${e instanceof Error ? e.message : String(e)})`);
    }
  }
  return { pages, notes, errors };
}

/** structure: a family module that does not load, and a family asked for (--family) that does not exist. */
export function moduleFindings(loaded, wanted = []) {
  const out = [];
  for (const f of loaded) if (f.error) out.push(finding('structure', 'module', f.dir, `${f.error}; its items cannot be checked`));
  for (const id of wanted) if (!loaded.some((f) => f.generator?.id === id)) out.push(finding('structure', 'module', id, `no family ${id} under packages/generators/src`));
  return out;
}

/** The CTI dose is active from W3: once GEN-cti-or-bug exists (its module, or a family that loaded) or a page names it. */
export const ctiActiveOf = (pages, familyIds = [], modulePresent = false) => modulePresent || familyIds.includes(CTI_FAMILY) || pages.some((p) => p.cti > 0);

/** The generators' sources, for the runtime-model lint. */
export function generatorSources(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|mjs|cjs)$/.test(e.name)) out.push({ path: relative(root, p).split(sep).join('/'), text: readFileSync(p, 'utf8') });
    }
  };
  walk(join(root, 'packages', 'generators', 'src'));
  return out;
}

/** The run records the authored calls cite. */
function loadRuns(root, ids) {
  const runs = new Map();
  for (const id of ids) {
    if (!/^RUN-[a-z0-9-]+$/.test(id)) continue;
    try {
      runs.set(id, JSON.parse(readFileSync(join(root, 'runs', `${id}.json`), 'utf8')));
    } catch {
      // not recorded yet: the bound rule notes it
    }
  }
  return runs;
}

// ------------------------------------------------------------------ the run

export async function collect(o) {
  const registryRaw = generatorsGate.loadRegistry(o.root);
  const registry = registryRaw ? { misconceptions: registryRaw.misconceptions, generators: registryRaw.generators } : null;
  const notes = [];
  if (!registry) notes.push('registry: packages/ids/src/registry.json is missing; misconception keys were not checked against it');
  const loaded = await generatorsGate.loadFamilies(o.root);
  const families = [];
  const findings = moduleFindings(loaded, o.families);
  for (const f of loaded) {
    if (f.error) continue;
    if (o.families.length > 0 && !o.families.includes(f.generator.id)) continue;
    families.push(await sampleFamily(f.generator, f.ports, { seeds: o.seeds }));
  }
  const { pages, notes: pageNotes } = await loadPages(o.root);
  notes.push(...pageNotes);
  const ctiActive = ctiActiveOf(pages, loaded.map((f) => f.generator?.id).filter(Boolean), existsSync(join(o.root, 'packages', 'generators', 'src', 'cti-or-bug', 'index.ts')));
  const runs = loadRuns(o.root, new Set(pages.flatMap((p) => p.calls.map((c) => c.keyRun)).filter(Boolean)));
  return { model: { families, pages, registry, ctiActive, sources: generatorSources(o.root), runs, notes }, findings };
}

// ------------------------------------------------------------------ planted fixtures

const VERDICTS = ['violated', 'holds', 'unknown'];
const VERDICT_TEXT = { violated: '`sat`', holds: '`unsat`', unknown: '`unknown`' };
const VERDICT_WHY = { violated: 'A model exists.', holds: 'No model exists.', unknown: 'The solver could not decide.' };
const VERDICT_MIS = { violated: 'dp:Z1', holds: 'dp:Z1', unknown: 'dp:Z2' };

/** Build once, on first use: a fixture that several cases read, or one that costs time, is built only when a case runs. */
const once = (f) => {
  let p = null;
  return () => (p ??= f());
};

/** A plain choice item for the planted fixtures. `opts` is [[text, why, mis], ...]; the key is the index `key`. */
function planted(ref, opts, key, fields = {}) {
  const options = opts.map(([text, why, mis], i) => ({ id: String.fromCharCode(65 + i), text, why, mis: i === key ? undefined : mis }));
  const item = choiceItem({ ref, source: 'authored', stem: '', prompt: 'Planted.', options, keys: [key], ...fields });
  if (item.call) {
    item.verdicts = item.options.map((o) => verdictOf(o.text));
    item.keyVerdict = item.verdicts[item.key];
  }
  return item;
}

/** A planted item with one option's fields changed. */
const edited = (item, j, fields) => ({ ...item, options: item.options.map((o, i) => (i === j ? { ...o, ...fields } : o)) });

/**
 * A planted page of calls: each call [keyVerdict, scene, offered], its options the verdicts offered (all three unless
 * named) in a seeded order (with `rotate`, the key at position i mod the number of options).
 */
function plantedCallPage(id, calls, seed = 1, rotate = false) {
  const draw = rng.createDraw(seed);
  const items = calls.map(([verdict, scene, offered = VERDICTS], i) => {
    let order = draw.shuffle(offered);
    if (rotate) {
      order = order.filter((v) => v !== verdict);
      order.splice(i % offered.length, 0, verdict);
    }
    const item = planted(`cell:${id}#${i + 1}`, order.map((v) => [VERDICT_TEXT[v], VERDICT_WHY[v], VERDICT_MIS[v]]), order.indexOf(verdict), { page: id, stage: stageOfPage(id), call: true });
    item.scene = { scene, why: 'planted' };
    return item;
  });
  if (items.length) items[items.length - 1].lastInPage = true;
  return { id, file: '', stage: stageOfPage(id), tier: 'core', calls: items, items, uses: [], cti: 0 };
}

/** A planted call on a first run whose key is an amount, which is no verdict. */
function valueCall(ref, id) {
  const item = planted(ref, [['`1`', 'One unit over the balance is the least amount that overdraws it.', ''], ['`0`', 'Zero moves nothing.', 'dp:Z5'], ['`2`', 'Two overdraws it, but one already does.', 'dp:Z3']], 0, { page: id, stage: stageOfPage(id), call: true });
  item.scene = { scene: 'first-run', why: 'planted' };
  return item;
}

/** Authored calls keyed verdict i mod 3, the key at position at(i) of three; the scene is first-run unless sceneFor says otherwise. */
function plantedCalls(id, n, at, sceneFor = () => 'first-run') {
  return Array.from({ length: n }, (_, i) => {
    const v = VERDICTS[i % 3];
    const order = VERDICTS.filter((x) => x !== v);
    order.splice(at(i), 0, v);
    const item = planted(`cell:${id}#${i + 1}`, order.map((x) => [VERDICT_TEXT[x], VERDICT_WHY[x], VERDICT_MIS[x]]), order.indexOf(v), { page: id, stage: stageOfPage(id), call: true });
    item.scene = { scene: sceneFor(v, i), why: 'planted' };
    return item;
  });
}

/**
 * A planted generated family: `make(draw, i, template, sample)` returns {opts, key} or a true/false set {statements};
 * both samples drawn, `count` items (default 300) per live template each (`live`, default t1).
 */
function plantedFamily(id, make, fields = {}) {
  const { live = ['t1'], count = 300, ...rest } = fields;
  const build = (sample, label) => {
    const draw = rng.createDraw(rng.deriveSeed(0, label));
    return live.flatMap((t) => Array.from({ length: count }, (_, i) => {
      const x = make(draw, i, t, sample);
      const common = { ref: `gen:${id}:${t}:b1:${sample === 'primary' ? '' : 'r'}${i}`, source: 'generated', sample, family: id, template: t, band: 1, stem: 'Planted.', prompt: 'Planted.' };
      if (x.statements) return { ...common, kind: 'multi-tf', statements: x.statements };
      const options = x.opts.map(([text, why, mis], j) => ({ id: String.fromCharCode(65 + j), text, why, mis: j === x.key ? undefined : mis }));
      const item = choiceItem({ ...common, options, keys: [x.key], call: id === CALL_FAMILY });
      return item.call ? withVerdicts(item) : item;
    }));
  };
  return { id, fixture: true, mode: 'offered', live, pending: [], items: build('primary', `${id}/p`), replicate: build('replicate', `${id}/r`), boundIssues: [], notes: [], ...rest };
}

/** Four options of equal length in a seeded order, the key among them: a family with no cue. */
function evenOptions(draw, words = ['north', 'south', 'east', 'west']) {
  const order = draw.shuffle(words);
  const key = draw.below(order.length);
  return { opts: order.map((w) => [`${w} wing`, `The ${w} wing.`, 'dp:G1']), key };
}

/**
 * GEN-fixture as it ships, served by its own engine: the clean control of the self-check, which the machinery that fails
 * the fixture with its shipped t3 cue (shippedCueFixture) must pass. W1-T39 replaced t3's dp:Z5 mutant "drop a
 * conjunct", always the shortest option, with "flip the connective only" (dp:G5), which makes t3 a 2x2 of connective and
 * negation (the key not-c1 or not-c2 beside not-c1 and not-c2, c1 or c2, and c1 and c2): every option shares its
 * connective with one option and its negations with another, so neither length nor token overlap singles out the key.
 */
export async function evenFixture() {
  const fx = await mod('packages/generators/src/core/fixture/index.ts');
  return { generator: fx.generator, ports: fx.ports };
}

/**
 * GEN-fixture with the t3 cue it shipped with: a distractor that drops a conjunct (the reference's first disjunct) is
 * always the shortest option and the other three tie, so always the longest hits 1 in 3 in t3 and 1 in 4 in t1 and t2:
 * 500 of 1800 against a bar of 486.7 at 200 seeds per template and band, and 250 of 900 against 251.0 at 100. The
 * family now offers "flip the connective only" in its place (W1-T39's change to W1-T21's fixture), so the cue is put
 * back here; were the family reverted, its instances would carry the cue as they are.
 */
export async function shippedCueFixture() {
  const fx = await mod('packages/generators/src/core/fixture/index.ts');
  const f = await mod('packages/generators/src/core/fixture/formula.ts');
  const base = fx.generator;
  const make = (seed, band, template) => {
    const inst = base.make(seed, band, template);
    if (template !== 't3') return inst;
    const part = inst.item.parts[0];
    if (part.options.some((o) => o.origin?.operator === 'drop a conjunct')) return inst;
    const i = part.options.findIndex((o) => o.origin?.kind === 'mutant' && o.origin.operator === 'flip the connective only');
    const ref = part.options.find((o) => o.origin?.kind === 'reference');
    const value = ref ? inst.data.values[ref.id] : null;
    if (i < 0 || value?.f !== 'or') return inst;
    const dropped = value.args[0];
    const options = part.options.map((o, j) => (j === i ? { ...o, text: f.render(dropped), why: 'This checks one part of the requirement and drops the rest, a slip carried into the encoding.', origin: { kind: 'mutant', tag: 'dp:Z5', operator: 'drop a conjunct' } } : o));
    return { ...inst, item: { ...inst.item, parts: [{ ...part, options }] }, data: { ...inst.data, values: { ...inst.data.values, [part.options[i].id]: dropped } } };
  };
  return { generator: { ...base, make } };
}

// ---- a scratch tree in the content format, found by the gate's own discovery like every page, run and source

const FENCE = '```';
const frontOf = (id, tier, title) => ['---', `id: ${id}`, `tier: ${tier}`, `title: "${title}"`, 'draft: true', 'kcs: [KC-1.violation-as-sat]', '---', ''];
/**
 * An instrument cell with a call; `options` are [id, text, why, mis] (mis empty on the key); `direction` adds a
 * @direction section and `after` an @after section.
 */
const cellOf = (n, key, options, md = '', prompt = 'What will Z3 return?', direction = '', after = '') => [
  `:::instrument ins=INS-z3 cell=${n} recorded=RUN-planted-page`,
  ...(md ? [md, ''] : []),
  `${FENCE}python`, 'print(s.check())', FENCE, '',
  ...(direction ? ['@direction', direction, ''] : []),
  `@call key=${key}`, prompt, '',
  ...options.flatMap(([id, text, why, mis]) => [`- ${id}. ${text}`, `  - why: ${why}`, ...(mis ? [`  - mis: ${mis}`] : [])]),
  ...(after ? ['', '@after', after] : []),
  ':::', '',
];
/** A free-run cell (call=false): its text, @direction and @after, each optional; its code names a fix that is not narrative. */
const freeRunOf = (n, md = '', direction = '', after = '') => [
  `:::instrument ins=INS-z3 cell=${n} recorded=RUN-planted-page call=false`,
  ...(md ? [md, ''] : []),
  `${FENCE}python editable`, 'fix = patch(guard)', 'print(s.check())', FENCE, '',
  ...(direction ? ['@direction', direction, ''] : []),
  ...(after ? ['@after', after, ''] : []),
  ':::', '',
];
/** A content card; its title and its text are narrative. */
const cardOf = (title, text) => [`:::card variant=twin title="${title}"`, text, ':::', ''];
const codeVerdicts = (key) => [['A', '`sat`', 'A model exists.', 'dp:Z1'], ['B', '`unsat`', 'No model exists.', 'dp:Z1'], ['C', '`unknown`', 'Small linear queries are decided.', 'dp:Z6']].map((o) => (o[0] === key ? [...o.slice(0, 3), ''] : o));
/** A cell of S9.L2: a query no small budget decides, keyed `unknown`; `recorded` names the cell's run, `run` the call's. */
const budgetCellOf = (n, recorded, run, prompt) => [
  `:::instrument ins=INS-z3 cell=${n} recorded=${recorded}`,
  `${FENCE}python`, 's.add(x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z)', 'print(s.check())', FENCE, '',
  `@call key=B${run ? ` run=${run}` : ''}`, prompt, '',
  '- A. proved: `unsat`', '  - why: Not within the budget.', '  - mis: dp:Z6',
  '- B. no verdict: `unknown`', '  - why: The reason says the run was canceled.',
  ':::', '',
];

/** The run record S9.L2's calls are keyed by: it stopped on its budget (rlimit 5000000), which neither cell states. Its ID holds a digit, as RUN-z3-* IDs do. */
export const PLANTED_RUN = { id: 'RUN-planted-z3-budget', budget: { rlimit: 5000000 }, verdict_lines: ['rlimit-case unknown canceled 1.1 s'] };

/**
 * Boot's first-contact call (pre-instruction); a lesson whose seven calls the narrative predicts, but only when each
 * scene is read right: the first call of a segment opens a scene (the second segment's first call names the fix to
 * come, and is still a first run), a later call whose words frame an edit as a fix is a fix (in its prose, in its
 * @direction, capitalized, and in its call's prompt), and a later call without them is a new query; two calls name
 * their verdicts in prose. With a prequestion and a GEN-cti-or-bug item, so the page reader's refs, uses and CTI count
 * run too. A lesson whose two calls rest on a run that stopped on its budget, one through the cell's recorded run and
 * one through the call's run, and state no budget; a lesson whose fixes are framed before the cell (S9.L3, below); a
 * page numbered S10.L10, so discovery reads stage and lesson numbers past nine; and a drawer whose key is 1.31 times its
 * distractors' mean length.
 */
export const PLANTED_PAGES = {
  'content/stages/S9/S9.L0.md': [
    ...frontOf('S9.L0', 'boot', 'Planted first contact'),
    '## First contact {minutes=3}', '',
    ...cellOf(1, 'B', [['A', 'No: the guard checks the funds first.', 'The guard reads the balance before the debit.', 'dp:G8'], ['B', 'Yes: some inputs get past the guard.', 'Z3 finds such an input.', '']], '', 'Can the transfer overdraw the account?'),
  ].join('\n'),
  'content/stages/S9/S9.L1.md': [
    ...frontOf('S9.L1', 'core', 'Planted scenes'),
    '## The first scene {minutes=10}', '',
    'Ordinary prose between the blocks.', '',
    ':::item role=prequestion family=GEN-planted template=t1 kcs=KC-1.violation-as-sat',
    '@choice key=B',
    'Which query finds a state that violates the requirement?',
    '- A. the requirement itself', '  - why: Its sat answers satisfy the requirement.', '  - mis: dp:Z1',
    '- B. the negation of the requirement', '  - why: Its sat answers violate the requirement.',
    ':::', '',
    ...cellOf(1, 'A', codeVerdicts('A')),
    ...cellOf(2, 'B', [['A', 'counterexample: a state breaks the requirement', 'The fix closed that path.', 'dp:Z1'], ['B', 'proved: the requirement holds', 'No state of the fixed code breaks it.', ''], ['C', 'no verdict: the budget ran out', 'Small linear queries are decided.', 'dp:Z6']], 'Now run the same query after the fix.'),
    ...cellOf(3, 'C', [['A', 'proved: no state breaks it', 'One state does.', 'dp:Z1'], ['B', 'no verdict: the solver gives up', 'Small linear queries are decided.', 'dp:Z6'], ['C', 'counterexample: one state breaks it', 'Z3 finds the state.', '']], 'A second query on the same model.'),
    '## The second scene {minutes=10}', '',
    ...cellOf(4, 'A', codeVerdicts('A'), 'Before the fix lands, run the query on the code as it is.'),
    '::item role=segment family=GEN-cti-or-bug template=t1 kcs=KC-4.cti-or-bug', '',
    ...cellOf(5, 'B', codeVerdicts('B'), 'With the guard fixed, run it again.'),
    ...cellOf(6, 'B', codeVerdicts('B'), '', 'What will Z3 return?', 'Patched: the guard now reads the balance. Run the same query again.'),
    ...cellOf(7, 'B', codeVerdicts('B'), '', 'What will Z3 return after the repair?'),
  ].join('\n'),
  'content/stages/S9/S9.L2.md': [
    ...frontOf('S9.L2', 'core', 'Planted budget'),
    '## A budget {minutes=10}', '',
    ...budgetCellOf(1, PLANTED_RUN.id, null, 'What will Z3 return within its budget?'),
    ...budgetCellOf(2, 'RUN-planted-page', PLANTED_RUN.id, 'And this query, within the same budget?'),
  ].join('\n'),
  // Fixes framed before the cell, each in one place alone: a prose block, a card's text, a card's title, a free-run
  // cell's text, @direction and @after, and the previous call's @after. The narrative is read afresh after each call
  // (cell 3 follows a fix and is a new query), and a free-run cell's code is not narrative (cell 14).
  'content/stages/S9/S9.L3.md': [
    ...frontOf('S9.L3', 'core', 'Planted narrative'),
    '## Fixes framed before the cell {minutes=10}', '',
    'Run the transfer as it is.', '',
    ...cellOf(1, 'A', codeVerdicts('A')),
    'Now fix the guard so that it reads the balance first, and run the query again.', '',
    ...cellOf(2, 'B', codeVerdicts('B')),
    'A new query, on the recipient.', '',
    ...cellOf(3, 'A', codeVerdicts('A')),
    ...cardOf('The production code', 'It repaired the same guard, and this cell runs its version.'),
    ...cellOf(4, 'B', codeVerdicts('B')),
    ...cardOf('Patched upstream', 'The production code reads the balance first.'),
    ...cellOf(5, 'B', codeVerdicts('B')),
    ...freeRunOf(6, 'Patch the guard in the code below, then run it.'),
    ...cellOf(7, 'B', codeVerdicts('B')),
    ...freeRunOf(8, '', 'Query asserts: the fixed guard reads the balance.'),
    ...cellOf(9, 'B', codeVerdicts('B')),
    ...freeRunOf(10, '', '', 'The guard is patched now.'),
    ...cellOf(11, 'B', codeVerdicts('B'), '', 'What will Z3 return?', '', "Next, repair the recipient's guard the same way."),
    ...cellOf(12, 'B', codeVerdicts('B')),
    ...freeRunOf(13, 'Run the reference model on its own.'),
    ...cellOf(14, 'A', codeVerdicts('A')),
  ].join('\n'),
  'content/stages/S10/S10.L10.md': [
    ...frontOf('S10.L10', 'core', 'Planted page past nine'),
    '## A page numbered past nine {minutes=5}', '',
    ...cellOf(1, 'B', codeVerdicts('B')),
  ].join('\n'),
  'content/drawers/D-99.md': [
    '---', 'id: D-99', 'title: "Planted drawer"', 'draft: true', 'kcs: [KC-1.violation-as-sat]', 'objective: A planted drawer page for GATE-items.', '---', '',
    '## A check {minutes=3}', '',
    ':::item role=segment family=GEN-planted template=t1 kcs=KC-1.violation-as-sat',
    '@choice key=A',
    'Which guard reads the balance it debits?',
    '- A. the guard reads the stored balance', '  - why: It reads the balance it debits.',
    '- B. the guard reads the old amount', '  - why: The old amount is stale.', '  - mis: dp:G1',
    '- C. the guard trusts input', '  - why: Input is not the balance.', '  - mis: dp:G1',
    ':::', '',
  ].join('\n'),
};

/** The pages the gate's discovery must find in the planted tree, in its order (stage folders sort as text: S10 before S9). */
export const PLANTED_PAGE_IDS = ['S10.L10', 'S9.L0', 'S9.L1', 'S9.L2', 'S9.L3', 'D-99'];
/** The stage each planted page must be read into (a drawer has none). */
export const PLANTED_PAGE_STAGES = { 'S10.L10': 'S10', 'S9.L0': 'S9', 'S9.L1': 'S9', 'S9.L2': 'S9', 'S9.L3': 'S9', 'D-99': null };

/** What the page reader must make of PLANTED_PAGES: each call's scene, key verdict, whether it is its page's last, and the run its key rests on. */
export const PLANTED_PAGE_CALLS = {
  'cell:S10.L10#1': { pre: false, scene: 'first-run', verdict: 'holds', last: true },
  'cell:S9.L0#1': { pre: true, verdict: 'value' },
  'cell:S9.L1#1': { pre: false, scene: 'first-run', verdict: 'violated', last: false },
  'cell:S9.L1#2': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L1#3': { pre: false, scene: 'first-run', verdict: 'violated', last: false },
  'cell:S9.L1#4': { pre: false, scene: 'first-run', verdict: 'violated', last: false },
  'cell:S9.L1#5': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L1#6': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L1#7': { pre: false, scene: 'fix', verdict: 'holds', last: true },
  'cell:S9.L2#1': { pre: false, scene: 'first-run', verdict: 'unknown', last: false, keyRun: PLANTED_RUN.id },
  'cell:S9.L2#2': { pre: false, scene: 'first-run', verdict: 'unknown', last: true, keyRun: PLANTED_RUN.id },
  'cell:S9.L3#1': { pre: false, scene: 'first-run', verdict: 'violated', last: false },
  'cell:S9.L3#2': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#3': { pre: false, scene: 'first-run', verdict: 'violated', last: false },
  'cell:S9.L3#4': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#5': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#7': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#9': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#11': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#12': { pre: false, scene: 'fix', verdict: 'holds', last: false },
  'cell:S9.L3#14': { pre: false, scene: 'first-run', verdict: 'violated', last: true },
};

/**
 * One generator line per runtime-model marker and per alternative a marker names (each endpoint, each completion path,
 * each SDK, by import, bare import and require), each matched by one marker alone.
 */
export const PLANTED_MODEL_LINES = [
  ['the Anthropic endpoint', "const host = 'api.anthropic.com'"],
  ['the OpenAI endpoint', "const host = 'api.openai.com'"],
  ["Google's generative-language endpoint", "const host = 'generativelanguage.googleapis.com'"],
  ['the Mistral endpoint', "const host = 'api.mistral.ai'"],
  ['the Cohere endpoint', "const host = 'api.cohere.ai'"],
  ["Cohere's other endpoint", "const host = 'api.cohere.com'"],
  ['a chat-completions path', "const path = base + '/v1/chat/completions'"],
  ['a completions path', "const path = base + '/v1/completions'"],
  ['a messages path', "const path = base + '/v1/messages'"],
  ['a responses path', "const path = base + '/v1/responses'"],
  ["Anthropic's SDK", "import Anthropic from '@anthropic-ai/sdk'"],
  ["OpenAI's SDK", "import OpenAI from 'openai'"],
  ["a module of OpenAI's SDK", "import { toFile } from 'openai/uploads'"],
  ["Google's older SDK", "import { GoogleGenerativeAI } from '@google/generative-ai'"],
  ["Google's SDK", "import { GoogleGenAI } from '@google/genai'"],
  ["Cohere's SDK, required", "const { CohereClient } = require('cohere-ai')"],
  ["OpenAI's SDK, imported at run time", "const { default: OpenAI } = await import('openai')"],
  ["Mistral's SDK", "import { Mistral } from '@mistralai/mistralai'"],
  ['the Ollama client, imported bare', "import 'ollama'"],
  ['a LangChain module', "import { PromptTemplate } from 'langchain/prompts'"],
  ['a LangChain package', "import { ChatAnthropic } from '@langchain/anthropic'"],
];

const SOURCE_EXTENSIONS = ['ts', 'tsx', 'js', 'mjs', 'cjs'];
/** Where planted model line k is written: across every extension the runtime-model lint reads, every other one a folder deeper. */
export const plantedSourcePath = (k) => `packages/generators/src/planted/${k % 2 ? 'deep/' : ''}line-${k + 1}.${SOURCE_EXTENSIONS[k % SOURCE_EXTENSIONS.length]}`;

/** Every file of the planted tree, by repository-relative path. */
export function plantedTreeFiles() {
  return {
    ...PLANTED_PAGES,
    [`runs/${PLANTED_RUN.id}.json`]: `${JSON.stringify(PLANTED_RUN, null, 2)}\n`,
    ...Object.fromEntries(PLANTED_MODEL_LINES.map(([, line], k) => [plantedSourcePath(k), `${line}\n`])),
  };
}

// ---- the vocabularies the readers name, written out apart from the gate's own lists, so a word dropped from a list
// ---- fails its fixture, and a word added to a list without a fixture fails the coverage check

/** One phrase per form the verdict reader names, and the verdict it must read (a code span first, then prose). */
export const PLANTED_VERDICT_PHRASES = [
  ['`sat`', 'violated'], ['`unsat`', 'holds'], ['`unknown`', 'unknown'],
  ['sat', 'violated'], ['unsat', 'holds'], ['unknown', 'unknown'],
  ["can't tell", 'unknown'], ['cannot tell', 'unknown'], ['cant tell', 'unknown'], ['no verdict', 'unknown'], ['undecided', 'unknown'], ['inconclusive', 'unknown'],
  ['no counterexample', 'holds'], ['no violation', 'holds'], ['no bug', 'holds'],
  ['the requirement holds', 'holds'], ['proved', 'holds'], ['proven', 'holds'], ['verified', 'holds'],
  ['counterexample', 'violated'], ['violated', 'violated'], ['it violates the rule', 'violated'], ['refuted', 'violated'], ['the check fails', 'violated'], ['broken', 'violated'],
  ['the gate fails closed', 'value'], ['one more than the balance', 'value'],
  // read whatever their case, as a learner reads them (the first only through its code span: its prose also says "fails")
  ['`Unsat`: no state fails the check', 'holds'], ['Proved', 'holds'], ['Counterexample: one state breaks it', 'violated'], ["Can't tell", 'unknown'],
];
/** The words that frame a later call as a fix (FIX_WORDS). */
export const PLANTED_FIX_WORDS = ['fix', 'fixed', 'fixes', 'fixing', 'patch', 'patched', 'patches', 'repair', 'repaired', 'repairs', 'corrected'];
/** The hedge words (HEDGE_WORDS). */
export const PLANTED_HEDGE_WORDS = ['may', 'might', 'could', 'possibly', 'perhaps', 'probably', 'likely', 'usually', 'often', 'sometimes', 'typically', 'generally', 'tends', 'tend'];
/** The words of a verdict line that say a run stopped on its budget (BUDGET_WORDS). */
export const PLANTED_BUDGET_WORDS = ['canceled', 'cancelled', 'timeout', 'timed out', 'rlimit', 'resource limit', 'budget'];

/** Every phrase the readers of verdicts and scenes read differently from what the fixtures above say. */
export function readerMismatches() {
  const wrong = [];
  for (const [text, want] of PLANTED_VERDICT_PHRASES) {
    const got = verdictOf(text);
    if (got !== want) wrong.push(`the option "${text}" reads as ${got}, expected ${want}`);
  }
  for (const w of PLANTED_FIX_WORDS) {
    const s = sceneOf({ md: `Run the same query again (${w}).`, call: {} }, 1);
    if (s.scene !== 'fix') wrong.push(`a later call framed by "${w}" reads as ${s.scene}, expected fix`);
  }
  const capitalized = sceneOf({ md: 'Fixed: run the same query again.', call: {} }, 1).scene;
  if (capitalized !== 'fix') wrong.push(`a later call framed by "Fixed", capitalized, reads as ${capitalized}, expected fix`);
  const scenes = [
    [{ md: 'Run the same query again after the fix.', call: {} }, 0, 'first-run', 'the first call of a segment, fix words or not'],
    [{ md: 'A second query on the same model.', call: {} }, 1, 'first-run', 'a later call without fix words'],
    [{ md: 'A second query on the same model.', call: { scene: 'fix' } }, 1, 'fix', 'a scene stated on the call'],
    [{ call: { scene: 'none' } }, 0, 'none', 'a call stated to open no scene'],
    [{ call: {} }, 1, 'fix', 'a later call after a fix framed in the narrative before it', ['Now fix the guard.']],
    [{ call: {} }, 0, 'first-run', 'the first call of a segment after a fix framed before it', ['Now fix the guard.']],
    [{ md: 'A second query, on `patch(x)`.', call: {} }, 1, 'first-run', 'a later call whose fix words are all in code', ['Run `fix()` first.']],
  ];
  for (const [block, before, want, what, lead] of scenes) {
    const s = sceneOf(block, before, lead).scene;
    if (s !== want) wrong.push(`${what} reads as ${s}, expected ${want}`);
  }
  return wrong;
}

/** Every way what the gate read from the planted tree differs from what its readers must make of it. */
function plantedTreeMismatches({ pages, runs, sources, notes, errors }) {
  const wrong = [...notes.map((n) => `discovery: ${n}`), ...errors.map((e) => `${e.file}, line ${e.line}: the content reader reports "${e.message}"`)];
  const ids = pages.map((p) => p.id);
  if (ids.join(' ') !== PLANTED_PAGE_IDS.join(' ')) wrong.push(`the gate found the pages ${ids.join(', ') || 'none'}, expected ${PLANTED_PAGE_IDS.join(', ')}`);
  for (const p of pages) if (p.id in PLANTED_PAGE_STAGES && p.stage !== PLANTED_PAGE_STAGES[p.id]) wrong.push(`${p.id} was read into stage ${p.stage}, expected ${PLANTED_PAGE_STAGES[p.id]}`);
  const calls = new Map(pages.flatMap((p) => p.calls).map((c) => [c.ref, c]));
  for (const [ref, want] of Object.entries(PLANTED_PAGE_CALLS)) {
    const c = calls.get(ref);
    if (!c) {
      wrong.push(`${ref} was not read as a call`);
      continue;
    }
    if (c.preInstruction !== want.pre) wrong.push(`${ref}: pre-instruction ${c.preInstruction}, expected ${want.pre}`);
    if (c.keyVerdict !== want.verdict) wrong.push(`${ref}: the key reads as ${c.keyVerdict}, expected ${want.verdict}`);
    if (want.scene !== undefined && c.scene?.scene !== want.scene) wrong.push(`${ref}: scene ${c.scene?.scene} (${c.scene?.why}), expected ${want.scene}`);
    if (want.last !== undefined && Boolean(c.lastInPage) !== want.last) wrong.push(`${ref}: last call of its page ${Boolean(c.lastInPage)}, expected ${want.last}`);
    if (want.keyRun !== undefined && c.keyRun !== want.keyRun) wrong.push(`${ref}: keyed by ${c.keyRun}, expected ${want.keyRun}`);
  }
  if (calls.size !== Object.keys(PLANTED_PAGE_CALLS).length) wrong.push(`${calls.size} calls read, expected ${Object.keys(PLANTED_PAGE_CALLS).length}`);
  const lesson = pages.find((p) => p.id === 'S9.L1');
  if (!lesson?.items.some((i) => i.ref === 'pre:S9.L1#1' && i.role === 'prequestion' && i.keys.length === 1)) wrong.push('S9.L1: the prequestion pre:S9.L1#1 was not read');
  if (lesson?.cti !== 1) wrong.push(`S9.L1: ${lesson?.cti} GEN-cti-or-bug item(s) counted, expected 1`);
  if (!lesson?.uses.some((u) => u.family === CTI_FAMILY && u.template === 't1')) wrong.push('S9.L1: the GEN-cti-or-bug item was not read as a use of the family');
  if (!runs.has(PLANTED_RUN.id)) wrong.push(`the run record ${PLANTED_RUN.id} was not loaded`);
  if (!pages.find((p) => p.id === 'D-99')?.items.some((i) => i.ref === 'item:D-99#1' && i.keys.length === 1)) wrong.push('D-99: the item item:D-99#1 was not read');
  PLANTED_MODEL_LINES.forEach((_, k) => {
    if (!sources.some((s) => s.path === plantedSourcePath(k))) wrong.push(`the generator source ${plantedSourcePath(k)} was not read`);
  });
  return [...wrong, ...readerMismatches()];
}

/**
 * The planted tree written to a scratch directory and read back by the gate's own discovery (loadPages, loadRuns and
 * generatorSources, as collect reads a repository), and every way what was read differs from what it must be.
 */
export async function readPlantedTree() {
  const root = mkdtempSync(join(tmpdir(), 'gate-items-planted-'));
  try {
    for (const [rel, text] of Object.entries(plantedTreeFiles())) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    }
    const { pages, notes, errors } = await loadPages(root);
    const runs = loadRuns(root, new Set(pages.flatMap((p) => p.calls.map((c) => c.keyRun)).filter(Boolean)));
    const sources = generatorSources(root);
    return { pages, runs, sources, wrong: plantedTreeMismatches({ pages, runs, sources, notes, errors }) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---- the vendored strategies' planted pools

const CUE_STEM = 'Which planted ledger rule guards the transfer?';
const CUE_WORDS = ['guard', 'balance', 'amount', 'state', 'query', 'model', 'bound', 'limit', 'account', 'debit', 'credit', 'hold', 'witness', 'check'];
const CUE_STEM_WORDS = ['planted', 'ledger', 'rule', 'guards', 'transfer'];
const CUE_FEATURES = ['stem', 'capital', 'acronym', 'number', 'absolute', 'reason', 'comma', 'so', 'paren', 'colon', 'semicolon'];
/** Each sample of a vendored strategy's planted pool holds exactly the number of items the strategies are judged from (CUE_MIN_ITEMS), written out. */
const CUE_POOL_ITEMS = 100;

/** One option with seeded surface features; `chance` gives each feature's percent chance in this item, so items differ in which features are rare. */
function featureText(draw, chance) {
  const has = (k) => draw.below(100) < chance[k];
  const words = Array.from({ length: 1 + draw.below(6) }, () => draw.pick(CUE_WORDS));
  if (has('stem')) words.splice(draw.below(words.length + 1), 0, draw.pick(CUE_STEM_WORDS));
  if (has('capital')) words.unshift(draw.pick(['Alice', 'The', 'Bob', 'Ledger']));
  if (has('acronym')) words.push(draw.pick(['SMT', 'TLA', 'BV64', 'ACID']));
  if (has('number')) words.push(String(draw.int(0, 9999)));
  if (has('absolute')) words.unshift(draw.pick(cues.ABSOLUTE_WORDS));
  if (has('reason')) words.push(draw.pick(['because', 'since', 'so']), draw.pick(CUE_WORDS));
  let text = words.join(' ');
  for (let k = 0; k < 2; k++) if (has('comma')) text = `${text}, ${draw.pick(CUE_WORDS)}`;
  if (has('so')) text = `${text}, so ${draw.pick(CUE_WORDS)}`;
  if (has('paren')) text = `${text} (${draw.pick(CUE_WORDS)})`;
  if (has('colon')) text = `${draw.pick(CUE_WORDS)}: ${text}`;
  if (has('semicolon')) text = `${text}; ${draw.pick(CUE_WORDS)}`;
  return text;
}

/**
 * Generated items of n options keyed by one strategy: each item is redrawn (up to 8 times) until the strategy singles
 * out one option, and keyed with the option the strategy picks most often. A healthy strategy then hits far above chance.
 */
function cueItems(s, n, label, count) {
  const draw = rng.createDraw(rng.deriveSeed(0, label));
  const items = [];
  for (let i = 0; i < count; i++) {
    let best = null;
    for (let t = 0; t < 8 && !(best && best.p >= 1); t++) {
      const chance = Object.fromEntries(CUE_FEATURES.map((k) => [k, draw.pick([10, 50, 90])]));
      const texts = [];
      while (texts.length < n) {
        const x = featureText(draw, chance);
        if (!texts.some((y) => normalized(y) === normalized(x))) texts.push(x);
      }
      const options = texts.map((text, j) => ({ id: String.fromCharCode(65 + j), text, why: 'Why.', mis: 'dp:G1' }));
      const q = cueQ({ stem: CUE_STEM, prompt: '', options, key: 0 });
      const picks = texts.map((_, k) => s.pick({ ...q, correct: [k] }));
      const p = Math.max(...picks);
      if (!best || p > best.p) best = { options, key: picks.indexOf(p), p };
    }
    const options = best.options.map((o, j) => (j === best.key ? { ...o, mis: undefined } : o));
    items.push(choiceItem({ ref: `planted:${label}:${i}`, source: 'generated', template: 't1', band: 1, stem: CUE_STEM, prompt: '', options, keys: [best.key] }));
  }
  return items;
}

/**
 * One planted case per vendored check: two samples of 100 items keyed by the strategy of that name, judged by
 * cueFindings with the gate's own strategy of that name. Some strategies cannot beat chance + 15 points on four options
 * (a uniform pick over three length ranks of four tops out at 1/3, under 1/4 + 0.15), so the pool tries 4, 2, 3 and 6
 * options, in that order, until one trips; a strategy that trips on none fails its case.
 */
export function cueCases() {
  const keyed = VENDORED_CHECKS.map((pair) => {
    const name = pair.slice('cue/'.length);
    return {
      name: `two samples keyed by the option '${name}' picks`,
      rule: 'cue',
      check: name,
      run: () => {
        const s = CUE_STRATEGIES.find((x) => x.name === name);
        if (!s) return [];
        for (const n of [4, 2, 3, 6]) {
          const pool = { id: `planted:${pair}`, generated: true, items: cueItems(s, n, `${pair}/p/${n}`, CUE_POOL_ITEMS), replicate: cueItems(s, n, `${pair}/r/${n}`, CUE_POOL_ITEMS) };
          const found = cueFindings(pool, [], [s]);
          if (found.length > 0) return found.map((f) => ({ ...f, message: `${n} options: ${f.message}` }));
        }
        return [];
      },
    };
  });
  // The odd-one-out strategies read two halves (the option alone with the flag, the option alone without it): one more
  // case per flag holds a pool that each half alone, and the strategy scoring nothing where no option stands out, keep
  // under the bar.
  const halves = cues.BINARY_FLAGS.map((flag) => {
    const name = `odd-one-out: ${flag.name}`;
    return {
      name: `two samples in which the option alone with ${flag.name} is the key in 15 of 100 items and the option alone without it in 15`,
      rule: 'cue',
      check: name,
      run: () => {
        const s = CUE_STRATEGIES.find((x) => x.name === name);
        if (!s) return [];
        const pool = { id: `planted:cue/${name}/halves`, generated: true, items: oddHalvesItems(flag, `${name}/halves/p`), replicate: oddHalvesItems(flag, `${name}/halves/r`) };
        return cueFindings(pool, [], [s]);
      },
    };
  });
  return [...keyed, ...halves];
}

/**
 * Generated items of four options for one binary flag: in 15 of every 100 the key is the only option with the flag, in
 * 15 the only option without it, and in the other 70 two options have it, which the odd-one-out strategy reads as no
 * cue (a uniform pick, 1 in 4). The strategy hits 15 + 15 + 70/4 = 47.5%, over 25% + 15 points; with either half
 * dropped it hits 36.25%, and scoring nothing where no option stands out 30%.
 */
function oddHalvesItems(flag, label) {
  const draw = rng.createDraw(rng.deriveSeed(0, label));
  const chance = Object.fromEntries(CUE_FEATURES.map((k) => [k, 50]));
  const text = (want, taken) => {
    for (let t = 0; t < 10000; t++) {
      const x = featureText(draw, chance);
      if (flag.has(plain(x)) === want && !taken.some((y) => normalized(y) === normalized(x))) return x;
    }
    throw new Error(`no option text ${want ? 'with' : 'without'} ${flag.name}`);
  };
  return Array.from({ length: CUE_POOL_ITEMS }, (_, i) => {
    const m = i % 20;
    const kind = m < 3 ? 'with' : m < 6 ? 'without' : 'none';
    const flags = draw.shuffle(kind === 'with' ? [true, false, false, false] : kind === 'without' ? [true, true, true, false] : [true, true, false, false]);
    const texts = [];
    for (const f of flags) texts.push(text(f, texts));
    const key = kind === 'with' ? flags.indexOf(true) : kind === 'without' ? flags.indexOf(false) : draw.below(4);
    const options = texts.map((t, j) => ({ id: 'ABCD'[j], text: t, why: 'Why.', mis: j === key ? undefined : 'dp:G1' }));
    return choiceItem({ ref: `planted:${label}:${i}`, source: 'generated', template: 't1', band: 1, stem: CUE_STEM, prompt: '', options, keys: [key] });
  });
}

// ---- the planted cases

/**
 * The planted cases: each names the rule and check it must trip (and, where a check is read on several pools, the pool;
 * where it must find several items, their refs), and the model that trips it, built when the case runs.
 */
export async function plantedCases(registry) {
  const cases = [];
  const add = (c) => cases.push(c);
  const reg = registry ?? { misconceptions: new Set(['dp:G1', 'dp:G5', 'dp:G6', 'dp:G8', 'dp:Z1', 'dp:Z2', 'dp:Z3', 'dp:Z5', 'dp:Z6']), generators: new Map() };
  const model = (fields) => ({ families: [], pages: [], registry: reg, ctiActive: false, sources: [], runs: new Map(), ...fields });
  const page = (id, items, extra = {}) => ({ id, file: '', stage: stageOfPage(id), tier: 'core', calls: items.filter((i) => i.call), items, uses: [], cti: 0, ...extra });
  // Boot's page: one first-contact call of three verdicts keyed `verdict` (in the middle), pre-instruction (ASSESSMENT.md section 5.1).
  const bootPage = (id, verdict) => {
    const order = VERDICTS.filter((v) => v !== verdict);
    order.splice(1, 0, verdict);
    const call = planted(`cell:${id}#1`, order.map((v) => [VERDICT_TEXT[v], VERDICT_WHY[v], VERDICT_MIS[v]]), 1, { page: id, stage: stageOfPage(id), call: true, preInstruction: true });
    call.scene = { scene: 'first-run', why: 'planted' };
    return page(id, [call], { tier: 'boot' });
  };
  const use = (family, template = 't1') => ({ family, template, role: 'segment', ref: `S9.L1/s1 segment ${family} ${template}` });
  const tf = (ref, statements) => ({ ref, source: 'authored', kind: 'multi-tf', stage: 'S9', prompt: 'Planted.', statements });
  const st = (k, truth, extra = {}) => ({ id: `s${k}`, text: `statement ${k}`, why: 'Why.', truth, ...(truth ? {} : { mis: 'dp:Z1' }), ...extra });
  const clean = [['first answer', 'Why one.', 'dp:G1'], ['other answer', 'Why two.', 'dp:G1'], ['third answer', 'Why three.', 'dp:G1']];
  // The key 34 characters against 30 and 22: 1.31 times its distractors' mean length, 1.13 times the longer one.
  const longKey = [['the guard reads the stored balance', 'It reads the balance it debits.', 'dp:G1'], ['the guard reads the old amount', 'The old amount is stale.', 'dp:G1'], ['the guard trusts input', 'Input is not the balance.', 'dp:G1']];
  const paren = [['the guard (as written)', 'One.', 'dp:G1'], ['the guard as written', 'Two.', 'dp:G1'], ['the check as written', 'Three.', 'dp:G1']];
  const PAGE = 'page:S9.L1';
  const AUTH = 'stage:S9/authored';
  const STAGE = 'stage:S9';
  const FAM = 'family:GEN-planted';
  const tree = once(readPlantedTree);
  const fixtureModule = () => mod('packages/generators/src/core/fixture/index.ts');
  // A family drawn by the gate's own sampler, as a real one is: one template, four options of one length, the key at
  // the seed's position mod 4.
  const plantedKcs = { primary: 'KC-1.violation-as-sat', secondary: [] };
  const wingFamily = {
    id: 'GEN-planted',
    engines: [],
    templates: [{ id: 't1', name: 't1', kcs: plantedKcs, bands: { 1: {}, 2: {}, 3: {} } }],
    make: (seed, band, template) => ({ family: 'GEN-planted', template, band, seed, kcs: plantedKcs, item: { stem: 'Planted.', parts: [{ kind: 'choice', id: 'main', prompt: 'Planted.', options: ['north', 'south', 'east', 'west'].map((w, j) => ({ id: 'ABCD'[j], text: `${w} wing`, why: `The ${w} wing.`, origin: j === seed % 4 ? { kind: 'reference' } : { kind: 'mutant', tag: 'dp:G1', operator: 'another wing' } })) }] } }),
  };

  // A family with one distractor that has neither a why nor a misconception key.
  const untagged = plantedFamily('GEN-planted', (d) => {
    const e = evenOptions(d);
    const j = (e.key + 1) % 4;
    e.opts[j] = [e.opts[j][0], '', undefined];
    return e;
  });
  // Generated calls keyed one verdict in 181 of 300 (60.3%), the other two in the rest.
  const verdictHeavy = (heavy) => plantedFamily(CALL_FAMILY, (d, i) => {
    const others = ['`sat`', '`unsat`', '`unknown`'].filter((t) => t !== heavy);
    const v = i < 181 ? heavy : others[i % 2];
    const opts = d.shuffle(['`sat`', '`unsat`', '`unknown`']);
    return { opts: opts.map((t) => [t, 'Why.', 'dp:Z1']), key: opts.indexOf(v) };
  });
  const satHeavy = verdictHeavy('`sat`');
  // Generated sets of four statements, `trues(i)` of them true.
  const trueSets = (trues) => plantedFamily('GEN-planted', (d, i) => ({ statements: [1, 2, 3, 4].map((k) => st(k, k <= trues(i))) }));
  // 723 of 1200 statements true (60.25%): three true in 123 sets, two in the rest.
  const mostlyTrue = trueSets((i) => (i < 123 ? 3 : 2));
  // 477 of 1200 true (39.75%): one true in 123 sets, two in the rest.
  const mostlyFalse = trueSets((i) => (i < 123 ? 1 : 2));

  // structure
  add({ name: 'a choice with one option', rule: 'structure', check: 'options', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0]], 0)])] }) });
  add({ name: 'a choice with two keyed options', rule: 'structure', check: 'key', pool: PAGE, model: model({ pages: [page('S9.L1', [{ ...planted('item:S9.L1#1', clean, 0), keys: [0, 1], key: -1 }])] }) });
  add({ name: 'a choice whose key names no option', rule: 'structure', check: 'key', pool: PAGE, model: model({ pages: [page('S9.L1', [{ ...planted('item:S9.L1#1', clean, 0), keys: [], key: -1 }])] }) });
  add({ name: 'two options that share an id', rule: 'structure', check: 'ids', pool: PAGE, model: model({ pages: [page('S9.L1', [edited(planted('item:S9.L1#1', clean, 0), 1, { id: 'A' })])] }) });
  add({ name: 'two statements that share an id', rule: 'structure', check: 'ids', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [st(1, true), st(2, false), { ...st(3, true), id: 's1' }])])] }) });
  add({ name: 'an option with no text', rule: 'structure', check: 'text', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['', 'Why two.', 'dp:G1'], clean[2]], 0)])] }) });
  add({ name: 'a true/false set of one statement', rule: 'structure', check: 'statements', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [st(1, true)])])] }) });
  add({ name: 'a page that names a pending template', rule: 'structure', check: 'pending', pool: PAGE, model: model({ families: [plantedFamily('GEN-planted', (d) => evenOptions(d), { pending: [{ template: 't2', engine: 'trace', lands: 'W3-T27' }] })], pages: [page('S9.L1', [], { uses: [use('GEN-planted', 't2')] })] }) });
  add({ name: 'a family module that does not load', rule: 'structure', check: 'module', run: () => moduleFindings([{ dir: 'planted', error: 'packages/generators/src/planted/index.ts exports no generator' }]) });
  add({ name: 'a family asked for that does not exist', rule: 'structure', check: 'module', run: () => moduleFindings([], ['GEN-absent']) });
  // The sample (ASSESSMENT.md section 7.3): a family the gate's own sampler draws from 199 seeds per template and band,
  // one short of the pool, fails; and the default sample, the command line's and the sampler's, is 200 instances per
  // template and band of both samples, written out here apart from SEEDS_PER_CELL.
  add({
    name: "a family sampled at 199 seeds per template and band, one short of the gate's pool, beside the default sample of 200",
    rule: 'structure',
    check: 'sample',
    pool: FAM,
    model: async () => model({ families: [await sampleFamily(wingFamily, {}, { seeds: 199 })] }),
    expect: async () => {
      const wrong = [];
      const seeds = parseArgs([]).seeds;
      if (seeds !== 200) wrong.push(`the command line samples ${seeds} seeds per template and band by default, not ASSESSMENT.md section 7.3's 200`);
      const fam = await sampleFamily(wingFamily, {}, {});
      if (fam.seedsPerCell !== 200) wrong.push(`the sampler records ${fam.seedsPerCell} seeds per template and band by default, not 200`);
      for (const [sample, items] of [['primary', fam.items], ['replicate', fam.replicate]]) {
        for (const band of [1, 2, 3]) {
          const n = items.filter((i) => i.template === 't1' && i.band === band).length;
          if (n !== 200) wrong.push(`the sampler draws ${n} instances of t1/b${band} in the ${sample} sample by default, not 200`);
        }
      }
      return wrong;
    },
  });

  // why-tag
  add({ name: 'an option with no why', rule: 'why-tag', check: 'why', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['other answer', '', 'dp:G1'], clean[2]], 0)])] }) });
  add({ name: 'an option whose why is only spaces', rule: 'why-tag', check: 'why', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['other answer', '   ', 'dp:G1'], clean[2]], 0)])] }) });
  add({ name: 'a generated distractor with no why', rule: 'why-tag', check: 'why', pool: FAM, model: model({ families: [untagged] }) });
  add({ name: 'one generated distractor with no why, in the replicate sample only', rule: 'why-tag', check: 'why', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i, t, sample) => {
    const e = evenOptions(d);
    if (sample === 'replicate' && i === 150) e.opts[(e.key + 1) % 4][1] = '';
    return e;
  })] }) });
  add({ name: 'a statement whose why is only spaces', rule: 'why-tag', check: 'why', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [st(1, true), st(2, false, { why: '  ' }), st(3, true)])])] }) });
  add({ name: 'a key that carries a misconception key', rule: 'why-tag', check: 'key-tag', pool: PAGE, model: model({ pages: [page('S9.L1', [edited(planted('item:S9.L1#1', clean, 0), 0, { mis: 'dp:G1' })])] }) });
  add({ name: 'a distractor with no misconception key', rule: 'why-tag', check: 'tag', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['other answer', 'Why two.', undefined], clean[2]], 0)])] }) });
  add({ name: "a distractor whose misconception key is a bare 'dp:'", rule: 'why-tag', check: 'tag', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['other answer', 'Why two.', 'dp:'], clean[2]], 0)])] }) });
  add({ name: 'a distractor whose misconception key is not a dp: key', rule: 'why-tag', check: 'tag', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['other answer', 'Why two.', 'G1'], clean[2]], 0)])] }) });
  add({ name: 'a generated distractor with no misconception key', rule: 'why-tag', check: 'tag', pool: FAM, model: model({ families: [untagged] }) });
  add({ name: 'a false statement with no misconception key', rule: 'why-tag', check: 'tag', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [st(1, true), st(2, false, { mis: undefined }), st(3, true)])])] }) });
  add({ name: 'a misconception key the registry does not hold', rule: 'why-tag', check: 'registered', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [clean[0], ['other answer', 'Why two.', 'dp:Q999'], clean[2]], 0)])] }) });
  add({ name: "a false statement's misconception key the registry does not hold", rule: 'why-tag', check: 'registered', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [st(1, true), st(2, false, { mis: 'dp:Q999' }), st(3, true)])])] }) });

  // distinct
  add({ name: 'two options that read the same', rule: 'distinct', check: 'text', pool: PAGE, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [['`sat`', 'One.', 'dp:Z1'], ['sat.', 'Two.', 'dp:Z1'], ['`unknown`', 'Three.', 'dp:Z2']], 2)])] }) });
  add({ name: 'two statements that read the same', rule: 'distinct', check: 'text', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [st(1, true), st(2, false, { text: 'Statement 1.' }), st(3, true)])])] }) });

  // length: each fixture just past the limit (1.31 against 1.3, 30.3% against 30%)
  add({ name: "a key 1.31 times its distractors' mean length and 1.13 times the longer one", rule: 'length', check: 'ratio', pool: AUTH, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', longKey, 0)])] }) });
  // Options that each name a verdict, one in six words, so the item is no verdict item: the per-item rules read it.
  add({ name: 'a long key among options that name verdicts, one of them in six words', rule: 'length', check: 'ratio', pool: AUTH, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', [['counterexample: the sender ends up negative', 'Z3 finds the state.', ''], ['proved: `unsat`', 'One state breaks it.', 'dp:Z1'], ['no verdict: `unknown`', 'Small linear queries are decided.', 'dp:Z6']], 0)])] }) });
  add({ name: 'generated keys twice their distractors', rule: 'length', check: 'ratio', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d) => {
    const e = evenOptions(d);
    e.opts[e.key][0] += ' and stair';
    return e;
  })] }) });
  add({ name: "one generated key 1.31 times its distractors' mean length, in the replicate sample only", rule: 'length', check: 'ratio', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i, t, sample) => {
    if (sample !== 'replicate' || i !== 150) return evenOptions(d);
    const texts = d.shuffle(['the guard reads the stored balance', 'the guard reads the old amount', 'the guard reads the new amount', 'the guard is wrong']);
    return { opts: texts.map((x) => [x, 'Why.', 'dp:G1']), key: texts.indexOf('the guard reads the stored balance') };
  })] }) });
  add({ name: 'a drawer page, found by discovery, whose key is 1.31 times its distractors', rule: 'length', check: 'ratio', pool: 'drawers', refs: ['item:D-99#1'], model: async () => model({ pages: (await tree()).pages }) });
  add({ name: 'a family whose key is strictly the longest in 91 of 300 items', rule: 'length', check: 'share', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i) => {
    const e = evenOptions(d, ['aaaaaaaaaa', 'bbbbbbbbbb', 'cccccccccc', 'dddddddddd']);
    const longer = i < 91 ? e.key : (e.key + 1 + d.below(3)) % 4;
    e.opts[longer][0] = `${e.opts[longer][0]}x`;
    return e;
  })] }) });
  add({ name: 'a stage whose key is strictly the longest in 4 of its 10 items', rule: 'length', check: 'share', pool: AUTH, model: model({ pages: [page('S9.L1', Array.from({ length: 10 }, (_, i) => {
    const opts = [['aaaaaaaaaa', 'One.', 'dp:G1'], ['bbbbbbbbbb', 'Two.', 'dp:G1'], ['cccccccccc', 'Three.', 'dp:G1']];
    opts[i < 4 ? 0 : 1][0] += 'x';
    return planted(`item:S9.L1#${i + 1}`, opts, 0);
  }))] }) });

  // blind
  // The key always tied for the longest with one other option: never strictly longest, still a cue.
  add({ name: 'a family whose key always ties for the longest', rule: 'blind', check: 'always-longest', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d) => {
    const e = evenOptions(d, ['aaaaaaaaa', 'bbbbbbbbb', 'ccccccccc', 'ddddddddd']);
    e.opts[e.key][0] += 'x';
    e.opts[(e.key + 1 + d.below(3)) % 4][0] += 'y';
    return e;
  })] }) });
  // The key strictly the longest in 29% of items, tied with one distractor in 20%, a distractor strictly the longest in
  // the rest: 117 of 300 at the first length rank and 81 at the second, against a bar of 90.0, while the strictly-longest
  // share (29%) and the ratio (1.07) pass.
  add({ name: 'a family whose key is often strictly the longest', rule: 'blind', check: 'always-longest', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i) => {
    const e = evenOptions(d, ['aaaaaaaaa', 'bbbbbbbbb', 'ccccccccc', 'ddddddddd']);
    const m = i % 100;
    if (m < 29) e.opts[e.key][0] += 'x';
    else if (m < 49) {
      e.opts[e.key][0] += 'x';
      e.opts[(e.key + 1) % 4][0] += 'y';
    } else e.opts[(e.key + 1 + d.below(3)) % 4][0] += 'y';
    return e;
  })] }) });
  // GEN-fixture's shipped t3 cue needs the gate's sample: it trips at 200 seeds per template and band, not at 100.
  // Its pool is judged by the blind strategies alone: the vendored ones over 3600 items would add seconds to every run.
  add({ name: "GEN-fixture with the t3 cue it shipped with, sampled as make() offers it at the gate's seeds per template and band", rule: 'blind', check: 'always-longest', pool: 'family:GEN-fixture', run: async () => strategyFindings(familyPool(await sampleFamily((await shippedCueFixture()).generator, {}, {}))) });
  add({ name: 'authored calls whose key is always the first option', rule: 'blind', check: 'always-first', pool: AUTH, model: model({ pages: [page('S9.L1', plantedCalls('S9.L1', 12, () => 0, (v) => (v === 'violated' ? 'fix' : 'first-run')))] }) });
  // 296 items of four options, the key first in 89: chance 74.0 + 2 SD 14.9 = 88.9, so 89 beats it by 0.1, and a bar of
  // 2.02 SD, or a variance 2% larger, lets it pass.
  add({ name: 'a family whose key is first in 89 of 296 items, 0.1 over chance + 2 SD', rule: 'blind', check: 'always-first', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i) => {
    const e = evenOptions(d);
    const at = i < 89 ? 0 : 1 + d.below(3);
    const [k] = e.opts.splice(e.key, 1);
    e.opts.splice(at, 0, k);
    return { opts: e.opts, key: at };
  }, { count: 296 })] }) });
  add({ name: 'authored calls whose key is always the last option', rule: 'blind', check: 'always-last', pool: AUTH, model: model({ pages: [page('S9.L1', plantedCalls('S9.L1', 12, () => 2, (v) => (v === 'violated' ? 'fix' : 'first-run')))] }) });
  // 40 three-way calls, 22 keyed unknown: the balance passes (55%), the majority verdict does not (19.3 is the bar).
  add({ name: '40 calls on which always the majority verdict (unknown) beats chance + 2 SD', rule: 'blind', check: 'majority-verdict', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(22).fill(['unknown', 'first-run']), ...Array(9).fill(['violated', 'fix']), ...Array(9).fill(['holds', 'first-run'])], 5, true)] }) });
  // The majority verdict is whichever leads: 22 of 40 keyed violated, or holds, beat the bar of 19.3 as unknown does;
  // a majority chosen among two verdicts only would pick one keyed 9 times on one of the three fixtures.
  add({ name: '40 calls on which always the majority verdict (violated) beats chance + 2 SD', rule: 'blind', check: 'majority-verdict', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(22).fill(['violated', 'fix']), ...Array(9).fill(['holds', 'first-run']), ...Array(9).fill(['unknown', 'first-run'])], 23, true)] }) });
  add({ name: '40 calls on which always the majority verdict (holds) beats chance + 2 SD', rule: 'blind', check: 'majority-verdict', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(22).fill(['holds', 'first-run']), ...Array(9).fill(['violated', 'first-run']), ...Array(9).fill(['unknown', 'first-run'])], 29, true)] }) });
  // 40 calls, 22 keyed violated after fixes: every call a surprise, the balance passes, always-reject does not.
  add({ name: '40 calls on which always-reject beats chance + 2 SD', rule: 'blind', check: 'always-reject', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(22).fill(['violated', 'fix']), ...Array(9).fill(['holds', 'first-run']), ...Array(9).fill(['unknown', 'first-run'])], 3, true)] }) });
  // 40 calls of three verdicts, 21 keyed violated, and 10 of two (holds and unknown) that offer no reject: always reject
  // picks uniformly among those, 21 + 5 = 26 against a bar of 25.1; scored as nothing there, it would get 21.
  add({ name: '50 calls on which always-reject beats chance + 2 SD only with its uniform pick on the 10 that offer no reject', rule: 'blind', check: 'always-reject', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(21).fill(['violated', 'first-run']), ...Array(10).fill(['holds', 'first-run']), ...Array(9).fill(['unknown', 'first-run']), ...Array(5).fill(['holds', 'first-run', ['holds', 'unknown']]), ...Array(5).fill(['unknown', 'first-run', ['holds', 'unknown']])], 11, true)] }) });
  // 40 calls, 22 keyed holds on first runs: balance and surprises pass, always-accept does not.
  add({ name: '40 calls on which always-accept beats chance + 2 SD', rule: 'blind', check: 'always-accept', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(22).fill(['holds', 'first-run']), ...Array(9).fill(['violated', 'first-run']), ...Array(9).fill(['unknown', 'first-run'])])] }) });
  // 40 calls of three verdicts, 21 keyed holds, and 10 of two (violated and unknown) that offer no holds: always accept
  // picks uniformly among those, 21 + 5 = 26 against a bar of 25.1; scored as nothing there, it would get 21.
  add({ name: '50 calls on which always-accept beats chance + 2 SD only with its uniform pick on the 10 that offer no holds', rule: 'blind', check: 'always-accept', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(21).fill(['holds', 'first-run']), ...Array(10).fill(['violated', 'first-run']), ...Array(9).fill(['unknown', 'first-run']), ...Array(5).fill(['violated', 'first-run', ['violated', 'unknown']]), ...Array(5).fill(['unknown', 'first-run', ['violated', 'unknown']])], 31, true)] }) });
  // 40 calls, 26 predicted by the narrative (35% surprises): the share passes, the strategy does not.
  add({ name: '40 calls on which the narrative-blind strategy beats chance + 2 SD', rule: 'blind', check: 'narrative-blind', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(13).fill(['violated', 'first-run']), ...Array(13).fill(['holds', 'fix']), ...Array(14).fill(['unknown', 'first-run'])])] }) });
  // 40 calls: on first runs 15 violated, 5 holds and 10 unknown; after a fix 6 holds and 4 violated. The strategy scores
  // 15 + 6 = 21 against a bar of 19.3; its first-run half alone (the fix scenes picked uniformly) gets 15 + 10/3 = 18.3,
  // its fix half alone 30/3 + 6 = 16. Always reject and the majority verdict (violated) get 19, last-is-sound 18.
  add({ name: '40 calls on which the narrative-blind strategy beats chance + 2 SD only with both its halves', rule: 'blind', check: 'narrative-blind', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(15).fill(['violated', 'first-run']), ...Array(5).fill(['holds', 'first-run']), ...Array(10).fill(['unknown', 'first-run']), ...Array(6).fill(['holds', 'fix']), ...Array(4).fill(['violated', 'fix'])], 19, true)] }) });
  // 20 pages of three calls, the last keyed holds and the other two one violated and one unknown: last-is-sound scores
  // 40 of 60 (bar 27.3), always accept and always reject 20 each, so neither stands in for it.
  add({ name: 'pages whose last call is keyed holds and whose other two split between violated and unknown', rule: 'blind', check: 'last-is-sound', pool: AUTH, model: model({ pages: Array.from({ length: 20 }, (_, i) => plantedCallPage(`S9.L${i + 1}`, [...(i % 2 ? [['violated', 'first-run'], ['unknown', 'first-run']] : [['unknown', 'first-run'], ['violated', 'first-run']]), ['holds', 'first-run']], i + 1)) }) });
  // 12 pages of three calls: the last calls 6 holds and 6 unknown, the other 24 are 14 violated, 4 holds and 6 unknown.
  // last-is-sound scores 6 + 14 = 20 of 36 against a bar of 17.7; with the rest picked uniformly it gets 6 + 8 = 14,
  // with the rest read as unknown 12, so its reject half has a fixture of its own (the fixture above holds its accept
  // half: with the last calls picked uniformly it gets 26.7 against 27.3). Always reject and the majority get 14.
  add({ name: 'pages whose last calls lean holds and whose other calls lean violated, each half of last-is-sound alone below the bar', rule: 'blind', check: 'last-is-sound', pool: AUTH, model: model({ pages: Array.from({ length: 12 }, (_, p) => {
    const rest = [...Array(14).fill('violated'), ...Array(4).fill('holds'), ...Array(6).fill('unknown')];
    return plantedCallPage(`S9.L${p + 1}`, [[rest[2 * p], 'first-run'], [rest[2 * p + 1], 'first-run'], [p < 6 ? 'holds' : 'unknown', 'first-run']], p + 1, true);
  }) }) });
  add({ name: 'six true/false sets with every statement true', rule: 'blind', check: 'all-true', pool: AUTH, model: model({ pages: [page('S9.L1', Array.from({ length: 6 }, (_, i) => tf(`item:S9.L1#${i + 1}`, [1, 2, 3, 4].map((k) => st(k, true)))))] }) });
  add({ name: 'six true/false sets with every statement false', rule: 'blind', check: 'all-false', pool: AUTH, model: model({ pages: [page('S9.L1', Array.from({ length: 6 }, (_, i) => tf(`item:S9.L1#${i + 1}`, [1, 2, 3, 4].map((k) => st(k, false)))))] }) });
  // A stage's pool: 12 authored calls with 7 keyed last (7.3 is their bar) and a named template with 89 of 300 keyed
  // last (90.0 is its bar). Neither part beats its own bar; the stage's pool, 96 against 94.3, does.
  add({
    name: "a stage's pool on which always-last beats chance + 2 SD, though neither its authored calls nor its named template does",
    rule: 'blind',
    check: 'always-last',
    pool: STAGE,
    model: model({
      families: [plantedFamily('GEN-planted', (d, i) => {
        const e = evenOptions(d);
        const at = i < 89 ? 3 : d.below(3);
        const [k] = e.opts.splice(e.key, 1);
        e.opts.splice(at, 0, k);
        return { opts: e.opts, key: at };
      })],
      pages: [page('S9.L1', plantedCalls('S9.L1', 12, (i) => (i < 7 ? 2 : i % 2)), { uses: [use('GEN-planted')] })],
    }),
  });
  add({ name: 'drawer items whose key is always the first option', rule: 'blind', check: 'always-first', pool: 'drawers', model: model({ pages: [page('D-99', Array.from({ length: 12 }, (_, i) => planted(`item:D-99#${i + 1}`, clean, 0)))] }) });
  // 41 three-way calls, 20 keyed violated: 20 against a bar of 19.70. Boot's call, keyed holds, is pre-instruction and
  // outside the strategies; counted, it would lift the bar to 20.11.
  add({ name: "41 calls on which always-reject beats chance + 2 SD by 0.3, beside Boot's first-contact call", rule: 'blind', check: 'always-reject', pool: AUTH, model: model({ pages: [bootPage('S9.L0', 'holds'), plantedCallPage('S9.L1', [...Array(20).fill(['violated', 'first-run']), ...Array(11).fill(['holds', 'first-run']), ...Array(10).fill(['unknown', 'first-run'])], 17, true)] }) });

  // convergence: one-edit mutants around the key make the key share the most tokens with every other option.
  add({ name: 'one-edit mutants that make the key the centroid', rule: 'convergence', check: 'centroid', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d) => {
    const words = ['alpha', 'beta', 'gamma', 'delta'];
    const keyText = words.join(' ');
    const mutants = words.slice(0, 3).map((w, j) => words.map((x, k) => (k === j ? `${x}q` : k === (j + 1) % 4 ? `${x}z` : x)).join(' '));
    const opts = d.shuffle([keyText, ...mutants]);
    return { opts: opts.map((t) => [t, 'Why.', 'dp:G1']), key: opts.indexOf(keyText) };
  })] }) });
  // One-edit mutants of a formula, ASSESSMENT.md section 7.2's case as GEN-negate-it serves it: each distractor flips one
  // comparison of a three-part conjunction, so the options share every word and number, and every option has the same
  // length; the key is the centroid through its comparison symbols alone (125.3 of 300 against a bar of 90.0).
  add({ name: 'one-edit mutants of a formula, each flipping one comparison, that make the key the centroid through its symbols alone', rule: 'convergence', check: 'centroid', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d) => {
    const FLIP = { '<': '≥', '≤': '>', '>': '≤', '≥': '<' };
    const atoms = ['a', 'x', 'y'].map((v) => ({ v, op: d.pick(['<', '≤', '>', '≥']), c: d.int(-4, 4) }));
    const render = (as) => as.map((a) => `${a.v} ${a.op} ${a.c}`).join(' ∧ ');
    const keyText = render(atoms);
    const opts = d.shuffle([keyText, ...atoms.map((_, j) => render(atoms.map((a, k) => (k === j ? { ...a, op: FLIP[a.op] } : a))))]);
    return { opts: opts.map((t) => [`\`${t}\``, 'Why.', 'dp:G5']), key: opts.indexOf(keyText) };
  })] }) });

  // absolutes
  add({ name: 'absolute keys among hedged distractors', rule: 'absolutes', check: 'absolute-option', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d) => {
    const opts = d.shuffle(['the guard always rejects it', 'the guard may reject it', 'the guard might reject it', 'the guard could reject it']);
    return { opts: opts.map((t) => [t, 'Why.', 'dp:G6']), key: opts.indexOf('the guard always rejects it') };
  })] }) });
  // The absolute option the key in 66 items and a distractor in 134; 100 items offer none, where the pick is uniform:
  // 66 + 25 = 91 against a bar of 90.0, and 66 if an item without the feature scored nothing.
  add({ name: 'absolute keys in 66 of 300 items, absolute distractors in 134, and 100 items with no absolute option', rule: 'absolutes', check: 'absolute-option', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i) => {
    const plain4 = ['the guard rejects it at once', 'the guard rejects it on retry', 'the guard rejects it in turn', 'the guard rejects it later'];
    const texts = d.shuffle(i < 200 ? ['the guard always rejects it', ...plain4.slice(0, 3)] : plain4);
    const absolute = texts.indexOf('the guard always rejects it');
    const key = i < 66 ? absolute : i < 200 ? (absolute + 1 + d.below(3)) % 4 : d.below(4);
    return { opts: texts.map((t) => [t, 'Why.', 'dp:G6']), key };
  })] }) });
  // One family per hedge word, its key hedged by that word alone among absolute distractors, judged by the strategies.
  for (const w of PLANTED_HEDGE_WORDS) {
    add({ name: `hedged keys ("${w}") among absolute distractors`, rule: 'absolutes', check: 'hedged-option', pool: FAM, run: () => strategyFindings(familyPool(plantedFamily('GEN-planted', (d) => {
      const key = `the guard ${w} reject it`;
      const opts = d.shuffle([key, 'the guard always rejects it', 'the guard never rejects it', 'the guard only rejects it']);
      return { opts: opts.map((t) => [t, 'Why.', 'dp:G6']), key: opts.indexOf(key) };
    }))) });
  }
  // A hedge word is read whatever its case: an option may open with it.
  add({ name: 'hedged keys ("Perhaps", capitalized) among absolute distractors', rule: 'absolutes', check: 'hedged-option', pool: FAM, run: () => strategyFindings(familyPool(plantedFamily('GEN-planted', (d) => {
    const key = 'Perhaps the guard rejects it';
    const opts = d.shuffle([key, 'The guard always rejects it', 'The guard never rejects it', 'The guard only rejects it']);
    return { opts: opts.map((t) => [t, 'Why.', 'dp:G6']), key: opts.indexOf(key) };
  }))) });

  // calls: each fixture just past its limit (29.7% surprises against 30%, 60.8% and 60.3% against 60%)
  // 37 calls: 24 the narrative predicts, 11 surprises (29.7%) and 2 keyed by amounts, which are no surprise; the
  // balance passes (holds 17 of 37).
  add({ name: 'a stage whose calls hold 11 genuine surprises in 37 (29.7%), two keyed by amounts', rule: 'calls', check: 'surprises', pool: AUTH, model: model({ pages: [page('S9.L1', [...plantedCallPage('S9.L1', [...Array(12).fill(['violated', 'first-run']), ...Array(12).fill(['holds', 'fix']), ...Array(6).fill(['unknown', 'first-run']), ...Array(5).fill(['holds', 'first-run'])], 13).items, valueCall('cell:S9.L1#36', 'S9.L1'), valueCall('cell:S9.L1#37', 'S9.L1')])] }) });
  // 31 of 51 calls keyed holds, and Boot's first-contact call keyed violated, which is pre-instruction: counted, it would
  // bring holds to 31 of 52 (59.6%).
  add({ name: "a stage whose calls are 31 of 51 holds (60.8%), beside Boot's first-contact call", rule: 'calls', check: 'balance', pool: AUTH, model: model({ pages: [bootPage('S9.L0', 'violated'), plantedCallPage('S9.L1', [...Array(31).fill(['holds', 'first-run']), ...Array(10).fill(['violated', 'first-run']), ...Array(10).fill(['unknown', 'first-run'])])] }) });
  add({ name: 'generated calls keyed sat in 181 of 300 (60.3%), in a template no page names', rule: 'calls', check: 'generated-balance', pool: `family:${CALL_FAMILY}`, model: model({ families: [satHeavy] }) });
  add({ name: 'generated calls keyed sat in 181 of 300 (60.3%), in a template a stage names', rule: 'calls', check: 'generated-balance', pool: STAGE, model: model({ families: [satHeavy], pages: [page('S9.L1', [], { uses: [use(CALL_FAMILY)] })] }) });
  // Each verdict counts in the balance, authored and generated: 7 of 11 calls keyed unknown (four of the calls offer
  // only holds and unknown) or violated, and 181 of 300 generated calls keyed unsat or unknown.
  add({ name: 'a stage whose 11 calls are 7 unknown (63.6%), four of the calls two-way', rule: 'calls', check: 'balance', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(4).fill(['unknown', 'first-run']), ['violated', 'first-run'], ['holds', 'first-run'], ...Array(3).fill(['unknown', 'first-run', ['holds', 'unknown']]), ['holds', 'first-run', ['holds', 'unknown']], ['violated', 'first-run']], 19, true)] }) });
  add({ name: 'a stage whose 11 calls are 7 violated (63.6%)', rule: 'calls', check: 'balance', pool: AUTH, model: model({ pages: [plantedCallPage('S9.L1', [...Array(7).fill(['violated', 'fix']), ...Array(2).fill(['holds', 'first-run']), ...Array(2).fill(['unknown', 'first-run'])], 37, true)] }) });
  add({ name: 'generated calls keyed unsat in 181 of 300 (60.3%)', rule: 'calls', check: 'generated-balance', pool: `family:${CALL_FAMILY}`, model: model({ families: [verdictHeavy('`unsat`')] }) });
  add({ name: 'generated calls keyed unknown in 181 of 300 (60.3%)', rule: 'calls', check: 'generated-balance', pool: `family:${CALL_FAMILY}`, model: model({ families: [verdictHeavy('`unknown`')] }) });
  // The call rules apply from a stage's first call: one call, keyed as the narrative predicts, is no surprise and one verdict.
  const oneCall = model({ pages: [plantedCallPage('S9.L1', [['violated', 'first-run']])] });
  add({ name: 'a stage of one call, which the narrative predicts', rule: 'calls', check: 'surprises', pool: AUTH, model: oneCall });
  add({ name: 'a stage of one call, so one verdict keys every call', rule: 'calls', check: 'balance', pool: AUTH, model: oneCall });

  // multi-tf: the shares just past the range (60.25% and 39.75% against 40% to 60%), the authored share from exactly
  // the 10 statements it is read from
  add({ name: 'a true/false set with every statement true', rule: 'multi-tf', check: 'count', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [1, 2, 3, 4].map((k) => st(k, true)))])] }) });
  add({ name: 'a true/false set with every statement false', rule: 'multi-tf', check: 'count', pool: PAGE, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [1, 2, 3, 4].map((k) => st(k, false)))])] }) });
  add({ name: 'generated sets with every statement true', rule: 'multi-tf', check: 'count', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', () => ({ statements: [1, 2, 3, 4].map((k) => st(k, true)) }))] }) });
  add({ name: 'generated sets 60.25% true, in a template no page names', rule: 'multi-tf', check: 'share', pool: FAM, model: model({ families: [mostlyTrue] }) });
  add({ name: 'generated sets 60.25% true, in a template a stage names', rule: 'multi-tf', check: 'share', pool: STAGE, model: model({ families: [mostlyTrue], pages: [page('S9.L1', [], { uses: [use('GEN-planted')] })] }) });
  add({ name: 'generated sets 39.75% true, in a template no page names', rule: 'multi-tf', check: 'share', pool: FAM, model: model({ families: [mostlyFalse] }) });
  add({ name: "a stage's authored sets 70% true (10 statements)", rule: 'multi-tf', check: 'share', pool: AUTH, model: model({ pages: [page('S9.L1', [tf('item:S9.L1#1', [1, 2, 3, 4, 5].map((k) => st(k, k <= 4))), tf('item:S9.L1#2', [1, 2, 3, 4, 5].map((k) => st(k, k <= 3)))])] }) });

  // A family shaped like GEN-call-it (ASSESSMENT.md section 4.12), drawn by the gate's own sampleFamily and read by
  // itemsOfInstance, as every family is: t1 three-way calls keyed sat on 61 of every 100 seeds (61% of the calls), t4
  // true/false sets of four statements, three true on 41 of every 100 seeds and two on the rest (60.25% true). Seed 7
  // also gives a distractor and a statement no why, seed 8 a distractor and a false statement no misconception key, so
  // each field the reader takes from a generated option or statement has a fixture.
  const callKcs = { primary: 'KC-1.three-answers', secondary: [] };
  const callItShaped = {
    id: CALL_FAMILY,
    engines: [],
    misconceptions: ['dp:Z1', 'dp:Z2', 'dp:G1'],
    templates: ['t1', 't4'].map((id) => ({ id, name: id, kcs: callKcs, bands: { 1: {}, 2: {}, 3: {} } })),
    make: (seed, band, template) => {
      const base = { family: CALL_FAMILY, template, band, seed, kcs: callKcs };
      if (template === 't1') {
        const v = seed % 100 < 61 ? 0 : 1 + (seed % 2);
        const order = [0, 1, 2].map((k) => (k + seed) % 3);
        const flawed = order.find((k) => k !== v);
        const options = order.map((k, j) => ({
          id: 'ABC'[j],
          text: VERDICT_TEXT[VERDICTS[k]],
          why: seed === 7 && k === flawed ? '' : VERDICT_WHY[VERDICTS[k]],
          origin: k === v ? { kind: 'reference' } : { kind: 'mutant', operator: 'another verdict', ...(seed === 8 && k === flawed ? {} : { tag: VERDICT_MIS[VERDICTS[k]] }) },
        }));
        return { ...base, item: { stem: 'Planted.', parts: [{ kind: 'choice', id: 'main', prompt: 'What will Z3 return?', options }] } };
      }
      const trues = seed % 100 < 41 ? 3 : 2;
      const statements = [1, 2, 3, 4].map((k) => ({
        id: `s${k}`,
        text: `statement ${k}`,
        why: seed === 7 && k === 4 ? '' : 'Why.',
        origin: k <= trues ? { kind: 'reference' } : { kind: 'mutant', operator: 'drop a hypothesis', ...(seed === 8 && k === 4 ? {} : { tag: 'dp:G1' }) },
      }));
      return { ...base, item: { stem: 'Planted.', parts: [{ kind: 'multi-tf', id: 'main', prompt: 'Which statements hold?', statements }] } };
    },
  };
  const callItSampled = once(() => sampleFamily(callItShaped, {}, { seedLists: { primary: Array.from({ length: 100 }, (_, i) => i), replicate: Array.from({ length: 100 }, (_, i) => 1000 + i) } }));
  const callItModel = async (pages = []) => model({ families: [await callItSampled()], pages });
  const callItNamed = () => callItModel([page('S9.L1', [], { uses: [use(CALL_FAMILY, 't1'), use(CALL_FAMILY, 't4')] })]);
  const callRef = (t, seed) => `gen:${CALL_FAMILY}:${t}:b1:${core.formatSeed(seed)}#main`;
  add({ name: 'GEN-call-it-shaped instances read by the gate: three-way calls keyed sat in 61%', rule: 'calls', check: 'generated-balance', pool: `family:${CALL_FAMILY}`, model: () => callItModel() });
  add({ name: 'GEN-call-it-shaped instances read by the gate: true/false sets 60.25% true', rule: 'multi-tf', check: 'share', pool: `family:${CALL_FAMILY}`, model: () => callItModel() });
  add({ name: 'GEN-call-it-shaped instances read by the gate, three-way calls keyed sat in 61%, in a template a stage names', rule: 'calls', check: 'generated-balance', pool: STAGE, model: callItNamed });
  add({ name: 'GEN-call-it-shaped instances read by the gate, true/false sets 60.25% true, in a template a stage names', rule: 'multi-tf', check: 'share', pool: STAGE, model: callItNamed });
  add({ name: 'GEN-call-it-shaped instances read by the gate: a distractor and a statement with no why', rule: 'why-tag', check: 'why', pool: `family:${CALL_FAMILY}`, refs: [callRef('t1', 7), callRef('t4', 7)], model: () => callItModel() });
  add({ name: 'GEN-call-it-shaped instances read by the gate: a distractor and a false statement with no misconception key', rule: 'why-tag', check: 'tag', pool: `family:${CALL_FAMILY}`, refs: [callRef('t1', 8), callRef('t4', 8)], model: () => callItModel() });

  // cti
  add({ name: 'three CTI items across S4 to S9', rule: 'cti', check: 'dose', pool: 'S4-S9', model: model({ ctiActive: true, pages: [page('S4.L5', [], { cti: 2 }), page('S5.L4', [], { cti: 1 })] }) });
  // Only S4 to S9 count: four CTI items in S3 and S10 leave the dose at the one in S4.
  add({ name: 'one CTI item across S4 to S9, beside four in S3 and S10', rule: 'cti', check: 'dose', pool: 'S4-S9', model: model({ ctiActive: true, pages: [page('S3.L4', [], { cti: 2 }), page('S4.L5', [], { cti: 1 }), page('S10.L1', [], { cti: 2 })] }) });
  // The dose turns on once GEN-cti-or-bug exists, as a module or a family that loaded, before any page names it.
  add({ name: "GEN-cti-or-bug's module present, no page naming it yet", rule: 'cti', check: 'dose', pool: 'S4-S9', run: () => ctiFindings([], ctiActiveOf([], [], true)) });
  add({ name: 'GEN-cti-or-bug loaded as a family, no page naming it yet', rule: 'cti', check: 'dose', pool: 'S4-S9', run: () => ctiFindings([], ctiActiveOf([], [CTI_FAMILY], false)) });

  // bound: a bounded key on an instance that prints no bound, or a bound with no number in it, GEN-fixture sampled for real.
  const boundedFixture = async (boundOf) => {
    const fx = await fixtureModule();
    const base = fx.generator;
    const gen = {
      ...base,
      make: (s, b, t) => {
        const { bound, ...rest } = base.make(s, b, t);
        const printed = boundOf(bound);
        return printed === undefined ? rest : { ...rest, bound: printed };
      },
      // the key still rests on the box, and says so
      key: async (inst, port) => {
        const k = await base.key(inst, port);
        return core.isDiscard(k) ? k : { ...k, bound: 'the box: every state of 4 variables from -6 to 6' };
      },
    };
    const seeds = { primary: sampleSeeds('GATE-items/planted-bound', 4), replicate: sampleSeeds('GATE-items/planted-bound-r', 4) };
    return model({ families: [await sampleFamily(gen, fx.ports, { seedLists: seeds })], registry });
  };
  add({ name: 'a bounded key on an instance that prints no bound', rule: 'bound', check: 'generated', pool: 'family:GEN-fixture', model: () => boundedFixture(() => undefined) });
  add({ name: 'a bounded key on an instance whose bound states no number', rule: 'bound', check: 'generated', pool: 'family:GEN-fixture', model: () => boundedFixture(() => 'within the box') });
  {
    // One call per budget-stop word, each keyed by a run whose verdict line names that word alone, and one more whose
    // verdict line writes it capitalized, as a line may begin with it.
    const words = [...PLANTED_BUDGET_WORDS, 'Timed out'];
    const calls = words.map((w, k) => {
      const call = planted(`cell:S9.L1#${k + 1}`, [['proved: `unsat`', 'Not within the budget.', 'dp:Z6'], ['no verdict: `unknown`', `The run reports "${w}".`]], 1, { page: 'S9.L1', stage: 'S9', call: true });
      call.scene = { scene: 'first-run', why: 'planted' };
      call.cellText = 'x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z';
      call.keyRun = `RUN-planted-budget-${k + 1}`;
      return call;
    });
    const runs = new Map(words.map((w, k) => [`RUN-planted-budget-${k + 1}`, { budget: { rlimit: 5000000 }, verdict_lines: [`query unknown ${w}`] }]));
    // And one whose stop shows only in a configuration's verdict lines, as a record of several configurations has it.
    const inConfig = planted(`cell:S9.L1#${words.length + 1}`, [['proved: `unsat`', 'Not within the budget.', 'dp:Z6'], ['no verdict: `unknown`', 'The Pyodide configuration reports "canceled".']], 1, { page: 'S9.L1', stage: 'S9', call: true });
    inConfig.scene = { scene: 'first-run', why: 'planted' };
    inConfig.cellText = 'x > 2, y > 2, z > 2, x*x*x + y*y*y == z*z*z';
    inConfig.keyRun = 'RUN-planted-budget-config';
    calls.push(inConfig);
    runs.set('RUN-planted-budget-config', { budget: { rlimit: 5000000 }, verdict_lines: ['native: query decided in 0.2 s'], configs: [{ id: 'pyodide', budget: { rlimit: 5000000 }, verdict_lines: ['pyodide: query unknown canceled'] }] });
    add({ name: "calls keyed by runs that stopped on their budget, one per budget-stop word, one capitalized and one in a configuration's verdict lines, that state no budget", rule: 'bound', check: 'authored', pool: AUTH, refs: calls.map((c) => c.ref), model: model({ pages: [page('S9.L1', calls)], runs }) });
  }
  {
    // A cell may print its budget through its key run's own values; another run's values print nothing of this one's.
    const call = planted('cell:S9.L1#1', [['proved: `unsat`', 'Not within the budget.', 'dp:Z6'], ['no verdict: `unknown`', 'The run reports "canceled".']], 1, { page: 'S9.L1', stage: 'S9', call: true });
    call.scene = { scene: 'first-run', why: 'planted' };
    call.cellText = 'The other query ran with {{run:RUN-planted-other#values.rlimit}} steps.';
    call.keyRun = 'RUN-planted-budget-key';
    const runs = new Map([['RUN-planted-budget-key', { budget: { rlimit: 5000000 }, verdict_lines: ['query unknown canceled'] }]]);
    add({ name: "a call keyed by a run that stopped on its budget, whose cell cites another run's values and no budget of its own", rule: 'bound', check: 'authored', pool: AUTH, refs: [call.ref], model: model({ pages: [page('S9.L1', [call])], runs }) });
  }
  add({ name: "lesson calls keyed by a run that stopped on its budget, through the cell's recorded run and through the call's run, that state no budget, all found by discovery", rule: 'bound', check: 'authored', pool: AUTH, refs: ['cell:S9.L2#1', 'cell:S9.L2#2'], model: async () => {
    const t = await tree();
    return model({ pages: t.pages, runs: t.runs });
  } });

  // runtime-model: one generator source per marker and alternative, found by the gate's own walk of the sources.
  PLANTED_MODEL_LINES.forEach(([what], k) => {
    add({ name: `a generator source that names ${what}`, rule: 'runtime-model', check: 'source', pool: 'generators', model: async () => model({ sources: (await tree()).sources.filter((s) => s.path === plantedSourcePath(k)) }) });
  });

  // cue
  // One option in every item carries a colon, the key in 121 of 300: 40.3%, just past chance (25%) + 15 points.
  add({ name: 'a family whose key carries the one colon in 121 of 300 items, just past chance + 15 points', rule: 'cue', check: 'has-colon', pool: FAM, model: model({ families: [plantedFamily('GEN-planted', (d, i) => {
    const e = evenOptions(d, ['alpha one', 'bravo two', 'charl tri', 'delta for']);
    const marked = i < 121 ? e.key : (e.key + 1 + d.below(3)) % 4;
    e.opts[marked][0] = e.opts[marked][0].replace(' ', ': ').slice(0, 14);
    return e;
  })] }) });
  // t2's key carries the colon in half its items and a distractor in the other half (50%, over 25% + 15 points); t1 has
  // none (25%), so the family's rate, 37.5%, stays under the bar and only t2's own pool shows the cue.
  add({ name: "one template whose key carries a colon at a cue-level rate its family's rate hides", rule: 'cue', check: 'has-colon', pool: `${FAM}/t2`, model: model({ families: [plantedFamily('GEN-planted', (d, i, t) => {
    const e = evenOptions(d, ['alpha one', 'bravo two', 'charl tri', 'delta for']);
    if (t === 't2') {
      const marked = i % 2 === 0 ? e.key : (e.key + 1 + d.below(3)) % 4;
      e.opts[marked][0] = e.opts[marked][0].replace(' ', ': ').slice(0, 14);
    }
    return e;
  }, { live: ['t1', 't2'] })] }) });
  add({ name: 'an authored key that is the only option with a parenthetical', rule: 'cue', check: 'odd-one-out', pool: AUTH, model: model({ pages: [page('S9.L1', [planted('item:S9.L1#1', paren, 0)])] }) });
  add({ name: 'a drawer key that is the only option with a parenthetical', rule: 'cue', check: 'odd-one-out', pool: 'drawers', model: model({ pages: [page('D-99', [planted('item:D-99#1', paren, 0)])] }) });
  // An authored call is an authored item too, and the other half of the lint: its key the only option without a colon.
  add({ name: 'an authored call whose key is the only option without a colon', rule: 'cue', check: 'odd-one-out', pool: AUTH, refs: ['cell:S9.L1#1'], model: model({ pages: [page('S9.L1', [planted('cell:S9.L1#1', [['counterexample', 'Z3 finds the state.', ''], ['proved: `unsat`', 'One state breaks it.', 'dp:Z1'], ['no verdict: `unknown`', 'Small linear queries are decided.', 'dp:Z6']], 0, { page: 'S9.L1', stage: 'S9', call: true })])] }) });

  // The page reader: the planted tree's pages through the gate's discovery and the content build's reader.
  add({ name: 'lesson pages in the content format, found by discovery, whose calls the narrative predicts once each scene is read right', rule: 'calls', check: 'surprises', pool: AUTH, model: async () => model({ pages: (await tree()).pages }), expect: async () => (await tree()).wrong });
  add({ name: 'a lesson page that names GEN-cti-or-bug, which turns the CTI dose on', rule: 'cti', check: 'dose', pool: 'S4-S9', model: async () => {
    const { pages } = await tree();
    return model({ pages, ctiActive: ctiActiveOf(pages) });
  }, expect: async () => (await tree()).wrong });
  return cases;
}

/** The clean controls: a cue-free generator pool (GEN-fixture with its t3 cue removed) and a balanced stage of calls. */
export async function cleanControls(registry, opts = {}) {
  const even = await evenFixture();
  const family = await sampleFamily(even.generator, even.ports, { seeds: opts.seeds });
  // S1's eleven calls as curriculum/S01-counterexample.md section 2.7 tallies them: 7 surprises, 45% holds at most.
  const scenes = [['holds', 'first-run'], ['unknown', 'first-run'], ['unknown', 'first-run'], ['violated', 'first-run'], ['holds', 'first-run'], ['holds', 'first-run'], ['holds', 'first-run'], ['violated', 'first-run'], ['holds', 'first-run'], ['violated', 'first-run'], ['unknown', 'first-run']];
  const callPage = plantedCallPage('S9.L1', scenes, 7, true);
  return [{ name: 'a generator fixture pool without the t3 length cue, and a balanced stage of calls', model: { families: [family], pages: [callPage], registry, ctiActive: false, sources: [], runs: new Map() } }];
}

/**
 * One planted case: it must trip its own rule and check (on its pool, when it names one; for each of its refs, when it
 * names them), and its expectations must hold.
 */
export async function runCase(c) {
  const pair = `${c.rule}/${c.check}`;
  const row = { name: c.name, rule: c.rule, check: c.check, ...(c.pool ? { pool: c.pool } : {}) };
  if (!CHECK_SET.has(pair)) return { ...row, pass: false, detail: `${pair} is not one of CHECKS` };
  let findings;
  let wrong;
  try {
    findings = c.run ? await c.run() : checkModel(typeof c.model === 'function' ? await c.model() : c.model).findings;
    wrong = c.expect ? await c.expect() : [];
  } catch (e) {
    return { ...row, pass: false, detail: `the case threw: ${e instanceof Error ? e.message : String(e)}` };
  }
  const hits = findings.filter((f) => f.rule === c.rule && f.check === c.check && (c.pool === undefined || f.pool === c.pool));
  if (hits.length === 0) {
    const seen = findings.map((f) => `${f.rule}/${f.check} on ${f.pool}`);
    return { ...row, pass: false, detail: `no ${pair} finding${c.pool ? ` on ${c.pool}` : ''} (${seen.slice(0, 12).join(', ') || 'no findings'}${seen.length > 12 ? ', ...' : ''})` };
  }
  const missing = (c.refs ?? []).filter((ref) => !hits.some((f) => f.ref === ref));
  if (missing.length > 0) return { ...row, pass: false, detail: `no ${pair} finding for ${missing.join(', ')} (found for ${hits.map((f) => f.ref ?? 'no ref').join(', ')})` };
  if (wrong.length > 0) return { ...row, pass: false, detail: wrong.join('; ') };
  const hit = hits[0];
  return { ...row, pass: true, detail: `${c.pool ? `${c.pool}: ` : ''}${hits.length > 1 && c.refs ? `${hits.length} findings, the first: ` : ''}${hit.message}` };
}

/**
 * Every pair of CHECKS (or of `wanted`) has a planted case that held, every strategy the gate runs is one of CHECKS, and
 * every word of a vocabulary the gate reads (and every model marker) has a planted fixture.
 */
export function coverage(results, wanted = null) {
  const out = [];
  const held = new Set(results.filter((r) => r.pass && r.check !== 'clean').map((r) => `${r.rule}/${r.check}`));
  const row = (pair, detail) => ({ name: `a planted fixture for ${pair}`, rule: pair.slice(0, pair.indexOf('/')), check: pair.slice(pair.indexOf('/') + 1), pass: false, detail });
  const want = (pair) => !wanted || wanted.has(pair);
  for (const pair of CHECKS) if (want(pair) && !held.has(pair)) out.push(row(pair, 'no planted fixture tripped this check'));
  for (const s of STRATEGIES) if (!CHECK_SET.has(`${s.rule}/${s.id}`)) out.push(row(`${s.rule}/${s.id}`, 'the gate runs this strategy, but it is not one of CHECKS'));
  for (const s of CUE_STRATEGIES) if (!CHECK_SET.has(`cue/${s.name}`)) out.push(row(`cue/${s.name}`, 'the gate runs this strategy, but it is not one of CHECKS'));
  const vocabularies = [
    ['absolutes/hedged-option', 'hedge word', HEDGE_WORDS, PLANTED_HEDGE_WORDS],
    ['calls/surprises', 'fix word', FIX_WORDS, PLANTED_FIX_WORDS],
    ['bound/authored', 'budget-stop word', BUDGET_WORDS, PLANTED_BUDGET_WORDS],
  ];
  for (const [pair, what, words, plantedWords] of vocabularies) {
    if (!want(pair)) continue;
    for (const w of words) if (!plantedWords.includes(w)) out.push(row(pair, `the ${what} "${w}" has no planted fixture`));
  }
  if (want('runtime-model/source')) for (const re of MODEL_MARKERS) if (!PLANTED_MODEL_LINES.some(([, line]) => re.test(line))) out.push(row('runtime-model/source', `the model marker ${re} has no planted line`));
  return out;
}

/**
 * Run every planted case and the clean controls: each case must trip its own check, each control nothing, and every pair
 * of CHECKS must be tripped by a case. `pairs` runs only the cases of those rule/check pairs and `controls: false` skips
 * the controls, so a test can weaken one lint and watch its own cases fail.
 */
export async function selfCheck(registry, opts = {}) {
  const wanted = opts.pairs ? new Set(opts.pairs) : null;
  const results = [];
  for (const c of [...(await plantedCases(registry)), ...cueCases()]) if (!wanted || wanted.has(`${c.rule}/${c.check}`)) results.push(await runCase(c));
  if (opts.controls !== false && !wanted) {
    for (const c of await cleanControls(registry, opts)) {
      const r = checkModel(c.model);
      results.push({ name: c.name, rule: '-', check: 'clean', pass: r.findings.length === 0, detail: r.findings.length === 0 ? 'no findings' : r.findings.map((f) => `${f.rule}/${f.check}: ${f.message}`).join('; ') });
    }
  }
  results.push(...coverage(results, wanted));
  return results;
}

// ------------------------------------------------------------------ report

function summarize(model, result) {
  const fams = model.families;
  const instances = fams.reduce((n, f) => n + f.items.length, 0);
  const rep = fams.reduce((n, f) => n + (f.replicate?.length ?? 0), 0);
  const authored = model.pages.reduce((n, p) => n + p.items.length, 0);
  const calls = model.pages.reduce((n, p) => n + p.calls.length, 0);
  const stages = [...new Set(model.pages.map((p) => p.stage).filter(Boolean))];
  return `${fams.length} famil${fams.length === 1 ? 'y' : 'ies'} (${fams.filter((f) => f.fixture).length} fixture), ${instances} sampled items and ${rep} replicate; ${model.pages.length} page(s), ${authored} authored item(s), ${calls} call(s); stages ${stages.join(', ') || 'none'}; ${result.findings.length} finding(s)`;
}

export function formatReport(model, result, planted, verbose = false) {
  const lines = [`GATE-items: ${summarize(model, result)}`];
  for (const f of model.families) {
    const own = result.findings.filter((x) => x.pool === `family:${f.id}`).length;
    const waiting = f.pending.map((p) => `${p.template} until ${p.lands}`).join(', ');
    const drawn = f.seedsPerCell !== undefined ? ` from ${f.seedsPerCell} seeds per template and band` : '';
    lines.push(`  ${own === 0 ? 'ok  ' : 'FAIL'}  ${f.id}${f.fixture ? ' (fixture)' : ''}  ${f.items.length} items + ${f.replicate.length} replicate${drawn}, ${f.mode === 'served' ? 'served by its own engine' : 'as make() offers them'}; live ${f.live.join(', ')}${waiting ? `; pending: ${waiting}` : ''}`);
    if (verbose) for (const n of f.notes) lines.push(`        note: ${n}`);
  }
  for (const p of result.pools.filter((x) => x.kind !== 'family')) {
    const own = result.findings.filter((x) => x.pool === p.id).length;
    const extra = p.calls !== undefined ? `, ${p.calls} call(s), ${p.surprises} genuine surprise(s)` : p.templates ? `, templates ${p.templates.join(', ')}` : '';
    lines.push(`  ${own === 0 ? 'ok  ' : 'FAIL'}  ${p.id}  ${p.n} item(s)${p.replicate ? ` + ${p.replicate} replicate` : ''}${extra}`);
  }
  if (model.ctiActive === false) lines.push('  ----  CTI dose: inactive until GEN-cti-or-bug ships (W3) or a page names it');
  if (verbose) {
    for (const r of result.rows.filter((x) => x.strategy)) {
      lines.push(`        ${r.pool}  ${r.strategy}${r.choice ? ` (${r.choice})` : ''}: ${barText(r.primary)}${r.replicate ? `; replicate ${barText(r.replicate)}` : ''}${r.fail ? '  FAIL' : ''}`);
    }
    for (const p of model.pages) {
      for (const c of p.calls) {
        lines.push(`        ${c.ref}  key ${c.key >= 0 ? c.options[c.key].id : '-'} (${c.keyVerdict})  scene ${c.scene?.scene ?? '-'} (${c.scene?.why ?? '-'})${c.preInstruction ? '  pre-instruction, outside the call rules' : isSurprise(c) ? '  genuine surprise' : ''}${c.surprise ? `  forecast ${c.surprise}` : ''}`);
      }
    }
    for (const n of result.notes) lines.push(`  note: ${n}`);
  }
  const shown = verbose ? result.findings : result.findings.slice(0, 60);
  for (const f of shown) lines.push(`FAIL  ${f.rule}/${f.check}  ${f.pool}${f.ref && !f.message.includes(f.ref) ? `  ${f.ref}` : ''}  ${f.message}`);
  if (shown.length < result.findings.length) lines.push(`  ... ${result.findings.length - shown.length} more (--verbose shows all)`);
  const heldN = planted.filter((p) => p.pass).length;
  lines.push(planted.every((p) => p.pass) ? `planted fixtures: ${heldN} of ${planted.length} held (each of the ${CHECKS.length} checks tripped by its planted fixture, the clean controls green)` : `planted fixtures: FAIL (${planted.length - heldN} of ${planted.length} did not hold: ${planted.filter((p) => !p.pass).map((p) => p.name).join('; ')})`);
  const byRule = {};
  for (const f of result.findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  const green = result.findings.length === 0 && planted.every((p) => p.pass);
  lines.push(green ? `GATE-items: green (${summarize(model, result)})` : `GATE-items: FAIL (${result.findings.length} finding(s)${Object.keys(byRule).length ? `: ${Object.entries(byRule).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}${planted.every((p) => p.pass) ? '' : '; a planted fixture did not hold'})`);
  return lines;
}

// ------------------------------------------------------------------ main

const USAGE = 'usage: verify-items.mjs [--family GEN-x] [--seeds N] [--self-check] [--json] [--verbose] [--root DIR]';

export function parseArgs(argv) {
  const o = { root: REPO, families: [], seeds: SEEDS_PER_CELL, selfCheck: false, json: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--root') o.root = resolve(value());
    else if (a === '--family') o.families.push(...value().split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--seeds') {
      o.seeds = Number(value());
      if (!Number.isInteger(o.seeds) || o.seeds < 1) throw new Error('--seeds needs a positive integer');
    } else if (a === '--self-check') o.selfCheck = true;
    else if (a === '--json') o.json = true;
    else if (a === '--verbose') o.verbose = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

export async function main(argv, io = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) }) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    io.err(`verify-items: ${e.message}\n${USAGE}`);
    return 2;
  }
  if (!existsSync(o.root)) {
    io.err(`verify-items: --root ${o.root} does not exist, so there is nothing to check\n${USAGE}`);
    return 2;
  }
  const registryRaw = generatorsGate.loadRegistry(REPO);
  const registry = registryRaw ? { misconceptions: registryRaw.misconceptions, generators: registryRaw.generators } : null;
  let planted;
  try {
    planted = await selfCheck(registry);
  } catch (e) {
    io.err(`verify-items: the planted fixtures could not run: ${e instanceof Error ? e.stack : String(e)}`);
    return 2;
  }
  if (o.selfCheck) {
    for (const r of planted) io.out(`${r.pass ? 'held' : 'FAIL'}  ${`${r.rule}/${r.check}`.padEnd(30)}  ${r.name}: ${r.detail}`);
    const failed = planted.filter((r) => !r.pass).length;
    io.out(failed === 0 ? `GATE-items self-check: green (${planted.length} cases held: each of the ${CHECKS.length} checks tripped by its planted fixture, the clean controls green)` : `GATE-items self-check: FAIL (${failed} of ${planted.length} cases did not hold)`);
    return failed === 0 ? 0 : 1;
  }
  let collected;
  try {
    collected = await collect(o);
  } catch (e) {
    io.err(`verify-items: the gate could not run: ${e instanceof Error ? e.stack : String(e)}`);
    return 2;
  }
  let result;
  try {
    result = checkModel(collected.model);
  } catch (e) {
    io.err(`verify-items: the rules could not run: ${e instanceof Error ? e.stack : String(e)}`);
    return 2;
  }
  result.findings.unshift(...collected.findings);
  const green = result.findings.length === 0 && planted.every((p) => p.pass);
  if (o.json) {
    io.out(JSON.stringify({ exit: green ? 0 : 1, findings: result.findings, pools: result.pools, notes: result.notes, rows: result.rows.map((r) => ({ ...r, choice: r.choice ?? null })), planted, families: collected.model.families.map((f) => ({ id: f.id, fixture: f.fixture, mode: f.mode, live: f.live, pending: f.pending, seedsPerCell: f.seedsPerCell ?? null, items: f.items.length, replicate: f.replicate.length, notes: f.notes })) }, null, 2));
  } else for (const l of formatReport(collected.model, result, planted, o.verbose)) io.out(l);
  return green ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
