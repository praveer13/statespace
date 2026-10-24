#!/usr/bin/env node
// Writes schemas/vectors/statement-hash.json, the vectors that the TypeScript and Python statement-hash
// implementations must both reproduce (GATE-schema).
//
//   node schemas/vectors/generate-statement-hash.mjs           write the file
//   node schemas/vectors/generate-statement-hash.mjs --check   fail if the file differs
//
// Every expected value comes from an oracle that is neither implementation under test: the JavaScript
// engine's own String.prototype.trimEnd (the operation Comparator Live's challenge hash is defined by)
// and node:crypto's SHA-256. The vectors hold the input as JSON text and as UTF-8 bytes, so each
// implementation is also tested through its bytes entry point (strict UTF-8, a leading byte order mark
// kept, no line-ending translation). The file is pure ASCII: every other character is a \u escape.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPublished, statementHashSpec } from '../codegen/model.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const OUT = path.join(here, 'statement-hash.json');

const cp = (n) => String.fromCodePoint(n);
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const u = (n) => `U+${n.toString(16).toUpperCase().padStart(4, '0')}`;
const utf8 = (text) => new TextEncoder().encode(text);

const spec = statementHashSpec(loadPublished(path.join(root, 'schemas')));
const trimmed = spec.codePoints.map((c) => c.value);

const vectors = [];
const add = (id, note, input, extra = {}) => vectors.push({ id, note, input, ...extra });

// ---------------------------------------------------------------- basics
add('empty', 'An empty statement hashes as one newline.', '');
add('newline-only', 'One newline is trimmed away, then one is appended.', '\n', { sameAs: 'empty' });
add('crlf-only', 'CR and LF are both trimmed.', '\r\n', { sameAs: 'empty' });
add('whitespace-only', 'A statement of only trimmed code points hashes as the empty statement.', ' \t\r\n\u00a0\u3000', { sameAs: 'empty' });
add('plain', 'A statement with no trailing whitespace.', 'theorem t : True := trivial');
add('plain-one-newline', 'One trailing newline gives the same hash as none.', 'theorem t : True := trivial\n', { sameAs: 'plain' });
add('plain-many-newlines', 'Several trailing newlines give the same hash as none.', 'theorem t : True := trivial\n\n\n', { sameAs: 'plain' });
add('plain-crlf', 'A trailing CRLF gives the same hash as none.', 'theorem t : True := trivial\r\n', { sameAs: 'plain' });
add('plain-trailing-blanks', 'Mixed trailing spaces, tabs and line ends all go.', 'theorem t : True := trivial \t \r\n \n', { sameAs: 'plain' });
add('leading-whitespace-kept', 'Only the end is trimmed: leading whitespace stays.', '  \tx');
add('interior-whitespace-kept', 'Interior whitespace stays; the final newline goes.', 'a  b\t\tc \n');
add('interior-blank-lines-kept', 'Interior blank lines stay.', 'a\n\nb\n\n');
add('interior-crlf-kept', 'Interior CRLF stays as CRLF; only the final one is trimmed.', 'a\r\nb\r\n');
add('two-lines-no-final-newline', 'Two lines without a final newline.', 'line 1\nline 2');

// ---------------------------------------------------------------- each trimmed code point
add('single-x', 'The base for the per-code-point vectors below.', 'x');
for (const n of trimmed) {
  const name = spec.codePoints.find((c) => c.value === n).name;
  add(`trim-${u(n)}`, `${name} after the last character is removed.`, `x${cp(n)}`, { sameAs: 'single-x' });
}

