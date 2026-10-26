#!/usr/bin/env node
// Weakened copies of what W1-T07 builds: the Call It sheet's rules (the first call is final), the Mirror's derivations and the
// Mirror screen. Each weakening is a change a careless edit could make: the last call counting instead of the first, a plan that
// always writes, seen or agent calls pooled in, a minimum of 10 calls, a band diagnosed at its edge, a mark that is not the
// learner's... The tests must fail on every one of them; a weakened copy that passes is a rule nothing holds.
//
// Each weakening is applied to a scratch copy: the directory it changes is copied and every other path is a link to the repository,
// so nothing in the tree is touched. The unchanged copy runs first and must pass. A weakened copy is KILLED when its tests fail
// by assertion, with the same number of tests as the unchanged copy ran (a copy that no longer loads is BROKEN, which is not a
// catch), and SURVIVES when they pass.
//
//   node scripts/spikes/W1-T07/mutants.mjs                  the host groups: learner, sheet, screen and guard (about three minutes)
//   node scripts/spikes/W1-T07/mutants.mjs --group learner  one group: learner, sheet, screen, guard or browser
//   node scripts/spikes/W1-T07/mutants.mjs --only L01,S03   chosen weakenings
//   node scripts/spikes/W1-T07/mutants.mjs --list           every weakening, with what it breaks
//   node scripts/spikes/W1-T07/mutants.mjs --verbose        also the first failing test or check of each weakening
//   node scripts/spikes/W1-T07/mutants.mjs --browsers       also the browser group: the sheet's harness (scripts/spikes/W1-T07/harness)
//                                                           built from the weakened copy and run in Chromium inside the pinned
//                                                           Playwright image (Docker; about a minute for each weakening)
//
// Exit status: 0 when every weakening was killed, 1 when one survived or broke, 2 when the run could not start.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '../../..');
const IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble';

const LEARNER = 'packages/learner/src/mirror';
const SHEET = 'apps/site/src/components/call-it';
const SCREEN = 'apps/site/src/screens/mirror';
const GUARD = 'scripts/spikes/W1-T07/lib';

/** The groups: what is copied, and the tests that must fail on a weakening of it. */
export const GROUPS = {
  learner: {
    copies: ['packages/learner'],
    tests: ['mirror-bands', 'mirror-derive', 'mirror-first-call', 'mirror-vrk30'].map((t) => `packages/learner/test/${t}.test.ts`),
  },
  sheet: {
    copies: [SHEET],
    tests: ['model', 'commit', 'render'].map((t) => `${SHEET}/test/${t}.test.mjs`),
  },
  screen: {
    copies: [SCREEN],
    tests: [`${SCREEN}/test/render.test.mjs`],
  },
  guard: {
    // the guard and its tests are copied together, so the test imports the weakened guard and not the real one
    copies: [GUARD, 'scripts/spikes/W1-T07/test'],
    tests: ['scripts/spikes/W1-T07/test/words.test.mjs'],
  },
  browser: {
    copies: [SHEET, 'scripts/spikes/W1-T07/harness'],
    tests: [],
  },
};

/** commit.ts without its check: the plan is built as if the log were empty, so the question is written whatever the log holds. */
const ALWAYS_WRITE = [
  "    if (plan.action === 'already') return { status: 'already', call: plan.recorded, wrote: false }\n    const written = await store.record(plan.input)",
  '    const written = await store.record((planCall([], draft) as { input: never }).input)',
];

