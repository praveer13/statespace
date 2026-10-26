# @statespace/stamps

Stamps derived, never typed. This package is spine section 8.8 ("Verdict → stamp") as a total function, the stamp vocabulary of section 8.7, the three-segment claim strip (M-assurance-strip), and the parsers that turn verdict lines into raw outputs. W1-T01 builds it; GATE-stamps (`scripts/verify-stamps.mjs`) holds it to the spine. It is pure: no DOM, storage or network (`npm run lint:purity`).

```
verdict lines ──parse.ts──┐
receipt@1 ─────receipt.ts─┼─▶ RawOutput ──deriveStamp (§8.8)──▶ Derivation: a stamp, a "modulo" reading, or none
engine reply ──reply.ts───┘
Derivation ×3 ──buildStrip──▶ the claim strip: proposition of the model · correspondence · requirement fit
```

## What it guarantees

| Rule | Where it lives | Checked by |
|---|---|---|
| Every stamp comes from a raw output through one row of section 8.8, or one rule beside it (`rows.ts`) | `deriveStamp` | the fixture table and the `rows` check |
| A `Stamp` is made only by this package (I2): its brand is a private class field, which no object literal carries, so the compiler refuses a stamp typed by hand, and a spread copy of a derived one (`{ ...stamp, lane: 'rechecked-here' }`, `{ ...stamp, qualifier: [] }`), wherever a Stamp is expected. The `hand` check also reads the apps' text, for what the compiler lets through: a copy, by a spread or by `Object.assign` (whose result the compiler types as the stamp), that changes a stamp's field when what it copies is typed a Stamp or named after one, when it stands where a stamp is used (`stampText` and the other text functions take a stamp's text fields), when the field is one only a stamp has, or in a `.js` or `.jsx` file, which no compiler checks; a cast to Stamp; and `JSON.parse` where a stamp is used. A value typed `any` from elsewhere is beyond both | `types.ts` | the compiler (`test/brand.test.ts`), and the `hand` check |
| Every qualifier is present; [P] names its checker and version; [M] and [T] print their bound first (I10) | `grammarProblems`, run on every stamp made | the `grammar` check |
| Requirement fit is never PROVED: neither [P], as primary or support, nor a Lean result read "PROVED modulo k assumed lemmas" | `buildStrip`, and the strip component again (`provedInRequirement`) | the `requirement` and `render` checks |
| An agent's assertion, or a model saying "proved", is quoted UNREVIEWED text with no stamp (I8) | `deriveStamp` | the fixture table and the `render` check |
| A `sat` is read in its query's direction, and becomes [R] only once its witness replays | `rawFromSolver`, `deriveStamp` | the fixture table |
| No verdict is read past an error line: a solver's `(error …)` line, a Lean error outside the closed list of rejections, a TLC `Error:` outside its verdict vocabulary | `parseSolverLines`, `rawFromLean`, `rawFromTlc` (`isErrorLine`) | the unit tests, and the `derive` check's rule that a fixture quoting a run configuration quotes its error lines too |
| A Lean acceptance needs exit 0, an accept line and no error line, in a Lean run's own lines; an axiom that is not permitted is a rejection; anything else is no verdict (spine section 9.6) | `rawFromLean`, `deriveReceipt` | the fixture table (RUN-lean-axioms' check-bad, RUN-lean-bv-decide's bits-bad) and the receipt tests |
| A receipt's sections (z3, tlc, lean, traces, goldens) are the CLI's normalization and are never trusted alone (ARCHITECTURE.md section 10.3): a stamp states only what the verdict lines state, and a section the lines contradict, or that no run backs, earns no stamp | `deriveReceipt` | the receipt tests, including receipts whose sections contradict their runs |
| Every part of a receipt that yields no stamp is named in `problems`: a cvc5 run no Z3 run takes, verdict lines that say no verdict or another one, a section its runs do not back, a run no deriver reads, a stamp whose grammar a run's version cannot meet. One part that cannot be stamped never costs the receipt its other stamps: `deriveReceipt` never throws on a valid receipt | `deriveReceipt` | the unit tests |
| Order never matters: every rule reads every run that bears on a stamp (every solver run on one input, every premise query of the violation queries on it, every Lean run, every trace), never the first one a search finds, so the same runs in another order give the same stamps. Where several Lean runs give a reading of one kind, the one reported is chosen by its own text, never by its place, and a statement mismatch in any run outranks a constant mismatch in another. One exception, which receipt@1 forces: a trace-validation run names its trace only by its seed, so the runs pair with the traces section's verdicts by seed when every run and every verdict names one, and otherwise in the order both list them; runs out of that order are refused, never misread | `deriveReceipt` | the receipt tests, which run their cases in every order (the trace runs: seeded in either order, and unseeded in the section's order and swapped) |
| I7: a changed statement hash voids the claim to [?], and no stamp derives from a run that read the statement: a solver run whose input it is; the tlc section whose spec it is, or whose run read it, or any TLA+ statement; the traces when any TLA+ statement changed; the lean section whose challenge it is, any of whose runs read it, or when any challenge module changed | `deriveReceipt` | the receipt tests |
| Every GEN-which-stamp key is what this deriver gives its recorded output (ASSESSMENT.md section 4.13), read from the run's lines by one of these parsers, never a raw output typed by hand | the generator, through this package | the `which-stamp` check, on W1-T26's fixtures (below) |

