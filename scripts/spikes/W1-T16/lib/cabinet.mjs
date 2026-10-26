// Builds the specimen cabinet from the repository (W1-T16): every record of content/specimens/ read, validated against
// specimen@1, checked against the ID registry, the spine's table and the glossary's internal names, and its evidence
// resolved from the run records of runs/ by apps/site/src/screens/specimens/model/evidence.ts (the code the site shares).
// The result is apps/site/src/screens/specimens/data/cabinet.generated.json, which the site loads: the browser cannot read
// runs/, so the lines a label is generated from travel with the cabinet, and a test fails when the committed file is not
// what this builds (a tool bump that changes a run shows here as a diff to review, never as a stale label).
//
// Run through type stripping (Node 22.18+): the shared model is TypeScript.

import fs from 'node:fs';
import path from 'node:path';
import { REPO, loadRegistry } from '../../../runs/registry.mjs';
import { canonicalJson, sha256Hex } from '../../../../packages/ledger/src/index.ts';
import { GRAPH } from '../../../../packages/kc/src/graph.generated.ts';
import { validate } from '../../../../packages/schema/src/index.ts';
import { resolveEvidence, runsOf } from '../../../../apps/site/src/screens/specimens/model/evidence.ts';
import { runTokens } from '../../../../apps/site/src/screens/specimens/model/text.ts';
import { internalFindings, learnerWords, readGlossary } from './learner-words.mjs';

export const CABINET_PATH = 'apps/site/src/screens/specimens/data/cabinet.generated.json';
export const RECORDS_DIR = 'content/specimens';
const SPINE = 'docs/spine/SPINE.md';
const REGISTRY = 'packages/ids/src/registry.json';

/** The specimens of the spine's table 5.1 with their lesson and the words of their name, and whether it says dated incident. */
export function spineSpecimens(root) {
  const rows = new Map();
  const file = path.join(root, SPINE);
  if (!fs.existsSync(file)) return rows;
  for (const line of fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n').split('\n')) {
    const m = /^\|\s*(SP-[1-9][0-9]*\.[1-9][0-9]*)\s*\|\s*(.*?)\s*\|\s*(S[0-9]+\.L[0-9]+)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (!m) continue;
    const runs = [...m[4].matchAll(/RUN-[a-z0-9]+(?:-[a-z0-9]+)*/g)].map((r) => r[0]);
    rows.set(m[1], { id: m[1], text: m[2], lesson: m[3], dated: /\(dated incident\)/.test(m[2]), runs: [...new Set(runs)] });
  }
  return rows;
}