/** [id, group, file, the text it replaces (once), the replacement, what the weakened copy does wrong] */
export const MUTANTS = [
  // ---- the learner's rules: which call counts
  ['L01', 'learner', `${LEARNER}/calls.ts`, '    if (!out.has(k)) out.set(k, e)', '    out.set(k, e)', 'firstCalls keeps the last call on a question'],
  ['L02', 'learner', `${LEARNER}/calls.ts`, '  return foldedEvents(events).find((e) => isCall(e) && callKey(identityOf(e)) === want)', '  return foldedEvents(events).findLast((e) => isCall(e) && callKey(identityOf(e)) === want)', 'firstCallOf finds the last call on a question'],
  ['L03', 'learner', `${LEARNER}/plan.ts`, "  if (recorded !== undefined) return { action: 'already', recorded }\n", '', 'planCall plans a write for a question that has been called'],
  ['L04', 'learner', `${LEARNER}/calls.ts`, '  return i < 0 ? ref : ref.slice(i + 1)', '  return ref', 'a call and a called item of one question are two questions'],
  ['L05', 'learner', `${LEARNER}/calls.ts`, "  return `${refBody(id.ref)}|${id.seed === undefined ? '' : id.seed}`", '  return refBody(id.ref)', 'every seed of a generated item is one question'],
  ['L06', 'learner', `${LEARNER}/calls.ts`, '    byId.set(e.id, held === undefined ? e : resolveConflict(held, e))', '    byId.set(held === undefined ? e.id : `${e.id}#${byId.size}`, e)', 'an event that appears twice (a double import) is counted twice'],
  ['L07', 'learner', `${LEARNER}/calls.ts`, '    byId.set(e.id, held === undefined ? e : resolveConflict(held, e))', '    byId.set(e.id, e)', 'two records of one id are decided by arrival, not by the canonical conflict rule'],
  // ---- the learner's rules: which calls the Mirror reads
  ['L08', 'learner', `${LEARNER}/mirror.ts`, "    else if (e.exposure !== 'unseen') excluded.seen += 1", "    else if (false) excluded.seen += 1", 'a call on a seen question counts'],
  ['L09', 'learner', `${LEARNER}/mirror.ts`, "    else if (e.provenance === 'agent') excluded.agent += 1", "    else if (false) excluded.agent += 1", "an agent's call counts"],
  ['L10', 'learner', `${LEARNER}/mirror.ts`, "(e.provenance === 'assisted' ? assisted : own).get(", 'own.get(', "calls made with help are pooled with the learner's own"],
  ['L11', 'learner', `${LEARNER}/mirror.ts`, "    if (typeof e.ok !== 'boolean') excluded.ungraded += 1", "    if (false) excluded.ungraded += 1", 'an ungraded call counts as a miss'],
  ['L12', 'learner', `${LEARNER}/mirror.ts`, 'content.isFirstContact?.(e) === true ? undefined : firstLearned(kc)', 'firstLearned(kc)', "Boot's first-contact call counts once its idea is learned"],
  ['L13', 'learner', `${LEARNER}/mirror.ts`, "if (learnedAt === undefined || compareInstants(e.at, learnedAt) < 0) excluded['before-instruction'] += 1", "if (learnedAt === undefined || compareInstants(e.at, learnedAt) <= 0) excluded['before-instruction'] += 1", 'a call at the instant of first learning is before instruction'],
  ['L14', 'learner', `${LEARNER}/mirror.ts`, "if (learnedAt === undefined || compareInstants(e.at, learnedAt) < 0) excluded['before-instruction'] += 1", "if (learnedAt === undefined || compareInstants(e.at, learnedAt) < 0) { excluded['before-instruction'] += 1; asked.delete(key) }", 'a call made before instruction leaves its question open for a later call to count'],
  ['L15', 'learner', `${LEARNER}/mirror.ts`, '    asked.add(key)\n', '', 'a second call on a question counts'],
  ['L16', 'learner', `${LEARNER}/mirror.ts`, '  const ordered = foldedEvents(events).filter((e) => compareInstants(e.at, now) < 0)', '  const ordered = foldedEvents(events)', 'events at or after the time read as of are read'],
  ['L17', 'learner', `${LEARNER}/shape.ts`, "export const binOf = (shape: CallShape): Bin => (shape.form === 'set' ? 'set' : 'answer')", "export const binOf = (_shape: CallShape): Bin => 'answer'", 'a multiple true/false set shares the bin of the single answers'],
  ['L18', 'learner', `${LEARNER}/shape.ts`, '  for (let i = 0; i < shape.statements; i++) n *= 2', '  for (let i = 0; i < shape.statements; i++) n += 2', 'a set of m statements has a chance of 1 in 2m, not 1 in 2^m'],
  // ---- the learner's rules: bands, bias and the minimum
  ['L19', 'learner', `${LEARNER}/bands.ts`, 'export const MIN_CALLS_PER_BAND = 20', 'export const MIN_CALLS_PER_BAND = 10', 'a band is diagnosed from 10 calls'],
  ['L20', 'learner', `${LEARNER}/bands.ts`, 'export const IMPUTED_THINK = 0.73', 'export const IMPUTED_THINK = 0.75', '"think so" is imputed at 0.75'],
  ['L21', 'learner', `${LEARNER}/bands.ts`, 'export const IMPUTED_SURE = 0.9', 'export const IMPUTED_SURE = 0.95', '"sure" is imputed at 0.95'],
  ['L22', 'learner', `${LEARNER}/bands.ts`, '  return (chance + GUESS_CEILING) / 2', '  return (1 / 3 + GUESS_CEILING) / 2', 'every guess is imputed as if the item had three options'],
  ['L23', 'learner', `${LEARNER}/bands.ts`, 'export const MIRROR_Z = 1.96', 'export const MIRROR_Z = 1.64', 'the Mirror draws 90% intervals'],
  ['L24', 'learner', `${LEARNER}/bands.ts`, "sure: { conf: 'sure', tap: 'sure', printed: 'above 80%', lo: 0.8, hi: 1, payoff: { right: 3, wrong: -6 } }", "sure: { conf: 'sure', tap: 'sure', printed: 'above 80%', lo: 0.8, hi: 1, payoff: { right: 3, wrong: -3 } }", 'a wrong "sure" pays -3'],
  ['L25', 'learner', `${LEARNER}/mirror.ts`, "  if (r.high < band.lo) return 'below'", "  if (r.high <= band.lo) return 'below'", 'an interval that ends at the band is outside it'],
  ['L26', 'learner', `${LEARNER}/mirror.ts`, "  if (r.low > band.hi) return 'above'", "  if (r.low >= band.hi) return 'above'", 'an interval that starts at the band is outside it'],
  ['L27', 'learner', `${LEARNER}/mirror.ts`, "diagnosis: enough && rate !== null ? outsideBand(rate, BANDS[conf]) : null", "diagnosis: rate !== null ? outsideBand(rate, BANDS[conf]) : null", 'a band is diagnosed whatever the number of its calls'],
  ['L28', 'learner', `${LEARNER}/mirror.ts`, 'low: meanConfidence - accuracy.high, high: meanConfidence - accuracy.low', 'low: meanConfidence - accuracy.low, high: meanConfidence - accuracy.high', "bias's interval runs the wrong way round"],
  ['L29', 'learner', `${LEARNER}/mirror.ts`, 'accuracy !== null && meanConfidence !== null && n >= MIN_CALLS_PER_BAND', 'accuracy !== null && meanConfidence !== null', 'bias is shown from the first call'],
  ['L30', 'learner', `${LEARNER}/mirror.ts`, 'guess.enough && sure.enough && ', '', 'resolution is shown when a band holds a handful of calls'],
  // ---- the learner's rules: VRK30
  ['L31', 'learner', `${LEARNER}/bands.ts`, 'export const VRK30_DAYS = 30', 'export const VRK30_DAYS = 29', 'a KC counts from 29 days after first learning'],
  ['L32', 'learner', `${LEARNER}/vrk30.ts`, '    latest.set(kc, e)', '    if (latest.get(kc)?.ok !== true) latest.set(kc, e)', 'a KC keeps counting after a later miss'],
  ['L33', 'learner', `${LEARNER}/bands.ts`, 'export const ACTIVE_MONTH_DAYS = 4', 'export const ACTIVE_MONTH_DAYS = 3', 'a month is active with work on three days'],
  ['L34', 'learner', `${LEARNER}/vrk30.ts`, "    if (e.provenance !== 'own' || !isGraded(e)) continue", '    if (!isGraded(e)) continue', 'work made with help makes a month active'],
  ['L35', 'learner', `${LEARNER}/vrk30.ts`, "    if (!isFresh(e) || typeof e.ok !== 'boolean') continue", "    if (typeof e.ok !== 'boolean') continue", 'a seen or assisted answer qualifies for VRK30'],
  ['L36', 'learner', `${LEARNER}/vrk30.ts`, '  const ordered = foldedEvents(events).filter((e) => compareInstants(e.at, now) < 0)', '  const ordered = foldedEvents(events)', 'VRK30 reads events at or after the time it is read as of'],

  // ---- the sheet: the first call is final
  ['S01', 'sheet', `${SHEET}/model.ts`, "      return s.phase === 'choosing' ? { ...s, draft: reduceDraft(s.draft, a, item), notice: null } : s", '      return { ...s, draft: reduceDraft(s.draft, a, item), notice: null }', 'a tap changes the draft after the call is recorded'],
  ['S02', 'sheet', `${SHEET}/model.ts`, "      return s.phase === 'choosing' && ready(item, s.draft) ? { ...s, phase: 'committing', notice: null } : s", "      return ready(item, s.draft) ? { ...s, phase: 'committing', notice: null } : s", 'a second commit is taken after the call is recorded'],
  ['S03', 'sheet', `${SHEET}/model.ts`, '      return a.call === null ? s : { ...s, phase: \'recorded\', recorded: a.call }', "      return a.call === null ? { ...s, phase: 'choosing', recorded: null } : { ...s, phase: 'recorded', recorded: a.call }", 'a read of the log that finds no call reopens a recorded sheet'],
  ['S04', 'sheet', `${SHEET}/model.ts`, '  return answered(item, draft) && draft.conf !== null', '  return answered(item, draft)', 'the action is ready before a confidence is chosen'],
  ['S05', 'sheet', `${SHEET}/model.ts`, '  return { ok: wrong.length === 0, resp: { answers }', '  return { ok: item.statements.some((s) => answers[s.id] === s.truth), resp: { answers }', 'a set is right when one statement is'],
  ['S06', 'sheet', `${SHEET}/model.ts`, "    case 'failed':\n      return s.phase === 'committing' ? { ...s, phase: 'choosing', notice: { kind: 'failed', message: a.message } } : s", "    case 'failed':\n      return { ...s, phase: 'choosing', notice: { kind: 'failed', message: a.message } }", 'a failure reopens a recorded sheet'],
  ['S07', 'sheet', `${SHEET}/commit.ts`, ALWAYS_WRITE[0], ALWAYS_WRITE[1], 'a question that has been called is written again'],
  ['S08', 'sheet', `${SHEET}/commit.ts`, '    const counted = firstCallOf(await store.events(), draft.identity) ?? written', '    const counted = written', 'a tab that lost the race is told its own call stands'],
  ['S09', 'sheet', `${SHEET}/commit.ts`, "  if (st.mode === 'read-only') return {", "  if (false) return {", 'a read-only store is written to'],
  ['S10', 'sheet', `${SHEET}/items.ts`, 'export const cellRef = (lesson: string, cell: number): string => `call:${lesson}/c${cell}`', 'export const cellRef = (lesson: string, cell: number): string => `cell:${lesson}#${cell}`', 'a cell call is written under a ref event@1 does not allow'],
  ['S11', 'sheet', `${SHEET}/CallIt.tsx`, '      <fieldset className="ci-fieldset" disabled={frozen}>', '      <fieldset className="ci-fieldset">', 'the fieldset stays open after the call is recorded'],
  ['S12', 'sheet', `${SHEET}/copy.ts`, "  matched: 'Your call matched.',", "  matched: 'Correct!',", 'a matched call is told "Correct!"'],
  ['S13', 'sheet', `${SHEET}/useCall.ts`, "  const idle: CallLog = store === null ? { status: 'unavailable' } : { status: 'loading' }", "  const idle: CallLog = store === null || store === undefined ? { status: 'unavailable' } : { status: 'loading' }", 'a store that is still opening is told the record is not kept'],
  ['S14', 'sheet', `${SHEET}/model.ts`, '  const mis = wrong.map((s) => s.mis).find((key): key is string => key !== undefined)', '  const mis = wrong[0]?.mis', "a set takes its misconception key from the first wrong statement even when that one has none, so a wrong answer on a true statement hides the key of a tagged one after it"],
  ['S15', 'sheet', `${SHEET}/model.ts`, '  const mis = wrong.map((s) => s.mis).find(', '  const mis = wrong.map((s) => s.mis).findLast(', 'a set records the last misconception key it matched, not the first'],
  ['S16', 'sheet', `${SHEET}/copy.ts`, "  saving: 'Recording your call…',", "  saving: 'Recording your call, then the run starts…',", "the sheet's own words use a term that Boot has not introduced (run, from S1.L1)"],

  // ---- the screen
  ['M01', 'screen', `${SCREEN}/MirrorScreen.tsx`, '  if (!v.enough) return COPY.tooFew(v.calls)\n', '', 'a band below the minimum gets a sentence'],
  ['M02', 'screen', `${SCREEN}/MirrorScreen.tsx`, '            .map((bin) => (\n              <Group key={bin.bin} id={`mr-assisted-${bin.bin}`} heading={COPY.bins[bin.bin]} bin={bin} diagnose={false} />', '            .map((bin) => (\n              <Group key={bin.bin} id={`mr-assisted-${bin.bin}`} heading={COPY.bins[bin.bin]} bin={bin} diagnose />', 'calls made with help get bias and sentences'],
  ['M03', 'screen', `${SCREEN}/MirrorScreen.tsx`, '<Link to="/today">{COPY.backToToday}</Link>', '<Link to="/today">{COPY.backToToday}</Link> <Link to="/claims">Claims</Link>', 'the Mirror links to Claims'],
  ['M04', 'screen', `${SCREEN}/copy.ts`, '`Your ${quoted(conf)} calls hit less often than ${quoted(conf)} says: ${hits} of ${n}, interval ${range(low, high)}.`', '`Your ${quoted(conf)} calls hit more often than ${quoted(conf)} says: ${hits} of ${n}, interval ${range(low, high)}.`', 'a band below its range is told it is above it'],
  ['M05', 'screen', `${SCREEN}/mirror.css`, '.mirror {\n  box-sizing: border-box;', '.mirror {\n  color: #b3261e;\n  box-sizing: border-box;', 'a literal colour in the stylesheet'],
  ['M06', 'screen', `${SCREEN}/MirrorScreen.tsx`, '            <Vrk30 vrk={vrk} ideaName={ideaName} />', '            <Vrk30 vrk={vrk} ideaName={(kc) => kc} />', 'an idea is shown by its ID'],
  ['M07', 'screen', `${SCREEN}/MirrorScreen.tsx`, '<Interval rate={r} lo={conf === \'guess\' && view.chance !== null ? view.chance : view.band.lo} hi={view.band.hi} />', '<Interval rate={r} lo={view.band.lo} hi={view.band.hi} />', "the guess band's range starts at 0, not at its chance"],
  ['M08', 'screen', `${SCREEN}/copy.ts`, "  unknownIdea: 'an idea that is not in this version of the course',", "  unknownIdea: 'a claim that is not in this version of the course',", "the screen's words use a term from after S1.L1 (claim, from S1.L3)"],

  // ---- the vocabulary guard the render tests hold every word to
  ['G01', 'guard', `${GUARD}/words.mjs`, 'if (comparePositions(at, page) > 0)', 'if (t.n > 19)', "a term is held by its row number in the glossary, not by the lesson that introduces it (claim and seam pass a page of S1.L1)"],
  ['G02', 'guard', `${GUARD}/words.mjs`, 'if (comparePositions(at, page) > 0)', 'if (comparePositions(at, page) >= 0)', "a term is refused on the page of its own first lesson"],
  ['G03', 'guard', `${GUARD}/words.mjs`, '  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]', '  return a[1] - b[1]', 'lessons are ordered by their number alone, so S2.L0 comes before S1.L5'],
  ['G04', 'guard', `${GUARD}/words.mjs`, 'for (const x of glossary.internal) for (const m of x.matchers)', 'for (const x of []) for (const m of x.matchers)', 'no internal name is looked for'],
  ['G05', 'guard', `${GUARD}/words.mjs`, "export const STATUS_WORDS = ['verified', 'correct', 'safe', 'proven', 'guaranteed']", "export const STATUS_WORDS = ['verified', 'correct', 'safe', 'guaranteed']", '"proven" passes as a bare status word'],
  ['G06', 'guard', `${GUARD}/words.mjs`, '  if (page === null) throw new Error(', '  if (false) throw new Error(', 'a text with no lesson is held to no vocabulary and passes'],
  ['G07', 'guard', `${GUARD}/words.mjs`, '    if (at === null) throw new Error(', '    if (false) throw new Error(', 'a glossary term with no lesson is read as a term of no page'],
  ['G08', 'guard', `${GUARD}/words.mjs`, "caseSensitive ? 'gu' : 'giu'", "'giu'", 'a case-sensitive term matches in any case ("bench" is the Bench)'],
  ['G09', 'guard', `${GUARD}/words.mjs`, 'if (glossary.internalIds.has(t.kind))', 'if (false)', "no ID of the course's machinery is looked for"],
  ['G10', 'guard', `${GUARD}/words.mjs`, '  if (/!/.test(text)) problems.push(', '  if (false) problems.push(', 'an exclamation mark passes'],

  // ---- the sheet in the browser (--browsers): the harness, built from the weakened copy, in Chromium
  ['B01', 'browser', `${SHEET}/CallIt.tsx`, '      <fieldset className="ci-fieldset" disabled={frozen}>', '      <fieldset className="ci-fieldset">', 'the fieldset stays open after the call is recorded'],
  ['B02', 'browser', `${SHEET}/commit.ts`, ALWAYS_WRITE[0], ALWAYS_WRITE[1], 'a question that has been called is written again'],
  ['B03', 'browser', `${SHEET}/useCall.ts`, '    const stop = store.subscribe(() => {\n      void read().catch(() => undefined)\n    })', '    const stop = () => undefined', 'an open sheet does not hear a call made in another tab'],
  ['B04', 'browser', `${SHEET}/CallIt.tsx`, "  const view: Draft = session.phase === 'recorded' && standing !== null ? draftOfRecorded(standing) : session.draft", '  const view: Draft = session.draft', 'a recorded sheet shows the learner\'s taps, not the call on record'],
  ['B05', 'browser', `${SHEET}/call-it.css`, '    scroll-padding-bottom: var(--ci-dock-height, 10rem);', '    scroll-padding-bottom: 0;', 'the docked bar reserves no scroll padding'],
  ['B06', 'browser', `${SHEET}/CallIt.tsx`, "    inflight.current = true\n    dispatch({ t: 'commit' })", "    inflight.current = true\n    onCommitted?.({ id: 'early', conf: session.draft.conf as Confidence, ok: null, picked: null, answers: null, provenance: 'own' }, 'recorded')\n    dispatch({ t: 'commit' })", "the host's run starts before the call is in the log"],
  ['B07', 'browser', `${SHEET}/useCall.ts`, '  const log = held.store === store && held.key === key ? held.log : idle', '  const log = held.log', "a cell given another question shows the last question's call"],
  ['B08', 'browser', `${SHEET}/CallIt.tsx`, "  return <CallItSheet key={`${props.item.identity.ref}#${props.item.identity.seed ?? ''}`} {...props} />", '  return <CallItSheet {...props} />', "a sheet given another question keeps the last question's taps and call"],
];