// ---------------------------------------------------------------- code points that are not trimmed
const keep = [
  [0x0085, 'NEXT LINE: Python\'s str.rstrip() removes it; ECMAScript keeps it.'],
  [0x001c, 'INFORMATION SEPARATOR FOUR: Python\'s str.rstrip() removes it; ECMAScript keeps it.'],
  [0x001d, 'INFORMATION SEPARATOR THREE: Python\'s str.rstrip() removes it; ECMAScript keeps it.'],
  [0x001e, 'INFORMATION SEPARATOR TWO: Python\'s str.rstrip() removes it; ECMAScript keeps it.'],
  [0x001f, 'INFORMATION SEPARATOR ONE: Python\'s str.rstrip() removes it; ECMAScript keeps it.'],
  [0x180e, 'MONGOLIAN VOWEL SEPARATOR was a space separator before Unicode 6.3 and is not one now.'],
  [0x200b, 'ZERO WIDTH SPACE is not whitespace.'],
  [0x200c, 'ZERO WIDTH NON-JOINER is not whitespace.'],
  [0x200d, 'ZERO WIDTH JOINER is not whitespace.'],
  [0x2060, 'WORD JOINER is not whitespace.'],
  [0x00ad, 'SOFT HYPHEN is not whitespace.'],
  [0x0000, 'NUL is not whitespace.'],
  [0x007f, 'DELETE is not whitespace.'],
  [0x0300, 'A combining mark is not whitespace.'],
  [0x2800, 'BRAILLE PATTERN BLANK looks blank and is not whitespace.'],
  [0x3164, 'HANGUL FILLER looks blank and is not whitespace.'],
  [0xfffd, 'REPLACEMENT CHARACTER is kept.'],
  [0xfffe, 'A noncharacter is valid UTF-8 and is kept.'],
  [0xe0020, 'TAG SPACE, outside the Basic Multilingual Plane, is not whitespace.'],
  [0x1f600, 'An emoji outside the Basic Multilingual Plane is kept.'],
  [0x10ffff, 'The largest code point is kept.'],
];
for (const [n, note] of keep) add(`keep-${u(n)}`, note, `x${cp(n)}`);

// ---------------------------------------------------------------- where trimming stops
add('stop-at-nel', 'Trimming stops at U+0085, which is not in the set, so the whitespace before it stays.', 'x\u0085 \n\t', {});
add('stop-at-nel-after-feff', 'U+FEFF is trimmed; then U+0085 stops the trim.', 'x\u0085\ufeff');
add('feff-then-nel-keeps-all', 'The last code point is U+0085, so nothing is trimmed, U+FEFF included.', 'x\ufeff\u0085');
add('python-extras-kept', 'U+001C to U+001F and U+0085 at the end are all kept.', 'x\u001c\u001d\u001e\u001f\u0085');
add('python-extras-then-ecma-whitespace', 'Whitespace after the Python-only code points goes; the Python-only ones stay.', 'x\u0085\u001c \u3000');
add('whole-set-run', 'Every code point of the set, in ascending order, after x.', `x${trimmed.map(cp).join('')}`, { sameAs: 'single-x' });
add('whole-set-run-reversed', 'Every code point of the set, in descending order, after x.', `x${[...trimmed].reverse().map(cp).join('')}`, { sameAs: 'single-x' });

// ---------------------------------------------------------------- outside the Basic Multilingual Plane
add('astral-last', 'A character outside the Basic Multilingual Plane at the end is kept whole.', 'x\u{1f600}');
add('astral-then-blanks', 'Whitespace after an astral character goes; the surrogate pair is not split.', 'x\u{1f600} \n', {});
add('astral-between-blanks', 'Whitespace between astral characters stays.', ' \u{1f600} \u{1f600} ');
add('astral-then-line-separator', 'U+2028 after an astral character goes.', '\u{1f600}\u2028');
add('astral-only', 'A statement of one astral character.', '\u{10ffff}');

// ---------------------------------------------------------------- byte order marks, from bytes
add('bom-leading-kept', 'A leading byte order mark stays as U+FEFF and is hashed.', '\ufeffx', { bytes: [0xef, 0xbb, 0xbf, 0x78] });
add('bom-only', 'A file of only a byte order mark is trimmed to nothing: U+FEFF is in the set.', '\ufeff', { bytes: [0xef, 0xbb, 0xbf], sameAs: 'empty' });
add('bom-leading-and-trailing', 'Only the trailing U+FEFF goes.', '\ufeffx\ufeff', { bytes: [0xef, 0xbb, 0xbf, 0x78, 0xef, 0xbb, 0xbf] });

