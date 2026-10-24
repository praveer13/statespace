#!/usr/bin/env node
// mutate.mjs: make the rejected-solution variants of the W0-S06 full probe from the private LAB-2 fixture solution.
//
// The pack's solution files are not published: complete proofs of a lab's theorems are reference solutions, which
// stay outside this repository (spine section 11.1; ARCHITECTURE.md section 13.5). The full probe also needs eight
// solutions that are each rejected for one reason, and each of those would hold most of the proofs again. So this
// script makes them: every variant is the private Solution.lean with one edit. The edits find a theorem by its name
// and replace its proof lines, or change its statement line, and the replacement text is the variant's own (a
// `sorry`, a custom axiom, a missing lemma, ...), so this file holds none of the lab's proofs. The one place it writes
// proofs of the lab's statements is `redef`: it redefines `transfer` as the identity and writes three one-line proofs
// that hold for that definition only.
//
//   node scripts/spikes/W0-S06/mutate.mjs --list
//   node scripts/spikes/W0-S06/mutate.mjs --solutions DIR --out DIR [--only a,b]    write the variants, as Solution.<name>.lean
//   node scripts/spikes/W0-S06/mutate.mjs --solutions DIR --verify                  compare DIR and its variants with private-fixtures.json
//   node scripts/spikes/W0-S06/mutate.mjs --solutions DIR --write-manifest          rewrite private-fixtures.json from DIR (a new baseline)
//
// DIR holds Solution.lean, broken/Broken.lean and fixed/Fixed.lean, the layout of the pack. What this script writes
// is private content: it refuses an --out inside the repository. The tests are in mutate.test.mjs and use an
// invented solution. Dependency-free Node 18 or later.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
export const MANIFEST = join(HERE, 'private-fixtures.json');
export const FIXTURES = ['Solution.lean', 'broken/Broken.lean', 'fixed/Fixed.lean'];
export const ROLE = 'private fixture, not published';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// ---------- a Lean source as lines, with the few structural operations the variants need
export class Source {
  constructor(text) {
    this.lines = text.split('\n');
    if (this.lines.at(-1) === '') this.lines.pop(); // the final newline is put back by toString
  }

  toString() {
    return this.lines.join('\n') + '\n';
  }

  // The declaration that starts a line with `kind name` (for example theorem transfer_conserves): the index of its
  // first line and of the line after its last. It runs to the next line that starts in column 0, so its indented
  // lines belong to it; blank lines at its end do not.
  find(kind, name) {
    const re = new RegExp(`^${kind} ${name}(\\s|$)`);
    const start = this.lines.findIndex((l) => re.test(l));
    if (start < 0) throw new Error(`no \`${kind} ${name}\` at the start of a line`);
    let end = start + 1;
    while (end < this.lines.length && (this.lines[end] === '' || /^\s/.test(this.lines[end]))) end += 1;
    while (this.lines[end - 1] === '') end -= 1;
    return { start, end };
  }

  // The index of the line of the declaration `kind name` that ends its statement: the first whose text ends with
  // `opener` (":= by" for a theorem, ":=" for a definition).
  opener(kind, name, opener) {
    const { start, end } = this.find(kind, name);
    for (let i = start; i < end; i += 1) if (this.lines[i].trimEnd().endsWith(opener)) return i;
    throw new Error(`\`${kind} ${name}\` has no line that ends with \`${opener}\``);
  }

  // Replaces the lines after the opener (a theorem's proof, a definition's body).
  replaceBody(kind, name, opener, replacement) {
    const at = this.opener(kind, name, opener);
    const { end } = this.find(kind, name);
    this.lines.splice(at + 1, end - (at + 1), ...replacement);
  }

  insertAfterOpener(kind, name, opener, added) {
    this.lines.splice(this.opener(kind, name, opener) + 1, 0, ...added);
  }

  insertBefore(kind, name, added) {
    this.lines.splice(this.find(kind, name).start, 0, ...added);
  }

  remove(kind, name) {
    const { start, end } = this.find(kind, name);
    this.lines.splice(start, end - start);
  }

  // Replaces the whole declaration, statement included.
  replaceDecl(kind, name, replacement) {
    const { start, end } = this.find(kind, name);
    this.lines.splice(start, end - start, ...replacement);
  }

  // The statement lines of a theorem, from its first line to the opener, with the opener cut off the last one.
  statement(name) {
    const { start } = this.find('theorem', name);
    const at = this.opener('theorem', name, ':= by');
    const lines = this.lines.slice(start, at + 1);
    lines[lines.length - 1] = lines.at(-1).trimEnd().replace(/\s*:= by$/, '');
    return lines;
  }

