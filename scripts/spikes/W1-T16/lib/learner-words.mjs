// The words of a specimen record, held to the internal-name rule (W1-T16).
//
// A label shows a record's words word for word, so they are learner copy: none of the names that content/glossary.yaml
// lists under `internal` (Boot, KC, the tier names, lane, Shelf, ...; learners see the `say` beside each), and no ID of the
// kinds it lists under `internalIds` (a knowledge component's ID, a gate, a generator, a task, ...). This is GATE-lessons'
// `internal` rule (spine section 0; DESIGN.md section 11.4) applied to what GATE-lessons does not read: content/specimens/
// and the screen's own strings. The glossary is the one source: this file holds no list of names, so a name the glossary
// gains is refused here the day it lands.
//
// Matching is the glossary's own (its header): whole words, case ignored unless the entry says caseSensitive, and a space
// in a form also matches a hyphen or a line wrap. The check reads the raw text, code spans included, so it refuses
// everything the gate would and a little more; the gate's exception for a name used as a plain verb is not made.
//
// Run through Node's type stripping: the ID grammar is TypeScript.

import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { scanLine } from '../../../../packages/ids/src/grammar.ts';
import { REPO } from '../../../runs/registry.mjs';

export const GLOSSARY = 'content/glossary.yaml';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A form as a pattern: whole words, with a space read as a run of white space or hyphens. */
function matcherOf(form, caseSensitive) {
  const body = escapeRegExp(form.trim()).replace(/ +/g, '[\\s-]+');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, caseSensitive ? 'gu' : 'giu');
}

/** Compile the glossary's internal names from the parsed document. Throws on a document that lists none: the guard never passes by finding nothing to look for. */
export function compileGlossary(doc) {
  const list = Array.isArray(doc?.internal) ? doc.internal : [];
  if (list.length === 0) throw new Error(`${GLOSSARY} has no \`internal\` list, so no word can be held to it`);
  const internal = list.map((x, i) => {
    if (typeof x?.name !== 'string' || x.name === '') throw new Error(`${GLOSSARY}: internal[${i}] has no name`);
    const forms = Array.isArray(x.forms) && x.forms.length > 0 ? x.forms.map(String) : [x.name];
    return { name: x.name, say: String(x.say ?? ''), matchers: forms.map((f) => matcherOf(f, x.caseSensitive === true)) };
  });
  const internalIds = new Set(Array.isArray(doc.internalIds) ? doc.internalIds.map(String) : []);
  return { internal, internalIds };
}

/**
 * The glossary under a repository root: { glossary } or { problem }. A tree under `--root` that has none (a scratch copy of what
 * the builder reads) falls back to this repository's, as GATE-lessons' `--root` does: the vocabulary is the course's, not the
 * tree's. With neither, there is nothing to hold the words to, which is a problem and never a pass.
 */
export function readGlossary(root, fallback = REPO) {
  const file = [path.join(root, GLOSSARY), path.join(fallback, GLOSSARY)].find((f) => fs.existsSync(f));
  if (file === undefined) return { problem: `${GLOSSARY}: is not there, so the words of the records cannot be held to its internal names` };
  try {
    return { glossary: compileGlossary(parse(fs.readFileSync(file, 'utf8'))) };
  } catch (e) {
    return { problem: `${GLOSSARY}: ${e.message}` };
  }
}

/**
 * The internal names and the IDs of the course's machinery in one string of learner copy: [{ rule, word, detail }].
 * The detail says what the gate says: "Boot" is an internal name (Boot); learners see Start here.
 */
export function internalFindings(text, glossary) {
  const out = [];
  for (const x of glossary.internal) {
    for (const matcher of x.matchers) {
      for (const m of text.matchAll(matcher)) out.push({ rule: `internal/${x.name}`, word: m[0], at: m.index, detail: `"${m[0]}" is an internal name (${x.name}); learners see ${x.say}` });
    }
  }
  for (const t of scanLine(text)) {
    if (glossary.internalIds.has(t.kind)) out.push({ rule: `internal/id-${t.kind}`, word: t.id, at: t.col - 1, detail: `${t.id} is an ID of the course's machinery (${t.kind}); learner copy names the thing a learner works with, never this` });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The words of a record that a label shows a learner, each with where it stands in the record: [[where, text], ...]. */
export function learnerWords(record) {
  const words = [
    ['title', record.title],
    ['violates', record.violates],
    ['because', record.because],
    ['class', record.class],
    ['cured_by.text', record.cured_by?.text],
    ...(record.evidence?.also ?? []).map((a, i) => [`evidence.also[${i}].caption`, a?.caption]),
    ['evidence.minimal.why', record.evidence?.minimal?.why],
    ['incident.source.title', record.incident?.source?.title],
  ];
  return words.filter(([, text]) => typeof text === 'string');
}