// ------------------------------------------------------------------ a scratch copy

/** A scratch tree: each path in `copies` copied, the directories above them real, everything else a link to the repository. */
function overlay(root, copies) {
  const copySet = new Set(copies);
  const prefixes = new Set(['']);
  for (const c of copies) {
    const parts = c.split('/');
    for (let i = 1; i < parts.length; i++) prefixes.add(parts.slice(0, i).join('/'));
  }
  const build = (rel) => {
    const real = path.join(REPO, rel);
    const out = path.join(root, rel);
    if (copySet.has(rel)) {
      fs.cpSync(real, out, { recursive: true, filter: (src) => path.basename(src) !== 'node_modules' });
    } else if (prefixes.has(rel)) {
      fs.mkdirSync(out, { recursive: true });
      for (const name of fs.readdirSync(real)) if (name !== '.git') build(rel === '' ? name : `${rel}/${name}`);
    } else {
      fs.symlinkSync(real, out);
    }
  };
  build('');
}

const count = (text, name) => Number(new RegExp(`^# ${name} ([0-9]+)$`, 'm').exec(text)?.[1] ?? NaN);

function runTests(root, tests, scratchEnv) {
  const r = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27, env: { ...process.env, ...scratchEnv } });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  return { status: r.status, tests: count(text, 'tests'), fail: count(text, 'fail'), text };
}

