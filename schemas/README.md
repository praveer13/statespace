# schemas: the one JSON Schema source

**Status:** built by W0-T02. `claim@1` and `event@1` are first versions from ARCHITECTURE.md sections 8.2 and 7.2, which W1-T15 and W1-T03 may extend; `IR@1` is a skeleton that W2-T08 publishes; `receipt@1` and `run@1` are published here by W0-S11, with their fixtures. **Date:** 2026-10-24 (machine clock).

This directory holds the JSON Schemas that every record of the course is checked against, and the generators and the gate that keep the TypeScript and Python sides identical to them. Nothing else defines the shape of a receipt, a claim, an event or the IR (spine section 11.1; ARCHITECTURE.md sections 10.1, 17.1 and 18, item 12).

## 1. What is here

| Path | What |
|---|---|
| `defs.schema.json` | shared definitions: SHA-256, the statement hash and its trim set, time, repository paths, the ID forms |
| `claim.schema.json` | `claim@1`, the claim card (ARCHITECTURE.md section 8.2) |
| `event.schema.json` | `event@1`, a practice event of the browser's evidence log (section 7.2); its type is `LedgerEvent` |
| `ir.schema.json` | `IR@1`, the skeleton W2-T08 completes; its open parts are marked `TODO(W2-T08)` |
| `receipt.schema.json`, `run.schema.json` | `receipt@1`, a receipt (spine section 9.4), and `run@1`, a run record (spine section 9.5; `runs/README.md` maps its snake_case fields to ARCHITECTURE.md section 9.1). Published by W0-S11; their fixtures are written by `scripts/runs/fixtures-receipt.mjs` and `scripts/runs/fixtures-run.mjs` |
| `drafts/` | drafts that are not published and generate nothing (W0-S05's `lasso.schema.json`) |
| `fixtures/` | valid and invalid records for every schema, and values for every shared definition |
| `vectors/` | the statement-hash test vectors and the script that writes them |
| `codegen/` | the generators, the keyword and pattern lint, the Python half of the gate, its self-test schema and its planted-fault tests |

Generated from these files and never edited by hand:

| Path | What |
|---|---|
| `packages/schema/src/generated/types.ts` | the TypeScript types |
| `packages/schema/src/generated/schemas.ts` | the schemas themselves, embedded, so the validator needs no file access |
| `packages/schema/src/generated/statement-hash-spec.ts` | the trim set, as constants |
| `bench/statespace/schema/records.py` | the Python types (`TypedDict`, Python 3.11 or later) |
| `bench/statespace/schema/schemas.py` | the schemas, embedded |
| `bench/statespace/schema/_statement_hash_spec.py` | the trim set, as constants |

Written by hand beside them: `packages/schema/src/validate.ts` (a dependency-free validator), `packages/schema/src/statement-hash.ts`, `bench/statespace/schema/statement_hash.py` and `bench/statespace/schema/validation.py` (a wrapper over `jsonschema`, imported only when called).

## 2. Rules every published schema follows

GATE-schema checks each one.

- **Dialect.** JSON Schema draft 2020-12, with `$schema` set. The supported keywords are listed in `codegen/subset.mjs`; any other keyword fails the gate, because a keyword that one side ignores would let the two languages disagree. Extension keywords start with `x-` and are annotations: `x-typeName` names the generated type, and `x-statementHash` is the statement-hash specification (section 3).
- **Names.** The file is `<name>.schema.json` and `$id` is `urn:statespace:<name>@<major>`. A record names its schema in a `schema` field whose constant is `statespace/<name>@<major>`; the gate checks the two agree. A reference to another schema is `urn:statespace:defs@1#/$defs/<name>`, and a reference inside a file is `#/$defs/<name>`.
- **Closed records.** A record schema sets `additionalProperties: false` on its root, so a misspelled field or a stamp typed into a claim card is an error, never a silent extra. A schema that describes data meant to grow says so with an open object.
- **Patterns mean the same in both languages.** ECMAScript (with the `u` flag) and Python's `re.search` read some patterns differently. Measured [X RUN-schema-gate]: `$` also matches before a final newline in Python and not in ECMAScript; `\d` and `\w` match non-ASCII digits and letters in Python only; `.` matches a carriage return and U+2028 in Python only; `\s` differs on U+0085 and U+FEFF. So a pattern uses `[0-9]`, explicit classes, and `(?![\s\S])` for the end of the input. The lint rejects `$`, `.`, `\d`, `\w`, `\s`, `\b`, `\p`, named groups, lookbehind and back references. `[\s\S]` is allowed, only as the whole class, because it is any character in both languages.
- **Tuples.** `prefixItems` is supported for arrays with fixed positions, as in TLC's JSON traces: `minItems` must equal the number of positions, so that none is optional, and `items` is `false` (the tuple is closed) or the schema of the rest. They become TypeScript tuples and Python `tuple[...]`.
- **`format` is an annotation.** Neither validator asserts it. A time is `$ref: urn:statespace:defs@1#/$defs/instant`, which is a pattern.
- **Every schema documents itself.** A root `title` and `description`; a `description` on each property is read into the generated types.

## 3. The statement hash

A statement (a Lean challenge, a TLA+ spec, an SMT-LIB file, a YAML claim file) is pinned by `statement-hash@1`, the rule of Comparator Live's challenge hash, `sha256(challenge.trimRight() + "\n")`. It is written once, as `x-statementHash` in `defs.schema.json`, and both languages follow it.

1. Read the file as bytes; do not translate line endings.
2. Decode as UTF-8, strictly. Invalid UTF-8 is an error, never a replacement character: a lenient decoder would hash different text in two languages. A leading U+FEFF stays.
3. Remove from the end every code point in the trim set, repeatedly, until the last one is not in it.
4. Append one U+000A.
5. Encode as UTF-8, take the SHA-256, and write it as 64 lowercase hexadecimal digits.

**The trim set** is ECMAScript's `WhiteSpace` and `LineTerminator`: U+0009, U+000B, U+000C, U+FEFF, every code point of general category `Zs`, U+000A, U+000D, U+2028 and U+2029. That is 25 code points, and each of Node 22 and 24, Chromium 153, Firefox 155 and WebKit 26.6 removes exactly those from the end of a string with `trimEnd` [X RUN-trimright-engines]. The list is in `defs.schema.json`; the gate re-derives it from the engine's own tables.

**Python's `str.rstrip()` is not used.** It removes 29 code points, among them U+001C to U+001F and U+0085, which ECMAScript keeps, and it keeps U+FEFF, which ECMAScript removes [X RUN-trimright-engines]. A hash taken with it would differ from the tab's on a file that ends in one of those six code points, and a claim would be voided wrongly (ARCHITECTURE.md section 20, item 10). Neither implementation uses `trimEnd`, `rstrip` or a regular expression: each trims the listed code points, which the generators write into constants from the schema, so a change in an engine's whitespace tables cannot change a hash.

**Vectors.** `vectors/statement-hash.json` holds the shared test vectors: the empty text, trailing line ends of every kind, each of the 25 code points alone, the code points that Python trims and ECMAScript keeps, a leading byte order mark, characters outside the Basic Multilingual Plane, invalid UTF-8 and lone surrogates (errors, with a code), and realistic Lean, SMT-LIB and TLA+ statements. Every expected value comes from an oracle that is neither implementation: the engine's own `trimEnd` and `node:crypto`, written by `vectors/generate-statement-hash.mjs`. GATE-schema runs both implementations on every vector, through text, bytes and (in Python) file entry points, and requires them to agree [X RUN-schema-gate].

**Where the rule is stricter than the sentence it comes from.** `sha256(challenge.trimRight() + "\n")` leaves the decoding, the line endings and ill-formed text unsaid. For a valid UTF-8 file the rule above gives the same bytes as that sentence read in JavaScript, whose `trimRight` is `trimEnd`. It refuses what the sentence leaves open: invalid UTF-8, a string with a lone surrogate, and a line-ending translation.

## 4. Using the types, the validators and the hash

TypeScript, from `@statespace/schema`:

```ts
import { validate, validateRecord, isRecord, isValid, statementHashOfBytes } from '@statespace/schema'
import type { Claim, LedgerEvent } from '@statespace/schema'

const result = validate('claim', json)          // { ok: true } or { ok: false, issues: [{ instancePath, keyword, ... }] }
if (isValid('event', value)) { /* value is a LedgerEvent */ }
const hash = await statementHashOfBytes(bytes)  // rejects with StatementHashError on invalid UTF-8
```

Python, from `statespace.schema` (the hash and the types need nothing installed; validation needs `jsonschema`):

```python
from statespace.schema import Claim, statement_hash_file, validate

statement_hash_file("claims/inv.smt2")          # raises StatementHashError on invalid UTF-8
issues = validate("claim", card)                # [] when valid
```

`validate` returns JSON Pointer paths and the failing keyword in both languages, so a message names the same field whichever side found it.

## 5. Adding or changing a schema

1. Write `schemas/<name>.schema.json` by the rules in section 2. Put a shared shape in `defs.schema.json`.
2. Add fixtures under `schemas/fixtures/<name>/`: `valid/*.json` (or `.yaml`), `invalid/*.json` and an `invalid/index.json` that gives, for each invalid file, the failing keyword and instance path. For a new shared definition add valid and invalid values to `fixtures/defs.json`.
3. Run `node schemas/codegen/generate.mjs` to write the TypeScript and Python files.
4. Run `node scripts/verify-schema.mjs`.

A change that adds an optional property is compatible. A change that removes a property, narrows a value or adds a required property is a new version: `@2`, a new `$id`, a new tag, and a logged decision. The statement-hash rule, the schema version of the receipt and the rule that receipts record versions verbatim are never changed in place (`labs/TOOLS.md` section 6.4).

## 6. GATE-schema

`node scripts/verify-schema.mjs` (the fast lane; it needs Node 22.6 or later and `uv`, and takes a few seconds when `uv` has its packages cached [X RUN-schema-gate]). It fails on any of these:

1. A schema that is not well formed, uses a keyword outside the subset or an unportable pattern, has a `$ref` that names nothing, or has a `schema` constant that its `$id` does not imply.
2. A generated file that differs from a fresh generation, or a TypeScript interface and a Python `TypedDict` that differ from each other or from the schema in their keys, their order or their required keys.
3. A record that does not validate. The records are the fixtures, the shared definitions' values, documents sent as raw JSON text (so each language's own parser reads them), mutants of every valid fixture (a key removed, a type changed, a trailing newline added), and every file in the repository that declares a `statespace/...` schema. The TypeScript validator and Python's `jsonschema` must give the same verdict on every one, and each invalid fixture must fail on the keyword and path its index names, in both.
4. A hash vector either language does not reproduce, a trim set that is not the engine's `trimEnd`, or `x-statementHash` written more than once.
5. A keep/kill rules file whose SHA-256 differs from the one `runs/RUN-keepkill-rules.json` records. The record lists the file in `inputs` as `{path, sha256}` (or `input` and `inputSha256`), or gives a `sha256sum` line in its outputs.

