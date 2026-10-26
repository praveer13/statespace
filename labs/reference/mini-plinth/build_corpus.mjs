// Write the expected IR of every positive file of LAB-3's parser corpus (labs/LAB-3/corpus/pos/*.mp) with the
// course's front end (packages/interp), and check every negative file is rejected at the line its first comment
// names. reference.mp must give the reference program exactly as the Lean reference exports it (the pool's).
//
//   node labs/reference/mini-plinth/build_corpus.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canonical, parseProgram, ParseError } from "../../../packages/interp/src/index.ts";

const LAB = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "LAB-3");
const pool = JSON.parse(readFileSync(join(LAB, "challenge", "goldens.json"), "utf8"));
let bad = 0;
for (const f of readdirSync(join(LAB, "corpus", "pos")).filter((x) => x.endsWith(".mp")).sort()) {
  const program = parseProgram(readFileSync(join(LAB, "corpus", "pos", f), "utf8"));
  const out = { commands: program.commands };
  if (f === "reference.mp" && canonical(out.commands) !== canonical(pool.programs[0].commands)) {
    console.error("reference.mp does not give the Lean export of refProgram");
    bad++;
  }
  writeFileSync(join(LAB, "corpus", "pos", f.replace(/\.mp$/, ".json")), JSON.stringify(out, null, 1) + "\n");
  console.log(`pos ${f}: ${out.commands.length} command(s)`);
}
for (const f of readdirSync(join(LAB, "corpus", "neg")).filter((x) => x.endsWith(".mp")).sort()) {
  const text = readFileSync(join(LAB, "corpus", "neg", f), "utf8");
  const want = Number(/^-- expect: line (\d+)/.exec(text)?.[1]);
  try {
    parseProgram(text);
    console.error(`neg ${f}: accepted`);
    bad++;
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    const ok = e.line === want;
    if (!ok) bad++;
    console.log(`neg ${f}: ${ok ? "rejected" : "REJECTED AT ANOTHER LINE"}: ${e.message}`);
  }
}
process.exit(bad ? 1 : 0);
