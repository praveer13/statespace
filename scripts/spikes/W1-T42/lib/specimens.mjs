// What GATE-specimens checks, read from the repository (W1-T42): the specimens of spine section 5.1 with the runs
// behind each, the cabinet's records in content/specimens/ (W1-T16), and the run records of runs/.
//
// The catalog is the spine's table, because it names the runs behind each specimen: `[X RUN-id]` for a run on disk,
// `{{run:RUN-id}}` for a run still to record (spine 5.1: "Status is [X RUN-id] when the run exists or {{run:RUN-id}}
// when it must be recorded first"). The cabinet's records are the specimens as mounted; one is found by the name of
// its file (SP-1.4.json, SP-1.4.yaml) or by its `id`, and every RUN-... in it is a run it cites.

import fs from 'node:fs';
import path from 'node:path';
import { RUN_ID, isFormMention, loadRegistry, referencesOf } from '../../../runs/registry.mjs';

export const SPECIMEN_ID = /^SP-(\d+)\.(\d+)$/;
export const stageOf = (specimenId) => `S${SPECIMEN_ID.exec(specimenId)[1]}`;

/**
 * The specimens of §5.1 with the runs the spine names behind each.
 * @returns {{specimens: {id: string, stage: string, lesson: string|null, executed: string[], pending: string[]}[], problems: string[]}}
 */
export function readSpineSpecimens(root) {
  const file = path.join(root, 'docs', 'spine', 'SPINE.md');
  if (!fs.existsSync(file)) return { specimens: [], problems: [`docs/spine/SPINE.md is not under ${path.basename(root)}: the gate has no specimen catalog`] };
  const specimens = [];
  const problems = [];
  const seen = new Set();
  for (const line of fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n').split('\n')) {
    const m = /^\|\s*(SP-\d+\.\d+)\s*\|/.exec(line);
    if (!m) continue;
    const id = m[1];
    if (seen.has(id)) {
      problems.push(`${id} appears twice in the spine's table`);
      continue;
    }
    seen.add(id);
    const cells = line.replace(/^\||\|\s*$/g, '').split(/\s\|\s/).map((c) => c.trim());
    const lessonCell = cells.find((c, i) => i > 0 && /^S\d+\.L\d+$/.test(c));
    const executed = [];
    const pending = [];
    for (const ref of referencesOf(line)) {
      if (isFormMention(ref) || !RUN_ID.test(ref.id)) continue;
      const into = ref.form === 'tag' ? executed : pending;
      if (!into.includes(ref.id)) into.push(ref.id);
    }
    specimens.push({ id, stage: stageOf(id), lesson: lessonCell ?? null, executed, pending });
  }
  if (specimens.length === 0) problems.push('docs/spine/SPINE.md has no specimen row (| SP-n.m | ... |)');
  return { specimens, problems };
}

/** Files of the cabinet that are not specimens: an index or manifest, a file whose name starts with an underscore, a schema. */
export const NOT_A_RECORD = /^(?:index|manifest|_.*)\.(?:json|ya?ml)$|\.schema\.json$/i;

/**
 * The cabinet's records. Every file under content/specimens/ with a .json, .yaml or .yml extension, except those of
 * NOT_A_RECORD, is read as text for its RUN-ids; its specimen is named by the file or by an `id` field.
 * @returns {{present: boolean, records: {id: string|null, file: string, runs: string[]}[]}}
 */
export function readCabinet(root) {
  const dir = path.join(root, 'content', 'specimens');
  if (!fs.existsSync(dir)) return { present: false, records: [] };
  const records = [];
  const walk = (d) => {
    for (const name of fs.readdirSync(d).sort()) {
      const abs = path.join(d, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs);
      else if (/\.(json|ya?ml)$/.test(name) && !NOT_A_RECORD.test(name)) records.push(readRecord(root, abs));
    }
  };
  walk(dir);
  return { present: true, records: records.flat() };
}

const runsIn = (text) => [...new Set([...String(text).matchAll(/RUN-[a-z0-9]+(?:-[a-z0-9]+)*/g)].map((m) => m[0]).filter((id) => RUN_ID.test(id)))];

function readRecord(root, abs) {
  const rel = path.relative(root, abs).split(path.sep).join('/');
  const text = fs.readFileSync(abs, 'utf8');
  const stem = path.basename(abs).replace(/\.(json|ya?ml)$/, '');
  if (abs.endsWith('.json')) {
    try {
      const doc = JSON.parse(text);
      const items = Array.isArray(doc) ? doc : Array.isArray(doc?.specimens) ? doc.specimens : [doc];
      return items.map((item) => {
        const id = typeof item?.id === 'string' && SPECIMEN_ID.test(item.id) ? item.id : SPECIMEN_ID.test(stem) && items.length === 1 ? stem : null;
        return { id, file: rel, runs: runsIn(JSON.stringify(item)) };
      });
    } catch {
      /* not JSON: read it as text, like a YAML file */
    }
  }
  const named = /^\s*-?\s*id:\s*["']?(SP-\d+\.\d+)["']?\s*$/m.exec(text)?.[1];
  const id = SPECIMEN_ID.test(stem) ? stem : (named ?? null);
  return [{ id, file: rel, runs: runsIn(text) }];
}

/** The run records on disk by id, and the spine's own status for each registered run id (executed, to-record). */
export function readRuns(root) {
  const records = new Map();
  for (const r of loadRegistry(root)) records.set(r.id, r);
  const status = new Map();
  const file = path.join(root, 'packages', 'ids', 'src', 'registry.json');
  if (fs.existsSync(file)) {
    try {
      for (const e of JSON.parse(fs.readFileSync(file, 'utf8')).entries ?? []) if (e.kind === 'run') status.set(e.id, e.status ?? null);
    } catch {
      /* the registry is GATE-links' to check */
    }
  }
  return { records, status };
}