`--strict` also fails on work a later task owns, which the gate otherwise reports as `todo`: the receipt and run schemas, the fixtures for schemas other tasks publish, `runs/RUN-*.json` records that wait for `run@1`, and the keep/kill rules. It is meant for the W0 exit (W0-T11). `--write` regenerates the generated files and the vectors first. `--self-check` runs 30 scenarios in a scratch copy (a hand-edited generated file, a `$` pattern, `str.rstrip()` in Python, a dropped U+FEFF, an edited vector, a changed keep/kill file, ...; two are controls that must pass) and 18 pattern probes, and requires the gate to fail on the right check each time [X RUN-schema-self-check]. It takes under a minute and belongs to the nightly lane.

The scripts that produced the recorded evidence are in `scripts/spikes/W0-T02/`: `trimright-engines.mjs` (the trim set in Node and in three browser engines, run in the pinned Playwright image), `type-check.mjs` (every valid fixture as a typed literal under `tsc` and `pyright`), `lasso-promotion.mjs` (W0-S05's draft promoted in a scratch copy) and `record.mjs`, which runs them all and writes `runs/RUN-schema-gate.json`, `runs/RUN-schema-self-check.json` and `runs/RUN-trimright-engines.json`.

## 7. Why the generators are hand-written

W0 allows dependency-free scripts, so the generators and the validator are plain code in this repository. An off-the-shelf generator would add a toolchain per language and could not enforce the two rules that matter here: that a schema uses only constructs both validators read alike, and that a type, a validator and a hash behave the same on both sides. The cost is that the generators handle only the supported subset; they stop with the schema location on anything else (an `allOf` member with a shape, properties beside `oneOf`, a name that two properties would both produce), and never type it as `unknown` in silence.

## 8. What later tasks do here

| Task | What it adds or relies on |
|---|---|
| W0-S11 | published `receipt.schema.json` and `run.schema.json`, using the patterns and `defs` above (ARCHITECTURE.md section 10.1 writes `$` in its outline patterns; here they use `(?![\s\S])`), with their fixtures and generated types. The gate validates every `runs/RUN-*.json` against `run@1`: the records use snake_case fields and an `outputs` list, where ARCHITECTURE.md section 9.1 writes camelCase and an `outputs` object, and `runs/README.md` maps one to the other until the owner settles the naming |
| W0-T07 | commits `content/governance/keepkill-rules.yaml` and records its SHA-256 in `runs/RUN-keepkill-rules.json`; this gate then fails if the file changes |
| W1-T03, W1-T15, W2-T08 | finish `event@1`, `claim@1` and `IR@1`; W5-T40 adds the claim topics vocabulary |
| W0-S05 | keeps `drafts/lasso.schema.json`; moving it to `schemas/lasso.schema.json` publishes it. A scratch copy of the draft passes the lint, generates types in both languages, and both validators accept the TLC trace recorded for the Hold spec and reject two tampered copies [X RUN-schema-gate]; its owner adds fixtures when it is published |
| W0-T05 | lists `jsonschema` and `pyyaml` in `bench/pyproject.toml`, pinned to the versions the gate ran with [X RUN-schema-gate] |
| W0-T04 | needs to run `node scripts/verify-schema.mjs` in the fast lane |