## Using it

```ts
import { deriveStamp, deriveReceipt, buildStrip, stampText, spokenName } from '@statespace/stamps'

const d = deriveStamp({ kind: 'smt-unsat', solver: { name: 'Z3', version: '5.3.1' }, rlimit: 5000000 }, { lane: 'rechecked-here', source: 'INS-z3' })
// d.kind === 'stamp'; stampText(d.stamp) === 'PROVED [P] · Z3 5.3.1 unsat · uncertified · rlimit 5e6'
// d.stamp.defeaters[0].text === 'encoding unverified'; spokenName(d.stamp) starts 'Proved, code P: …'

const fromReceipt = deriveReceipt(receipt, { source: 'receipts/LAB-1.3/<file>.json' })
// { lane, items: [{ section, raw, derivation }], problems } — problems name every part that yields no stamp

const strip = buildStrip({ claim: 'CL-1.1', title: '…', proposition: { primary: d }, correspondence: { … }, requirement: { … } })
// { ok: true, strip } or { ok: false, problems } — it refuses [P] in requirement fit and an agent's claim
```

The site renders stamps and strips with `apps/site/src/components/stamp/` and `apps/site/src/components/strip/`; a screen never formats a stamp itself.

| Export | What |
|---|---|
| `deriveStamp(raw, { lane, source })` | the table of section 8.8; the switch is exhaustive, so a new raw-output kind does not compile without a row |
| `deriveReceipt(receipt, options)` | every stamp a validated receipt@1 carries, with cvc5 cross-checks and premise queries paired, the I7 void for a changed statement hash, and the lane (re-checked here only when the tab re-ran the check); `engineFamily(engine)` names which parser reads an engine's lines |
| `rawFromReply(reply, context)` | an instrument reply, in the bus shape of ARCHITECTURE.md section 17.3, as a raw output |
| `parseSolverLines`, `parseTlcReport`, `parseTlcConstants`, `parseLeanReport`, `parseTraceRecord` and the `rawFrom…` functions | verdict lines as the runs registry and receipts hold them, read into raw outputs; GEN-which-stamp keys its items with the same code (ASSESSMENT.md section 4.13). A solver's verdict counts only where a verdict stands on a line (first, or after a harness label such as `[1.3 guard added]`), on exactly one line of one query; anything they cannot read is a `ParseError`, which means no verdict |
| `isErrorLine` | the error-line test the parsers use and GATE-stamps applies to fixtures: `error: …`, `<file>:<line>:<col>: error: …`, `(error "…")` |
| `buildStrip`, `stripSpokenName`, `provedInRequirement` | M-assurance-strip, its accessible reading (DESIGN.md section 5.9), and the question a component asks before it draws a requirement-fit cell |
| `stampText`, `codeText`, `spokenName`, `parseStampText` | `WORD [code] · qualifier`, the code-first form, the spoken name, and stamp text read back |
| `STAMPS`, `SPINE_ROWS`, `OTHER_RULES`, `TAG_CODES`, `LANE_BADGES` | the vocabulary, the rows, the tags GATE-codes allows, the badge words |

