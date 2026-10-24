#!/usr/bin/env node
// Which state does `$/lean/plainGoal` report at each position of a proof? (W0-S10 spike)
//
// For every strip in a directory of generated strips, ask the server for the goals at every
// character of the theorem's lines and print, line by line, which strip state each run of
// characters shows. The listing is the evidence for where the generator hovers: a position strictly
// inside a leaf tactic shows the state after it, the start of a tactic shows the state before it,
// and a macro such as `rw` exposes an intermediate state in between. The output holds no timing
// or path, so a re-run must reproduce it byte for byte.
//
// Usage: node scan-positions.mjs --strips <dir> [--corpus <dir>] [--image <name>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withLeanServer } from './lib/lean-server.mjs';
import { theoremSpan } from './gen-strips.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const o = { strips: null, corpus: path.join(HERE, 'corpus'), image: 'ss-lean:4.35.0', leanBin: 'lean', mounts: [], leanOptions: [], cpusetCpus: null, timeoutS: 300 };
for (let i = 2; i < process.argv.length; i++) {
  const flag = process.argv[i];
  if (flag === '--strips') o.strips = path.resolve(process.argv[++i]);
  else if (flag === '--corpus') o.corpus = path.resolve(process.argv[++i]);
  else if (flag === '--image') o.image = process.argv[++i];
  else { console.error(`scan: unknown argument ${flag}`); process.exit(2); }
}
if (!o.strips) { console.error('usage: node scan-positions.mjs --strips <dir> [--corpus <dir>] [--image <name>]'); process.exit(2); }

const manifest = JSON.parse(fs.readFileSync(path.join(o.strips, 'manifest.json'), 'utf8'));
const strips = manifest.strips.map((e) => JSON.parse(fs.readFileSync(path.join(o.strips, e.file), 'utf8')));
const texts = new Map();
for (const s of strips) if (!texts.has(s.source.file)) texts.set(s.source.file, fs.readFileSync(path.join(o.corpus, s.source.file), 'utf8'));

let positions = 0;
const out = [`${manifest.request}: the state shown at each character position of each proof (0-based line and character)`, `toolchain ${manifest.toolchain.banner}`, ''];
await withLeanServer(o, async (server) => {
  for (const file of texts.keys()) await server.open(file, texts.get(file));
  for (const strip of strips) {
    const file = strip.source.file;
    const lines = texts.get(file).split('\n');
    const span = theoremSpan(lines, strip.theorem);
    const known = new Map();
    strip.states.forEach((st) => { const k = JSON.stringify(st.goals); if (!known.has(k)) known.set(k, st.index); });
    const others = new Map();
    out.push(`${strip.id}   (${file}, lines ${span.start}-${span.end})`);
    strip.states.forEach((st) => out.push(`  state ${st.index} = ${st.when === 'before' ? `before \`${strip.tactics[st.index]}\`` : 'end of proof'}`));
    const body = [];
    for (let l = span.start; l <= span.end; l++) {
      const runs = [];
      for (let c = 0; c <= lines[l].length; c++) {
        const goals = await server.plainGoal(file, l, c);
        positions++;
        let label;
        if (goals === null) label = 'no goal information';
        else {
          const nested = goals.map((g) => g.split('\n'));
          const k = JSON.stringify(nested);
          if (nested.length === 0) label = 'no goals';
          else if (known.has(k)) label = `state ${known.get(k)}`;
          else {
            if (!others.has(k)) others.set(k, { n: others.size + 1, goals: nested });
            label = `other ${others.get(k).n}`;
          }
        }
        if (runs.length > 0 && runs.at(-1).label === label) runs.at(-1).to = c;
        else runs.push({ label, from: c, to: c });
      }
      body.push(`  line ${l}  ${JSON.stringify(lines[l])}`);
      for (const r of runs) body.push(`    ${r.from === r.to ? `character ${r.from}` : `characters ${r.from}-${r.to}`}: ${r.label}`);
    }
    out.push(...body);
    for (const { n, goals } of others.values()) {
      out.push(`  other ${n} is not a strip state:`);
      for (const g of goals) out.push(...g.map((line) => `      ${line}`));
    }
    out.push('');
  }
});
out.push(`scan: ${strips.length} strips, ${positions} positions`);
process.stdout.write(`${out.join('\n')}\n`);