/** Apply a weakening to a scratch tree; null when its text is not there exactly once. */
function apply(root, [, , file, find, replace]) {
  const target = path.join(root, file);
  const text = fs.readFileSync(target, 'utf8');
  const n = text.split(find).length - 1;
  if (n !== 1) return `the text it replaces is in ${file} ${n} times, not once`;
  fs.writeFileSync(target, text.replace(find, () => replace));
  return null;
}

// ------------------------------------------------------------------ the browser group

function dockerReady() {
  const r = spawnSync('docker', ['image', 'inspect', IMAGE], { encoding: 'utf8' });
  return r.status === 0;
}

function browserRun(distDir, outDir) {
  const name = 'w1t07-mutant';
  const r = spawnSync(
    'docker',
    ['run', '--rm', '--memory=4g', '--network', 'none', '--name', name, '-e', 'ONLY=final,dock', '-e', 'ENGINES=chromium', '-v', `${REPO}:/repo:ro`, '-v', `${distDir}:/dist:ro`, '-v', `${outDir}:/out`, IMAGE, 'node', '/repo/scripts/spikes/W1-T07/harness/check.mjs', '/dist', '/out', '/statespace/'],
    { encoding: 'utf8', maxBuffer: 1 << 27 },
  );
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const fails = text.split('\n').filter((l) => l.startsWith('FAIL '));
  return { status: r.status, fails, text };
}

