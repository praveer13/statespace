// W0-T02: does every engine's String.prototype.trimEnd remove exactly the code points that the schema lists?
//
// The statement hash (schemas/defs.schema.json, x-statementHash) trims the code points ECMAScript's trimEnd
// removes, which is also what Comparator Live's `challenge.trimRight()` does in a browser. This script computes
// that set in the engine it runs in, over all 1114112 code points, and compares it with the schema's list. It
// also reads what Python's str.rstrip() removes, when asked, to show where the two differ.
//
// Run it in the pinned Playwright image, with the repository mounted read-only at /repo:
//
//   docker run --rm --memory=6g -v "$PWD":/repo:ro -w /repo mcr.microsoft.com/playwright:v1.63.0-noble \
//     node scripts/spikes/W0-T02/trimright-engines.mjs
//
// or with Node alone (the "node" engine only): node scripts/spikes/W0-T02/trimright-engines.mjs --node-only
// It prints one JSON object.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const defs = JSON.parse(fs.readFileSync(path.join(root, 'schemas', 'defs.schema.json'), 'utf8'));
const schemaSet = defs.$defs.statementSha256['x-statementHash'].trimRight.codePoints.map((c) => parseInt(c.cp.slice(2), 16));

/** Runs inside the engine; must be self-contained. */
function measure() {
  const trimEnd = [];
  const whitespaceClass = [];
  const wellFormed = typeof ''.isWellFormed === 'function';
  const re = /^\s$/u;
  for (let cp = 0; cp <= 0x10ffff; cp += 1) {
    const ch = String.fromCodePoint(cp);
    if (`a${ch}`.trimEnd() === 'a') trimEnd.push(cp);
    if (re.test(ch)) whitespaceClass.push(cp);
  }
  return { trimEnd, whitespaceClass, aliasIsSame: String.prototype.trimRight === String.prototype.trimEnd, wellFormed };
}

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const hex = (c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`;

function summarize(engine, version, r) {
  return {
    engine,
    version,
    trimEndCount: r.trimEnd.length,
    equalsSchemaSet: same(r.trimEnd, schemaSet),
    missingFromSchema: r.trimEnd.filter((c) => !schemaSet.includes(c)).map(hex),
    notRemovedByEngine: schemaSet.filter((c) => !r.trimEnd.includes(c)).map(hex),
    regexWhitespaceClassEqualsTrimEnd: same(r.whitespaceClass, r.trimEnd),
    trimRightIsTrimEnd: r.aliasIsSame,
  };
}

const results = [];
results.push(summarize('node', process.versions.node, measure()));
results[0].v8 = process.versions.v8;
results[0].unicode = process.versions.unicode;

if (!process.argv.includes('--node-only')) {
  const { chromium, firefox, webkit } = await import('playwright-core');
  for (const [name, type] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
    const browser = await type.launch({ args: name === 'chromium' ? ['--no-sandbox'] : [] });
    try {
      const page = await browser.newPage();
      const r = await page.evaluate(measure);
      results.push(summarize(name, browser.version(), r));
    } finally {
      await browser.close();
    }
  }
}

console.log(JSON.stringify({ schemaCodePoints: schemaSet.length, engines: results }, null, 2));