  editFirstLine(kind, name, edit) {
    const { start } = this.find(kind, name);
    const next = edit(this.lines[start]);
    if (next === this.lines[start]) throw new Error(`\`${kind} ${name}\`: the edit changed nothing`);
    this.lines[start] = next;
  }

  prepend(added) {
    this.lines.unshift(...added);
  }
}

const THEOREM = 'theorem';
const PROOF = ':= by';

// ---------- the variants: name -> what it breaks, and how
// `what` is the reason a correct check gives (expectations.mjs holds the verdict each one is expected to get).
export const VARIANTS = {
  weak: {
    what: 'transfer_nonneg gets an extra hypothesis (n = 0): a weaker statement than the challenge, so comparator finds a statement mismatch',
    apply(s) {
      s.editFirstLine(THEOREM, 'transfer_nonneg', (l) => l.replace(/ :$/, ' (h : n = 0) :'));
    },
  },
  redef: {
    what: 'transfer is redefined as the identity, and the three theorems about it are re-proved for that definition: comparator finds a constant that does not match',
    apply(s) {
      s.replaceBody('def', 'transfer', ':=', ['  s']);
      s.replaceBody(THEOREM, 'transfer_conserves', PROOF, ['  simp [transfer, total]']);
      s.replaceBody(THEOREM, 'transfer_rejected', PROOF, ['  simp [transfer]']);
      s.replaceBody(THEOREM, 'transfer_nonneg', PROOF, ['  simp [transfer]', '  exact ⟨ha, hb⟩']);
    },
  },
  sorry: {
    what: 'the proof of transfer_conserves is `sorry`',
    apply(s) {
      s.replaceBody(THEOREM, 'transfer_conserves', PROOF, ['  sorry']);
    },
  },
  axiom: {
    what: 'transfer_conserves is proved from a custom axiom, `cheat`',
    apply(s) {
      const statement = s.statement('transfer_conserves');
      statement[statement.length - 1] += ' := cheat s n';
      s.replaceDecl(THEOREM, 'transfer_conserves', ['axiom cheat : ∀ (s : Ledger) (n : Int), total (transfer s n) = total s', '', ...statement]);
    },
  },
  native: {
    what: 'transfer_rejected uses a helper proved with native_decide, which adds an axiom of its own',
    apply(s) {
      s.insertBefore(THEOREM, 'transfer_rejected', ['theorem aux_native : (2 : Nat) + 2 = 4 := by native_decide', '']);
      s.insertAfterOpener(THEOREM, 'transfer_rejected', PROOF, ['  have _ := aux_native']);
    },
  },
  kernelskip: {
    what: 'transfer_conserves is added to the environment with the kernel check skipped, with a proof (`trivial`) that the kernel would reject',
    apply(s) {
      s.prepend(['import Lean', 'open Lean Elab Command Term Meta', '']);
      s.replaceDecl(THEOREM, 'transfer_conserves', [
        '/-- Adds `name : ty := pf` to the environment with the kernel\'s check skipped, whatever `pf` is. -/',
        'elab "unchecked_theorem " name:ident " : " ty:term " := " pf:term : command => do',
        '  liftTermElabM do',
        '    let t ← instantiateMVars (← elabType ty)',
        '    let v ← instantiateMVars (← elabTerm pf none)',
        '    addDecl (.thmDecl { name := name.getId, levelParams := [], type := t, value := v })',
        '',
        'set_option debug.skipKernelTC true in',
        'unchecked_theorem transfer_conserves : ∀ (s : Ledger) (n : Int), total (transfer s n) = total s := trivial',
      ]);
    },
  },
  missing: {
    what: 'the last theorem, xfer_self, is left out',
    apply(s) {
      s.remove(THEOREM, 'xfer_self');
    },
  },
  builderror: {
    what: 'the proof of transfer_conserves names a lemma that does not exist, so the project does not build',
    apply(s) {
      s.replaceBody(THEOREM, 'transfer_conserves', PROOF, ['  exact no_such_lemma s n']);
    },
  },
};

export function makeVariants(solutionText, only = Object.keys(VARIANTS)) {
  const out = {};
  for (const name of only) {
    if (!VARIANTS[name]) throw new Error(`unknown variant ${name}; the names are ${Object.keys(VARIANTS).join(', ')}`);
    const s = new Source(solutionText);
    try {
      VARIANTS[name].apply(s);
    } catch (e) {
      throw new Error(`variant ${name}: ${e instanceof Error ? e.message : e}; the solution must write each theorem as \`theorem name ... := by\` followed by indented lines, as the pack's does`);
    }
    out[name] = s.toString();
  }
  return out;
}