const plain = (s) => s.replace(/[`*_"“”'’]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** The run records of runs/ as the resolver's source. */
export function runSource(root) {
  const byId = new Map(loadRegistry(root).filter((r) => !r.error).map((r) => [r.id, r.doc]));
  return { get: (id) => byId.get(id) };
}

/** Records in lesson sources that mount a specimen (`::specimen id=SP-1.1`, mount unless `mount=false`): [{ lesson, id }]. */
function lessonMounts(root) {
  const out = [];
  const dir = path.join(root, 'content', 'stages');
  if (!fs.existsSync(dir)) return out;
  for (const stage of fs.readdirSync(dir)) {
    const sub = path.join(dir, stage);
    if (!fs.statSync(sub).isDirectory()) continue;
    for (const f of fs.readdirSync(sub)) {
      const m = /^(S[0-9]+\.L[0-9]+)\.md$/.exec(f);
      if (!m) continue;
      for (const line of fs.readFileSync(path.join(sub, f), 'utf8').split('\n')) {
        const s = /^::specimen\s+(.*)$/.exec(line);
        if (!s) continue;
        const id = /\bid=(SP-[0-9]+\.[0-9]+)\b/.exec(s[1])?.[1];
        if (id && !/\bmount=false\b/.test(s[1])) out.push({ lesson: m[1], id });
      }
    }
  }
  return out;
}

export function buildCabinet(root = REPO) {
  const problems = [];
  const warnings = [];
  const registry = JSON.parse(fs.readFileSync(path.join(root, REGISTRY), 'utf8')).entries;
  const lessons = new Set(registry.filter((e) => e.kind === 'lesson').map((e) => e.id));
  const specimenEntries = new Map(registry.filter((e) => e.kind === 'specimen').map((e) => [e.id, e]));
  const spine = spineSpecimens(root);
  const stages = registry.filter((e) => e.kind === 'stage').map((e) => ({ id: e.id, title: e.title }));
  stages.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  const labStages = new Set(registry.filter((e) => e.kind === 'lab-stage').map((e) => e.id));
  const claims = new Set(registry.filter((e) => e.kind === 'claim-template').map((e) => e.id));
  const kcById = new Map(GRAPH.kcs.map((k) => [k.id, k.name]));
  const source = runSource(root);
  // the words of a record are learner copy: the glossary's internal names are refused in them (lib/learner-words.mjs)
  const { glossary, problem: glossaryProblem } = readGlossary(root);
  if (glossaryProblem !== undefined) problems.push(glossaryProblem);

  const dir = path.join(root, RECORDS_DIR);
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
  const files = names.filter((f) => f.endsWith('.json'));
  // a record is a JSON file: GATE-specimens counts a record of another format as mounted, and this cabinet would never show it
  // (a name that starts with a dot, such as .DS_Store, is the machine's and no record's)
  for (const f of names) {
    if (f !== 'README.md' && !f.startsWith('.') && !f.endsWith('.json')) problems.push(`${RECORDS_DIR}/${f}: a record is a JSON file named for its id (SP-1.1.json), and this is not one: GATE-specimens would count it as mounted and the cabinet would never show it`);
  }
  const entries = [];
  const seen = new Set();
  for (const f of files) {
    const rel = `${RECORDS_DIR}/${f}`;
    let record;
    try {
      record = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      problems.push(`${rel}: not JSON: ${e.message}`);
      continue;
    }
    const bad = (what) => problems.push(`${rel}: ${what}`);
    const result = validate('specimen', record);
    if (!result.ok) {
      for (const issue of result.issues.slice(0, 6)) bad(`not specimen@1: ${issue.instancePath || '/'} ${issue.keyword}: ${issue.message}`);
      continue;
    }
    if (`${record.id}.json` !== f) bad(`the file is named for ${f.replace(/\.json$/, '')}, and the record's id is ${record.id}`);
    if (seen.has(record.id)) bad(`${record.id} is mounted twice`);
    seen.add(record.id);

    // a course specimen is the registry's and the spine's: its lesson, the words of its name, its dated-incident mark, its runs
    if (/^SP-/.test(record.id)) {
      const reg = specimenEntries.get(record.id);
      const row = spine.get(record.id);
      if (!reg || !row) bad(`${record.id} is not a specimen of the spine's table 5.1`);
      else {
        if (record.found_in.lesson !== reg.lesson) bad(`found_in.lesson is ${record.found_in.lesson ?? '(absent)'}, and the spine's table gives ${reg.lesson}`);
        if (!plain(row.text).includes(plain(record.title))) bad(`the title ${JSON.stringify(record.title)} is not in the spine's words for the specimen (${JSON.stringify(row.text)})`);
        if (row.dated && record.incident === undefined) bad('the spine marks it a dated incident and the record has no incident');
        if (!row.dated && record.incident !== undefined) bad('the record has an incident and the spine does not mark the specimen a dated incident');
        const cited = new Set([...runsOf(record), ...[record.because, record.violates, record.class, record.cured_by.text].flatMap(runTokens), ...(record.evidence.also ?? []).flatMap((a) => runTokens(a.caption))]);
        for (const run of row.runs) if (!cited.has(run)) bad(`the spine names ${run} behind the specimen and the record does not cite it`);
      }
    } else if (record.mount !== undefined) bad('a specimen that is not a course specimen has no mount rule: its own lab check mounts it');
    // a course specimen is mounted by a first call in a lesson, the one that finds it among them; with no rule, or one that leaves that lesson out, no learner is ever shown it
    if (/^SP-/.test(record.id)) {
      const finds = specimenEntries.get(record.id)?.lesson;
      if (record.mount === undefined) bad('a course specimen has a mount rule: without one no learner is ever shown it');
      else if (finds !== undefined && !record.mount.lessons.includes(finds)) bad(`mount.lessons are ${record.mount.lessons.join(', ')} and leave out ${finds}, the lesson of the spine's table: the specimen would not be mounted where it is found`);
    }
    for (const l of record.mount?.lessons ?? []) if (!lessons.has(l)) bad(`mount.lessons names ${l}, which is not a lesson`);
    if (record.found_in.lesson !== undefined && !lessons.has(record.found_in.lesson)) bad(`found_in.lesson ${record.found_in.lesson} is not a lesson`);
    if (record.found_in.lab_stage !== undefined && !labStages.has(record.found_in.lab_stage)) bad(`found_in.lab_stage ${record.found_in.lab_stage} is not a lab stage`);
    if (record.cured_by.claim !== undefined && !claims.has(record.cured_by.claim)) bad(`cured_by.claim ${record.cured_by.claim} is not a claim template of the registry`);
    if (record.incident !== undefined && record.incident.toy_model !== true) bad("incident.toy_model is not true: a dated incident is kept as a toy model of its mechanism and never as the incident's code, and the label says so");
    if (glossary !== undefined) for (const [where, text] of learnerWords(record)) for (const found of internalFindings(text, glossary)) bad(`${where}: ${found.detail}`);
    const kcNames = {};
    for (const kc of record.kcs) {
      if (!kcById.has(kc)) bad(`${kc} is not a KC of the graph`);
      else kcNames[kc] = kcById.get(kc);
    }

    const resolved = resolveEvidence(record, source);
    for (const p of resolved.problems) problems.push(`${rel}: ${p}`);
    if (resolved.evidence !== null) entries.push({ record, evidence: resolved.evidence, rev: sha256Hex(canonicalJson(record)), kcNames });
  }

  // lesson sources that mount a specimen name where the cabinet's records say it is mounted: a mismatch is a note for the integrator
  // (the lessons are other tasks' and may not be authored yet), never a failure here
  const mounts = lessonMounts(root);
  for (const m of mounts) {
    const e = entries.find((x) => x.record.id === m.id);
    if (e && e.record.mount && !e.record.mount.lessons.includes(m.lesson)) warnings.push(`${m.lesson} mounts ${m.id} (::specimen), and the record's mount.lessons are ${e.record.mount.lessons.join(', ')}`);
  }
  for (const e of entries) {
    for (const l of e.record.mount?.lessons ?? []) {
      const page = path.join(root, 'content', 'stages', `S${l.slice(1).split('.')[0]}`, `${l}.md`);
      if (fs.existsSync(page) && !mounts.some((m) => m.id === e.record.id && m.lesson === l)) warnings.push(`the record mounts ${e.record.id} in ${l}, and ${l}.md has no ::specimen id=${e.record.id} block`);
    }
  }

  entries.sort((a, b) => a.record.id.localeCompare(b.record.id, 'en', { numeric: true }));
  return { cabinet: { format: 'cabinet/1', stages, specimens: entries }, problems, warnings };
}

/** The file's text: JSON, two-space indent, one trailing newline, so that a diff is a diff of the data. */
export const cabinetText = (cabinet) => `${JSON.stringify(cabinet, null, 2)}\n`;
