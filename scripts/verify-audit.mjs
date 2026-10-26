#!/usr/bin/env node
// GATE-audit (spine sections 6, 6.2 and 11.2; docs/AUDIT-DESK.md sections 2-4; W1-T40): every anchor and variant
// of the audit pool builds or runs with its key, key run, class (primary and acceptable), typed evidence and "based
// on" card; at least six exemplars in each class whose anchors have shipped (an anchor has shipped unless spine
// section 6 ships it without variants and its variants are declared pending; only AUD-2.1-AUD-2.4 and AUD-5.3 may
// wait in revision 3), an exemplar being a flawed case that differs from the class's others in operator, artifact or
// medium and in its texts beyond numeric literals and white space, so a relabeled or re-seeded copy fails; every
// shipped Clearinghouse family re-executed on its recorded seeds, failing if its naive baseline meets the family's
// bar or its reference misses it.
//
//   node scripts/verify-audit.mjs                   the nightly lane
//   node scripts/verify-audit.mjs --only AUD-1.1    only these anchors (comma-separated or repeated)
//   node scripts/verify-audit.mjs --strict          pending re-keys and pending variants fail too, and so does an
//                                                   empty pool (what a release asks: everything live)
//   node scripts/verify-audit.mjs --ports MODULE    an engine port provider (repeatable); STATESPACE_GENERATOR_PORTS
//                                                   adds more, as for GATE-generators
//   node scripts/verify-audit.mjs --self-check      plant one fault at a time; the gate must fail on each
//   --json, --verbose, --root DIR
//
// "Builds or runs with its key": the keying battery of AUDIT-DESK 4.3, which GEN-spot-the-gap exports
// (W1-T25; scripts/spikes/W1-T40/README.md section 4), re-keys every pair member and every listed variant through
// the engine ports, and the gate fails on any key that changes, any key that leaves out a field it must carry or
// gives it in another form (a field left out would read as agreement), any check that returns unknown, and any case
// the battery cannot run. A case whose engine has no lane yet (the Lean and TLC anchors of W1) is keyed by its executed
// run meanwhile: its key lines must be stated by that run, and it says which task brings its engine
// (`rekey: {pending: {engine, lands}}`); the gate fails the declaration once a port for that engine exists or the
// tracker marks the task done. The contract of a pool file is scripts/spikes/W1-T40/README.md section 3.
//
// Exit status: 0 green, 1 findings, 2 the gate could not run.

