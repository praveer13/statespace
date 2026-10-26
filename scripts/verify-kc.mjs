#!/usr/bin/env node
// GATE-kc (spine section 11.2; W1-T04). The checks live in packages/kc/src/check.ts; this script reads the files.
//
//   node scripts/verify-kc.mjs              run the gate on this repository
//   node scripts/verify-kc.mjs --verbose    also print every path's units and the pending KCs
//   node scripts/verify-kc.mjs --json       print the findings and summaries as JSON
//   node scripts/verify-kc.mjs --write      regenerate packages/kc/src/graph.generated.ts from content/kc/graph.yaml
//   node scripts/verify-kc.mjs --self-check plant each fault in memory and require the gate to fail on it
//   node scripts/verify-kc.mjs --root DIR   read the files under DIR (tests)
//
// Exit status: 0 green (warnings and notes allowed), 1 findings, 2 a required file could not be read.
//
// Inputs: content/kc/graph.yaml (the graph); docs/spine/SPINE.md (section 4, the lesson rows, section 3.0);
// packages/ids/src/registry.json (lessons, lab stages and checks, generators, drawers: GATE-links keeps it equal to
// the spine); content/stages/budget.yaml (the published paths: GATE-budget keeps them equal to section 3.0); and the
// content whose KC tags the gate checks:
//   pages     content/stages/S*/S*.L*.{md,json,yaml} and content/drawers/D-*.{md,json,yaml}, read as lesson@1 pages
//             (schemas/lesson.schema.json). A Markdown source is read by the content pipeline's own reader,
//             parsePageSource of packages/content (W1-T36), so the gate sees the blocks the site builds.
//   records   content/audit/**, content/specimens/**, content/generators/**, content/stages/S*/lab.yaml and
//             content/stages/S*/placement.yaml (YAML or JSON).
// Content YAML is read by packages/content's strict reader (YAML 1.2, no duplicate keys); without the package (no
// npm ci), the repository's dependency-free subset reads what it can and the rest is unreadable, which fails. The
// graph and the budget file are written in that subset and are always read with it.

import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The checks are the package's TypeScript, which Node runs as it is from 22.18; before that it needs a flag.
if (!process.features.typescript) {
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 1);
}
const { parseYaml } = await import('../packages/ids/src/yaml-subset.ts');
const { scanBlocks } = await import('../packages/ids/src/markdown.ts');
const { checkKc } = await import('../packages/kc/src/check.ts');
const { GENERATED_PATH, generateModule } = await import('../packages/kc/src/generate.ts');
const { GRAPH_PATH, loadGraph } = await import('../packages/kc/src/load.ts');
const { BUDGET_PATH } = await import('../packages/kc/src/paths.ts');
const { SPINE_PATH } = await import('../packages/kc/src/spine.ts');

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const REGISTRY_PATH = 'packages/ids/src/registry.json';
/** The content pipeline's build entry, whose page reader and YAML reader GATE-kc uses for content. */
export const CONTENT_BUILD = 'packages/content/src/build/index.ts';
const SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__', 'fixtures']);

/** @param {string} path @returns {string | null} */
function readOrNull(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (/** @type {NodeJS.ErrnoException} */ (e).code === 'ENOENT') return null;
    throw e;
  }
}

/**
 * Files under a directory (relative to root), recursively, sorted; symbolic links and fixtures are skipped.
 * @param {string} root @param {string} rel @param {(p: string) => boolean} keep
 */
function filesUnder(root, rel, keep) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} r */
  const visit = (r) => {
    let st;
    try {
      st = lstatSync(join(root, r));
    } catch {
      return;
    }
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      for (const name of readdirSync(join(root, r)).sort()) if (!SKIP_DIRS.has(name)) visit(`${r}/${name}`);
    } else if (keep(r)) out.push(r);
  };
  visit(rel);
  return out;
}

const isYaml = (p) => /\.ya?ml$/.test(p);
const isJson = (p) => p.endsWith('.json');

