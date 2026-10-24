// The gate's own tests: plant a fault in a scratch copy of the files GATE-schema reads, run the gate there
// and require it to fail on the check that should catch the fault. A gate that cannot be made to fail is
// not a gate. `node scripts/verify-schema.mjs --self-check` runs this; it takes about a minute, so it
// belongs to the nightly lane and to whoever changes the gate, not to every pull request.

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { lintPattern } from './subset.mjs';

const COPY = ['schemas', 'packages/schema', 'bench/statespace/schema', 'scripts/verify-schema.mjs'];
const KEEP = (relative) => !/(^|\/)(__pycache__|node_modules|test)(\/|$)/.test(relative);

const edit = (root, file, fn) => {
  const p = path.join(root, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`the planted fault did not change ${file}`);
  fs.writeFileSync(p, after);
};
const json = (root, file, fn) => edit(root, file, (t) => `${JSON.stringify(fn(JSON.parse(t)), null, 2)}\n`);
const write = (root, file, text) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), text);
};
const regenerate = async (root) => {
  const { write: generate } = await import(`${pathToFileURL(path.join(root, 'schemas/codegen/generate.mjs')).href}?${Math.random()}`);
  generate(root);
};
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');

const RULES = 'rules:\n  - comparison: example\n';
// A planted run record with the run@1 core fields (GATE-schema validates every runs/RUN-*.json against run@1); only
// its inputs matter to the keep/kill check.
const keepKillRun = (hash) =>
  `${JSON.stringify({
    id: 'RUN-keepkill-rules',
    title: 'Self-check fixture: the keep/kill rules file and the SHA-256 recorded for it',
    engine: 'node',
    version: '22.22.2',
    binary: null,
    binary_sha256: null,
    image: null,
    recorded_at: '2026-10-24T00:00:00Z',
    started_at: '2026-10-24T00:00:00Z',
    duration_s: 0,
    argv: ['node', 'scripts/spikes/W0-T07/record.mjs'],
    inputs: [{ path: 'content/governance/keepkill-rules.yaml', sha256: hash }],
    budget: {},
    exit_code: 0,
    verdict_lines: [],
    outputs: [],
    environment: { os: 'Linux', cpu_count: 1 },
    notes: ['A planted record; only its inputs matter to the keep/kill check.'],
  })}\n`;