## The direction of a solver query in a receipt

A `sat` or `unsat` means opposite things for a violation query and for a premise query (DESIGN.md section 5.4), and receipt@1 has no field for it. A solver run therefore names its direction in `runs[].step`: `violation` or `premise` (the plural, `premises`, reads the same), optionally followed by `-<name>` to pair the two (`violation-guard` with `premise-guard`). A step such as `starter` names no direction, so its run earns no stamp: the starter's overdraft search is `violation-starter`. The CLI that writes LAB-1's receipts (W1-T29, W1-T30) follows this convention.

Runs that read the same `inputSha256` answer the same query, whatever their steps say. So:

- **A disagreement.** When one solver run on an input says `sat` and another `unsat`, no run on that input earns a stamp, and each carries the defeater against both sides (spine section 8.8). A run on the input whose verdict and lines disagree leaves the others on it unstamped too, since its true answer could be the contradicting one.
- **The cross-check.** Every cvc5 run on a Z3 violation query's input is its cross-check. "Z3 and cvc5 agree" needs every one of them to say `unsat`, under one cvc5 version; an `unknown` or an error leaves the Z3 [P] standing alone.
- **The premise.** Every premise query named after a violation query on its input is its premise, with every run on their inputs (two violation runs on one input, such as the Bench CLI's `violation` and `violation-2`, share one premise reading). Premise queries that disagree (one `sat`, another `unsat`) leave it unstamped; any `unsat` adds the defeater "the claim holds vacuously". One name over several premise inputs is named in `problems`.
- A cvc5 run that no Z3 run takes in one of these ways earns no stamp and is named in `problems`.

## What a receipt must carry for each stamp

`deriveReceipt` re-reads every verdict line with this package's parsers, and a receipt section counts only where its runs' lines back it. The Bench CLI's lanes (W1-T29's Z3 lane now; the TLC, trace and Lean lanes with their labs) write receipts that meet these rules, or the tab derives no stamp and names the reason:

| Section | The run that backs it | What the lines must show |
|---|---|---|
| a solver run | itself | the verdict where a verdict stands on a line, equal to `runs[].verdict`, and a version; after `unknown`, Z3's `(:reason-unknown "…")` (the stamp prints the reason the lines carry, never the z3 section's alone). The rlimit the stamp prints is the one its command line passes (`rlimit=N`, `--rlimit N`), which must equal `budget.rlimit`; with none on the command line, the budget's |
| `z3` | the Z3 runs with the same `inputSha256` as its `smtlibSha256` (through its `entry` when both entries ran it) | its verdict and reason equal one of those runs'; a section that agrees with none of them leaves them all unstamped |
| a cvc5 cross-check or a premise query | itself, read from its own lines | a verdict equal to its `runs[].verdict`; one that disagrees leaves the Z3 query it pairs with unstamped (see the rules above) |
| `tlc` | the one TLC model-check run whose `argv` carries the section's `flags` in order, and whose `inputSha256` is the section's `specSha256` (the spec, written as its statement hash's preimage, as the Z3 lane writes its queries) | the run's verdict, the section's `result` and what `parseTlcReport` reads all agree; a count the lines print equals `distinctStates`; [M] · complete needs "Model checking completed. No error has been found." and the final count line with 0 states left on the queue; [R] for a deadlock under deadlock freedom needs the trace's `State k:` lines |
| `traces` | the TLC runs whose lines print the trace module's `<<"trace-validation", …>>` record, one run per trace (spine section 9.4), one non-empty version among them | each run prints exactly one record, whose verdict agrees with its own counts (accepted: every line matched and the end record; partial: every line matched and no end record; rejected at line k: lines 1 to k − 1 matched) and with the run's verdict; each run pairs with one of the section's verdicts, by its `budget.seed` when every run and every verdict names a seed (each seed once on each side), and otherwise in the order both list them (with the same seed where both name one); each record is its verdict (a rejected trace at the same first non-conforming line); a trace listed twice is never counted twice; the section's `n`, which counts accepted traces only, equals the accepted records |
| `lean` | the Lean runs (`lean`, `lake`, `comparator`, `leanchecker`) | the `#print axioms` lines print every theorem the section lists, with the same axioms and no others (a theorem printed twice counts every axiom either line names), an axiom list printed with no theorem's name holds only axioms the section lists, and the lines agree with its `sorryCount` and `nativeAxioms`; [P] needs a run marked accepted with exit 0, an accept line ("Your solution is okay!" or "<checker> kernel accepts the solution") and no error line; "n checkers" counts the accepting `--paranoid` runs' own accept lines, on which those runs agree. The version is the toolchain's, or else the one version every `lean` run names (a `lake`, comparator or leanchecker run reports its own version, not Lean's). A checker row that rejects still refuses; one that accepts never makes an acceptance |
| `goldens` | none yet | not derived until the goldens harness (W2-T25) prints lines this package parses |