/**
 * The content pipeline's readers (packages/content, W1-T36): `parsePageSource` reads a lesson or drawer source into
 * its lesson@1 record, and `readYaml` reads YAML strictly (YAML 1.2, no duplicate keys). They need the workspace's
 * installed dependencies; when the package cannot load, the content it would read is reported as unreadable.
 * @param {string} root
 * @returns {Promise<{ parsePageSource: (text: string) => { record: Record<string, unknown> | null, problems: { severity: string, message: string, line: number | null }[] }, readYaml: (text: string) => { value: unknown, problems: { severity: string, message: string, line: number | null }[] } } | { error: string }>}
 */
async function contentReaders(root) {
  const entry = join(root, CONTENT_BUILD);
  if (!existsSync(entry)) return { error: `${CONTENT_BUILD} is missing` };
  try {
    const mod = await import(pathToFileURL(entry).href);
    if (typeof mod.parsePageSource !== 'function' || typeof mod.readYaml !== 'function') return { error: `${CONTENT_BUILD} exports no parsePageSource and readYaml` };
    return { parsePageSource: mod.parsePageSource, readYaml: mod.readYaml };
  } catch (e) {
    return { error: `${CONTENT_BUILD} does not load (${/** @type {Error} */ (e).message.split('\n')[0]}); run npm ci` };
  }
}

/** The first error of a reader's problems, as one line. */
const firstError = (problems) => {
  const e = problems.find((p) => p.severity === 'error');
  return e === undefined ? null : `${e.line === null ? '' : `line ${e.line}: `}${e.message}`;
};

/**
 * Read everything the gate needs from a repository root.
 * @param {string} root
 * @returns {Promise<{ inputs: import('../packages/kc/src/check.ts').KcInputs, notes: string[] } | { missing: string }>}
 */