/** [name, plant(root), the checks that must report FAIL, extra gate arguments] */
const SCENARIOS = [
  ['an unmodified copy passes', async () => {}, []],
  // receipt@1 is published (W0-S11), so the copy stands for the state before it landed.
  ['--strict fails while a later task owes receipt.schema.json', async (r) => fs.rmSync(path.join(r, 'schemas/receipt.schema.json')), ['schema receipt'], ['--strict']],
  ['a generated TypeScript file is edited by hand', async (r) => edit(r, 'packages/schema/src/generated/types.ts', (t) => `${t}// tampered\n`), ['generated files']],
  ['a schema gains a property and nobody regenerates', async (r) => json(r, 'schemas/claim.schema.json', (j) => ({ ...j, properties: { ...j.properties, note: { type: 'string' } } })), ['generated files']],
  ['a Python record loses a key', async (r) => edit(r, 'bench/statespace/schema/records.py', (t) => t.replace('    agent: NotRequired[bool]\n', '')), ['generated files']],
  ['a Python field becomes required', async (r) => edit(r, 'bench/statespace/schema/records.py', (t) => t.replace('    template: NotRequired[ClaimTemplateId]', '    template: ClaimTemplateId')), ['generated files']],
  ['the Python emitter forgets that a property is optional, and the files are regenerated from it', async (r) => {
    edit(r, 'schemas/codegen/emit-py.mjs', (t) => t.replace('t = `NotRequired[${t}]`;', 't = t;'));
    await regenerate(r);
  }, ['types in sync']],
  ['the TypeScript emitter forgets that a property is optional, and the files are regenerated from it', async (r) => {
    edit(r, 'schemas/codegen/emit-ts.mjs', (t) => t.replace("${p.optional ? '?' : ''}", ''));
    await regenerate(r);
  }, ['types in sync']],
  ['a pattern ends with $ instead of the portable idiom', async (r) => edit(r, 'schemas/defs.schema.json', (t) => t.replace('^[0-9a-f]{64}(?![\\\\s\\\\S])', '^[0-9a-f]{64}$')), ['schemas']],
  ['a $ pattern is regenerated: Python accepts a trailing newline, TypeScript does not', async (r) => {
    edit(r, 'schemas/defs.schema.json', (t) => t.replace('^[0-9a-f]{64}(?![\\\\s\\\\S])', '^[0-9a-f]{64}$'));
    await regenerate(r);
  }, ['schemas', 'validators agree']],
  ['a schema is loosened and regenerated: an invalid value is accepted', async (r) => {
    json(r, 'schemas/defs.schema.json', (j) => {
      delete j.$defs.sha256.pattern;
      return j;
    });
    await regenerate(r);
  }, ['validators agree']],
  ['a keyword outside the subset appears', async (r) => json(r, 'schemas/claim.schema.json', (j) => ({ ...j, patternProperties: { '^x-': { type: 'string' } } })), ['schemas']],
  ['a tuple lets a leading item be optional', async (r) => json(r, 'schemas/claim.schema.json', (j) => ({ ...j, properties: { ...j.properties, pair: { type: 'array', prefixItems: [{ type: 'string' }, { type: 'string' }], minItems: 1, items: false } } })), ['schemas']],
  ['a $ref names nothing', async (r) => json(r, 'schemas/claim.schema.json', (j) => ({ ...j, properties: { ...j.properties, model: { $ref: 'urn:statespace:defs@1#/$defs/nonesuch' } } })), ['schemas']],
  ['the TypeScript validator miscounts a length', async (r) => edit(r, 'packages/schema/src/validate.ts', (t) => t.replace('codePointLength(value) < min', 'codePointLength(value) <= min')), ['validators agree']],
  ['the TypeScript trim forgets U+FEFF', async (r) => edit(r, 'packages/schema/src/statement-hash.ts', (t) => t.replace('TRIM_RIGHT.has(text.charCodeAt(end - 1))', '(TRIM_RIGHT.has(text.charCodeAt(end - 1)) && text.charCodeAt(end - 1) !== 0xfeff)')), ['vectors (TypeScript)']],
  ['the Python trim is str.rstrip()', async (r) => edit(r, 'bench/statespace/schema/statement_hash.py', (t) => t.replace('    end = len(text)\n    while end > 0 and text[end - 1] in _TRIM_RIGHT:\n        end -= 1\n    return text[:end]', '    return text.rstrip()')), ['vectors (Python)']],
  ['the Python file entry point reads text mode and translates newlines', async (r) => edit(r, 'bench/statespace/schema/statement_hash.py', (t) => t.replace('return statement_hash_bytes(Path(path).read_bytes())', 'return statement_hash_text(Path(path).read_text(encoding="utf-8"))')), ['vectors (Python)']],
  ['the Python decoder replaces invalid bytes instead of failing', async (r) => edit(r, 'bench/statespace/schema/statement_hash.py', (t) => t.replace('text = data.decode("utf-8")', 'text = data.decode("utf-8", errors="replace")')), ['vectors (Python)']],
  ['an expected vector hash is edited', async (r) => edit(r, 'schemas/vectors/statement-hash.json', (t) => t.replace('01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b', '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546c')), ['statement-hash.json', 'vectors (TypeScript)']],
  ['a code point leaves the schema list', async (r) => {
    json(r, 'schemas/defs.schema.json', (j) => {
      const list = j.$defs.statementSha256['x-statementHash'].trimRight.codePoints;
      j.$defs.statementSha256['x-statementHash'].trimRight.codePoints = list.filter((c) => c.cp !== 'U+FEFF');
      return j;
    });
    await regenerate(r);
  }, ['trim set']],
  ['an invalid fixture is not listed in its index', async (r) => edit(r, 'schemas/fixtures/claim/invalid/index.json', (t) => t.replace(/  \{"file": "agent-string\.json"[^\n]*\n/, '')), ['fixtures']],
  ['a definition has no fixtures', async (r) => json(r, 'schemas/fixtures/defs.json', (j) => {
    delete j.seamId;
    return j;
  }), ['fixtures']],
  ['a valid fixture is broken', async (r) => json(r, 'schemas/fixtures/event/valid/note-1.json', (j) => ({ ...j, ref: 'note:x' })), ['validators agree']],
  ['a repository record is invalid', async (r) => write(r, 'sample/bad-ir.json', '{"schema":"statespace/ir@1","policy":{}}\n'), ['validators agree']],
  ['a repository record names a version that is not published', async (r) => write(r, 'sample/old-claim.json', '{"schema":"statespace/claim@2"}\n'), ['records']],
  ['the keep/kill rules and their run agree', async (r) => {
    write(r, 'content/governance/keepkill-rules.yaml', RULES);
    write(r, 'runs/RUN-keepkill-rules.json', keepKillRun(sha(RULES)));
  }, []],
  ['the keep/kill rules change after they were recorded', async (r) => {
    write(r, 'content/governance/keepkill-rules.yaml', `${RULES}  - comparison: added later\n`);
    write(r, 'runs/RUN-keepkill-rules.json', keepKillRun(sha(RULES)));
  }, ['keep/kill rules']],
  ['the keep/kill run records no hash', async (r) => {
    write(r, 'content/governance/keepkill-rules.yaml', RULES);
    write(r, 'runs/RUN-keepkill-rules.json', '{"id":"RUN-keepkill-rules"}\n');
  }, ['keep/kill rules']],
  ['the keep/kill rules exist without their run', async (r) => write(r, 'content/governance/keepkill-rules.yaml', RULES), ['keep/kill rules']],
];

/** Patterns the lint must flag, and the portable ones it must accept. */
const LINT_FLAGGED = ['^a$', '^\\d+(?![\\s\\S])', '^\\w+(?![\\s\\S])', '^\\s(?![\\s\\S])', '^.(?![\\s\\S])', '^(?<n>a)(?![\\s\\S])', '(?<=a)b', '^\\p{L}(?![\\s\\S])', '^a{2}+(?![\\s\\S])', '^(a)\\1(?![\\s\\S])', '\\bword', '^\\u{1F600}(?![\\s\\S])'];
const LINT_ACCEPTED = ['^[0-9a-f]{64}(?![\\s\\S])', '^(?:a|b)+(?![\\s\\S])', '^[A-Za-z0-9._-]+(?![\\s\\S])', '^(?!x)[a-z]+(?![\\s\\S])', '^[^\\n]*(?![\\s\\S])', '^a\\.b(?![\\s\\S])'];

export async function selfCheck(repoRoot) {
  const results = [];
  const record = (name, ok, detail = '') => results.push({ name, ok, detail });

  for (const p of LINT_FLAGGED) record(`the pattern lint flags ${JSON.stringify(p)}`, lintPattern(p).length > 0);
  for (const p of LINT_ACCEPTED) record(`the pattern lint accepts ${JSON.stringify(p)}`, lintPattern(p).length === 0, lintPattern(p).join('; '));

  for (const [name, plant, mustFail, extra = []] of SCENARIOS) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-selfcheck-'));
    try {
      for (const rel of COPY) {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.cpSync(path.join(repoRoot, rel), path.join(root, rel), { recursive: true, filter: (src) => KEEP(path.relative(repoRoot, src).split(path.sep).join('/')) });
      }
      await plant(root);
      const run = spawnSync(process.execPath, [path.join(root, 'scripts/verify-schema.mjs'), ...extra], { encoding: 'utf8', timeout: 180000 });
      const failed = [...run.stdout.matchAll(/^ {2}FAIL {2}([^:]+):/gm)].map((m) => m[1]);
      const passed = run.status === 0;
      if (mustFail.length === 0) {
        record(name, passed, passed ? '' : `expected PASS but failed on ${failed.join(', ') || run.stderr.trim().split('\n').pop()}`);
      } else {
        const missing = mustFail.filter((m) => !failed.includes(m));
        record(name, run.status === 1 && missing.length === 0, missing.length === 0 && run.status === 1 ? `fails on ${failed.join(', ')}` : `expected FAIL on ${mustFail.join(', ')}; got status ${run.status} and FAIL on ${failed.join(', ') || 'nothing'}`);
      }
    } catch (e) {
      record(name, false, e.message);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
  return results;
}