import { existsSync, mkdtempSync, rmSync, symlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.features.typescript) {
  const { spawnSync } = await import('node:child_process');
  const again = spawnSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(again.status ?? 2);
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIB = join(REPO, 'scripts', 'spikes', 'W1-T40', 'lib');
const pool = await import(pathToFileURL(join(LIB, 'pool.mjs')).href);

const BATTERY_FAMILY = join('packages', 'generators', 'src', 'spot-the-gap', 'index.ts');
const CLEARINGHOUSE = join('apps', 'instruments', 'src', 'engines', 'clearinghouse', 'audit.ts');
/** Port providers tried when they exist, as GATE-generators does: GATE-calls' Z3 pair runs the tab's Z3 under Node. */
const DEFAULT_PROVIDERS = ['scripts/conformance/z3-pyodide-native.mjs'];
const SIX = 6; // exemplars per class whose anchors have shipped (spine sections 4.1, 6 and 11.2)

const USAGE = 'usage: verify-audit.mjs [--only AUD-n.k] [--strict] [--ports MODULE] [--self-check] [--json] [--verbose] [--root DIR]';

export function parseArgs(argv) {
  const o = { root: REPO, only: [], strict: false, ports: [], selfCheck: false, json: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--root') o.root = resolve(value());
    else if (a === '--only') o.only.push(...value().split(',').map((s) => s.trim()).filter(Boolean));
    else if (a === '--strict') o.strict = true;
    else if (a === '--ports') o.ports.push(resolve(value()));
    else if (a === '--self-check') o.selfCheck = true;
    else if (a === '--json') o.json = true;
    else if (a === '--verbose') o.verbose = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

// ------------------------------------------------------------------ the battery and its ports

/**
 * GEN-spot-the-gap's keying battery (W1-T25), when it exists: packages/generators/src/spot-the-gap/index.ts exporting
 * `auditBattery` = { engines, key(case, port), regenerate?(anchor, generatorRef) } and, like every family, `ports`
 * for engines it runs as plain code. Returns { battery, ports, file, problems }.
 */
export async function loadBattery(root) {
  const file = join(root, BATTERY_FAMILY);
  if (!existsSync(file)) return { battery: null, ports: {}, file: null, problems: [] };
  try {
    const mod = await import(pathToFileURL(file).href);
    const b = mod.auditBattery;
    if (!b || typeof b.key !== 'function' || !Array.isArray(b.engines)) return { battery: null, ports: mod.ports ?? {}, file, problems: [`${BATTERY_FAMILY} exports no auditBattery {engines, key(case, port)}: GATE-audit re-keys every case with it (scripts/spikes/W1-T40/README.md section 4)`] };
    return { battery: b, ports: mod.ports ?? {}, file, problems: [] };
  } catch (e) {
    return { battery: null, ports: {}, file, problems: [`${BATTERY_FAMILY} did not load: ${e instanceof Error ? e.message : String(e)}`] };
  }
}

/** Engine ports from provider modules: each exports `ports` (engine to port) or `createPorts()` returning them. */
export async function loadProviders(modules, quiet = false) {
  const map = new Map();
  const problems = [];
  for (const m of modules) {
    try {
      const mod = await import(pathToFileURL(m).href);
      const ports = typeof mod.createPorts === 'function' ? await mod.createPorts() : mod.ports;
      if (!ports || typeof ports !== 'object') {
        if (!quiet) problems.push(`${m} exports neither ports nor createPorts()`);
      } else for (const [engine, port] of Object.entries(ports)) map.set(engine, port);
    } catch (e) {
      if (!quiet) problems.push(`${m} did not load: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { map, problems };
}

/** One port over every engine at hand; an engine without one is refused with the bus's `unknown-engine` code. */
function compositePort(map) {
  return {
    async run(req) {
      const p = map.get(req.engine);
      if (!p) throw Object.assign(new Error(`no port for engine ${req.engine} here`), { code: 'unknown-engine' });
      return p.run(req);
    },
  };
}

/** The case as the battery receives it: plain data, its texts as written. */
function batteryInput(a, c) {
  return Object.freeze({
    ref: c.ref,
    id: c.id,
    kind: c.kind,
    anchor: { id: a.id, stage: a.stage, class: a.class, medium: a.medium, artifact: a.artifact, claim: a.claim },
    key: { truth: c.truth, primary: c.primary, also: c.also },
    statement: c.text.statement.join('\n'),
    diff: c.text.diff.join('\n'),
    receipt: c.text.receipt.join('\n'),
    evidence: c.evidence,
    keyRun: c.keyRun,
    keyLines: c.keyLines,
    operator: c.operator,
    pair: c.pair,
    medium: c.medium,
    artifact: c.artifact,
    claim: c.claim,
    generator: c.generator ? { template: c.generator.template, band: c.generator.band, seed: c.generator.seed } : null,
    raw: c.raw,
  });
}

/** What makes an exemplar distinct by name (AUDIT-DESK 4): its operator, artifact and medium. */
export const exemplarLabel = (c) => `${c.operator ?? '?'}|${c.artifact ?? '?'}|${(c.medium ?? '?').toLowerCase()}`;

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const isDiscard = (v) => v !== null && typeof v === 'object' && typeof v.discard === 'string';

/**
 * What a key from the battery carries (scripts/spikes/W1-T40/README.md section 4), checked before it is compared:
 * `primary`, a class or 'none'; on a flawed key, `also`, the rest of the acceptable set, and `evidence: {type,
 * load_bearing}`, the lines the battery recomputed, which a G2 key always lists (a G2 case's load-bearing lines are its
 * premises' unsat core, recomputed by Z3: AUDIT-DESK 6.3). A field the battery leaves out, spells otherwise
 * (`loadBearing`, as the case it receives spells it) or gives in another form (evidence without its type, lines or
 * classes that are not text, an empty class) would read as agreeing with the case, and nothing in it would be
 * compared: each is a finding. Returns problem strings.
 */
export function keyShape(got) {
  if (typeof got.primary !== 'string' || got.primary === '') return ["names no primary class (a class, or 'none' for a sound case), so its class was not compared"];
  if (got.primary === 'none') return [];
  const out = [];
  if (!Array.isArray(got.also) || got.also.some((x) => typeof x !== 'string')) out.push('carries no also list of acceptable classes for a flawed case, so its acceptable set was not compared');
  const ev = got.evidence;
  const evidenceShaped = ev !== null && typeof ev === 'object' && typeof ev.type === 'string' && Array.isArray(ev.load_bearing) && ev.load_bearing.every((x) => typeof x === 'string');
  if (!evidenceShaped) out.push('carries no evidence {type, load_bearing} for a flawed case, so its evidence was not compared');
  if (evidenceShaped && ev.load_bearing.length === 0 && got.primary === 'G2') out.push("recomputed no load-bearing lines for a G2 case, whose lines are the premises' unsat core (AUDIT-DESK 6.3)");
  return out;
}

/**
 * Compare the battery's key with the case's: primary, acceptable set, evidence type and load-bearing lines, each set
 * both ways. A key without its primary class has nothing to compare (keyShape reports it); an empty list of lines is
 * a class whose lines the battery does not recompute.
 */
export function keyDifferences(c, got) {
  const out = [];
  if (typeof got.primary !== 'string' || got.primary === '') return out;
  const primary = got.primary === 'none' ? null : got.primary;
  if ((primary === null) !== (c.truth === 'sound') || (primary !== null && primary !== c.primary)) out.push(`the battery keys it ${primary ?? 'none: sound'}, the case says ${c.primary ?? 'none: sound'}`);
  else if (primary !== null) {
    const acc = [...new Set([primary, ...(Array.isArray(got.also) ? got.also : [])])];
    if (!sameSet(acc, c.acceptable)) out.push(`the battery's acceptable set is ${acc.join(', ')}, the case says ${c.acceptable.join(', ')}`);
    const ev = got.evidence ?? {};
    if (typeof ev.type === 'string' && ev.type !== c.evidence.type) out.push(`the battery asks for ${ev.type} evidence, the case says ${c.evidence.type}`);
    const lb = Array.isArray(ev.load_bearing) ? ev.load_bearing : [];
    if (lb.length > 0 && !sameSet(lb, c.evidence.loadBearing)) out.push(`the battery's load-bearing lines are ${lb.join(', ')}, the case says ${c.evidence.loadBearing.join(', ') || 'none'}`);
  }
  return out;
}

// ------------------------------------------------------------------ the Clearinghouse (W3-T14)

/**
 * Re-execute every shipped Clearinghouse family on its recorded seeds (spine section 11.2): its naive baseline must
 * stay below the family's bar and its reference must reach it, on the mean over the seeds, and a second execution
 * must give the same scores. The contract is scripts/spikes/W1-T40/README.md section 6.
 */
export async function checkClearinghouse(root, inject = null) {
  const findings = [];
  let families = inject;
  let file = null;
  if (!families) {
    file = join(root, CLEARINGHOUSE);
    if (!existsSync(file)) return { families: null, findings, rows: [] };
    try {
      const mod = await import(pathToFileURL(file).href);
      families = mod.auditFamilies;
    } catch (e) {
      return { families: null, findings: [{ check: 'clearinghouse', where: CLEARINGHOUSE, message: `did not load: ${e instanceof Error ? e.message : String(e)}` }], rows: [] };
    }
    if (!Array.isArray(families)) return { families: null, findings: [{ check: 'clearinghouse', where: CLEARINGHOUSE, message: 'exports no auditFamilies list' }], rows: [] };
  }
  const rows = [];
  for (const f of families) {
    const where = `clearinghouse ${f?.id ?? '?'}`;
    if (!f || typeof f.id !== 'string' || typeof f.bar !== 'number' || !Array.isArray(f.seeds) || f.seeds.length === 0 || typeof f.score !== 'function') {
      findings.push({ check: 'clearinghouse', where, message: 'a family is {id, bar, seeds (non-empty), score(policy, seed)}' });
      continue;
    }
    const run = async (policy) => {
      const xs = [];
      for (const s of f.seeds) xs.push(await f.score(policy, s));
      return xs;
    };
    const naive = await run('naive');
    const reference = await run('reference');
    const again = [...(await run('naive')), ...(await run('reference'))];
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const row = { id: f.id, bar: f.bar, seeds: f.seeds.length, naive: mean(naive), reference: mean(reference) };
    rows.push(row);
    if (![...naive, ...reference].every((x) => typeof x === 'number' && Number.isFinite(x))) findings.push({ check: 'clearinghouse', where, message: 'a baseline returned a score that is not a number' });
    else {
      if (!again.every((x, i) => x === [...naive, ...reference][i])) findings.push({ check: 'clearinghouse', where, message: 'two executions on the recorded seeds gave different scores: the world is not a pure function of its seed (I2)' });
      if (row.naive >= f.bar) findings.push({ check: 'clearinghouse', where, message: `the naive baseline meets the bar: ${row.naive.toFixed(3)} >= ${f.bar} over ${f.seeds.length} recorded seeds` });
      if (row.reference < f.bar) findings.push({ check: 'clearinghouse', where, message: `the reference misses the bar: ${row.reference.toFixed(3)} < ${f.bar} over ${f.seeds.length} recorded seeds` });
    }
  }
  return { families, findings, rows, file };
}

// ------------------------------------------------------------------ the run

/**
 * Run the gate on a tree. `inject` replaces parts for the self-check and the tests: `anchors` (normalized anchors
 * instead of the tree's pool), `battery` (with its own `ports`), `ports` (a Map of engine ports), `tracker`,
 * `families` (Clearinghouse families).
 */
export async function runGate(o, inject = {}) {
  let registry;
  try {
    registry = pool.loadRegistry(o.root);
  } catch (e) {
    return { exit: 2, error: `the ID registry could not be read: ${e instanceof Error ? e.message : String(e)}` };
  }
  const tracker = inject.tracker ?? pool.loadTracker(o.root);
  const spineAnchors = pool.loadSpineAnchors(o.root);
  const findings = [];
  const notes = [];
  const add = (check, where, message) => findings.push({ check, where, message });

  let loaded;
  if (inject.anchors) loaded = { anchors: inject.anchors, problems: inject.problems ?? [], files: [], present: true };
  else loaded = await pool.loadPool(o.root, registry);
  if (o.only.length > 0) {
    for (const id of o.only) if (!loaded.anchors.some((a) => a.id === id)) add('anchor', id, `no anchor ${id} in content/audit/`);
    loaded = { ...loaded, anchors: loaded.anchors.filter((a) => o.only.includes(a.id)), problems: loaded.problems.filter((p) => !p.anchor || o.only.includes(p.anchor)) };
  }
  if (!spineAnchors) add('anchor', 'docs/spine/SPINE.md', 'spine section 6.2 (### 6.2 Anchors) could not be read, so no anchor can be checked against it');
  const problems = [...loaded.problems, ...pool.contentProblems(loaded, { root: o.root, registry, spineAnchors })];
  for (const p of problems) {
    const where = p.case ? `${p.anchor}/${p.case}` : (p.anchor ?? p.file ?? '-');
    const message = p.message.startsWith(`${where}: `) ? p.message.slice(where.length + 2) : p.message;
    add(p.check, where, p.line ? `${message} (${p.file}:${p.line})` : message);
  }
  const anchors = loaded.anchors;
  const cases = anchors.flatMap((a) => a.cases.map((c) => [a, c]));

  // Pending declarations: their landing task exists and is not done.
  const taskState = (t) => (tracker ? (tracker.get(t)?.status ?? null) : undefined);
  const pendingTask = (where, what, lands) => {
    if (!lands || !/^W[0-9]+-[TS][0-9]{2,}$/.test(lands)) return add('pending', where, `${what}: pending, but no tracker task is named to land it`);
    const st = taskState(lands);
    if (st === null) add('pending', where, `${what}: pending until ${lands}, which tracker/tasks.yaml does not have`);
    else if (st === 'done') add('pending', where, `${what}: pending until ${lands}, which the tracker marks done`);
  };
  // Variants may wait only on the anchors that spine section 6 ships without them (AUD-2.1-AUD-2.4 and AUD-5.3 in
  // revision 3); every other anchor ships with its variants, so a pending declaration there is a finding.
  const variantless = pool.loadSpineVariantless(o.root);
  const mayWait = new Set(variantless?.ids ?? []);
  for (const a of anchors) {
    if (!a.variantsPending) continue;
    pendingTask(a.id, 'the variants', a.variantsPending.lands);
    if (!mayWait.has(a.id)) add('pending', a.id, `its variants are declared pending until ${a.variantsPending.lands}, but spine section 6 ships only ${variantless?.sentence ?? 'no anchor'} without variants: ${a.id} ships with its variants`);
  }

  // The battery, its engines and their ports.
  const loadedBattery = inject.battery !== undefined ? { battery: inject.battery, ports: inject.battery?.ports ?? {}, file: 'injected', problems: [] } : await loadBattery(o.root);
  for (const p of loadedBattery.problems) add('battery', BATTERY_FAMILY, p);
  const battery = loadedBattery.battery;
  let portMap = inject.ports ?? null;
  if (!portMap) {
    portMap = new Map(Object.entries(loadedBattery.ports ?? {}));
    const named = [...o.ports, ...(process.env.STATESPACE_GENERATOR_PORTS ?? '').split(',').map((s) => s.trim()).filter(Boolean)];
    const wanted = new Set([...(battery?.engines ?? []), ...cases.map(([, c]) => c.rekeyPending?.engine).filter(Boolean)]);
    if ([...wanted].some((e) => !portMap.has(e))) {
      const provided = await loadProviders(named);
      for (const p of provided.problems) add('unknown', '-', `port provider: ${p}`);
      const fallback = await loadProviders(DEFAULT_PROVIDERS.map((p) => join(o.root, p)).filter((p) => existsSync(p) && !named.includes(p)), true);
      for (const [e, port] of [...fallback.map, ...provided.map]) if (!portMap.has(e)) portMap.set(e, port);
    }
  }
  const port = compositePort(portMap);

  // Re-key every case: the battery, unless the case waits for its engine's lane.
  let rekeyed = 0;
  let waiting = 0;
  const pendingNotes = [];
  for (const [a, c] of cases) {
    if (c.truth === null) continue; // its key is broken: already a finding
    if (c.rekeyPending) {
      waiting++;
      const { engine, lands } = c.rekeyPending;
      pendingTask(c.ref, `the re-keying (engine ${engine ?? '?'})`, lands);
      if (engine && portMap.has(engine)) add('pending', c.ref, `its re-keying waits for engine ${engine}, but a port for ${engine} exists here: re-key it with the battery and drop rekey.pending`);
      if (o.strict) add('pending', c.ref, `--strict: the case is keyed only by its run until ${lands ?? '?'} (engine ${engine ?? '?'})`);
      pendingNotes.push(`${c.ref} until ${lands}`);
      continue;
    }
    if (!battery) continue;
    let got;
    try {
      got = await battery.key(batteryInput(a, c), port);
    } catch (e) {
      add(e?.code === 'unknown-engine' ? 'unknown' : 'battery', c.ref, `the battery could not key the case: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    if (isDiscard(got)) {
      add('unknown', c.ref, `the battery discarded the case (${got.cause ?? 'unknown'}): ${got.discard}; a check that returns unknown fails the gate (AUDIT-DESK 4.3)`);
      continue;
    }
    if (got === null || typeof got !== 'object') {
      add('battery', c.ref, 'the battery returned no key');
      continue;
    }
    rekeyed++;
    for (const p of keyShape(got)) add('battery', c.ref, `the battery's key ${p} (scripts/spikes/W1-T40/README.md section 4)`);
    for (const d of keyDifferences(c, got)) add('battery', c.ref, `the key changed: ${d}`);
    // A listed variant regenerates from its generator reference, byte for byte.
    if (c.kind === 'variant' && c.generator && typeof battery.regenerate === 'function') {
      try {
        const g = await battery.regenerate(batteryInput(a, c).anchor, { template: c.generator.template, band: c.generator.band, seed: c.generator.seed });
        for (const f of ['statement', 'diff', 'receipt']) {
          const want = c.text[f].join('\n');
          const have = pool.linesOf(g?.[f] ?? '').join('\n');
          if (want !== have) add('regenerate', c.ref, `GEN-spot-the-gap ${c.generator.template} band ${c.generator.band} seed ${c.generator.seed} regenerates another ${f}: the listed variant drifted from its generator`);
        }
      } catch (e) {
        add('regenerate', c.ref, `the variant could not be regenerated: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  const needBattery = cases.filter(([, c]) => c.truth !== null && !c.rekeyPending).length;
  if (!battery && needBattery > 0) add('battery', BATTERY_FAMILY, `no keying battery, so ${needBattery} case${needBattery === 1 ? '' : 's'} cannot be re-keyed: GEN-spot-the-gap (W1-T25) exports auditBattery (scripts/spikes/W1-T40/README.md section 4)`);
  if (battery && cases.some(([, c]) => c.kind === 'variant' && c.generator) && typeof battery.regenerate !== 'function') notes.push('the battery exports no regenerate(): listed variants are not compared with their generator');

  // Six exemplars per class whose anchors have shipped, counted by primary class rolled up to G1-G13. An exemplar
  // "differs structurally from the class's other cases (a different operator, artifact or medium), not one with
  // re-seeded constants" (AUDIT-DESK 4): a flawed case counts as a new exemplar only when its label (operator,
  // artifact, medium) is new for the class and its statement, diff and receipt differ from every exemplar already
  // counted there once white space and numeric literals are set aside (lib/pool.mjs structureOf). A case with a new
  // label and a counted exemplar's structure is a relabeled or re-seeded copy: a finding, and no exemplar. A case
  // with a counted label is another case of that exemplar: no exemplar, and no finding.
  // An anchor has shipped unless its variants are pending and spine section 6 lets them wait: an anchor with an empty,
  // missing or malformed variants field, or with a pending declaration the spine does not allow, counts as shipped,
  // so its class needs its six.
  const exemplars = new Map(); // class -> [{ case, label, structure }], in pool order
  for (const [, c] of cases) {
    if (c.truth !== 'flawed' || !c.top) continue;
    if (!exemplars.has(c.top)) exemplars.set(c.top, []);
    const counted = exemplars.get(c.top);
    const label = exemplarLabel(c);
    if (counted.some((e) => e.label === label)) continue;
    const structure = pool.structureOf(c);
    const twin = counted.find((e) => e.structure === structure);
    if (!twin) {
      counted.push({ case: c, label, structure });
      continue;
    }
    const t = twin.case;
    const other = [['operator', c.operator, t.operator], ['artifact', c.artifact, t.artifact], ['medium', c.medium, t.medium]].filter(([, x, y]) => x !== y).map(([k, x]) => `${k} ${x ?? '?'}`);
    const same = ['statement', 'diff', 'receipt'].every((f) => c.text[f].join('\n') === t.text[f].join('\n'));
    add('exemplars', c.ref, `repeats ${t.ref} under another label (${other.join(', ')}): its statement, diff and receipt ${same ? 'are the same' : 'differ from it only in numeric literals and white space'}, so it is not a new exemplar of ${c.top}; an exemplar differs structurally, not by its label or by re-seeded constants (AUDIT-DESK 4)`);
  }
  const carried = new Map(); // class -> { shipped: anchors, pending: anchors whose variants may wait, with their task }
  for (const a of anchors) {
    for (const k of new Set(a.cases.filter((c) => c.kind === 'member' && c.truth === 'flawed' && c.top).map((c) => c.top))) {
      if (!carried.has(k)) carried.set(k, { shipped: [], pending: [] });
      if (a.variantsPending && mayWait.has(a.id)) carried.get(k).pending.push(`${a.id} (${a.variantsPending.lands})`);
      else carried.get(k).shipped.push(a.id);
    }
  }
  const coverage = [];
  for (const k of registry.topClasses) {
    const n = exemplars.get(k)?.length ?? 0;
    const cv = carried.get(k);
    const status = !cv ? 'no anchor yet' : cv.shipped.length > 0 ? (n >= SIX ? 'ok' : 'short') : 'variants pending';
    coverage.push({ class: k, exemplars: n, status, shipped: cv?.shipped ?? [], pending: cv?.pending ?? [] });
    if (status === 'short') add('exemplars', k, `${k} has ${n} exemplar${n === 1 ? '' : 's'}; a class whose anchors have shipped needs at least ${SIX} that differ structurally: in operator, artifact or medium, and in their texts beyond numeric literals (shipped: ${cv.shipped.join(', ')})`);
    if (status === 'variants pending' && o.strict) add('exemplars', k, `--strict: ${k} has ${n} exemplar${n === 1 ? '' : 's'} while its anchors' variants are pending (${cv.pending.join(', ')})`);
  }

  // The Clearinghouse.
  const ch = await checkClearinghouse(o.root, inject.families ?? null);
  findings.push(...ch.findings);

  if (anchors.length === 0 && o.strict) add('pool', 'content/audit', '--strict: the audit pool is empty');
  return {
    exit: findings.length > 0 ? 1 : 0,
    findings,
    notes,
    present: loaded.present,
    anchors: anchors.length,
    cases: cases.length,
    rekeyed,
    waiting,
    pending: pendingNotes,
    battery: battery ? (loadedBattery.file === 'injected' ? 'injected' : BATTERY_FAMILY) : null,
    engines: [...portMap.keys()],
    coverage,
    clearinghouse: ch.rows,
  };
}

export function formatReport(r, verbose = false) {
  const lines = [];
  if (!r.present) lines.push('GATE-audit: there is no audit pool yet (content/audit/ arrives with W1-T33 and W1-T34)');
  else lines.push(`GATE-audit: ${r.anchors} anchors, ${r.cases} cases; ${r.rekeyed} re-keyed by the battery${r.battery ? ` (${r.battery}; ports: ${r.engines.join(', ') || 'none'})` : ' (no battery: W1-T25)'}, ${r.waiting} keyed by their runs while their engine's lane is pending`);
  if (r.pending.length > 0 && verbose) for (const p of r.pending) lines.push(`  pending re-key: ${p}`);
  const shown = r.coverage.filter((c) => c.status !== 'no anchor yet');
  if (shown.length > 0) lines.push(`  exemplars: ${shown.map((c) => `${c.class} ${c.exemplars}${c.status === 'ok' ? '' : c.status === 'short' ? ` (short of ${SIX})` : ` (variants pending: ${c.pending.join(', ')})`}`).join('; ')}`);
  lines.push(`  Clearinghouse: ${r.clearinghouse.length === 0 ? 'no family shipped yet (W3-T14)' : r.clearinghouse.map((f) => `${f.id} naive ${f.naive.toFixed(3)} < bar ${f.bar} <= reference ${f.reference.toFixed(3)} over ${f.seeds} seeds`).join('; ')}`);
  for (const n of r.notes) lines.push(`  note: ${n}`);
  const list = verbose ? r.findings : r.findings.slice(0, 60);
  for (const f of list) lines.push(`FAIL  ${f.check}  ${f.where}  ${f.message}`);
  if (list.length < r.findings.length) lines.push(`  ... ${r.findings.length - list.length} more (--verbose shows all)`);
  const byCheck = {};
  for (const f of r.findings) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1;
  const what = r.present ? `${r.anchors} anchors, ${r.cases} cases, ${r.rekeyed} re-keyed, ${r.waiting} pending re-key` : 'no pool yet';
  lines.push(r.findings.length === 0 ? `GATE-audit: green (${what})` : `GATE-audit: FAIL (${r.findings.length} finding${r.findings.length === 1 ? '' : 's'}: ${Object.entries(byCheck).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  return lines;
}

// ------------------------------------------------------------------ self-check

/**
 * Plant one fault at a time in the W1-shaped fixture pool; the gate must fail on each, and the clean pool must pass.
 * Every rule of the pool contract (scripts/spikes/W1-T40/README.md section 3) and of the gate has a case here, so that
 * a weakened rule fails its case: scripts/spikes/W1-T40/mutants.mjs weakens each in turn and runs this self-check.
 */
export async function selfCheck() {
  const fx = await import(pathToFileURL(join(LIB, 'fixtures.mjs')).href);
  const registry = pool.loadRegistry(REPO);
  // The tracker as W1 has it for the tasks the fixture names, so that the self-check's verdicts do not move as tasks
  // close: the variants of AUD-2.1-AUD-2.4 land with W2-T13 and AUD-5.3's with W3-T13, the Lean and TLC lanes with
  // W2-T01 and W3-T05; W0-S11 is done.
  const tracker = new Map([['W2-T13', 'todo'], ['W3-T13', 'todo'], ['W2-T01', 'todo'], ['W3-T05', 'todo'], ['W0-S11', 'done']].map(([id, status]) => [id, { id, status }]));
  const results = [];
  /** Normalize documents as loadPool does: one that cannot be read as an anchor is left out, its problem kept. `names[i]` is document i's file name. */
  const normalize = (docs, names = {}) => {
    const problems = [];
    const anchors = [];
    docs.forEach((doc, i) => {
      const name = names[i] ?? `${doc?.id}.yaml`;
      const a = pool.normalizeAnchor(doc, { file: `content/audit/${name}`, name, registry, problems });
      if (a) anchors.push(a);
    });
    return { anchors, problems };
  };
  const box = new Map([[fx.BOX_ENGINE, fx.boxPort]]);
  const run = (docs, inject = {}, o = {}) => {
    const { names, ...rest } = inject;
    const n = normalize(docs, names);
    return runGate({ root: REPO, only: [], strict: false, ports: [], ...o }, { anchors: n.anchors, problems: n.problems, battery: fx.fixtureBattery(), ports: box, tracker, families: [], ...rest });
  };
  const expect = async (name, check, promise, extra = () => true) => {
    const r = await promise;
    const hit = (r.findings ?? []).filter((f) => f.check === check);
    const ok = hit.length > 0 && extra(r, hit);
    const shown = (extra.text !== undefined && hit.find((f) => f.message.includes(extra.text))) || hit[0];
    results.push({ name, check, pass: ok, detail: ok ? `${shown.where}: ${shown.message}` : `no such ${check} finding (${(r.findings ?? []).map((f) => f.check).join(', ') || 'none'})${r.error ? `: ${r.error}` : ''}` });
  };
  /** The finding of the check must say this (several rules share a check). */
  const says = (text) => Object.assign((_, hit) => hit.some((f) => f.message.includes(text)), { text });
  /** The classes short of six exemplars, or one class with exactly n. */
  const shortOf = (...classes) => (r) => classes.every((k) => r.findings.some((f) => f.check === 'exemplars' && f.where === k));
  const exemplarsOf = (k, n) => (r) => r.findings.some((f) => f.check === 'exemplars' && f.where === k && f.message.startsWith(`${k} has ${n} exemplar`));
  const mutate = (fn) => {
    const docs = fx.w1Pool();
    fn(docs);
    return docs;
  };
  // The fixture's anchors, by index: 0 AUD-1.1 (G2), 1 AUD-1.2 (G4), 2 AUD-1.3 (G5), each with its pair (cases: sound,
  // flawed) and six variant pairs (variants: v1-flawed, v1-sound, ...); 3 AUD-2.1, 4 AUD-2.2, 5 AUD-2.3, 6 AUD-2.4 and
  // 7 AUD-5.3, keyed by their runs, variants pending; the cases of AUD-2.2-AUD-2.4 and AUD-5.3 wait for the Lean and TLC
  // lanes (rekey.pending).

  const clean = await run(fx.w1Pool(), { families: [fx.fixtureFamily()] });
  results.push({ name: 'the clean W1-shaped fixture passes', check: '-', pass: clean.exit === 0 && clean.rekeyed > 0, detail: clean.exit === 0 ? formatReport(clean).at(-1) : clean.findings.slice(0, 3).map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });

  // The anchor: its ID, file, stage, class and fields against the spine and the registry.
  await expect('an anchor whose id is not an anchor ID', 'anchor', run(mutate((d) => (d[0].id = 'aud-1.1'))), says('id must be an anchor ID'));
  await expect('an anchor ID the spine does not register', 'anchor', run(mutate((d) => (d[0].id = 'AUD-1.9'))), says("is not an audit anchor of the spine's registry"));
  await expect('an anchor file not named after its ID', 'anchor', run(fx.w1Pool(), { names: { 0: 'AUD-1.9.yaml' } }), says("an anchor's file is named after its ID"));
  await expect("an anchor whose stage is not the spine's", 'anchor', run(mutate((d) => (d[0].stage = 'S2'))), says('in the spine, not S2'));
  await expect('an anchor whose class differs from the spine', 'anchor', run(mutate((d) => (d[1].class = 'G8'))), says('differs from spine section 6.2'));
  await expect('an anchor without its class', 'fields', run(mutate((d) => delete d[0].class)), says('class is missing'));
  await expect('an anchor whose class is not a gap class', 'fields', run(mutate((d) => (d[0].class = 'G99'))), says('is not a gap class'));
  await expect('an anchor without its medium', 'fields', run(mutate((d) => delete d[0].medium)), says('medium is missing'));
  await expect('an anchor scheduled after nothing', 'fields', run(mutate((d) => (d[0].scheduled_after = []))), says('scheduled_after must list'));
  await expect('an anchor scheduled after a unit the registry does not have', 'fields', run(mutate((d) => (d[0].scheduled_after = ['LAB-1.3', 'S1.L99']))), says('which is not a lab, lab stage or lesson'));
  await expect("an anchor scheduled before its stage's lab", 'fields', run(mutate((d) => (d[3].scheduled_after = ['S1.L5']))), says('names no lab or lab stage of S2'));
  await expect('an anchor without its KCs', 'fields', run(mutate((d) => (d[0].kcs = []))), says('kcs must list'));
  await expect('a KC the registry does not have', 'fields', run(mutate((d) => (d[0].kcs = ['KC-1.non-vacuity-check', 'KC-1.no-such-kc']))), says('KC-1.no-such-kc is not a KC'));
  await expect('an anchor without its "based on" card', 'based-on', run(mutate((d) => delete d[0].based_on)), says('card (based_on'));
  await expect('a "based on" card without its incident', 'based-on', run(mutate((d) => delete d[0].based_on.incident)), says('based_on.incident is missing'));
  await expect('a "based on" card whose date is not a date', 'based-on', run(mutate((d) => (d[1].based_on.date = 'August 2010'))), says('based_on.date must be a quoted date'));
  await expect('a "based on" card that does not say which event its date marks', 'based-on', run(mutate((d) => delete d[0].based_on.date_marks)), says('date_marks is missing'));
  await expect('a "based on" card without its source', 'based-on', run(mutate((d) => delete d[0].based_on.source)), says('based_on.source is missing'));
  await expect('a "based on" source that is neither a URL nor a path here', 'based-on', run(mutate((d) => (d[7].based_on.source = ['docs/history/no-such-folder/', 'research/evidence/A5r3/tla/run.log']))), says('is neither a URL nor a path'));
  await expect('a "based on" card that ships code', 'based-on', run(mutate((d) => (d[0].based_on.incident = 'the refactor:\n```\ntheorem t : False := sorry\n```'))), says('holds code'));
  await expect("no case keyed by a run of spine 6.2's Key run cell", 'key-run', run(mutate((d) => {
    for (const c of d[0].cases) Object.assign(c, { key_run: 'RUN-z3-starter', key_lines: ['[1.3 guard added] unsat'] });
  })), says("Key run cell"));

  // The pair and the variants field.
  await expect('an anchor without its sound member', 'pairs', run(mutate((d) => (d[0].cases = d[0].cases.filter((c) => c.id !== 'sound')))), says('an anchor is a matched pair'));
  await expect("no flawed member keyed with the anchor's class", 'key', run(mutate((d) => (d[1].cases[1].key = { class: 'G8', also: ['G4'] }))), says('no flawed member is keyed G4'));
  await expect('an anchor without a variants field', 'fields', run(mutate((d) => delete d[3].variants)), says('variants must list'));
  await expect('variants pending without their task', 'fields', run(mutate((d) => (d[3].variants = { pending: {} }))), says('names the tracker task its variants land with'));
  await expect('an anchor with an empty variants list', 'fields', run(mutate((d) => (d[0].variants = []))), (r, h) => says('variants is an empty list')(r, h) && shortOf('G2')(r));

  // Cases: their form, keys and texts.
  await expect('a case that is not a mapping', 'fields', run(mutate((d) => d[0].variants.push('v7-flawed'))), says('is not a mapping'));
  await expect('a case without a valid id', 'fields', run(mutate((d) => (d[0].variants[0].id = 'V1 Flawed'))), says('a case needs an id'));
  await expect('two cases with one id', 'fields', run(mutate((d) => d[0].cases.push(structuredClone(d[0].cases[0])))), says('the id sound is used twice'));
  await expect('a case without a key', 'key', run(mutate((d) => delete d[0].cases[1].key)), says('a case needs a key'));
  await expect('a key that writes primary beside its class', 'key', run(mutate((d) => (d[0].cases[1].key = { class: 'G2', primary: 'G2', also: ['G1'] }))), says('`primary` is a KC tag key'));
  await expect('a sound key with acceptable classes', 'key', run(mutate((d) => (d[0].cases[0].key = { class: 'none', also: ['G1'] }))), says('a sound key has no acceptable classes'));
  await expect('a key whose acceptable classes are not a list', 'key', run(mutate((d) => (d[0].cases[1].key = { class: 'G2', also: 'G1' }))), says('key.also must be a list of gap classes'));
  await expect('a key whose class is not a gap class', 'key', run(mutate((d) => (d[0].variants[0].key = { class: 'G99', also: ['G1'] }))), says('G99 is not a gap class'));
  await expect('an acceptable class that is not a gap class', 'key', run(mutate((d) => (d[0].variants[0].key = { class: 'G2', also: ['G99'] }))), says('the acceptable class G99'));
  await expect('a case without a statement', 'fields', run(mutate((d) => delete d[1].variants[1].statement)), says('statement is missing'));
  await expect('a receipt that is not text', 'fields', run(mutate((d) => (d[1].variants[1].receipt = 42))), says('receipt must be text'));

  // Typed evidence.
  await expect('a case without evidence', 'evidence', run(mutate((d) => delete d[4].cases[1].evidence)), says('evidence is missing'));
  await expect('evidence of a type the class does not take', 'evidence', run(mutate((d) => (d[1].cases[1].evidence = { type: 'declaration', load_bearing: ['statement:5'] }))), says('a G4 finding carries witness evidence'));
  await expect('a witness without its reference artifact', 'evidence', run(mutate((d) => delete d[1].cases[1].evidence.reference)), says('needs a reference artifact'));
  await expect("a sound case whose evidence is not its restatement", 'evidence', run(mutate((d) => (d[0].cases[0].evidence = { type: 'declaration', load_bearing: ['statement:3'], scenarios: [{ text: 'one' }, { text: 'two' }, { text: 'three' }] }))), says("a sound case's evidence is its restatement"));
  await expect('a restatement without scenarios', 'evidence', run(mutate((d) => (d[0].cases[0].evidence = { type: 'restatement', scenarios: [] }))), says('at least three scenarios'));
  await expect('a restatement with two scenarios', 'evidence', run(mutate((d) => (d[0].cases[0].evidence = { type: 'restatement', scenarios: [{ text: 'one' }, { text: 'two' }] }))), says('at least three scenarios'));
  const threeScenarios = await run(mutate((d) => (d[0].cases[0].evidence.scenarios = d[0].cases[0].evidence.scenarios.slice(0, 3))));
  results.push({ name: '… and one with exactly three, which passes', check: '-', pass: threeScenarios.exit === 0, detail: threeScenarios.exit === 0 ? formatReport(threeScenarios).at(-1) : threeScenarios.findings.slice(0, 3).map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });
  await expect('a flawed case without load-bearing lines', 'evidence', run(mutate((d) => (d[4].cases[1].evidence.load_bearing = []))), says('one to three lines'));
  await expect('a flawed case with four load-bearing lines', 'evidence', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['statement:3', 'statement:5', 'statement:6', 'statement:7']))), says('one to three lines'));
  /** AUD-1.1's flawed member with `n` statement lines and no diff or receipt, its declaration on the first two. */
  const linesCase = (n) => (d) => Object.assign(d[0].cases[1], { statement: `${['s.add(amount <= a)', 's.add(a < amount)', 's.add(b >= 0)', 's.add(a >= 0)'].slice(0, n).join('\n')}\n`, diff: '', receipt: '', evidence: { type: 'declaration', load_bearing: ['statement:1', 'statement:2'] } });
  await expect('line-anchored evidence on a case with three selectable lines', 'evidence', run(mutate(linesCase(3))), says('the case has 3 selectable lines'));
  const four = await run(mutate(linesCase(4)));
  results.push({ name: '… and on a case with four, which passes that rule', check: '-', pass: !four.findings.some((f) => f.check === 'evidence'), detail: four.findings.filter((f) => f.check === 'evidence').map((f) => f.message).join('; ') || `no evidence finding (${four.findings.map((f) => f.check).join(', ') || 'none'})` });
  await expect('a load-bearing entry that is not a line reference', 'evidence', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['line 6', 'statement:6', 'statement:7']))), says('load_bearing entries are'));
  await expect('a load-bearing line the case does not have', 'evidence', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['statement:6', 'statement:7', 'statement:99']))), says('statement:99 is not a non-blank line'));
  await expect('a load-bearing line listed twice', 'evidence', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['statement:6', 'statement:7', 'statement:7']))), says('is listed twice'));

  // Key runs and key lines.
  await expect('a pair member without a key run', 'key-run', run(mutate((d) => delete d[1].cases[0].key_run)), says('names the executed run that keys it'));
  await expect('a key run named by a path, not a run ID', 'key-run', run(mutate((d) => (d[0].cases[1].key_run = '../runs/RUN-z3-vacuous-unsat'))), says('key_run must be a run ID'));
  await expect('a key run that is not on disk', 'key-run', run(mutate((d) => (d[0].cases[1].key_run = 'RUN-z3-no-such-run'))), says('is not on disk'));
  await expect('a key line that is neither a line nor {config, line}', 'key-run', run(mutate((d) => (d[0].cases[1].key_lines = ['[max0_guarded_premises] unsat', 42]))), says('key_lines entries are'));
  await expect('a pair member whose key run quotes no line', 'key-run', run(mutate((d) => (d[0].cases[1].key_lines = []))), says('quotes the verdict lines'));
  await expect('a key line its run does not state', 'key-run', run(mutate((d) => (d[0].cases[1].key_lines = ['[max0_guarded_premises] sat']))), says('states no verdict line'));
  await expect("a key line found in its run only inside a word ('sat' in 'unsat')", 'key-run', run(mutate((d) => Object.assign(d[0].variants[0], { key_run: 'RUN-cvc5-alethe', key_lines: ['sat'] }))), says('RUN-cvc5-alethe states no verdict line "sat"'));
  await expect('a key line in a configuration that does not state it', 'key-run', run(mutate((d) => (d[7].cases[1].key_lines = [{ config: '1.8.0-deadlock', line: 'Error: Deadlock reached.' }]))), says('(1.8.0-deadlock) states no verdict line'));

  // The keying battery (AUDIT-DESK 4.3): every key, acceptable set, evidence type and load-bearing line recomputed, and
  // each compared both ways, so a case that says more than the battery fails as one that says less does.
  await expect('the battery keys a case another class', 'battery', run(mutate((d) => (d[0].cases[1].key = 'G4'))), says('the key changed: the battery keys it G2'));
  await expect('a sound case the battery finds vacuous', 'battery', run(mutate((d) => {
    const flawedPremises = d[0].cases[1].check.premises;
    d[0].cases[0].check = { ...d[0].cases[0].check, premises: flawedPremises };
  })), says('the battery keys it G2, the case says none'));
  await expect('a flawed case the battery keys sound', 'battery', run(mutate((d) => (d[0].cases[1].check = structuredClone(d[0].cases[0].check)))), says('the battery keys it none: sound, the case says G2'));
  await expect('a case whose acceptable set is narrower than the one the battery computes', 'battery', run(mutate((d) => (d[0].cases[1].key = { class: 'G2', also: [] }))), says("the battery's acceptable set is G2, G1, the case says G2"));
  await expect('a case whose acceptable set is wider than the one the battery computes', 'battery', run(mutate((d) => (d[0].cases[1].key = { class: 'G2', also: ['G1', 'G12'] }))), says("the battery's acceptable set is G2, G1, the case says G2, G1, G12"));
  await expect('a case whose acceptable set has the size of the one the battery computes but another class', 'battery', run(mutate((d) => (d[0].cases[1].key = { class: 'G2', also: ['G12'] }))), says("the battery's acceptable set is G2, G1, the case says G2, G12"));
  await expect('a case whose evidence type is not the one the battery computes', 'battery', run(mutate((d) => (d[1].cases[1].check.recorded.evidence.type = 'identifiers'))), says('the battery asks for identifiers evidence, the case says witness'));
  await expect('load-bearing lines that are not the recomputed unsat core', 'battery', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['statement:3', 'statement:7']))), says("the battery's load-bearing lines are statement:6, statement:7, the case says statement:3, statement:7"));
  await expect('load-bearing lines that hold the recomputed unsat core and one line more', 'battery', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['statement:3', 'statement:6', 'statement:7']))), says("the battery's load-bearing lines are statement:6, statement:7, the case says statement:3, statement:6, statement:7"));
  await expect('load-bearing lines that hold part of the recomputed unsat core', 'battery', run(mutate((d) => (d[0].cases[1].evidence.load_bearing = ['statement:6']))), says("the battery's load-bearing lines are statement:6, statement:7, the case says statement:6"));
  await expect("the battery keys a subclass of the case's class (G1a where the case says G1)", 'battery', run(mutate((d) => (d[3].cases[1].check.recorded.class = 'G1a'))), says('the battery keys it G1a, the case says G1'));
  // The key's shape (section 4): a field the battery leaves out, or spells otherwise, is a finding, never agreement. Each
  // battery below wraps the stand-in and reshapes its keys; AUD-1.1's G2 cases are keyed with their recomputed core.
  const reshaped = (fn) => {
    const inner = fx.fixtureBattery();
    return { ...inner, key: async (input, p) => fn(await inner.key(input, p)) };
  };
  const flawedKey = (k) => k !== null && typeof k === 'object' && typeof k.primary === 'string' && k.primary !== 'none';
  await expect('a battery whose keys spell their lines loadBearing, as the case it receives does', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { ...k, evidence: { type: k.evidence.type, loadBearing: k.evidence.load_bearing } } : k)) }), says('carries no evidence {type, load_bearing}'));
  await expect('a battery whose flawed keys carry no evidence', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { primary: k.primary, also: k.also } : k)) }), says('carries no evidence {type, load_bearing}'));
  await expect('a battery that recomputes no load-bearing lines for a G2 case', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) && k.primary === 'G2' ? { ...k, evidence: { ...k.evidence, load_bearing: [] } } : k)) }), (r, h) => says('recomputed no load-bearing lines for a G2 case')(r, h) && h.every((f) => f.where.startsWith('AUD-1.1/')));
  await expect('a battery whose flawed keys give their acceptable classes as text, not a list', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { ...k, also: k.also.join(', ') } : k)) }), says('carries no also list of acceptable classes'));
  await expect('a battery whose sound keys leave out their primary class', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (k !== null && typeof k === 'object' && k.primary === 'none' ? { also: k.also, evidence: k.evidence } : k)) }), says("names no primary class (a class, or 'none' for a sound case)"));
  // Each field is there and has its type: evidence without its type would skip the type comparison, an empty class
  // the class comparison; lines or classes that are not text are not the line references and classes compared.
  await expect('a battery whose flawed keys carry their lines but no evidence type', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { ...k, evidence: { load_bearing: k.evidence.load_bearing } } : k)) }), says('carries no evidence {type, load_bearing}'));
  await expect('a battery whose flawed keys carry evidence: null', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { ...k, evidence: null } : k)) }), says('carries no evidence {type, load_bearing}'));
  await expect('a battery whose G2 keys give their load-bearing lines as numbers, not line references', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) && k.primary === 'G2' ? { ...k, evidence: { ...k.evidence, load_bearing: k.evidence.load_bearing.map((l) => Number(l.split(':')[1])) } } : k)) }), says('carries no evidence {type, load_bearing}'));
  await expect('a battery whose flawed keys list acceptable classes that are not text', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { ...k, also: k.also.map((x) => Number(x.slice(1))) } : k)) }), says('carries no also list of acceptable classes'));
  await expect('a battery whose flawed keys name their class as an empty string', 'battery', run(fx.w1Pool(), { battery: reshaped((k) => (flawedKey(k) ? { ...k, primary: '' } : k)) }), says("names no primary class (a class, or 'none' for a sound case)"));
  await expect('a check that returns unknown', 'unknown', run(fx.w1Pool(), { ports: new Map([[fx.BOX_ENGINE, fx.unknownBoxPort]]) }), says('the battery discarded the case'));
  await expect('a case the battery cannot run (no port for its engine)', 'unknown', run(fx.w1Pool(), { ports: new Map() }), says('the battery could not key the case'));
  await expect('a battery that returns no key', 'battery', run(fx.w1Pool(), { battery: { ...fx.fixtureBattery(), key: async () => null } }), says('the battery returned no key'));
  // The case as the battery receives it (section 4): plain, frozen data with the case's fields and its texts as written.
  {
    const seen = new Map();
    const inner = fx.fixtureBattery();
    const r = await run(fx.w1Pool(), { battery: { ...inner, key: async (input, p) => (seen.set(input.ref, input), inner.key(input, p)) } });
    const docs = fx.w1Pool();
    const v = docs[0].variants[0];
    const m = docs[0].cases[1];
    const got = seen.get('AUD-1.1/v1-flawed');
    const member = seen.get('AUD-1.1/flawed');
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const text = (t) => pool.linesOf(t).join('\n');
    const checks = [
      ['the battery saw every re-keyable case', r.exit === 0 && seen.size === r.rekeyed],
      ["its reference, id, kind, anchor and key", Boolean(got) && got.ref === 'AUD-1.1/v1-flawed' && got.id === 'v1-flawed' && got.kind === 'variant' && same(got.anchor, { id: 'AUD-1.1', stage: 'S1', class: 'G2', medium: 'z3py', artifact: 'guarded-transfer', claim: 'unsat, therefore safe.' }) && same(got.key, { truth: 'flawed', primary: 'G2', also: ['G1'] })],
      ['its statement, diff and receipt as written', Boolean(got) && got.statement === text(v.statement) && got.diff === text(v.diff) && got.receipt === text(v.receipt)],
      ['its evidence, operator, pair, medium, artifact, claim and generator', Boolean(got) && got.evidence.type === 'declaration' && same(got.evidence.loadBearing, v.evidence.load_bearing) && got.operator === v.operator && got.pair === 'AUD-1.1/v1' && got.medium === 'z3py' && got.artifact === v.artifact && got.claim === 'unsat, therefore safe.' && same(got.generator, { template: 't1', band: 1, seed: 0x1000 })],
      ["a member's key run and key lines, and every case's YAML object as raw", Boolean(member) && member.keyRun === m.key_run && same(member.keyLines, m.key_lines.map((line) => ({ config: null, line }))) && same(got?.raw, v) && same(member.raw, m)],
      ['frozen', Boolean(got) && Object.isFrozen(got)],
    ];
    const failed = checks.filter(([, ok]) => !ok).map(([what]) => what);
    results.push({ name: 'the case as the battery receives it (README section 4)', check: '-', pass: failed.length === 0, detail: failed.length === 0 ? `${seen.size} cases, each with its fields and texts as written` : `did not hold: ${failed.join('; ')}` });
  }
  await expect('re-keyable cases and no battery', 'battery', run(fx.w1Pool(), { battery: null }), says('no keying battery'));
  // A listed variant regenerates from its generator reference, its statement, diff and receipt each byte for byte.
  /** The battery with a regenerate() that reproduces every listed variant's texts, then passes `drift` (a field) through `edit` if given. */
  const regenerating = (drift = null, edit = (t) => `${t}\n# drifted`) => {
    const byRef = new Map();
    for (const a of fx.w1Pool()) for (const c of Array.isArray(a.variants) ? a.variants : []) if (c.generator) byRef.set(`${a.id}|${c.generator.template}|${c.generator.band}|${c.generator.seed}`, c);
    return {
      ...fx.fixtureBattery(),
      regenerate: (anchor, g) => {
        const c = byRef.get(`${anchor.id}|${g.template}|${g.band}|${g.seed}`);
        const out = { statement: c?.statement ?? '', diff: c?.diff ?? '', receipt: c?.receipt ?? '' };
        if (drift) out[drift] = edit(out[drift]);
        return out;
      },
    };
  };
  const faithful = await run(fx.w1Pool(), { battery: regenerating() });
  results.push({ name: 'a battery whose regenerate() reproduces every listed variant passes', check: '-', pass: faithful.exit === 0 && faithful.rekeyed > 0, detail: faithful.exit === 0 ? formatReport(faithful).at(-1) : faithful.findings.slice(0, 3).map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });
  await expect('a listed variant whose statement drifted from its generator', 'regenerate', run(fx.w1Pool(), { battery: regenerating('statement') }), says('regenerates another statement'));
  await expect('a listed variant whose diff drifted from its generator', 'regenerate', run(fx.w1Pool(), { battery: regenerating('diff') }), says('regenerates another diff'));
  await expect('a listed variant whose receipt drifted from its generator', 'regenerate', run(fx.w1Pool(), { battery: regenerating('receipt') }), says('regenerates another receipt'));
  await expect('a listed variant whose regenerated statement differs only by a blank first line', 'regenerate', run(fx.w1Pool(), { battery: regenerating('statement', (t) => `\n${t}`) }), says('regenerates another statement'));

  // Six exemplars per class whose anchors have shipped, an exemplar differing structurally (AUDIT-DESK 4).
  await expect('a class whose anchors shipped with five exemplars, one short of six', 'exemplars', run(mutate((d) => (d[0].variants = d[0].variants.filter((c) => /^v[1-4]-/.test(c.id))))), exemplarsOf('G2', 5));
  const six = await run(mutate((d) => (d[0].variants = d[0].variants.filter((c) => /^v[1-5]-/.test(c.id)))));
  results.push({ name: '… and one with exactly six, which passes', check: '-', pass: six.exit === 0 && six.coverage.some((c) => c.class === 'G2' && c.exemplars === SIX && c.status === 'ok'), detail: six.exit === 0 ? `G2 ${six.coverage.find((c) => c.class === 'G2')?.exemplars} exemplars: ${formatReport(six).at(-1)}` : six.findings.slice(0, 3).map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });
  await expect("AUD-1.1's six variant pairs under one label (operator, artifact and medium shared), their texts distinct", 'exemplars', run(mutate((d) => {
    for (const c of d[0].variants) delete c.artifact;
  })), exemplarsOf('G2', 2));
  /** An anchor's variant pairs replaced by six copies of its pair v1, each relabeled, each pair's texts passed through `edit(text, k)`. */
  const copiesOfV1 = (d, i, prefix, edit) => {
    const v1 = d[i].variants.filter((c) => c.pair === 'v1');
    d[i].variants = [1, 2, 3, 4, 5, 6].flatMap((k) =>
      v1.map((c) => {
        const copy = structuredClone(c);
        Object.assign(copy, { id: c.id.replace(/^v1-/, `${prefix}-${k}-`), pair: `${prefix}-${k}`, artifact: `${prefix}-${k}` });
        for (const f of ['statement', 'diff', 'receipt']) if (typeof copy[f] === 'string') copy[f] = edit(copy[f], k);
        return copy;
      }),
    );
  };
  /** n copies flagged as repeats, and the class left with `left` exemplars (the anchor's pair member and its first copy, plus any other anchor's). */
  const copiesFlagged = (k, prefix, n, left) => (r) => exemplarsOf(k, left)(r) && r.findings.filter((f) => f.check === 'exemplars' && f.where.startsWith(`${prefix}-`) && f.message.startsWith('repeats ')).length === n;
  await expect("AUD-1.2's variant pairs as six relabeled copies of its pair v1", 'exemplars', run(mutate((d) => copiesOfV1(d, 1, 'copy', (t) => t))), copiesFlagged('G4', 'AUD-1.2/copy', 5, 2));
  await expect("AUD-1.2's variant pairs as relabeled copies of its pair v1 that differ only in white space", 'exemplars', run(mutate((d) => copiesOfV1(d, 1, 'respaced', (t, k) => t.replace(/ /g, ' '.repeat(k)).replace(/\n/g, k % 2 ? '\n' : '\n\n')))), copiesFlagged('G4', 'AUD-1.2/respaced', 5, 2));
  await expect("AUD-1.3's variant pairs as pair v1 re-seeded six times under new labels", 'exemplars', run(mutate((d) => copiesOfV1(d, 2, 'reseed', (t, k) => t.replace(/\b(2000|60000)\b/g, (m) => String(Number(m) + 1000 * k))))), copiesFlagged('G5', 'AUD-1.3/reseed', 5, 3));
  // Every literal form section 3 sets aside, re-seeded at once: SMT-LIB's bit-vector literals, indexed and written out,
  // hexadecimal, a digit group with a Rust suffix, octal, binary, an exponent, a range bound, and a literal whose sign
  // the re-seeding flips.
  const literals = (k) => `(assert (= X #x000000000000000${k}))\n(assert (bvule B (_ bv${k} 64)))\n(assert (= M #b${(k % 2).toString(2)}1))\nlet cap = ${k}_000_000u64; let mask = 0x${k}F; let mode = 0o${k}; let bit = 0b${k % 2}1; let fee = ${k}e3; for i in 1..${k} {}\nlet delta = ${k % 2 ? '-' : ''}${k};\n`;
  await expect("AUD-1.2's variant pairs as pair v1 re-seeded six times in every literal form section 3 names", 'exemplars', run(mutate((d) => copiesOfV1(d, 1, 'literals', (t, k) => `${t}${t.endsWith('\n') ? '' : '\n'}${literals(k)}`))), copiesFlagged('G4', 'AUD-1.2/literals', 5, 2));
  await expect('… whose class is then short of six exemplars', 'exemplars', run(mutate((d) => (d[0].variants = []))), shortOf('G2'));
  await expect('the three S1 anchors with empty variants lists', 'exemplars', run(mutate((d) => {
    for (const i of [0, 1, 2]) d[i].variants = [];
  })), shortOf('G2', 'G4', 'G5'));

  // Pending declarations: variants, re-keying.
  await expect('variants pending on an anchor the spine ships with its variants', 'pending', run(mutate((d) => (d[0].variants = { pending: { lands: 'W2-T13' } }))), (r, h) => says('ships with its variants')(r, h) && shortOf('G2')(r));
  await expect('variants pending with a task the tracker marks done', 'pending', run(mutate((d) => (d[3].variants = { pending: { lands: 'W0-S11' } }))), says('which the tracker marks done'));
  await expect('variants pending with a task the tracker does not have', 'pending', run(mutate((d) => (d[3].variants = { pending: { lands: 'W9-T99' } }))), says('which tracker/tasks.yaml does not have'));
  await expect('a re-keying pending with no landing task', 'pending', run(mutate((d) => (d[4].cases[1].rekey = { pending: { engine: 'lean' } }))), says('no tracker task is named'));
  await expect('a malformed re-keying declaration', 'pending', run(mutate((d) => (d[4].cases[1].rekey = 'later'))), says('rekey: {pending: {engine, lands}}'));
  await expect('a case whose re-keying waits with no key run', 'pending', run(mutate((d) => delete d[4].cases[1].key_run)), says('keyed by an executed run meanwhile'));
  await expect('a re-key still pending once its engine has a port', 'pending', run(fx.w1Pool(), { ports: new Map([[fx.BOX_ENGINE, fx.boxPort], ['lean', fx.boxPort]]) }), says('but a port for lean exists here'));

  // Variants: pairs, operators, generators.
  await expect('a variant that names no pair', 'pairs', run(mutate((d) => {
    delete d[0].variants[0].pair;
    delete d[0].variants[1].pair;
  })), says('a variant names its pair'));
  await expect('a variant pair without its sound form', 'pairs', run(mutate((d) => (d[0].variants = d[0].variants.filter((c) => c.id !== 'v1-sound')))), says('needs its flawed form and its matched sound form'));
  await expect('a pair whose members carry different claims', 'pairs', run(mutate((d) => (d[0].variants[1].claim = 'proved, ship it'))), says('carry different claims'));
  await expect('a variant that names no operator', 'operator', run(mutate((d) => delete d[0].variants[0].operator)), says('names the operator that made it'));
  await expect('an operator the spine does not list', 'operator', run(mutate((d) => (d[0].variants[0].operator = 'flip-a-coin'))), says('is not an operator of spine section 6.2'));
  await expect("a variant keyed outside its operator's classes", 'operator', run(mutate((d) => (d[2].variants[0].operator = 'swap-quantifiers'))), says('but the case is keyed G5'));
  await expect('a generator reference to template t5, one past t4', 'fields', run(mutate((d) => (d[0].variants[0].generator = { template: 't5', band: 1, seed: 1 }))), says('generator is {template: t1-t4'));
  await expect('a generator reference to band 4, one past 3', 'fields', run(mutate((d) => (d[0].variants[0].generator = { template: 't1', band: 4, seed: 1 }))), says('generator is {template: t1-t4'));
  await expect('a generator reference whose seed is not a uint32', 'fields', run(mutate((d) => (d[0].variants[0].generator = { template: 't1', band: 1, seed: 2 ** 32 }))), says('generator is {template: t1-t4'));
  const edgeGenerator = await run(mutate((d) => (d[0].variants[0].generator = { template: 't4', band: 3, seed: 2 ** 32 - 1 })));
  results.push({ name: '… and one to template t4, band 3 and seed 2^32 - 1, the last of each, which passes', check: '-', pass: edgeGenerator.exit === 0, detail: edgeGenerator.exit === 0 ? formatReport(edgeGenerator).at(-1) : edgeGenerator.findings.slice(0, 3).map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });

  // The Clearinghouse (W3-T14): the naive baseline's mean over every recorded seed stays below the bar, the reference's
  // reaches it. The scores below are binary fractions, so every mean is exact, at the bar itself included.
  await expect('a Clearinghouse family whose naive baseline meets its bar', 'clearinghouse', run(fx.w1Pool(), { families: [fx.fixtureFamily({ naive: 0.8 })] }), says('the naive baseline meets the bar'));
  await expect('a Clearinghouse family whose reference misses its bar', 'clearinghouse', run(fx.w1Pool(), { families: [fx.fixtureFamily({ reference: 0.5 })] }), says('the reference misses the bar'));
  /** A family with bar 0.75 over four recorded seeds, each baseline's score a function of the seed. */
  const exact = (id, naive, reference) => ({ id, bar: 0.75, seeds: [1, 2, 3, 4], score: (policy, seed) => (policy === 'naive' ? naive(seed) : reference(seed)) });
  await expect('a Clearinghouse family whose naive baseline meets its bar exactly', 'clearinghouse', run(fx.w1Pool(), { families: [exact('CH-at-bar', () => 0.75, () => 1)] }), says('the naive baseline meets the bar: 0.750 >= 0.75'));
  await expect('a Clearinghouse family whose naive mean meets its bar though its first and lowest seed do not', 'clearinghouse', run(fx.w1Pool(), { families: [exact('CH-naive-mean', (s) => (s === 1 ? 0.5 : 0.875), () => 1)] }), says('the naive baseline meets the bar: 0.781 >= 0.75 over 4 recorded seeds'));
  await expect('a Clearinghouse family whose reference mean misses its bar though its first and highest seed reach it', 'clearinghouse', run(fx.w1Pool(), { families: [exact('CH-reference-mean', () => 0.25, (s) => (s === 1 ? 1 : 0.625))] }), says('the reference misses the bar: 0.719 < 0.75 over 4 recorded seeds'));
  const atBar = await run(fx.w1Pool(), { families: [exact('CH-reference-at-bar', (s) => (s === 1 ? 0.75 : 0.5), () => 0.75)] });
  results.push({ name: 'a Clearinghouse family whose reference reaches its bar exactly, its naive mean below it, passes', check: '-', pass: atBar.exit === 0 && atBar.clearinghouse.length === 1, detail: atBar.exit === 0 ? formatReport(atBar).find((l) => l.startsWith('  Clearinghouse:'))?.trim() : atBar.findings.map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });
  let calls = 0;
  const drifting = { ...fx.fixtureFamily(), score: (policy, seed) => (policy === 'naive' ? 0.2 : 0.8) + calls++ / 1000 + seed * 0 };
  await expect('a Clearinghouse family whose scores change between executions', 'clearinghouse', run(fx.w1Pool(), { families: [drifting] }), says('gave different scores'));
  // The repeat covers both baselines: here only the reference's second execution differs.
  let referenceCalls = 0;
  await expect("a Clearinghouse family whose reference scores change between executions, its naive scores steady", 'clearinghouse', run(fx.w1Pool(), { families: [exact('CH-reference-drift', () => 0.25, () => (referenceCalls++ < 4 ? 0.875 : 0.9375))] }), says('gave different scores'));
  await expect('a Clearinghouse family without recorded seeds', 'clearinghouse', run(fx.w1Pool(), { families: [{ ...fx.fixtureFamily(), seeds: [] }] }), says('a family is {id, bar, seeds (non-empty)'));
  await expect('a Clearinghouse family whose score is not a number', 'clearinghouse', run(fx.w1Pool(), { families: [{ ...fx.fixtureFamily(), score: () => Number.NaN }] }), says('a score that is not a number'));

  // The options: --strict (what a release asks) and --only.
  const strict = run(fx.w1Pool(), {}, { strict: true });
  await expect('--strict: a re-key still pending', 'pending', strict, (_, h) => h.some((f) => f.message.startsWith('--strict')));
  await expect('--strict: variants still pending', 'exemplars', strict, (_, h) => h.some((f) => f.message.startsWith('--strict')));
  await expect('--strict: an empty pool', 'pool', run([], {}, { strict: true }), says('--strict: the audit pool is empty'));
  await expect('--only names an anchor the pool lacks', 'anchor', run(fx.w1Pool(), {}, { only: ['AUD-1.9'] }), says('no anchor AUD-1.9 in content/audit/'));

  // The pool read from files: green, then red on one planted fault at a time, through content/audit/ and its reader.
  const tree = mkdtempSync(join(tmpdir(), 'audit-tree-'));
  try {
    for (const d of ['packages', 'docs', 'tracker', 'runs', 'research']) symlinkSync(join(REPO, d), join(tree, d));
    const dir = join(tree, 'content', 'audit');
    const writePool = (files) => {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    };
    const asFiles = (docs) => Object.fromEntries(docs.map((a) => [`${a.id}.json`, `${JSON.stringify(a, null, 2)}\n`]));
    const fromTree = () => runGate({ root: tree, only: [], strict: false, ports: [] }, { battery: fx.fixtureBattery(), ports: box, tracker, families: [] });
    const files = asFiles(fx.w1Pool());
    writePool(files);
    const fromFiles = await fromTree();
    results.push({ name: 'the fixture read from files passes', check: '-', pass: fromFiles.exit === 0 && fromFiles.anchors === 8, detail: fromFiles.exit === 0 ? formatReport(fromFiles).at(-1) : fromFiles.findings.slice(0, 3).map((f) => f.message).join('; ') });
    // Files whose names start with an underscore, and readme files, are not anchors (section 3), however they read.
    writePool({ ...files, '_draft.yaml': 'id: [not, an anchor\n', 'readme.yaml': 'notes: {unclosed\n' });
    const skipped = await fromTree();
    results.push({ name: 'a file whose name starts with an underscore, and a readme, are not read as anchors', check: '-', pass: skipped.exit === 0 && skipped.anchors === 8, detail: skipped.exit === 0 ? formatReport(skipped).at(-1) : skipped.findings.slice(0, 3).map((f) => `${f.check} ${f.where}: ${f.message}`).join('; ') });
    writePool({ ...files, 'AUD-1.3.json': '{ "id": "AUD-1.3", "stage": "S1",\n' });
    await expect('a pool file that does not parse', 'file', fromTree(), says('not valid JSON'));
    writePool({ ...files, 'AUD-2.1.json': '[1, 2]\n' });
    await expect('a pool file that holds no mapping', 'file', fromTree(), says('is not a mapping'));
    writePool({ ...files, 'AUD-1.3b.json': files['AUD-1.3.json'] });
    await expect('two pool files that define one anchor', 'anchor', fromTree(), says('AUD-1.3 is defined twice'));
  } finally {
    rmSync(tree, { recursive: true, force: true });
  }
  return results;
}

// ------------------------------------------------------------------ main

export async function main(argv, io = { out: (s) => process.stdout.write(`${s}\n`), err: (s) => process.stderr.write(`${s}\n`) }) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (e) {
    io.err(`verify-audit: ${e.message}\n${USAGE}`);
    return 2;
  }
  if (o.selfCheck) {
    const results = await selfCheck();
    for (const r of results) io.out(`${r.pass ? 'held' : 'FAIL'}  ${r.check.padEnd(13)}  ${r.name}: ${r.detail}`);
    const failed = results.filter((r) => !r.pass).length;
    io.out(failed === 0 ? `GATE-audit self-check: green (${results.length} cases held)` : `GATE-audit self-check: FAIL (${failed} of ${results.length} cases did not hold)`);
    return failed === 0 ? 0 : 1;
  }
  const r = await runGate(o);
  if (r.error) {
    io.err(`verify-audit: ${r.error}`);
    return r.exit;
  }
  if (o.json) io.out(JSON.stringify(r, null, 2));
  else for (const l of formatReport(r, o.verbose)) io.out(l);
  return r.exit;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