export async function loadInputs(root) {
  const spine = readOrNull(join(root, SPINE_PATH));
  const registryText = readOrNull(join(root, REGISTRY_PATH));
  if (spine === null) return { missing: SPINE_PATH };
  if (registryText === null) return { missing: REGISTRY_PATH };
  /** @type {string[]} */
  const notes = [];

  const graphText = readOrNull(join(root, GRAPH_PATH));
  let graphDoc = null;
  /** @type {string | null} */
  let graphError = null;
  if (graphText === null) graphError = `${GRAPH_PATH} is missing`;
  else {
    try {
      graphDoc = parseYaml(graphText);
    } catch (e) {
      graphError = `${GRAPH_PATH} is not readable YAML: ${/** @type {Error} */ (e).message}`;
    }
  }
  const budgetText = readOrNull(join(root, BUDGET_PATH));
  let budgetDoc = null;
  /** @type {string | null} */
  let budgetError = null;
  if (budgetText === null) budgetError = `${BUDGET_PATH} is missing`;
  else {
    try {
      budgetDoc = parseYaml(budgetText);
    } catch (e) {
      budgetError = `${BUDGET_PATH} is not readable YAML: ${/** @type {Error} */ (e).message}`;
    }
  }

  // ---- content
  const pageFiles = [
    ...filesUnder(root, 'content/stages', (p) => /\/S[0-9]+\.L[0-9]+\.(md|json|ya?ml)$/.test(p)),
    ...filesUnder(root, 'content/drawers', (p) => /\/D-[0-9]{2}\.(md|json|ya?ml)$/.test(p)),
  ];
  const recordFiles = [
    ...filesUnder(root, 'content/audit', (p) => isYaml(p) || isJson(p)).map((p) => ({ path: p, kind: 'audit' })),
    ...filesUnder(root, 'content/specimens', (p) => isYaml(p) || isJson(p)).map((p) => ({ path: p, kind: 'specimen' })),
    ...filesUnder(root, 'content/generators', (p) => isYaml(p) || isJson(p)).map((p) => ({ path: p, kind: 'generator' })),
    ...filesUnder(root, 'content/stages', (p) => /\/S[0-9]+\/lab\.ya?ml$/.test(p)).map((p) => ({ path: p, kind: 'lab' })),
    ...filesUnder(root, 'content/stages', (p) => /\/S[0-9]+\/placement\.ya?ml$/.test(p)).map((p) => ({ path: p, kind: 'placement' })),
  ];
  const needsReaders = pageFiles.some((p) => p.endsWith('.md') || isYaml(p)) || recordFiles.some((r) => isYaml(r.path));
  const readers = needsReaders ? await contentReaders(root) : { error: 'not needed' };
  /** @type {{ file: string, message: string }[]} */
  const unreadable = [];
  /** @param {string} p @returns {{ ok: true, value: unknown } | { ok: false, error: string }} */
  const docOf = (p) => {
    const text = readFileSync(join(root, p), 'utf8');
    if (isJson(p)) {
      try {
        return { ok: true, value: JSON.parse(text) };
      } catch (e) {
        return { ok: false, error: `not valid JSON: ${/** @type {Error} */ (e).message}` };
      }
    }
    if ('error' in readers) {
      // without the content package, the repository's YAML subset still reads plain files
      try {
        return { ok: true, value: parseYaml(text) };
      } catch (e) {
        return { ok: false, error: `${readers.error}, and the YAML subset cannot read it (${/** @type {Error} */ (e).message})` };
      }
    }
    const r = readers.readYaml(text);
    const err = firstError(r.problems);
    return err === null ? { ok: true, value: r.value } : { ok: false, error: err };
  };
  /** @type {{ file: string, record: unknown }[]} */
  const pages = [];
  for (const p of pageFiles) {
    if (p.endsWith('.md')) {
      if ('error' in readers) {
        unreadable.push({ file: p, message: readers.error });
        continue;
      }
      const r = readers.parsePageSource(readFileSync(join(root, p), 'utf8'));
      if (r.record === null) unreadable.push({ file: p, message: `packages/content's parsePageSource read no page${firstError(r.problems) === null ? '' : ` (${firstError(r.problems)})`}` });
      else pages.push({ file: p, record: r.record });
      const n = r.problems.filter((x) => x.severity === 'error').length;
      if (r.record !== null && n > 0) notes.push(`${p}: parsePageSource reports ${n} source error(s), first ${firstError(r.problems)}; GATE-kc reads the blocks it could place (the content build fails on the rest)`);
    } else {
      const d = docOf(p);
      if (d.ok) pages.push({ file: p, record: d.value });
      else unreadable.push({ file: p, message: d.error });
    }
  }
  /** @type {{ file: string, kind: any, doc: unknown }[]} */
  const records = [];
  for (const r of recordFiles) {
    const d = docOf(r.path);
    if (d.ok) records.push({ file: r.path, kind: r.kind, doc: d.value });
    else unreadable.push({ file: r.path, message: d.error });
  }

  let registry;
  try {
    registry = JSON.parse(registryText).entries;
  } catch (e) {
    return { missing: `${REGISTRY_PATH} (not valid JSON: ${/** @type {Error} */ (e).message})` };
  }
  return {
    inputs: {
      graphDoc,
      graphError,
      spineBlocks: scanBlocks(spine.replace(/\r\n?/g, '\n')),
      registry,
      budgetDoc,
      budgetError,
      pages,
      records,
      unreadable,
      generated: readOrNull(join(root, GENERATED_PATH)),
    },
    notes,
  };
}

// ---------------------------------------------------------------- planted faults (--self-check and the tests)

const clone = (x) => structuredClone(x);
/** @param {any} doc @param {string} id */
const kcIn = (doc, id) => doc.kcs.find((k) => k.id === id);
/** A minimal lesson@1 page. */
const page = (id, segments) => ({ schema: 'statespace/lesson@1', id, tier: 'bridge', title: id, draft: true, kcs: [], segments });
const item = (role, family, kcs) => ({ type: 'item', role, family, template: 't1', kcs });
const cell = (n) => ({ type: 'instrument', ins: 'INS-z3', cell: n, callOnFirstRun: true, recorded: 'RUN-z3-starter' });
/** The pages other than one lesson's, so a planted page replaces an authored one instead of sitting beside it. */
const others = (pages, id) => pages.filter((p) => !(p.record !== null && typeof p.record === 'object' && p.record.id === id) && !p.file.endsWith(`/${id}.md`));