## The GEN-which-stamp fixtures

GEN-which-stamp keys its items with this package (ASSESSMENT.md section 4.13), and GATE-stamps checks every key on the family's fixtures, which W1-T26 writes to `content/generators/GEN-which-stamp/fixtures.json`:

```json
{
  "schema": "statespace/which-stamp-fixtures@1",
  "fixtures": [
    {
      "id": "t1-band3-doublespend-deadlock",
      "run": "RUN-tlc-doublespend",
      "config": "1.8.0-default",
      "parser": "tlc",
      "lines": ["Error: Deadlock reached.", "11 states generated, 10 distinct states found, 3 states left on queue."],
      "context": {},
      "key": "[?] · stopped at deadlock, 10 distinct states"
    }
  ]
}
```

Each fixture goes through the same path as the fixture table's executed fixtures:

- `run` is a run on disk, and `parser` is the one that reads its engine's lines: `solver` for Z3, `tlc` and `trace` for TLC, `lean` for Lean. There is no parser for a raw output typed by hand.
- Every line in `lines` is a whole line of that run's record or output files, and one configuration of the run prints them all (the record itself counts as one, under the run's id): its own verdict lines, or else its own output files. A record with configurations gathers their files in its own output list, so that list makes no configuration. The stamp names that configuration's checker, its own engine and version or else the record's, never the record's alone. When configurations of several checkers print the same lines (Z3 5.3.0, 5.1.0 and 4.15.4 all print `-> unsat` for issue input 1 [X RUN-z3-11179]; TLC 1.8.0 and 1.7.4 both print the same deadlock lines [X RUN-tlc-doublespend]), `config` names the one the fixture quotes. The configuration must be a run of the parser's engine, and the fixture quotes every error line of a configuration it quotes from.
- A cvc5 answer is read only as a Z3 query's cross-check, never alone, as `deriveReceipt` reads a receipt.
- `context` holds only what the lines cannot say, in the keys its parser reads, each a value of the kind it takes: `solver` reads `direction` (violation or premise), `rlimit`, `replay`, `witness` (a length and unit), `guardsEnforcement` and `crossCheck` (`{run, lines, sameInput, config?}`); `tlc` reads `constantsFrom` (an input file of the configuration), `deadlockFreedom` and `bound` (`depth N`); `lean` reads `exitCode` and `paranoid`; `trace` reads `traces` (for each quoted record, the run configuration that printed it) and `property` (safety or liveness, which it needs).
- The solver's rlimit is the one the configuration ran under (its budget, or the `rlimit=N` its command line passes, which must agree), whatever the context says; a context `rlimit` must be that one. Every other number in `context` stands as a whole token in the quoted lines or the configuration's verdict lines, command line, budget, values or exit code (500000 does not stand in 5000000), and a Lean `exitCode` is the configuration's recorded exit code where it has one.
- A solver's witness length is context, because a solver's lines print a model, not its length: its number must stand in the run like any other (so a typed 42 fails), and the fixture's `note` says why the witness is that long. The gate cannot check the length itself, so a length the run prints for another reason (a 1 in the model's values) passes; TLC's witness length is read from the trace's `State k:` lines by the parser, never typed.
- A cross-check is a second solver's answer (cvc5 beside Z3; never one solver twice), read from one configuration of its run (`crossCheck.config` when several checkers print its lines). `sameInput: true` needs the configuration that printed the query's lines and the one that printed the cross-check's to record an input with the same SHA-256 (the record's gathered input list never counts), and, where both lines name their query (`[cl11_violation] unsat`, `cl11_violation: unsat`), the same query.
- A trace counts once, whatever configuration names it, and the stamp names the one TLC version the named configurations ran.