// ---------------------------------------------------------------- ordinary statements
add('nul-inside', 'NUL inside the text is kept.', 'a\u0000b\n');
add('nul-last', 'NUL at the end is kept.', 'a\u0000');
add('non-ascii', 'Non-ASCII text is hashed as UTF-8.', '\u2200 x, x = x\n');
add('lean-challenge', 'A Lean challenge with trailing blank lines.', 'import Std\n\nnamespace Lab2\n\ntheorem transfer_conserves (a b n : Int) : (a - n) + (b + n) = a + b := by\n  sorry\n\nend Lab2\n\n\n');
add('smt2-statement', 'An SMT-LIB statement, CRLF line ends and a trailing blank line.', '(declare-const a Int)\r\n(assert (< a 0))\r\n(check-sat)\r\n\r\n');
add('tla-property', 'A TLA+ property with indentation kept and trailing spaces trimmed.', '---- MODULE Inv ----\nInv == spent <= Init\n====   \n  \n');

// ---------------------------------------------------------------- from bytes
add('crlf-bytes', 'Bytes with interior CRLF: read in text mode with newline translation, a language would hash a different text.', 'a\r\nb\r\n', { bytes: [0x61, 0x0d, 0x0a, 0x62, 0x0d, 0x0a] });
add('nbsp-bytes', 'U+00A0 as UTF-8 (C2 A0) at the end is trimmed.', 'x\u00a0', { bytes: [0x78, 0xc2, 0xa0], sameAs: 'single-x' });
add('ideographic-space-bytes', 'U+3000 as UTF-8 (E3 80 80) at the end is trimmed.', 'x\u3000', { bytes: [0x78, 0xe3, 0x80, 0x80], sameAs: 'single-x' });
add('line-separator-bytes', 'U+2028 as UTF-8 (E2 80 A8) at the end is trimmed.', 'x\u2028', { bytes: [0x78, 0xe2, 0x80, 0xa8], sameAs: 'single-x' });
add('nel-bytes', 'U+0085 as UTF-8 (C2 85) at the end is kept.', 'x\u0085', { bytes: [0x78, 0xc2, 0x85] });
add('noncharacter-bytes', 'U+FFFE as UTF-8 (EF BF BE) is valid and is kept.', '\ufffe', { bytes: [0xef, 0xbf, 0xbe] });
add('max-code-point-bytes', 'U+10FFFF as UTF-8 (F4 8F BF BF) is valid and is kept.', '\u{10ffff}', { bytes: [0xf4, 0x8f, 0xbf, 0xbf] });

// ---------------------------------------------------------------- invalid UTF-8: an error, never a replacement character
const invalidBytes = [
  ['continuation-alone', [0x80], 'A continuation byte with no lead.'],
  ['lead-without-continuation', [0xc3, 0x28], 'A two-byte lead followed by an ASCII byte.'],
  ['overlong-2', [0xc0, 0xaf], 'An overlong two-byte form of "/".'],
  ['overlong-3', [0xe0, 0x80, 0xaf], 'An overlong three-byte form of "/".'],
  ['overlong-4', [0xf0, 0x80, 0x80, 0xaf], 'An overlong four-byte form of "/".'],
  ['surrogate-encoded', [0xed, 0xa0, 0x80], 'A UTF-16 surrogate encoded as UTF-8.'],
  ['above-10ffff', [0xf4, 0x90, 0x80, 0x80], 'A code point above U+10FFFF.'],
  ['five-byte-lead', [0xf8, 0x88, 0x80, 0x80, 0x80], 'A five-byte sequence.'],
  ['truncated-3', [0xe2, 0x82], 'A three-byte sequence cut short.'],
  ['byte-ff', [0xff], 'The byte FF never occurs in UTF-8.'],
  ['after-valid-text', [0x61, 0x62, 0xff, 0x63], 'Invalid in the middle of valid text.'],
  ['bom-then-bad', [0xef, 0xbb, 0xbf, 0x80], 'A byte order mark, then a stray continuation byte.'],
];
for (const [name, bytes, note] of invalidBytes) add(`invalid-utf8-${name}`, note, undefined, { bytes, error: 'invalid-utf8' });