/**
 * Each plant edits the real inputs to plant one fault; the gate must then fail on `check` with a message that
 * matches `text`, beside whatever the unplanted tree already reports.
 * @type {{ name: string, check: string, text: RegExp, edit: (i: import('../packages/kc/src/check.ts').KcInputs) => import('../packages/kc/src/check.ts').KcInputs }[]}
 */
export const PLANTS = [
  {
    name: 'a requires cycle',
    check: 'dag',
    text: /cycle/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      kcIn(g, 'KC-1.only-if-direction').requires = ['KC-1.implication-vacuity'];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'the graph drifts from the spine',
    check: 'spine',
    text: /KC-1\.violation-as-sat: requires differs/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      kcIn(g, 'KC-1.violation-as-sat').requires = [];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'fewer than 80 KCs',
    check: 'counts',
    text: /allows 80 to 110/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      const keep = new Set(g.kcs.slice(0, 40).map((k) => k.id));
      g.kcs = g.kcs.slice(0, 40).map((k) => ({ ...k, requires: (k.requires ?? []).filter((r) => keep.has(r)), confusable: (k.confusable ?? []).filter((r) => keep.has(r)) }));
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a threshold KC without a generator',
    check: 'sources',
    text: /KC-1\.three-answers is a threshold KC with no generator/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      kcIn(g, 'KC-1.three-answers').families = [];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a family not used in the KC\'s stage',
    check: 'sources',
    text: /GEN-anomaly-id is not used in S1/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      kcIn(g, 'KC-1.witness-class').families = ['GEN-anomaly-id'];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a wrong first lesson',
    check: 'first-taught',
    text: /KC-1\.two-state-property: the graph says it is first taught in S1\.L5/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      kcIn(g, 'KC-1.two-state-property').first_taught = 'S1.L5';
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a requirement taught after its dependent in roadmap order',
    check: 'order',
    text: /KC-1\.implication-vacuity \(first taught in S1\.L3\) requires KC-1\.only-if-direction/,
    edit: (i) => {
      const registry = i.registry.map((e) => {
        if (e.id === 'S1.L1') return { ...e, kcs: (e.kcs ?? []).filter((k) => k !== 'KC-1.only-if-direction') };
        if (e.id === 'S1.L5') return { ...e, kcs: [...(e.kcs ?? []), 'KC-1.only-if-direction'] };
        return e;
      });
      const g = clone(i.graphDoc);
      kcIn(g, 'KC-1.only-if-direction').first_taught = 'S1.L5';
      return { ...i, registry, graphDoc: g };
    },
  },
  {
    name: 'a hard edge broken on the builder\'s path (S5.L9 before S4)',
    check: 'paths',
    text: /KC-5\.inductive-invariant-tla .* requires KC-4\.invariant-vs-inductive through a hard edge/,
    edit: (i) => {
      const b = clone(i.budgetDoc);
      const blocks = b.paths.builder.blocks;
      blocks.find((x) => x.id === 'S5-early').take = ['S5.L1–S5.L9', 'LAB-5.1–LAB-5.6', 'DEFENCE', 'NOTE'];
      return { ...i, budgetDoc: b };
    },
  },
  {
    name: 'a soft edge crossed without its substitute',
    check: 'paths',
    text: /crosses the soft edge KC-6\.rowcount-as-guard → KC-3\.big-step-errors .* names no substitute/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.substitutes = g.substitutes.filter((s) => s.soft_edge === undefined);
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'an artifact used before it is built, with no substitute',
    check: 'paths',
    text: /LAB-6\.6 comes before LAB-6\.2, whose artifact it uses .* names no substitute/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.substitutes = g.substitutes.filter((s) => !(Array.isArray(s.artifact) && s.artifact[0] === 'LAB-6.6'));
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a substitute that no path needs',
    check: 'paths',
    text: /is declared for the default path, which does not cross that edge/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.substitutes = [...g.substitutes, { path: 'default', soft_edge: ['KC-6.rowcount-as-guard', 'KC-3.big-step-errors'], substitute: 'D-23' }];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a lesson that applies an artifact built later, with no substitute and no pending decision',
    check: 'paths',
    text: /on the builder path S6\.L2 comes before LAB-3\.7, whose artifact it applies .* names no substitute/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.pending_crossings = (g.pending_crossings ?? []).filter((x) => !(Array.isArray(x.artifact) && x.artifact[0] === 'S6.L2'));
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a pending crossing that no path makes',
    check: 'paths',
    text: /the pending crossing S6\.L2 → LAB-3\.7 is declared for the default path, which does not cross it/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.pending_crossings = [...(g.pending_crossings ?? []), { path: 'default', artifact: ['S6.L2', 'LAB-3.7'], decision: 'none: the default path builds LAB-3.7 first' }];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a lab stage that exercises a KC taught after it',
    check: 'paths',
    text: /LAB-1\.2 exercises KC-1\.two-state-property, which the default path first teaches later/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.lab_stages['LAB-1.2'].kcs = ['KC-1.two-state-property'];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a lab stage with a check and no KC tags',
    check: 'labs',
    text: /LAB-1\.2 has LAB-1\.c2 but no KC tags/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.lab_stages['LAB-1.2'].kcs = [];
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'a tool whose drawer does not cover its first use',
    check: 'paths',
    text: /first stage that needs the Bench devcontainer is LAB-2\.1, which D-23's "Used in"/,
    edit: (i) => {
      const g = clone(i.graphDoc);
      g.tools.devcontainer.drawer = 'D-23';
      return { ...i, graphDoc: g };
    },
  },
  {
    name: 'an untagged item on a page',
    check: 'tags',
    text: /S1\.L2 s1 block 2: the item carries no KC tags/,
    edit: (i) => ({ ...i, pages: [...others(i.pages, 'S1.L2'), { file: 'content/stages/S1/S1.L2.md', record: page('S1.L2', [{ id: 's1', title: 'Three answers', minutes: 15, blocks: [cell(1), item('segment', 'GEN-call-it', [])] }]) }] }),
  },
  {
    name: 'a specimen tagged with a KC that does not exist',
    check: 'tags',
    text: /SP-1\.1 \(specimen\) is tagged KC-1\.no-such-kc/,
    edit: (i) => ({ ...i, records: [...i.records, { file: 'content/specimens/SP-1.1.yaml', kind: 'specimen', doc: { id: 'SP-1.1', kcs: ['KC-1.no-such-kc'] } }] }),
  },
  {
    name: 'an audit case without KC tags',
    check: 'tags',
    text: /AUD-1\.1 \(audit case\) carries no KC tags/,
    edit: (i) => ({ ...i, records: [...i.records, { file: 'content/audit/AUD-1.1.yaml', kind: 'audit', doc: { id: 'AUD-1.1', class: 'G2' } }] }),
  },
  {
    name: 'a segment that declares a KC the graph does not have',
    check: 'tags',
    text: /S1\.L2 s1 \(segment kcs\) is tagged KC-1\.no-such-kc/,
    edit: (i) => ({ ...i, pages: [...others(i.pages, 'S1.L2'), { file: 'content/stages/S1/S1.L2.md', record: page('S1.L2', [{ id: 's1', title: 'Three answers', minutes: 15, kcs: ['KC-1.no-such-kc'], blocks: [cell(1), item('segment', 'GEN-call-it', ['KC-1.three-answers'])] }]) }] }),
  },
  {
    name: 'a cell\'s call credited to a KC its segment does not declare',
    check: 'dose',
    text: /KC-1\.unknown-fails-closed: its first lesson, S1\.L2, has no call tagged with it/,
    edit: (i) => ({
      ...i,
      pages: [
        ...others(i.pages, 'S1.L2'),
        {
          file: 'content/stages/S1/S1.L2.md',
          // the segment declares one KC; its graded item (no call) carries both, which must not lend the call the other
          record: page('S1.L2', [
            {
              id: 's1',
              title: 'Three answers',
              minutes: 15,
              kcs: ['KC-1.three-answers'],
              blocks: [item('prequestion', 'GEN-call-it', ['KC-1.three-answers', 'KC-1.unknown-fails-closed']), cell(1), item('segment', 'GEN-which-stamp', ['KC-1.three-answers', 'KC-1.unknown-fails-closed'])],
            },
            { id: 's2', title: 'Exit', minutes: 3, blocks: [item('exit', 'GEN-which-stamp', ['KC-1.unknown-fails-closed', 'KC-1.three-answers'])] },
          ]),
        },
      ],
    }),
  },
  {
    name: 'a lesson item whose primary KC is taught later',
    check: 'tags',
    text: /its primary KC KC-1\.encoding-is-the-claim is first taught after S1\.L2/,
    edit: (i) => ({ ...i, pages: [...others(i.pages, 'S1.L2'), { file: 'content/stages/S1/S1.L2.md', record: page('S1.L2', [{ id: 's1', title: 'Three answers', minutes: 15, blocks: [item('segment', 'GEN-call-it', ['KC-1.encoding-is-the-claim'])] }]) }] }),
  },
  {
    name: 'a first lesson without an exit item for one of its KCs',
    check: 'dose',
    text: /KC-1\.unknown-fails-closed: its first lesson, S1\.L2, has no exit item tagged with it/,
    edit: (i) => ({
      ...i,
      pages: [
        ...others(i.pages, 'S1.L2'),
        {
          file: 'content/stages/S1/S1.L2.md',
          record: page('S1.L2', [
            {
              id: 's1',
              title: 'Three answers',
              minutes: 20,
              blocks: [item('prequestion', 'GEN-call-it', ['KC-1.three-answers', 'KC-1.unknown-fails-closed']), cell(1), item('segment', 'GEN-call-it', ['KC-1.three-answers', 'KC-1.unknown-fails-closed']), item('exit', 'GEN-which-stamp', ['KC-1.three-answers'])],
            },
          ]),
        },
      ],
    }),
  },
  {
    name: 'a stale generated module',
    check: 'generated',
    text: /out of date/,
    edit: (i) => ({ ...i, generated: `${i.generated ?? ''}// edited by hand\n` }),
  },
];