// ---------- the manifest of the private files' hashes
const entry = (name, buf, extra = {}) => ({ name, sha256: sha256(buf), bytes: buf.length, role: ROLE, ...extra });

function readFixtures(dir) {
  const missing = FIXTURES.filter((f) => !existsSync(join(dir, f)));
  if (missing.length > 0) throw new Error(`${dir} lacks ${missing.join(', ')}`);
  return Object.fromEntries(FIXTURES.map((f) => [f, readFileSync(join(dir, f))]));
}

export function manifestFor(dir) {
  const files = readFixtures(dir);
  const variants = makeVariants(files['Solution.lean'].toString('utf8'));
  return {
    description:
      'SHA-256 values and sizes of the files of the LAB-2 whole-lab pack that this repository does not hold: complete proofs are reference solutions, which stay in a private place (spine section 11.1). The three fixtures are the files the recorded run mounted; each variant is made from Solution.lean by `mutate.mjs <name>` and is byte for byte the file that ran. scripts/spikes/W0-S06/mutate.mjs --solutions DIR --verify checks a directory against this list. assemble-run.mjs copies it into the record\'s inputs[].',
    fixtures: FIXTURES.map((f) => entry(f, files[f])),
    variants: Object.entries(variants).map(([name, text]) => entry(`variants/Solution.${name}.lean`, Buffer.from(text, 'utf8'), { made_by: `mutate.mjs ${name}`, what: VARIANTS[name].what })),
  };
}

export function readManifest() {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

// What differs between a directory's files (and the variants made from them) and the manifest; an empty list is a match.
export function verifyDir(dir, manifest = readManifest()) {
  const now = manifestFor(dir);
  const problems = [];
  const compare = (a, b) => {
    for (const want of a) {
      const got = b.find((x) => x.name === want.name);
      if (!got) problems.push(`${want.name}: not made`);
      else if (got.sha256 !== want.sha256) problems.push(`${want.name}: SHA-256 ${got.sha256.slice(0, 12)}..., the manifest says ${want.sha256.slice(0, 12)}...`);
      else if (got.bytes !== want.bytes) problems.push(`${want.name}: ${got.bytes} bytes, the manifest says ${want.bytes}`);
    }
  };
  compare(manifest.fixtures, now.fixtures);
  compare(manifest.variants, now.variants);
  return { problems, checked: manifest.fixtures.length + manifest.variants.length, now };
}

// ---------- command line
function main(argv) {
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (name) => argv.includes(name);
  if (has('--list')) {
    for (const [name, v] of Object.entries(VARIANTS)) console.log(`${name.padEnd(11)} ${v.what}`);
    return 0;
  }
  const solutions = opt('--solutions') ?? process.env.W0S06_SOLUTIONS;
  if (!solutions) {
    console.error('mutate.mjs: the LAB-2 fixture solutions are not part of this repository; give their directory with --solutions DIR or W0S06_SOLUTIONS (it holds Solution.lean, broken/Broken.lean and fixed/Fixed.lean)');
    return 64;
  }
  if (has('--verify')) {
    const { problems, checked } = verifyDir(solutions);
    for (const p of problems) console.log(`  MISMATCH ${p}`);
    console.log(`${solutions === process.env.W0S06_SOLUTIONS ? '$W0S06_SOLUTIONS' : '--solutions'}: ${checked - problems.length} of ${checked} private files and variants match private-fixtures.json`);
    return problems.length === 0 ? 0 : 1;
  }
  if (has('--write-manifest')) {
    writeFileSync(MANIFEST, JSON.stringify(manifestFor(solutions), null, 2) + '\n');
    console.log('wrote scripts/spikes/W0-S06/private-fixtures.json');
    return 0;
  }
  const out = opt('--out');
  if (!out) {
    console.error('mutate.mjs: --out DIR is required');
    return 64;
  }
  if (resolve(out) === ROOT || resolve(out).startsWith(ROOT + sep)) {
    console.error('mutate.mjs: refusing to write private fixtures inside the repository; use a directory outside it');
    return 64;
  }
  const only = opt('--only')?.split(',');
  const text = readFixtures(solutions)['Solution.lean'].toString('utf8');
  const made = makeVariants(text, only);
  mkdirSync(out, { recursive: true });
  for (const [name, body] of Object.entries(made)) writeFileSync(join(out, `Solution.${name}.lean`), body);
  console.log(`wrote ${Object.keys(made).length} variants`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(`mutate.mjs: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 2;
  }
}