`key` is the derived stamp in either form, word first (`UNKNOWN [?] · stopped at deadlock, 10 distinct states`) or code first (`[?] · …`), the "modulo" reading for a Lean `sorry` (`PROVED modulo 1 assumed lemma`), or `none (<reason>)` for an output that earns no stamp (`none (replay-pending)`). A t2 item may add `part`, the qualifier field it blanks, which must be one of the derived qualifier's parts. A key typed for an output no run recorded fails, so does a raw output typed into the fixture, a context key the parser does not read, a distractor stated as a key, and a generator under `packages/generators/src/which-stamp/` that does not import `@statespace/stamps`. An output no parser reads yet (PostgreSQL's, until S6 and S7) has no GEN-which-stamp key yet. While neither the generator nor the file exists the gate prints "pending (W1-T26)"; a generator without its fixtures fails. The distractor mutants, wrong stamps on purpose, live in `packages/generators/src/which-stamp/mutants.ts` (or `distractors.ts`), the one file of the generator the `hand` check leaves alone; anywhere else in it, stamp text typed by hand is a finding.

## The fixture table

`test/fixtures/verdicts.json` holds raw outputs drawn from executed runs: each fixture quotes lines of a run on disk, verbatim, reads them with one of the package's parsers, and states the stamp they must derive. They follow the GEN-which-stamp rules above: GATE-stamps checks every quoted line against the run's record and output files, reads the checker, budget and inputs from the one configuration that printed the lines (`config` names it where configurations of several checkers print them), requires a fixture that quotes lines of one of the run's configurations to quote every error line of it too (so a fixture cannot keep "Lean default kernel accepts the solution" and drop the "is not permitted" error beside it), checks every number in a fixture's context against that configuration, and every row of section 8.8 against at least one fixture. Rows that no run on disk exercises yet (a bounded Spectacle stop, TLC's simulation mode, a comparator acceptance whose permitted axioms include a `_native` one, the Clearinghouse), and rows whose runs print output no parser here reads yet (PostgreSQL's read-back and its range check, until S6 and S7), stand on fixtures marked `"executed": false`, each with a note naming the run to record or the run it was typed from (the spine's run ID where section 9.5 lists one; where it lists none, the run described in full and reported to the spine); the gate prints them as a note on every run, so they are replaced as those runs land.

## Adding or changing a row

1. Change spine section 8.8 first; GATE-stamps fails until `rows.ts` carries the new "Raw output" cell verbatim.
2. Add the raw-output kind to `raw.ts` and its case to `deriveStamp`; the compiler points at the switch.
3. Add a fixture from an executed run, or a labeled synthetic one with the run to record.
4. Run `npm test -w @statespace/stamps`, `node scripts/verify-stamps.mjs` and `node scripts/verify-stamps.mjs --self-check`.

## Not yet derived

The `pg`, `datalog` and `pairs` sections of a receipt arrive with S6 and S7; `deriveReceipt` names each in `problems` rather than dropping it (TODO(W4-T16), which adds the PostgreSQL lane and the pg section). The `goldens` section is named the same way until the goldens harness's verdict lines have a parser (TODO(W2-T25)), because its counts alone are the CLI's normalization. TLC's simulation mode has a row and a raw-output kind, but receipt@1 carries no trace count for it yet.