/**
 * Run every plant; each must add a failure of its check that the unplanted tree does not have.
 * @param {import('../packages/kc/src/check.ts').KcInputs} inputs
 */
export function selfCheck(inputs) {
  const base = checkKc(inputs);
  const known = new Set(base.findings.filter((f) => f.level === 'fail').map((f) => `${f.check}\u0000${f.message}`));
  return PLANTS.map((p) => {
    const r = checkKc(p.edit(inputs));
    const fresh = r.findings.filter((f) => f.level === 'fail' && f.check === p.check && !known.has(`${f.check}\u0000${f.message}`));
    const hit = fresh.find((f) => p.text.test(f.message));
    return { name: p.name, ok: hit !== undefined, detail: hit?.message ?? (fresh[0]?.message ? `failed otherwise: ${fresh[0].message}` : `no new ${p.check} failure`) };
  });
}

// ---------------------------------------------------------------- output

const LABEL = { fail: 'FAIL', warn: 'WARN', note: 'NOTE' };
const pad = (s, n) => (s.length >= n ? `${s} ` : s + ' '.repeat(n - s.length));

/**
 * @param {string[]} argv
 * @param {{ out?: (s: string) => void, err?: (s: string) => void }} [io]
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, io = {}) {
  const out = io.out ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.err ?? ((s) => process.stderr.write(`${s}\n`));
  let root = defaultRoot;
  const flags = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') root = resolve(argv[++i] ?? '');
    else if (['--json', '--verbose', '--write', '--self-check'].includes(a)) flags.add(a);
    else if (a === '--help' || a === '-h') {
      out('usage: node scripts/verify-kc.mjs [--verbose] [--json] [--write] [--self-check] [--root dir]');
      return 0;
    } else {
      err(`usage: node scripts/verify-kc.mjs [--verbose] [--json] [--write] [--self-check] [--root dir]\nunknown argument: ${a}`);
      return 2;
    }
  }
  const loaded = await loadInputs(root);
  if ('missing' in loaded) {
    err(`GATE-kc: cannot read ${loaded.missing}`);
    return 2;
  }
  const { inputs, notes } = loaded;

  if (flags.has('--write')) {
    if (inputs.graphError !== null) {
      err(`GATE-kc --write: ${inputs.graphError}`);
      return 1;
    }
    const { graph, problems } = loadGraph(inputs.graphDoc);
    if (graph === null || problems.length > 0) {
      for (const p of problems) err(`${p.where ?? GRAPH_PATH}: ${p.message}`);
      err(`GATE-kc --write: ${GRAPH_PATH} has ${problems.length} problem(s); ${GENERATED_PATH} was not written`);
      return 1;
    }
    const text = generateModule(graph);
    if (inputs.generated === text) out(`GATE-kc --write: ${GENERATED_PATH} is current`);
    else {
      writeFileSync(join(root, GENERATED_PATH), text);
      out(`GATE-kc --write: wrote ${GENERATED_PATH} (${graph.kcs.length} KCs, ${graph.labStages.length} lab stages)`);
    }
    inputs.generated = text;
  }

  if (flags.has('--self-check')) {
    out('GATE-kc self-check: plant each fault in memory, run the gate, require it to fail on the right check');
    const results = selfCheck(inputs);
    for (const r of results) out(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.name}${r.ok ? '' : `: ${r.detail}`}`);
    const bad = results.filter((r) => !r.ok).length;
    out(`GATE-kc self-check: ${bad === 0 ? 'PASS' : 'FAIL'} (${results.length - bad} of ${results.length} held)`);
    return bad === 0 ? 0 : 1;
  }

  const report = checkKc(inputs);
  const fails = report.findings.filter((f) => f.level === 'fail');
  const warns = report.findings.filter((f) => f.level === 'warn');
  const others = report.findings.filter((f) => f.level === 'note');
  if (flags.has('--json')) {
    out(JSON.stringify({ green: fails.length === 0, findings: report.findings, summaries: Object.fromEntries(report.summaries), pending: report.pending, notes, paths: report.paths.map((p) => ({ id: p.id, units: p.units.map((u) => u.id) })) }, null, 2));
    return fails.length === 0 ? 0 : 1;
  }
  const g = report.graph;
  out(`GATE-kc: ${g === null ? 'no graph' : `${g.kcs.length} KCs from ${GRAPH_PATH}`}, against ${SPINE_PATH}, ${REGISTRY_PATH} and ${BUDGET_PATH}; ${inputs.pages.length} page(s) and ${inputs.records.length} record file(s) of content`);
  for (const n of notes) out(`NOTE  content   ${n}`);
  const checks = [...new Set([...report.summaries.map(([c]) => c), ...report.findings.map((f) => (f.scope === null ? f.check : `${f.check} ${f.scope}`))])];
  for (const c of checks) {
    const mine = report.findings.filter((f) => (f.scope === null ? f.check : `${f.check} ${f.scope}`) === c);
    const summary = report.summaries.find(([s]) => s === c);
    if (summary && !mine.some((f) => f.level === 'fail')) out(`OK    ${pad(c, 14)}${summary[1]}`);
    for (const f of mine) out(`${LABEL[f.level]}  ${pad(c, 14)}${f.message}${f.where ? `  [${f.where}]` : ''}`);
  }
  if (flags.has('--verbose')) {
    for (const p of report.paths) out(`PATH  ${p.id}: ${p.units.map((u) => u.id).join(' ')}`);
    if (report.pending.length > 0) out(`PENDING  ${report.pending.join(', ')}`);
  }
  out(`GATE-kc: ${fails.length === 0 ? 'green' : `red (${fails.length} failure${fails.length === 1 ? '' : 's'})`}${warns.length > 0 ? `, ${warns.length} warning${warns.length === 1 ? '' : 's'}` : ''}${others.length > 0 ? `, ${others.length} note${others.length === 1 ? '' : 's'}` : ''}`);
  return fails.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // a reader that closes the pipe early (`| head`) is not an error
  process.stdout.on('error', (e) => {
    if (/** @type {NodeJS.ErrnoException} */ (e).code !== 'EPIPE') throw e;
  });
  process.exitCode = await main(process.argv.slice(2));
}