function buildHarness(root, distDir) {
  const r = spawnSync('npx', ['vite', 'build', '-c', path.join(root, 'scripts/spikes/W1-T07/harness/vite.config.mjs')], { cwd: root, encoding: 'utf8', env: { ...process.env, HARNESS_OUT: distDir }, maxBuffer: 1 << 27 });
  return { ok: r.status === 0, text: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// ------------------------------------------------------------------ main

function main(argv) {
  const flag = (name) => argv.includes(name);
  const value = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  if (flag('--list')) {
    for (const m of MUTANTS) console.log(`${m[0]}  ${m[1].padEnd(7)} ${m[2]}: ${m[5]}`);
    return 0;
  }
  const only = value('--only')?.split(',');
  const groupArg = value('--group');
  const wanted = (m) => (only ? only.includes(m[0]) : groupArg ? m[1] === groupArg : m[1] !== 'browser' || flag('--browsers'));
  const chosen = MUTANTS.filter(wanted);
  if (chosen.length === 0) {
    console.error('mutants: nothing chosen');
    return 2;
  }
  const scratchBase = fs.mkdtempSync(path.join(process.env.W1T07_SCRATCH ?? os.tmpdir(), 'w1t07-mutants-'));
  const results = [];
  try {
    for (const group of Object.keys(GROUPS)) {
      const inGroup = chosen.filter((m) => m[1] === group);
      if (inGroup.length === 0) continue;
      const g = GROUPS[group];
      let baseline = null;
      if (group === 'browser') {
        if (!dockerReady()) {
          console.error(`mutants: the browser group needs Docker and ${IMAGE}`);
          return 2;
        }
      } else {
        const root = fs.mkdtempSync(path.join(scratchBase, `${group}-base-`));
        overlay(root, g.copies);
        baseline = runTests(root, g.tests, {});
        fs.rmSync(root, { recursive: true, force: true });
        console.log(`${group}: the unchanged copy ran ${baseline.tests} tests, ${baseline.fail} failed`);
        if (baseline.status !== 0 || !(baseline.tests > 0) || baseline.fail !== 0) {
          console.error(baseline.text.split('\n').filter((l) => /^not ok|^# (fail|tests)/.test(l)).join('\n'));
          console.error(`mutants: the unchanged copy of group ${group} does not pass its tests`);
          return 2;
        }
      }
      for (const m of inGroup) {
        const root = fs.mkdtempSync(path.join(scratchBase, `${m[0]}-`));
        overlay(root, g.copies);
        const bad = apply(root, m);
        if (bad) {
          console.error(`mutants: ${m[0]}: ${bad}`);
          return 2;
        }
        let verdict;
        let detail;
        if (group === 'browser') {
          const dist = path.join(root, '.dist');
          const built = buildHarness(root, dist);
          if (!built.ok) {
            verdict = 'BROKEN';
            detail = 'the harness no longer builds';
          } else {
            const out = fs.mkdtempSync(path.join(scratchBase, `${m[0]}-out-`));
            const run = browserRun(dist, out);
            verdict = run.fails.length > 0 ? 'KILLED' : run.status === 0 ? 'SURVIVED' : 'BROKEN';
            detail = run.fails.length > 0 ? `${run.fails.length} checks failed: ${run.fails[0].slice(0, 110)}` : `exit ${run.status}`;
          }
        } else {
          const r = runTests(root, g.tests, {});
          if (r.status === 0) {
            verdict = 'SURVIVED';
            detail = `${r.tests} tests passed`;
          } else if (r.tests === baseline.tests && r.fail > 0) {
            verdict = 'KILLED';
            const first = r.text.split('\n').find((l) => /^not ok/.test(l)) ?? '';
            detail = `${r.fail} of ${r.tests} tests failed: ${first.replace(/^not ok \d+ - /, '').slice(0, 100)}`;
          } else {
            verdict = 'BROKEN';
            detail = `ran ${r.tests} tests, not ${baseline.tests}`;
          }
        }
        fs.rmSync(root, { recursive: true, force: true });
        results.push({ id: m[0], group, verdict, what: m[5], detail });
        console.log(`${verdict.padEnd(8)} ${m[0]}  ${m[5]}${verdict === 'KILLED' && !flag('--verbose') ? '' : `  [${detail}]`}`);
      }
    }
  } finally {
    fs.rmSync(scratchBase, { recursive: true, force: true });
  }
  const killed = results.filter((r) => r.verdict === 'KILLED').length;
  console.log(`mutants: ${killed} of ${results.length} weakened copies failed their tests${results.length === killed ? '' : `; ${results.filter((r) => r.verdict !== 'KILLED').map((r) => `${r.id} ${r.verdict.toLowerCase()}`).join(', ')}`}`);
  return killed === results.length ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