// ---------------------------------------------------------------- ill-formed strings: an error through the text entry point
const illFormed = [
  ['lone-high-surrogate', 'x\ud800', 'A high surrogate with nothing after it.'],
  ['lone-low-surrogate', '\udc00x', 'A low surrogate with nothing before it.'],
  ['reversed-pair', '\udc00\ud800', 'A low surrogate before a high one.'],
  ['two-high-surrogates', '\ud800\ud800', 'Two high surrogates in a row.'],
  ['lone-surrogate-before-blank', 'x\ud800 ', 'A lone surrogate followed by whitespace.'],
];
for (const [name, text, note] of illFormed) add(`ill-formed-${name}`, note, text, { error: 'ill-formed-text', textOnly: true });

// ---------------------------------------------------------------- expected values, from the oracle
const byId = new Map();
const out = vectors.map((v) => {
  const entry = { id: v.id, note: v.note };
  if (v.error) {
    if (v.input !== undefined) entry.text = v.input;
    if (v.bytes) entry.bytesHex = hex(v.bytes);
    entry.error = v.error;
    return entry;
  }
  const bytes = v.bytes ? Uint8Array.from(v.bytes) : utf8(v.input);
  const decoded = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (decoded !== v.input) throw new Error(`${v.id}: bytes and text disagree`);
  const canonical = `${v.input.trimEnd()}\n`; // the oracle: the engine's own trimEnd
  const sha256 = crypto.createHash('sha256').update(utf8(canonical)).digest('hex');
  entry.text = v.input;
  entry.bytesHex = hex(bytes);
  entry.canonicalHex = hex(utf8(canonical));
  entry.sha256 = sha256;
  if (v.sameAs) {
    const other = byId.get(v.sameAs);
    if (!other) throw new Error(`${v.id}: sameAs ${v.sameAs} must come earlier`);
    if (other.sha256 !== sha256) throw new Error(`${v.id}: claimed to hash like ${v.sameAs} but does not`);
    entry.sameAs = v.sameAs;
  }
  byId.set(v.id, entry);
  return entry;
});
if (new Set(out.map((v) => v.id)).size !== out.length) throw new Error('vector ids must be unique');
for (const n of trimmed) {
  if (!out.some((v) => v.id === `trim-${u(n)}`)) throw new Error(`no vector for ${u(n)}`);
}

const ascii = (text) => text.replace(/[\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const lines = out.map((v) => `    ${ascii(JSON.stringify(v))}`);
const head = {
  spec: spec.id,
  description: 'Shared test vectors for the statement hash. Each valid vector gives the input as JSON text and as UTF-8 bytes (bytesHex), the bytes that are hashed (canonicalHex, which is trimRight(text) followed by a newline) and their SHA-256. A vector with an error must be rejected with that code: invalid-utf8 through the bytes entry point, ill-formed-text through the text entry point. A vector with textOnly set has no bytes. sameAs names an earlier vector with the same hash. The TypeScript and Python implementations must reproduce every value; GATE-schema checks it.',
  source: 'schemas/vectors/generate-statement-hash.mjs',
  oracle: 'String.prototype.trimEnd for the trimming and node:crypto for SHA-256; neither implementation under test is used',
};
const body = `{\n  "spec": ${JSON.stringify(head.spec)},\n  "description": ${JSON.stringify(head.description)},\n  "source": ${JSON.stringify(head.source)},\n  "oracle": ${JSON.stringify(head.oracle)},\n  "vectors": [\n${lines.join(',\n')}\n  ]\n}\n`;

export const vectorsText = body;
export const vectorCount = out.length;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replaceAll('\r\n', '\n') : null;
  if (process.argv.includes('--check')) {
    if (current !== body) {
      console.error('schemas/vectors/statement-hash.json differs from a fresh generation; run: node schemas/vectors/generate-statement-hash.mjs');
      process.exit(1);
    }
    console.log(`statement-hash.json matches a fresh generation (${out.length} vectors)`);
  } else {
    fs.writeFileSync(OUT, body);
    console.log(`wrote ${path.relative(root, OUT)}: ${out.length} vectors`);
  }
}
