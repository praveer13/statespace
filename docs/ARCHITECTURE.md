# statespace: technical architecture

**Status:** the technical architecture for v2, written against the spine (`docs/spine/SPINE.md`, revision 2), which owns every ID used here. **Date:** 2026-10-23 (machine clock). **Audience:** the owner and the agents who build waves W0–W6. **Scope:** the static site, the instrument origin and its message bus, the workers, the evidence log, the learner's lab repo and claim graph, the runs registry, receipts, the Bench and its CLI, lab zips and the agent kit, CI gates, budgets, the security model, offline use, and the module map. Pedagogy, content and the visual system appear only where they constrain the build.

**Precedence.** The spine's order applies: the roadmap; then executed runs (`research/spikes/RESULTS.md`, `research/evidence/`); then the brief (`research/synthesis/BRIEF.md`), the digests, the reports and reviews, kernelspace, and v1. Where this document decides something the spine leaves open, §18 lists the decision for owner review. §20 lists what this document believes the spine gets wrong.

**Tags.** `[X RUN-id]` marks an executed run on disk (spine §9.5). `{{run:RUN-id}}` marks a run that must be recorded before the sentence ships. `[D]` marks a design decision or estimate made here; a value tagged [D] is a course parameter, never a tool fact. Citation keys in lowercase brackets ([webkit7d], [ghpages], [ghdomain], [ks100x], [ksnext], [dp], [dr2], [sridefeat]) resolve in BRIEF §9; run tags resolve in spine §9.5 and, once W0-S11 lands, in `runs/`. Stamp codes are bracketed; IDs never are.

---

## 0. The architecture on one screen

```
 learner's browser
 +--------------------------------------------------------------------+
 | MAIN ORIGIN   https://<course-domain>/   (GitHub Pages, static)    |
 |   screens SCR-*, lessons, Today, Claims, Audit, Mirror             |
 |   evidence log: IndexedDB, practice events only                    |
 |   pure course code: stamps, FSRS, KC state, pocket checkers        |
 |   status is derived at read time and never stored (I2)             |
 |        |                                                           |
 |        |  one MessagePort after an origin-checked handshake;       |
 |        |  structured data only, size-capped in both directions     |
 |        v                                                           |
 |   +----------------------------------------------------------+     |
 |   | INSTRUMENT ORIGIN   https://instruments.<course-domain>/ |     |
 |   |   second Pages site in a hidden iframe; no learner data  |     |
 |   |   host: origin checks, caps, schema validation           |     |
 |   |   workers: Pyodide + Z3 | Spectacle | PGlite | Lane A    |     |
 |   |            pure pool (lasso, history, pairs, parsers)    |     |
 |   |   engine cache: its own service worker, content-hashed   |     |
 |   +----------------------------------------------------------+     |
 +--------------------------------------------------------------------+
        ^  files and URL fragments (receipts, bundles, wasm, specs)
        |  are handed to the instrument origin unparsed
 learner's machine                            course repository and CI
 +----------------------------------------+   +------------------------------------+
 | the Bench: digest-pinned devcontainer  |   | content/, runs/, schemas/, labs/   |
 | statespace CLI (Python, uv)            |   | gates: fast (under 5 min, blocks   |
 | Lean, TLC, PostgreSQL, Z3, cvc5, ...   |   | merges); nightly (blocks           |
 | lab repo in git = the record:          |   | releases); release                 |
 |   claims/  specimens/  receipts/       |   | deploys both Pages sites           |
 |   broken/ beside fixed/                |   |                                    |
 +----------------------------------------+   +------------------------------------+
```

Seven rules carry the design.

1. **Zero always-on servers.** Two static GitHub Pages sites, the learner's machine, and CI. No accounts, telemetry or grading server (I6).
2. **Two origins.** Every engine, every piece of learner code and every parse of bytes from outside the page runs on the instrument origin, which holds no learner data. The main origin holds the evidence log and never parses outside bytes (I6, OD-5).
3. **The lab repo is the record.** The browser's only record is practice events. Claims, specimens and receipts live in the learner's git repository (V2-17).
4. **Every tool number is a run.** Copy cites `{{run:RUN-id}}`; `runs/` holds each run's recipe and outputs (I4).
5. **Checkers decide.** Keys are computed by engines at grade time (I3). Stamps are derived from receipts and instrument replies at read time, never stored (I2).
6. **Statements are pinned and hashed.** Agents may prove; the guard hook keeps them off what the learner states (I7, I8).
7. **Every bounded check prints its bound,** the course's own graders included (I10).

---

## 1. Invariants and the mechanisms that hold them

| # | Invariant (spine §1.1) | Mechanism in this architecture | Where | Gate |
|---|---|---|---|---|
| I1 | Evidence, not clicks | Only graded event kinds feed the learner model. Reading, viewing and opening drawers write no evidence. Agent work enters as claims or as `provenance: agent` events weighted 0 | `packages/ledger`, `packages/learner` | GATE-lessons; ledger property tests |
| I2 | Derived, never stored | The log stores events. KC state, sign-off, VRK₃₀, Judgment and stamps are pure functions of events, the lab mirror and content | `packages/learner`, `packages/stamps`, `packages/claims` | GATE-stamps, GATE-schema |
| I3 | Pure generators, keys from checkers | `make(seed, level)` is pure and deterministic. The key is computed over the bus, or by a pocket checker, at grade time. `unknown` discards the instance | `packages/generators` | GATE-generators, GATE-calls |
| I4 | Every tool number is a run reference | The content compiler resolves `{{run:RUN-id}}` against `runs/`; an unresolved reference fails outside draft content | `scripts/build-content`, `packages/runs` | GATE-numbers, GATE-facts, GATE-runs |
| I5 | Nothing locks | No route, block or item has a precondition, and the router has no guards. Call It is a commit before a run, never a gate on reading | `apps/site` | GATE-lessons |
| I6 | Zero servers; untrusted input only in the instrument origin | Two static sites. Engines and parsers of outside bytes run only on the instrument origin (§5, §6) | `apps/instruments`, `packages/bus` | GATE-bundle; W0-S01 |
| I7 | Statements pinned and hashed | Challenge packs, `claims/*.tla`, `*.smt2` and `*.yaml`, comparator-style hashes in receipts; a changed hash voids the claim to [?] | `bench/`, `packages/stamps` | GATE-claims, GATE-schema |
| I8 | Agent claims never stamped | Agent proposals live in `proposals/` and render as quoted UNREVIEWED text; the stamp deriver has no code path for them | `packages/claims`, `packages/stamps` | GATE-stamps |
| I9 | No non-public material and personal identifiers in the public repo | GATE-privacy scans the repo, lab zips and stuck packets; overlay data never leaves the device | `scripts/verify-privacy` | GATE-privacy |
| I10 | Bounded checks print their bound | Every instrument reply carries its budget and bound; the stamp deriver refuses an [M] or [T] without one; graders print theirs | `packages/bus`, `packages/stamps` | GATE-stamps, GATE-items |

---

## 2. Runtime topology

### 2.1 Where code runs

| Place | What runs there | What it holds | What it never does |
|---|---|---|---|
| Main origin | course UI; derivations of learner state; stamp derivation; pocket checkers (INS-pocket); INS-interp on course-authored programs; Goal Replay and Theater rendering from build-time data | the evidence log; working state (settings, drafts); a disposable, read-only mirror of the lab repo | parse bytes from outside the page; run an engine; run learner code |
| Instrument origin | Pyodide with Z3, Spectacle, PGlite, the Lane A host, and a pool of pure workers (lasso validator, history checker, paired-state evaluator, INS-interp on imported or learner-produced IR, and the parsers for receipts, bundles, fragments, traces and histories) | content-hashed engine assets in its own Cache API | read or write learner data; fetch a URL named in a message; return HTML |
| The Bench | the `statespace` CLI and the real tools | the lab repo and the toolchains | send anything to the course |
| CI (GitHub Actions) | gates, run recording, deploys | the course repository | see learner data |

The placement rule, instrument by instrument, is in §6.9.

### 2.2 Principal data flows

1. **A lesson cell run.** The learner commits a call, which is written durably first. The main origin then sends `{engine, version, input, budget}` over the bus; the worker replies `{verdict, witness, stats, provenance}`; the main origin derives the stamp (spine §8.8) and logs the event with `engine@version`.
2. **A generated item.** `make(seed, level)` builds the instance on the main origin. The key comes from an engine over the bus or from a pocket checker. A `sat` answer is graded by checking the learner's witness against the property, never by matching model values, because native and Pyodide witnesses differ [X RUN-z3-bv64-pyodide].
3. **A Lane A check.** The learner drops a `.wasm` built on the Bench. The main origin draws and records the seeds, then hands over the bytes unparsed. The instrument origin compiles the module, runs each check in a fresh instance, composes oracles (INS-interp, Z3, PGlite) and returns per-check results, which the main origin logs as `lab-check` events (§6.6).
4. **A receipt import.** A receipt file or URL fragment from the Bench is handed over unparsed. The instrument origin parses it and validates it against `receipt@1`. The main origin re-validates the structured reply, derives stamps, updates the mirror and logs a `receipt-import` event (§10).
5. **A lab bundle import.** `statespace export` writes a bundle of claims, statement texts, specimens and receipts. It travels like a receipt and replaces the mirror wholesale (§8.3).
6. **A backup.** The main origin exports the event log as a bundle file; re-import merges with undo (§7.7).
7. **Runs into copy.** At build time CI resolves every `{{run:RUN-id}}` against `runs/`; the site ships resolved values linked to their run records (§9).
8. **A red night.** The nightly lane writes a status file naming failed gates and the course claims they touch; a redeploy shows those claims as "unverified since <date>" (§13.4).

---

## 3. The site

### 3.1 Stack and hosting

React 19.3.1, Vite 7.3.7, TypeScript 5.9.3, React Router 7.18.4, Playwright and axe, pinned in W0-S12 [X RUN-scaffold]. The output is static and served by GitHub Pages, which runs no server code and accepts no custom response headers. Two consequences shape the rest of this document. Security policy arrives as a meta CSP (§15.4). Long-lived caching is done by service workers under content-hashed URLs (§16), not by HTTP headers. A post-build step writes an `index.html` for every static route, so deep links return HTTP 200 (kernelspace's pattern). Learner payloads that ride in links (receipts, spec duels) use the URL fragment, which browsers do not send to servers.

### 3.2 Routes and screens

| Route | Screen | Phone-first |
|---|---|---|
| `/` | SCR-boot on a first visit; SCR-today afterwards | yes |
| `/boot` | SCR-boot | yes |
| `/today` | SCR-today | yes |
| `/week` | SCR-week | yes |
| `/stages` | SCR-stages | yes |
| `/stages/S{n}` | SCR-stage | yes |
| `/lessons/S{n}.L{k}` | SCR-lesson | yes |
| `/theater/{scene}` | SCR-theater | no (vertical lanes on phones) |
| `/derivation/{item}` | SCR-derivation | no (read on phones) |
| `/bench` | SCR-bench | no (labeled laptop-only) |
| `/labs/LAB-{n}` | SCR-lab | no (resume card on phones) |
| `/receipts#{sha256}` | SCR-receipt | yes |
| `/audit` | SCR-audit | yes |
| `/specimens` | SCR-specimens | yes |
| `/claims` | SCR-claims | yes (cards); table at 900 px and wider |
| `/defence/S{n}` | SCR-defence | no (Part D on phones) |
| `/mirror` | SCR-mirror | yes |
| `/notes` | SCR-notes | no |
| `/drawers/D-{nn}` | SCR-drawer | yes |
| `/clearinghouse` | SCR-clearinghouse | yes |
| `/assurance` | SCR-assurance | yes |
| `/changes` | SCR-changes | yes |
| `/search` | SCR-search | yes |
| `/settings` | SCR-settings | yes |
| the instrument origin, `b/<buildId>/…` (the payload in the fragment) | SCR-instrument | yes |

Navigation is Today · Stages · Bench · Audit · Claims, plus search (spine §0). The Mirror is reached from Today and is never linked from Claims. A route that names a learner object, such as a receipt, names it in the fragment, so no learner data appears in any request. A run record opens in a run sheet over the current screen rather than on a route of its own (§18). A spec-duel link (M-spec-duel) and a receipt imported by link open SCR-instrument on the instrument origin, where the untrusted input renders, rather than a main-origin screen; the payload rides in the fragment, and the main origin never parses it (I6).

### 3.3 Content pipeline

```
content/   lessons, KC graph, generator templates, audit pool, specimens,
           claim templates, seams and erosions, drawers, facts registry
runs/      RUN-*.json
built      Goal Replay strips, Theater graphs, goldens table (build-time artifacts)
   |
   |  scripts/build-content: validate against schemas/ and the ID registry,
   |  resolve {{run:}} references, compute itemRev, build the rail (titles only)
   v
apps/site/public/content/*.json   per-lesson JSON, lazy and content-hashed
apps/site/public/md/*.md          per-lesson Markdown for the learner's agent
apps/site/public/llms.txt         index of the Markdown pages
apps/site/public/schemas/*.json   published JSON Schemas (receipt@1, claim@1, ...)
search index                      for SCR-search
```

**Block types.** W1–W2 content uses at most six content block types (V2-18), and GATE-lessons counts them. The proposed initial six [D] are `prose` (with sidenotes); `instrument` (any tab instrument cell, with the Call It commit on its first run and a recorded-run fallback); `item` (a graded item naming its GEN family and template, in the role prequestion, segment or exit); `claim`; `specimen`; and `card` (Build this, production twin, dated incident, "this will feel harder"). Segments are structure, not blocks. The rail renders segment titles only, never answers, verdicts or option text (V2-05).

**Item revisions.** `itemRev` is a fingerprint over an item's authored fields and the runs it cites. An event graded against an older revision shows "re-check" and never deducts (kernelspace's rule, spine §0).

### 3.4 State on the main origin

No store holds status. There are three kinds of state:

- **the event log**, append-only (§7);
- **working state**: settings, drafts, the remembered tab; last writer wins, and none of it is evidence;
- **the lab mirror**: read-only, replaced on each lab bundle import (§8.3).

Screens read derived views from memoized selectors over events, the mirror and content (I2).

### 3.5 The instrument client

`InstrumentClient` (`apps/site/src/bus-client/`) creates the hidden iframe on the first instrument need; Boot creates it early, because its first call runs Z3. The client performs the handshake (§5.3), multiplexes requests by id, enforces the caps on outgoing messages (§5.6), runs its own watchdog per request, and exposes `run`, `cancel`, `warm`, `caps` and `evict`. While a worker is cold or its engine is downloading, an instrument cell renders the recorded run for the same input from `runs/`, labeled as recorded and showing its run id. Boot does exactly this while Z3 loads [X RUN-z3-starter-pyodide], which also gives phones the spine's flow: predict, see a recorded run, queue the hands-on work for the laptop (spine §9.3).

---

## 4. kernelspace infrastructure: vendored, adapted and new

statespace inherits kernelspace's learning engine and none of its look (spine §0). The inheritance is code where kernelspace's code is stateless and tested, and ideas where the code is coupled to kernelspace's own product.

### 4.1 How vendoring works

`vendor/kernelspace/` holds files copied from kernelspace at one pinned commit SHA. `vendor/kernelspace/VENDOR.md` records the SHA, each file's path and SHA-256, and its license; kernelspace's license file sits beside them, and GATE-privacy's license lint checks it. Vendored files are never edited in place. statespace changes live in wrapper modules, so `scripts/vendor-drift` can diff the vendored set against a newer kernelspace SHA and produce a reviewable update. W0-S12 performs the first vendoring.

### 4.2 Module by module

| kernelspace module | Disposition | statespace home | Reason |
|---|---|---|---|
| Evidence ledger v3 (engine, store façade, legacy migration) | **Not vendored.** Its envelope ideas are re-implemented: a grow-only event set keyed by id, a canonical conflict rule, order-insensitive folds, a schema guard, a write-ahead outbox, cross-tab sync, and merge-or-replace import behind an undo checkpoint (§7) | `packages/ledger` | the engine is coupled to kernelspace's XP, legacy migration and store façade (spine §11.1; [dr2 B5, R6]) |
| KC graph (types, stable IDs with migration rows, its verify script) | **Adapted.** The graph shape (requires, confusable and threshold edges) and the rule that an ID never changes in place are kept; the module and its gate are rewritten for 104 KCs, published paths and first-taught order | `packages/kc`, `content/kc/`, GATE-kc | the builder's-path checks and soft-edge substitutes (spine §3.0) have no kernelspace counterpart |
| FSRS (`fsrs.ts`: pure, dependency-free, with recorded reference vectors) | **Vendored unchanged** | `vendor/kernelspace/`, wrapped by `packages/learner/schedule` | statespace sets target retention 0.85–0.90 (spine §4.1) |
| Claims registry (dated, sourced external facts with TTLs, "stale since" badges, errata, change cards) | **Adapted** as the facts registry. TTLs, "stale since" badges and errata that flag "re-check" are kept. Tool facts leave it for `runs/` | `content/registry/`; M-change-cards, M-production-twin | I4 makes tool facts runs; "claim" is a learner term here (§20) |
| Verify-script framework, item lints, blind-strategy checks, `a11y.mjs` | **Vendored** | `scripts/verify-*`, `scripts/a11y.mjs` | the runner, report format and item lints carry over; most gates are new (§13) |
| Lab packer and agent kit (AGENTS.md and CLAUDE.md templates, the fail-closed PreToolUse hook) | **Vendored and extended:** challenge packs, `comparator.json`, a protected-paths manifest, the devcontainer, the Python CLI | `labs/pack/`, `labs/agent-kit/` | V2-01 |
| Zero-import wasm ABI (host, lab worker, Rust kit crate) | **Vendored;** ABI v2 unchanged | `apps/instruments/src/lane-a/`, `labs/kit-rs/` | the family's ABI [ksnext]; statespace adds host-side oracles (§6.6) |
| `sw.js` with its kill switch | **Vendored;** used on both origins | `apps/site/src/sw/`, `apps/instruments/src/sw/` | offline use and engine caching (§16) |
| Seeded RNG and the determinism lint | **Vendored** | `packages/rng`, GATE-generators | I3 |

### 4.3 Not inherited

- **The Fleet world.** The Clearinghouse is new and thinner (M-docket, §6.8).
- **The look** (V2-33).
- **The opaque-origin sandbox** that kernelspace uses for untrusted code (a worker inside an `<iframe sandbox="allow-scripts">`), because Pyodide's worker failed inside it in Chromium [X RUN-browser-origin]. statespace uses a real second origin instead (§5.1).
- **Any in-page model or bring-your-own-key tutor.** No runtime language-model component exists anywhere in this architecture; the learner's own agent works through `llms.txt`, per-lesson Markdown and the lab kit, and the site sees nothing.

### 4.4 New in statespace

1. The instrument origin and its message-only bus (§5).
2. Engine workers: Pyodide with the Z3 wheel, Spectacle, PGlite, the Datalog adapter (§6).
3. Host-side oracles composed with Lane A (§6.6).
4. The runs registry and its reference resolver (§9).
5. Receipt v1 and the Lane B import path (§10).
6. The lab repo as the record, the lab mirror, and the typed claim graph with erosion propagation (§8).
7. Stamps derived from receipts and replies (§8.5).
8. The Bench devcontainer and the Python CLI (§11).
9. Conformance gates across engines (§13.3).
10. The Clearinghouse world (§6.8).

---

## 5. Two origins and the instrument bus

### 5.1 Why a second origin

The decision (OD-5, V2-19) rests on executed runs:

- Z3 runs in the tab through Pyodide 314.0.7 and the `z3_solver` 5.3.1.0 wheel without cross-origin isolation or SharedArrayBuffer, in Chromium 153, Firefox 155 and WebKit 26.6 [X RUN-z3-starter-pyodide]. Plain GitHub Pages can therefore host it.
- Code inside a Pyodide worker can see `indexedDB` [X RUN-browser-origin]. On the main origin, that database would be the evidence log.
- kernelspace's isolation pattern failed for Pyodide in Chromium, and Pyodide's classic-worker paths failed in all three engines [X RUN-browser-origin].
- A separate origin in a plain iframe, with a same-origin module worker, ran Z3 in all three engines, could not read the parent's storage, and had the Cache API available [X RUN-browser-origin].
- A GitHub account's project sites share one origin, so the instrument site needs its own custom subdomain [ghpages][ghdomain][dr2 B8].

### 5.2 Hosting

| | Main origin | Instrument origin |
|---|---|---|
| URL | `https://<course-domain>/` [D] | `https://instruments.<course-domain>/` (OD-5) |
| Source | `apps/site` | `apps/instruments` |
| Pages site | this repository | a second repository that holds only built output and its CNAME file, because a repository serves one Pages site [D] |
| Served paths | the course | `b/<buildId>/host.html`, workers, engine assets, the asset manifest, its service worker |
| Learner data | evidence log, working state, lab mirror | none |

**One registrable domain** [D]. Both origins live under one registrable domain, so the instrument frame is same-site but cross-origin: the same-origin policy still separates their storage, and the extra restrictions browsers place on cross-site frames should not apply. Whether that holds for cache persistence in each engine is a W0-S01 question (§19).

**Versioned builds** [D]. Each instruments build lives at an immutable path, `b/<buildId>/`, where `buildId` is a content hash. The main site embeds the `buildId` it was built and tested against, and the instruments repository keeps the last few builds, so a cached main site keeps working through and after a deploy. A main site never talks to an instruments build it was not tested with.

### 5.3 Embedding and handshake

```html
<iframe src="https://instruments.<course-domain>/b/<buildId>/host.html"
        title="statespace instruments" hidden referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"></iframe>
```

The iframe carries `sandbox="allow-scripts allow-same-origin"` [D]: workers, caches and the handshake behave as without it, and it blocks top navigation and `document.domain` in Chromium, Firefox and WebKit [X RUN-origin-subdomain].

1. `host.html` loads. If `window.parent === window` (opened at the top level), it shows a one-line notice and does nothing else.
2. The host posts `{t: 'hello', bus: 1, build}` to its parent once per allowed parent origin, each time naming that origin as the target. A browser drops a message whose target origin does not match, so only the real parent receives it.
3. The main origin accepts `hello` only when `event.origin === INSTRUMENT_ORIGIN`, `event.source === iframe.contentWindow`, and `build` equals the `buildId` it expects.
4. The main origin creates a `MessageChannel`, keeps `port1`, and posts `{t: 'connect', bus: 1, build, nonce}` to `INSTRUMENT_ORIGIN` only, transferring `port2`.
5. The host accepts `connect` only from an allowed parent origin, from `window.parent`, with exactly one transferred port, and only once per frame lifetime. It answers `ready` on the port. After `connect` is accepted the host registers `/sw.js` with scope `/`; a page that never completes the handshake causes no registration, and a registration from an earlier session still controls the frame from its first request [D] [X RUN-origin-subdomain].
6. From then on both sides use only the port. Window-level messages are ignored on both sides without inspecting their payloads.

### 5.4 Message types

Every message carries `t`; request-scoped messages also carry `id`, a random 128-bit string chosen by the main origin.

**Main origin → instrument origin**

| `t` | Fields | Effect |
|---|---|---|
| `connect` | `bus`, `build`, `nonce`; one transferred port | adopt the port (once) |
| `run` | `id`; `req: {engine, version, input, budget}` | queue a run on the engine's worker |
| `cancel` | `id` | drop a queued run, or `worker.terminate()` a running one and respawn lazily |
| `warm` | `engine` | fetch and initialize an engine before it is needed |
| `caps` | — | report engines, pinned versions, cache state and first-load sizes from the manifest |
| `evict` | `engine?` | clear engine caches: the instrument cache's kill switch |

**Instrument origin → main origin**

| `t` | Fields | Notes |
|---|---|---|
| `hello` | `bus`, `build` | before the handshake only |
| `ready` | `engines: EngineCaps[]` | after `connect` |
| `progress` | `id`, `phase: download \| init \| run`, `loaded?`, `total?` | throttled to a few per second [D] |
| `result` | `id`, `reply: {verdict, witness, stats, provenance}` | exactly one `result` or `error` per `run` |
| `error` | `id?`, `code`, `detail` (plain text, capped) | codes below |

**Error codes:** `bad-message`, `too-large`, `unknown-engine`, `version-mismatch`, `budget-exhausted`, `terminated`, `engine-crashed`, `invalid-input`, `busy`. A `version-mismatch` means the request named a version the build does not pin. Each build pins exactly one version per engine and refuses mismatches rather than silently answering with another version, because a stamp's qualifier names the version (spine §8.7).

**Engines on the bus**

| `engine` | Serves | Worker (§6) |
|---|---|---|
| `z3` | INS-z3, INS-derivation steps, spec duels, grade-time keys | Pyodide |
| `datalog` | INS-datalog | Pyodide (Fixedpoint) or pure pool (fallback) |
| `spectacle` | INS-spectacle | Spectacle |
| `pglite` | INS-pglite | PGlite |
| `lane-a` | INS-lane-a, INS-sim | Lane A |
| `lasso` | INS-lasso | pure pool |
| `history` | INS-history's checker | pure pool |
| `pairs` | INS-pairs | pure pool |
| `interp` | INS-interp on imported or learner-produced IR | pure pool |
| `receipt`, `bundle`, `fragment`, `trace` | parsing and validating outside bytes: receipts (INS-receipt), lab, export and audit bundles, URL fragments, histories and NDJSON traces | pure pool |
| `clearinghouse` | M-docket | pure pool, with Lane A and PGlite through the supervisor |

### 5.5 Origin checks

**Main side.**
- `INSTRUMENT_ORIGIN` is a build-time constant: exact scheme and host, no wildcard, no path.
- The handshake is accepted only as in §5.3; every other window message is ignored unread.
- Messages are sent only with an explicit target origin, never `"*"`.
- Every reply is untrusted data: it is validated against the generated schema for its engine before use, and a reply whose `id` is unknown or already answered is dropped.

**Instrument side.**
- `ALLOWED_PARENTS` is a build-time list holding the production main origin. Development builds add `http://localhost:<port>`; GATE-bundle fails a production build whose list holds anything else.
- `connect` is accepted only as in §5.3, and a second port is never adopted.
- Where `location.ancestorOrigins` exists, the host refuses to start when its first entry is a real origin outside the allowed list; it treats `"null"` as unknown and relies on the handshake [D]. `referrerpolicy="no-referrer"` stays: where Firefox masked the ancestor as `"null"`, the handshake alone rejected the forged `connect` [X RUN-origin-subdomain]. This is defense in depth; the property is not available in every engine.
- The host never fetches a URL taken from a message. Engines load only assets named in the build's manifest, from the instrument origin itself.

### 5.6 Size caps and structural limits [D]

These are course parameters held in `packages/bus/limits.ts`, enforced by the sender before transfer and again by the receiver.

| Payload | Cap [D] |
|---|---|
| any message on the port | 16 MiB |
| `run.input` for text engines (SMT-LIB, TLA+, SQL, IR JSON) | 256 KiB |
| a learner wasm module | 8 MiB |
| a receipt file | 2 MiB |
| a lab bundle from `statespace export` | 16 MiB |
| a browser export bundle (the event log) | 16 MiB |
| an audit bundle from `statespace audit` | 4 MiB |
| an imported history or NDJSON trace file | 4 MiB |
| a URL-fragment payload (receipt or spec duel), encoded | 32 KiB; larger receipts import as files |
| a witness in a reply | 64 KiB |
| a graph reply (the Spectacle minimap) | 4 MiB |
| JSON structure | depth at most 64; at most 100,000 values; the keys `__proto__`, `prototype` and `constructor` rejected |
| queues | one running request per worker; at most 16 queued per engine |
| text shown to the learner from a reply | truncated at 10,000 characters, with "show all" in a text-only viewer |

### 5.7 Validation and rendering rules

- **Outside bytes are data.** They are parsed by grammars: JSON, SMT-LIB through Z3's own parser, TLA+ through Spectacle's parser, IR through its schema. Nothing from a file or a fragment reaches `eval`, `Function`, Python's `exec`, or a template engine.
- **A URL never carries executable Python.** An INS-z3 cell runs only code the course authored or the learner typed into the cell. Spec-duel fragments carry SMT-LIB, the course's property language or TLA+, all parsed as data.
- **Validators are compiled at build time** from `schemas/` into plain functions, so no page needs runtime code generation.
- **Replies render as text.** Verdict lines and witnesses appear in `<pre>` blocks or tables built through text APIs; no reply field is assigned to `innerHTML` or rendered as Markdown. W1-T14's acceptance ("a fuzzed import never renders as HTML") is a GATE-bundle test.

### 5.8 Budgets, timeouts and cancellation

Every request carries a `Budget` with two parts. The engine budget (a Z3 `rlimit`, a Spectacle wall-clock budget, a history-search bound, a Lane A per-check limit) produces a verdict, and that verdict prints its bound (I10). The wall-clock watchdog `wallMs` produces `terminated` and no verdict: on expiry the supervisor calls `worker.terminate()` and the next request gets a fresh worker. The main origin runs its own watchdog, the host's plus a margin [D], and treats silence as `terminated`.

Two rules come from W0-S02. First, every call to the solver sets an `rlimit`, because `timeout` never returned under Pyodide in Node or in three desktop browsers [X RUN-z3-budget-pyodide, RUN-phone-pyodide]. The watchdog's wall time is a second bound: twice the slowest run that the cell's `rlimit` allows on the reference profile, and at least 10 s [D] (W0-S02 §5.2). Second, `worker.terminate()` is called only by the watchdog, never on a timer, because the next request pays the warm start again.

### 5.9 Downloads

OD-6 (changed 2026-10-25): no download asks first and none warns, and while an engine downloads the loader shows its size. **Definition** [D]: an engine's size is everything it needs for its first load, counted as compressed bytes on the wire, as listed in the build's asset manifest; the host reports it in `caps` (`firstLoadBytes`) and in `progress` (`total`), and the loader prints that figure, never typed copy. The host fetches an uncached engine only for a `run` or `warm` from the main origin. First loads: Pyodide with Z3 12,893,420 B as gzip level 5 [X RUN-phone-pyodide]; PGlite 5,580,851 B as gzip level 5 [X RUN-pglite-0511].

---

## 6. Workers on the instrument origin

### 6.1 The supervisor

The host page runs one supervisor. It keeps one long-lived worker per engine family (a module worker, except Spectacle's classic worker, §6.3), created on first use, with a FIFO queue and one request in flight per worker. It starts a watchdog per request, respawns a worker after `terminate()`, loads engine assets only from the build manifest (verified by SHA-256, §15.4), and stamps every reply with `provenance: {engine, version, build, budget}`. Workers never message each other directly: the supervisor relays oracle requests, for example from the Lane A worker to the Z3 and PGlite workers, so every worker keeps its own budget and watchdog.

W0-S02's rules for the supervisor follow. It stops a worker only through the watchdog (§5.8). It adds no second `WebAssembly.instantiate` to the Pyodide worker after Pyodide has loaded, because that call did not settle in WebKit [X RUN-phone-pyodide]; any other module goes in its own worker [D]. `warm` messages the service worker every 15 s until it answers [D] and reports a fill that has not finished instead of waiting for it, because Firefox stopped a worker about 60 s into a fill on an emulated slow link [X RUN-phone-pyodide]. The fill stores each file after its hash check, so a retry fetches only what the cache lacks.

Phone timings cannot be emulated in CI for these workers: in the measured harness, Chromium's CPU throttling did not reach the cross-origin iframe's worker [X RUN-browser-origin]. Phone budgets therefore come only from real devices. W0-S02 recorded the first load exactly and every timing as an emulation on three desktop engines [X RUN-phone-pyodide]; the real-device figures are {{run:RUN-phone-pyodide}}.

### 6.2 Pyodide with the Z3 wheel

Serves INS-z3, each step of INS-derivation, spec duels (M-spec-duel), grade-time keys for the Z3-keyed generator families, and INS-datalog (§6.5).

| Aspect | Design |
|---|---|
| Engine | Z3 5.3.1 through the `z3_solver` 5.3.1.0 pyemscripten wheel on Pyodide 314.0.7, all self-hosted on the instrument origin [X RUN-z3-starter-pyodide] |
| Worker | a module worker; the measured classic-worker paths failed [X RUN-browser-origin] |
| Ready time | 1.46–1.71 s in the measured desktop engines [X RUN-z3-starter-pyodide]; phones: emulated figures only [X RUN-phone-pyodide], real devices {{run:RUN-phone-pyodide}} |
| First load | 12,893,420 B as gzip level 5 [X RUN-phone-pyodide]; the first deployment sent 12,935,856 B, because GitHub Pages sent `python_stdlib.zip` uncompressed [X RUN-pages-wire-check]; it downloads without a prompt, and the loader shows its size (OD-6, §5.9) |
| Per-request isolation | a fresh Python namespace and a fresh `Solver()` per request; no module-level state survives between requests |
| Engine budget | an `rlimit` on every solver call. Under Pyodide in Node, `s.set('timeout', 2000)` never returned, while an `rlimit` of 5e6 ended in `unknown (canceled)` after 1.1 s [X RUN-z3-budget-pyodide]; `timeout` never returned in Chromium, Firefox or WebKit either [X RUN-phone-pyodide]. Every verdict prints its `rlimit` (I10), and the watchdog's wall time bounds every request (§5.8) |
| Hard stop | `worker.terminate()` from the supervisor's watchdog only, never on a timer; the next request starts a fresh worker and pays the ready time again |
| Witnesses | returned as name-to-value strings. Native and Pyodide witnesses differ [X RUN-z3-bv64-pyodide], so graders check a witness against its property and never compare model values |
| `unknown` | returned with Z3's reason string, as in the reason-stable `x**y == 8` case [X RUN-z3-unknown-pow]. A generated instance that comes back `unknown` is discarded and the generator draws the next seed in its deterministic sequence (I3) |
| Inputs | Python the learner typed into a cell; course-authored Python for keys; SMT-LIB strings, parsed by Z3's own parser, for Derivation Board steps, spec duels and Lane A output |
| Wheel | used as pinned: repackaging it without its second copy of `libz3.so` would shrink the first load but changes the pinned hash, so it is not adopted [D] |

### 6.3 Spectacle

Serves INS-spectacle and its minimap (M-telescope).

| Aspect | Design |
|---|---|
| Engine | Spectacle at commit 5827c22, vendored with its MIT license and unmodified; a course-side adapter owns the search, the invariant and deadlock checks and TLC's counts, and carries every fix [X RUN-spectacle, RUN-spectacle-s5s8]; a fork would need a logged decision and GATE-conformance coverage (spine §12 item 56) |
| Conformance | graph-equal to TLC on 49 of 49 configurations and verdict-equal on 47 of 47, in Node and three browser engines [X RUN-spectacle-s5s8]; its distinct-state counts equal TLC's on the double-spend family (11, 45, 191 and 813 for two to five workers) in three engines [X RUN-spectacle, RUN-tlc-full]. GATE-conformance keeps them equal for every authored spec, and a bump to a newer commit waits for that gate |
| Speed | 524–1,125 states/s on the double-spend family [X RUN-spectacle]; S8's Outbox runs at 85 to 309 states per second in the browsers, so a two-command design of 3,887 states takes up to 41.7 s [X RUN-spectacle-s5s8], which is why learner edits run under a wall-clock budget and not a state cap |
| Scope | 45 of 56 curriculum configurations are in scope (W0-S04's spec-by-spec table lists them) [X RUN-spectacle-s5s8]; liveness, fairness, action properties, symmetry and trace validation are Theater-only (INS-lasso covers lassos, INS-theater shows authored TLC graphs, and TLC runs on the Bench) |
| Limits | no PlusCal (translated at build time); no `Nat`, `Int` or `STRING`; community modules are blocked, because Spectacle fetches them from a third-party URL; Spectacle's own checker skips initial states and has no deadlock check, so the adapter carries both. Past the budget, the cell offers "send to the Bench" |
| Loading | every module Spectacle loads, `EXTENDS` targets included, is served from the instrument origin, and the adapter answers each module fetch itself and refuses any community-module name; a local `EXTENDS` resolves from the root module's directory, and `module_overrides` does not work at this commit. W0-S04 also confirmed operator coverage on S5 and S8 specs and the state-pair check, which accepted every TLC edge and rejected every sampled non-edge [X RUN-spectacle-s5s8] |
| Worker | a classic dedicated worker on the instrument origin, never the main thread (Spectacle's scripts load with `importScripts`, which a module worker lacks); the watchdog terminates it [X RUN-spectacle-s5s8] |
| Budget | a wall-clock budget of 10 s in the worker [D], with no separate state cap, and the watchdog behind it. A stop at the budget returns `stopped: bound`, which stamps [M] · bound · partial (spine §8.8) |

Authored scenes in INS-theater do not use Spectacle. They navigate TLC state graphs exported at build time (`-workers 1`, explicit deadlock flag; W3-T06) and render on the main origin.

### 6.4 PGlite

Serves INS-pglite.

| Aspect | Design |
|---|---|
| Engine | PGlite 0.5.11 reporting PostgreSQL 18.6, pinned and measured in three browser engines [X RUN-pglite-0511]; 0.5.10 was measured under Node [X RUN-pglite] |
| Sessions | one connection. Two "concurrent" workers serialized in the measured run [X RUN-pglite], so the tab never claims to show concurrency; concurrent behavior is replayed from Bench histories in INS-history |
| Isolation per item | one PGlite instance per worker, reset between items (`RESET ALL`, the item's schemas and roles dropped, its script loaded), and a worker that ends when idle, because a fresh instance costs 0.85 to 0.91 s and about 190 MiB of linear memory and closing it returns no memory [X RUN-pglite-rls, RUN-pglite-0511] [D]; nothing persists between items |
| Outputs | rows, row counts and SQLSTATE codes as data, for example 22003 on `bigint` overflow and a NULL-amount guarded update that affects 0 rows [X RUN-pglite] |
| Row-level security | S7.L4's hands-on segments run in the tab on laptops, and the Bench stays authoritative [X RUN-pglite-rls]; phones show recorded runs, because a live instance adds 565 to 1,125 MiB of resident memory in desktop browsers [X RUN-pglite-0511]. PGlite's connection is the superuser, so every RLS statement follows a `SET ROLE`, and the tab never uses `SET SESSION AUTHORIZATION`, whose reset does not work [X RUN-pglite-rls] |
| Conformance | PGlite = PostgreSQL 18.6 on single-session specimens and on the RLS specimens (GATE-conformance), with `RESET SESSION AUTHORIZATION` the one documented difference [X RUN-pglite-rls] |

### 6.5 Datalog

Serves INS-datalog. The `datalog` engine is an adapter over Z3's `Fixedpoint` inside the Pyodide worker, so one Pyodide runtime serves both Z3 and Datalog and Stage 7 adds no fourth engine download. `Fixedpoint` is the evaluation step only: the adapter applies Soufflé's front-end checks first, translates the program, reads each relation back and rebuilds derivations itself. It equals Soufflé on 5,915 of 5,915 relation comparisons and on 53,488 of 53,488 derivation heights, natively and in four Pyodide runtimes [X RUN-fixedpoint-equal], and under Pyodide `Fixedpoint` handled stratified negation [X RUN-z3-fixedpoint]. `rlimit` and `timeout` do not bound a join, so the adapter caps a program from its size and facts, with `worker.terminate()` as the hard stop. A TypeScript evaluator in the pure pool, differential-tested against Soufflé, is the logged fallback (spine §9.1, §12 item 55). Either way GATE-conformance requires relations and derivation heights equal to Soufflé's on the fixtures. The adapter reconstructs one derivation per derived fact from the computed relations and checks each step as an instance of a rule, so a derivation shown in S7.L2 is valid even when it differs from the one Soufflé would print.

### 6.6 The Lane A host: the learner's Mini-Plinth interpreter and other components as wasm

Serves INS-lane-a and INS-sim. The course's reference interpreter is the TypeScript port INS-interp, checked against kernel-checked goldens (GATE-interp). What runs here as wasm is the learner's own Rust, compiled to `wasm32-unknown-unknown` with zero imports: the parser and typechecker (LAB-3.8, LAB-3.9), **the learner's Mini-Plinth reference interpreter** (LAB-3.10, capstone S10.L2), `miniplinth check` (LAB-4), the SQL compiler and transaction runtime (LAB-6), the revocation trace checker (LAB-7.6), the outbox machine (LAB-8.4, INS-sim), and the SQL validator (LAB-9.11). The course's reference modules also run here, labeled "reference module, earns nothing".

**Contract.** The family ABI v2, through the vendored host. A module exports `ks_abi_version`, `ks_alloc`, `ks_free`, `ks_run`, `ks_panic_msg` and `ks_trace_drain`, plus an invoke entry point for components the host drives. `ks_run` reads line commands (`v 2`, `list`, `only <id>`, `seed <u32>`), and `list` runs no learner code. Lab-specific requests travel as JSON through the invoke entry point: IR@1 in, a component-specific JSON reply out. Drawer D-14 documents the contract for learners.

**A run, step by step.**

1. **Main origin.** The learner drops a `.wasm`. The main origin computes its SHA-256 (recorded in the events), draws one seed per seeded check with `crypto.getRandomValues`, writes the pending run to the outbox (§7.5), and transfers the bytes with `{lab, checks, seeds}`.
2. **Host.** It refuses a module with any import, an unknown ABI version, or a reference identity when credit is requested. It compiles the module once and runs `list` in a fresh instance.
3. **Each check.** A fresh instance receives `v 2`, `only <id>` and `seed <s>`. A per-check limit applies [D: the vendored host's 2 s default; a lab raises it only through a logged calibration]. On expiry the worker is terminated, the check is marked `timeout`, and a fresh worker continues with the next check. After a trap, `ks_panic_msg` and `ks_trace_drain` are read from that instance.
4. **Oracles.** Where a check compares the learner's output with the course, the host composes the output with an oracle through the supervisor: INS-interp and the goldens table for interpreters; Z3 equivalence for emitted SMT-LIB; PGlite outcome classes for compiled SQL; seeded fault schedules and invariant checks for the outbox machine.
5. **Reply.** For each check, `{id, status: pass | fail | trap | timeout, msg, seed, oracle, n?}`, where `oracle` is `engine@version`. Mismatch messages name a triage class: spec, implementation, tool or proof error (V2-15). The main origin logs one `lab-check` event per check, `exposure: unseen` on fresh seeds, with provenance from the hint ladder's state (M-hint-ladder).

Zero imports already deny a module any input or output of its own. Lane A still runs on the instrument origin because I6 keeps learner code off the origin that holds the evidence log, and because its oracles live there.

### 6.7 The pure pool

Course TypeScript with no third-party engine, in one worker with the same budgets and watchdog:

- the lasso validator (INS-lasso): exact on finite graphs; its input, `lasso@1`, is TLC's `-dumpTrace json` counterexample as written, with no wrapper and a strict schema [X RUN-tlc-lasso-json];
- the abstract-serializability checker (INS-history): a bounded search over n ≤ 6–8 transactions, so its results are [T] and show anomalies present, never absent;
- the paired-state evaluator (INS-pairs): finite domains, bounds printed;
- INS-interp on imported or learner-produced IR;
- the TypeScript Datalog fallback (§6.5);
- the parsers and validators for receipts, lab bundles, export bundles, audit bundles, histories, NDJSON traces, IR exports and URL fragments.

### 6.8 The Clearinghouse world

M-docket and SCR-clearinghouse. A seeded Mini-Plinth world runs on INS-interp in the pure pool, with the learner's components plugged in through the Lane A host: their checker gates proposals, their compiler runs on PGlite, their outbox machine runs under seeded faults, their validator checks plans. A week's state is a pure function of the world seed, the week index, the hashes of the plugged components and the learner's incident responses (which are events), so nothing about the world is stored (I2). The main origin passes the learner's oldest open erodible seam, computed from the claim graph (§8.6), so Clearinghouse erosions fire by the spine's rule (spine §5.4). Incident thresholds come from naive and reference baselines recorded in RUN-docket-baselines.

### 6.9 Placement of every tab instrument

| Instrument | Runs on | Worker | Engine budget | Offline |
|---|---|---|---|---|
| INS-z3 | instrument | Pyodide | `rlimit` | after caching |
| INS-goal-replay | main | none: build-time strips | — | yes |
| INS-interp | main for course-authored programs; instrument for imported or learner IR | none, or pure pool | step fuel | yes |
| INS-derivation | UI on main; each step on the instrument | Pyodide | `rlimit` per step | after Z3 is cached |
| INS-theater | main | none: build-time TLC graphs | — | yes |
| INS-spectacle | instrument | Spectacle (classic worker) | wall-clock budget | after caching |
| INS-lasso | instrument | pure pool | graph size | after caching |
| INS-pglite | instrument | PGlite | watchdog | after caching |
| INS-history | viewer on main; checker on the instrument | pure pool | transaction bound | after caching |
| INS-datalog | instrument | Pyodide (the `Fixedpoint` adapter) or pure pool (fallback) | a cap the adapter sets from the program's size and facts, or an iteration cap | after caching |
| INS-pairs | instrument | pure pool | domain bound | after caching |
| INS-sim | instrument | Lane A | fault seeds and per-check limit | after caching |
| INS-lane-a | instrument | Lane A | per-check limit | after caching |
| INS-receipt | parser on the instrument, which also shows a receipt imported by link on SCR-instrument; SCR-receipt on main | pure pool | size cap | after caching |
| INS-pocket | main | none | — | yes |

**SCR-instrument** (spine §10.1) is not an instrument but the instrument origin's own page. A spec-duel link and a receipt imported by link open it there, so the untrusted input renders on the instrument origin and never on a main-origin screen.

**The rule** (§18, item 1): pure course code working on course content or on the learner's typed answers may run on the main origin; every engine, every piece of learner code and every parse of outside bytes runs on the instrument origin.

---

## 7. The evidence log (kernelspace's evidence ledger, re-implemented)

### 7.1 Scope

The browser's only record is practice events (V2-17): calls, items, probes, audit findings, Prove-it results imported from `statespace defend`, Lane A checks, receipt imports, explain-backs and notes. Claims, specimens and receipts are records in the lab repo, and the browser holds only a mirror of them (§8.3). Reading and viewing write no evidence. Opening a drawer logs an uncredited `view` event, as help-seeking ("logged, never required", spine §3.12; spine §8.2), and it never counts.

### 7.2 `event@1`

The fields are the spine's (§8.2) plus kernelspace's envelope fields `v`, `tz`, `day` and `dev` (§18, item 9). W1-T03 reconciles the published `schemas/event.schema.json` with spine §8.2: it still lists `automated` as a provenance value and has no `view` kind.

| Field | Type | Rule |
|---|---|---|
| `id` | string | `crypto.randomUUID()`; never parsed |
| `v` | integer | shape version of the event's kind |
| `kind` | `call`, `item`, `probe`, `audit`, `prove-it`, `lab-check`, `receipt-import`, `explain-back`, `note`, and the uncredited `view` | spine §8.2 |
| `ref` | string | grammar below |
| `itemRev` | string | fingerprint of the item as graded; a newer revision shows "re-check" and never deducts |
| `engine` | string | `name@version` of the engine that keyed or graded the event |
| `seed` | uint32 | drawn at grade time |
| `ok` | boolean | the graded verdict |
| `conf` | `guess`, `think`, `sure` | the Call It confidence, stored as a category; bands are applied at read time |
| `resp` | by kind | the learner's response; its shape depends on the kind and is checked by the module that reads it |
| `mis` | `dp:` key | the misconception tag the response matched, which M-refutation-card reads |
| `provenance` | `own`, `assisted`, `agent` | self-declared (OD-8); `automated` is a flag on receipts and claims only, never an event value (spine §8.2) |
| `exposure` | `seen`, `unseen` | the spine's `seen \| unseen` |
| `at` | ISO 8601 instant | from an injectable clock; it carries the local UTC offset |
| `tz`, `day` | minutes east of UTC; the local date | frozen at write time, so travel never rewrites history; the weekly rhythm reads `day` |
| `dev` | string | random per browser profile; used by multi-device merges |
| `ms` | number | time on task |
| `data` | object | kind-specific and schema-checked: a module's SHA-256, per-check status, a receipt's hash |

**Ref grammar** [D]

| Kind | `ref` |
|---|---|
| `call` | `call:S{n}.L{k}/{cell}` for the first run of an authored cell; `call:GEN-{family}/{template}` for a generated item; `call:ER-{k}/forecast` for an erosion forecast |
| `item` | `item:GEN-{family}/{template}`; KC tags are resolved from content at read time. An item met in a drawer, a placement walk, a test-out or a confirmation names that context instead: `drawer:D-03/i2`, `placement:step-4`, `testout:KC-1.violation-as-sat`, `confirm:KC-1.violation-as-sat` |
| `probe` | `probe:S{n}/A/{attempt}/{index}` (Defence Part A) |
| `prove-it` | `prove-it:LAB-{n}/{mutant}`; Defence Part B uses `prove-it:S{n}/B/{attempt}/{mutant}` |
| `audit` | `audit:AUD-{n}.{k}/{variant}`, `audit:harvest/{hash}`, `audit:S{n}/C/{attempt}/{index}` |
| `lab-check` | `lab-check:LAB-{n}.c{k}` |
| `receipt-import` | `receipt-import:{sha256}` |
| `explain-back` | `explain-back:S{n}` |
| `note` | `note:{n}` |
| `view` | `view:D-{nn}`, the drawer opened (uncredited) |

### 7.3 Provenance and weights

Applied at read time, never stored (spine §8.2):

| Provenance and exposure | Weight | Counts toward |
|---|---|---|
| own · unseen · generated (fresh) | 1.0 | sign-off, settled, VRK₃₀, Judgment |
| own · unseen, authored (a first exposure to a fixed cell or anchor) | 1.0 | Judgment; scheduling |
| own · seen (practice) | 0.3 | scheduling only |
| assisted (past rung R2, or a context packet used) | 0.3 | scheduling only, until an unseen variant passes unassisted |
| automated (a tactic closed a step taught in manual mode) | — | a flag on receipts and claims only, which never count as evidence, so it never weighs an evidence event |
| agent | 0 | may produce claims; never evidence |

### 7.4 Storage

IndexedDB database `statespace`:

| Store | Key | Holds |
|---|---|---|
| `events` | `id` | `event@1` records, indexed on `at` and on `[kind, ref]` |
| `working` | `key` | last-writer-wins records: settings, drafts, the last export time |
| `mirror` | `path` | the read-only lab mirror (§8.3) |
| `meta` | `key` | schema version, device id, persistence status |
| `checkpoints` | `id` | the undo checkpoint written before any replace-import, undo or reset |

### 7.5 Write path, merge and guards

1. **Durable first.** An action's events go to a localStorage outbox synchronously, then commit to IndexedDB; a BroadcastChannel message then tells other tabs to re-derive. A call is in the outbox before its run is sent, so a call can never be recorded after its result was seen (M-call-it: "the first call is final").
2. **Merges converge.** The log is a set of events keyed by id. When two records share an id but differ, the one whose canonical JSON is lexicographically smaller wins. The rule is commutative, associative and idempotent, so double imports, stale tabs and two-device merges converge.
3. **Schema guard.** A bundle that finds a newer schema version in the database goes read-only and asks for a reload; an import with a newer schema is refused.
4. **Append-only.** Events are never edited. They are removed only by replace-import, undo or reset, each of which writes an undo checkpoint first.

### 7.6 Derived learner state

`deriveLearner(events, mirror, content, now)` is pure and memoized by a digest of the event set (I2).

| View | Derivation | Spine |
|---|---|---|
| KC state and schedule | graded events replayed per KC through the vendored FSRS at 0.85–0.90 target retention, weighted per §7.3 | §4.1 |
| Today plan | due items on fresh seeds, 0–1 audit case, re-finds, sure-and-wrong returns, the resume card, change cards and erosion forecasts, fitted to 10–12 minutes from logged item times | M-today |
| Signed off, settled | the §8.6 rules over a Defence attempt's `probe`, `prove-it` and `audit` events, plus fresh items correct in at least three spaced sessions; settled after a fresh probe correct at least 30 days later | §8.6 |
| VRK₃₀ | KCs answered correctly on own · unseen fresh items at least 30 days after first learning | §2.3 |
| Judgment ("audit accuracy" in learner copy) | balanced accuracy on own · unseen audit events, with an interval assembled from the 97.5% Wilson intervals of its two class rates (spine §6); per-class precision and recall once a class has n ≥ 10 | §2.2 |
| Mirror | bias and hit rate per confidence band with Wilson intervals; post-instruction, unassisted calls only; nothing diagnosed below about 20–30 calls per band | §8.5 |
| Weekly rhythm | graded work per local `day`; "met in k of the last 12 weeks" with 7-day repair and reserve weeks | M-set-your-week |

A first-paint cache of derived views is allowed only together with the digest of the event set it came from. On a mismatch it is discarded, and no code path treats it as truth.

### 7.7 Export, import and undo

- **Export.** `bundle@1` holds `{schema, schemaVersion, exportedAt, dev, events[], working[]}` and downloads as a file. The mirror is not exported, because the lab repo is its record.
- **Import.** The file goes to the instrument origin unparsed (§2.2), is parsed and validated there, and returns as structured events. The main origin re-validates each event, shows a preview (new, duplicate, conflicting), then merges or replaces; undo restores the checkpoint. Caps follow §5.6.
- **Tests** (W1-T03, W1-T20). Export then merge-import round-trips; double import, merge and a stale tab give identical logs; undo restores the log exactly.

### 7.8 Backup nudge and eviction

WebKit may delete script-written storage after seven days without interaction [webkit7d]. The defenses, in order:

1. The lab repo is the record for everything except practice events.
2. A backup card appears on Today and in SCR-settings when the last export is at least seven days old and events exist since then.
3. `navigator.storage.persist()` is requested after the first export or import [D], and its result is shown in SCR-settings.
4. An optional Home Screen install is offered on iOS [dr2 B4].

The card's copy is informational and gain-framed: it says what an export keeps, never what might be lost, and it shows no counters.

---

## 8. The lab repo and the claim graph

### 8.1 The `statespace-lab` repository (OD-2)

```
statespace-lab/
  AGENTS.md  CLAUDE.md              agent kit (§12)
  .claude/settings.json             deny rules and the PreToolUse hook
  .claude/hooks/statespace-guard.sh
  .devcontainer/                    digest-pinned image, from S2 on (D-15); LAB-1 needs none
  .statespace/lab.toml              lab ids, pins, the protected-paths manifest (generated)
  labs/LAB-{n}/
    challenge/                      read-only Challenge module and comparator.json (Lean labs)
    src/ ...                        the learner's Lean modules, Rust crates, TLA+ specs
    broken/   fixed/                kept counterexamples beside their fixes (roadmap rule 2)
  claims/                           claim@1 cards (*.yaml) and the statements they pin (*.tla, *.smt2)
  proposals/                        agent-proposed claims: rendered UNREVIEWED, never stamped
  specimens/                        specimen@1 records and witness files
  receipts/LAB-{n}.{k}/             receipt@1 files written by `statespace check`
  decisions/                        decision records (LAB-3.7)
  notes/                            technical notes (M-notes); publishing them is optional
  report/                           report@1 JSON and Markdown (LAB-10.8)
```

### 8.2 Formats

| Path | Format | Written by | Notes |
|---|---|---|---|
| `claims/*.yaml` | `claim@1` | the learner; cards fade from receipt-prefilled to learner-written | six fields plus the requirement row, and the optional `topics` (the keys of spine §3.12's vocabulary, which surface deferred drawers) and `correspondence.code[]` (`{language, path, symbol}`), both added to claim@1 by W1-T15; stamps are never typed into a card |
| `claims/*.tla`, `claims/*.smt2` | TLA+ properties, SMT-LIB statements | the learner | hashed into receipts (I7) |
| `labs/LAB-{n}/challenge/` | a read-only `Challenge` module and `comparator.json`, whose keys are `challenge_module`, `solution_module`, `theorem_names` and `permitted_axioms` [X RUN-lean-comparator] | the course | protected from agents |
| `specimens/*.yaml` | `specimen@1`: violates, because, minimal?, cured by, found in, tool version; status mounted or kept | the learner, from runs | the label is generated from a run (spine §5.1) |
| `labs/LAB-{n}/broken/`, `fixed/` | source | the learner | broken beside fixed |
| `receipts/LAB-{n}.{k}/*.json` | `receipt@1` | `statespace check` | immutable; a newer receipt supersedes an older one |
| `proposals/*.yaml` | `claim@1` with `agent: true` | agents | quoted UNREVIEWED text; never stamped (I8) |
| `decisions/*.md`, `notes/*.md` | Markdown | the learner | — |
| `report/` | `report@1` | `statespace export` | §8.7 |

A claim card, sketched:

```yaml
schema: statespace/claim@1
id: transfer-conserves               # the learner's local id
template: CL-2.1
proposition: total is unchanged by every allowed transfer, over Int
statement: { path: labs/LAB-2/challenge/Challenge.lean, theorem: transfer_conserves }
assumptions:
  - { text: balances are unbounded integers, seam: SEAM-1 }   # an assumption may carry topics too
model: two accounts over Int
method: { receipt: receipts/LAB-2.2/<file>.json }   # the stamp is derived from it, never typed
correspondence:
  text: the Lean definition is the semantics; nothing is compiled yet
  code: []                                          # optional: the code the model corresponds to, as { language, path, symbol }
if_weakened: { specimen: specimens/<id>.yaml }      # must refute this card's own proposition (GATE-claims)
requirement: { text: money is neither created nor destroyed by a transfer }
rests_on: []
topics: []                                          # optional: keys of spine §3.12's vocabulary, for example migrations
supersedes: null
```

### 8.3 How the browser sees the repo

`statespace export` writes `labbundle@1`: the claim files, the statement texts with their hashes, specimens, receipts, and the repo's commit hash. The learner imports it on SCR-bench as a file, or as a fragment when small enough (§5.6). The instrument origin parses and validates it, recomputes each statement's comparator-style hash from the bundled text, and returns the structured bundle; the main origin replaces the mirror wholesale.

The mirror is read-only. The browser never edits a claim: SCR-claims can draft a card, and the draft leaves the browser as a downloaded YAML file for the learner to commit, so the mirror changes only on the next import. A receipt imported between bundles overlays the mirror until the next bundle replaces it.

### 8.4 The typed claim graph

Built at read time from the mirror and content (`packages/claims`).

| Node | Source |
|---|---|
| claim | a card in `claims/` (or in `proposals/`, flagged `agent`) |
| statement | a pinned Lean theorem, TLA+ property or SMT-LIB statement, identified by path and hash |
| receipt | a file in `receipts/` |
| seam | an assumption naming SEAM-1–SEAM-15; SEAM-13–SEAM-15 are held seams |
| specimen | a record in `specimens/`, or a course specimen the learner has met |
| component | a piece of the executable system (parser, typechecker, checker, solver, compiler, runtime, database) for the trusted-computing-base view (S9.L9) |
| defeater | an open doubt, such as "encoding unverified" or "translation from the TLA+ spec unverified" (spine §8.8), with status open or eliminated |

| Edge | From → to | Meaning |
|---|---|---|
| `states` | claim → statement | the claim is about exactly this pinned statement |
| `supported-by` | claim → receipt | the receipt's verdicts carry the claim's stamps |
| `assumes` | claim → seam | an [A] assumption, drawn dashed |
| `rests-on` | claim → claim | a dependency, for example CL-3.5 on the pinned Lean reference |
| `trusts` | claim → component | the claim depends on an unverified component |
| `refutes` | specimen → claim | the "if weakened" witness |
| `cracks` | specimen → seam | the second endpoint of an erosion (spine §5.4) |
| `defeats` | defeater → claim | an open doubt against the claim |

### 8.5 Stamps and strips at read time

`packages/stamps` implements spine §8.8 as a total function from a raw output (a receipt's parsed verdict lines, or an instrument reply) to a stamp: the word, the bracketed code, the qualifier (checker and version, bound or n), and the lane badge (*re-checked here*, *reported from your machine*, *self-assessed*). Each claim renders a three-segment strip: proposition-of-model, correspondence, requirement-fit, and requirement-fit is never [P]. A few rules show why stamps are derived and never typed:

- a Lean result with `sorryAx` earns no [P]; the claim reads "PROVED modulo k assumed lemmas", each lemma [A];
- a `_native` axiom yields [P] · kernel + compiler;
- a comparator statement or constant mismatch, or a changed statement hash, voids the claim to [?];
- TLC stopped at "Deadlock reached" before exploring every reachable state yields [?] with its distinct-state count, never "no error" ([R] only when the property was deadlock freedom);
- an inductive check at fixed constants yields [M] · "inductive at N = k", never [P];
- an agent's assertion yields no stamp at all.

GATE-stamps tests the function against a fixture table of raw outputs drawn from executed logs.

### 8.6 Erosion propagation

Erosion is an event, not a stamp (spine §5.4). It cracks the correspondence segment, an assumption record, or (for ER-3) requirement-fit, and never silently the proposition-of-model. It fires when both endpoints exist in the learner's record, and it is derived, like everything else.

```ts
function deriveErosions(g: ClaimGraph, rec: LearnerRecord, table: ErosionTable): ErosionView[] {
  return table.events.map((er) => {                    // ER-1 ... ER-12, spine §5.4
    if (table.heldSeams.has(er.seam)) return { er: er.id, fired: false }; // SEAM-13..15 never crack
    const claims = g.claimsAssuming(er.seam);          // claims whose assumptions name the seam
    const planted = claims.length > 0 || rec.hasMet(er.plantedIn); // endpoint 1; SEAM-6 is planted by
                                                       // S3.L1's first AST draft, not by a claim
    const cashed = er.id === 'ER-12'                   // endpoint 2
      ? rec.clearinghouseWeekWhere((wk) => oldestOpenErodibleSeam(g, rec, wk) === er.seam) !== undefined
      : rec.hasMet(er.specimen);                       // an event showing the cracking specimen,
                                                       // or the specimen mounted in specimens/
    if (!planted || !cashed) return { er: er.id, fired: false };
    const direct = claims.map((c) => c.id);
    const inherited = g.dependents('rests-on', direct).filter((id) => !direct.includes(id));
    return {
      er: er.id, fired: true, segment: er.segment,     // correspondence | assumption | requirement
      direct, inherited,                               // the blast radius on SCR-claims
      mintedCracked: rec.specimenMetBefore(er.specimen, claims), // builder's path: the claim mints cracked
      forecastPending: !rec.has(`call:${er.id}/forecast`),
    };
  });
}
```

- **Forecast first.** The crack is revealed after the forecast call (M-erosion-forecast) or after an explicit skip; a skip records nothing and blocks nothing (I5).
- **Direct and inherited.** Claims that assume the seam show the crack on the cracked segment. Claims that rest on them show a hairline "rests on a cracked seam" on the same segment, so the blast radius is visible without overstating it.
- **Repair.** A remedy (spine §5.4's "Remedies offered") produces a new card with `supersedes:` naming the old one. The old card stays in the erosion log, and the new one carries no crack. The erosion log is derived from the events and the mirror's history.
- **Tests.** W3-T12's property test replays both published paths and fails unless every shipped ER fires on each; GATE-erosions checks endpoints, forecast items and remedy cards.

### 8.7 The report

`report@1` is a traversal of the claim graph (KC-10.claim-graph-report): sections for proved, model-checked, tested, enforced, configured, assumed and not covered; a checker matrix; statement hashes; budgets and advisories; and a defeater log shown as m of n doubts eliminated, never summed into a score [sridefeat]. `statespace export` writes it as JSON and Markdown from the repo, and SCR-claims can export the same traversal from the mirror. GATE-schema validates `report@1` (W5-T06); LAB-10.c8 and LAB-10.c9 check it in the learner's bundle.

---

## 9. The runs registry

### 9.1 `run@1`

Every tool number, verdict, flag and version in copy, keys and artboards traces to a file `runs/<RUN-id>.json` (spine §9.5):

| Field | Holds |
|---|---|
| `id` | the RUN ID from the spine |
| `engine`, `version` | the engine and its version string, verbatim |
| `binarySha256` | the hash of the binary, jar or wheel that ran |
| `image` | the container image digest, or the browser build for browser runs |
| `argv` | the exact command line, flags included |
| `input`, `inputSha256` | a path under `runs/inputs/<RUN-id>/` (committed) and the hash over it |
| `budget` | `rlimit`, workers, seeds, state caps: the same shape as the bus `Budget` |
| `outputs` | the verbatim output lines, plus named values extracted from them |
| `recordedAt` | when the run executed |

Runs whose outputs describe a moving upstream, such as RUN-twin-pins with its 60-day TTL, also carry `ttlDays` (§18, item 15).

The published run@1 (`schemas/run.schema.json`) writes these fields in snake_case (`binary_sha256`, `recorded_at`, `ttl_days`) and holds more (`configs[]` for a run with several configurations, `values`, `checks[]`, `unrecorded[]`, `notes[]`); `runs/README.md` §2 maps each name below to its published one.

```json
{
  "id": "RUN-<id>",
  "engine": "<engine>",
  "version": "<verbatim version string>",
  "binarySha256": "<sha256>",
  "image": "<image digest>",
  "argv": ["<exact>", "<command>", "<line>"],
  "input": "runs/inputs/RUN-<id>/",
  "inputSha256": "<sha256>",
  "budget": { "rlimit": "<n>" },
  "outputs": { "lines": ["<verbatim>"], "values": { "<name>": "<value parsed from the lines>" } },
  "recordedAt": "<ISO 8601>"
}
```

### 9.2 References in content

- **Citation.** `{{run:RUN-id}}` renders as a run chip (id, engine and version, date) that opens the run sheet: argv, input hash, outputs, and the command that re-executes it (`statespace run RUN-id`).
- **Value** (proposed, §18, item 14). `{{run:RUN-id#values.<name>}}` prints a value straight from the record (run@1 keeps `values` at the top level, beside the list of outputs), so a number in copy is generated rather than typed.
- **Docs.** Documents use the spine's tag form `[X RUN-id]`.
- **Drafts.** An unresolved reference renders as "run not yet recorded" only in content labeled "draft: first-learner pass pending". GATE-runs fails the fast lane on any unresolved reference in other content, and fails every release on any unresolved reference at all.

### 9.3 Gates on numbers

- **GATE-numbers** (the brief's `verify:numbers`) scans copy, keys and artboards for tool-shaped tokens: numbers next to a unit or an engine name, verdict words, SQLSTATE codes, command-line flags and version strings. Each must sit in a sentence carrying a run reference or be generated by a value reference. Design values pass only when tagged [D]. The gate also fails on any match against the deny-list of known-false sentences (BRIEF §2.2), which lives in the gate's own fixture file and is never shipped.
- **GATE-facts** checks that a sentence tagged as tool behavior agrees with a value in the cited run's `outputs`.
- **GATE-runs** checks registry integrity (schema, input hashes) and resolution, and on a tool bump re-runs everything and opens a reviewable diff.

### 9.4 Recording and re-recording

W0-S11 imports the 34 executed runs from `research/` together with their logs. A new run starts as a recipe (engine, image, argv, input); `statespace run --record` executes it inside the digest-pinned Bench image, or the pinned Playwright image for browser runs, and fills in versions, hashes, outputs and `recordedAt`. Learner-zero records (RUN-lz-boot-w1, RUN-lz-today-w1, RUN-lz-signoff-w2) and tester records (RUN-boot-firstsuccess) store event-log exports and are labeled descriptive. Every content task depends on the task that records its runs (spine §13 rules).

### 9.5 The course erodes in public

A tool bump re-runs `runs/` in CI and opens a diff. When the diff merges, every changed output yields a change card (M-change-cards: struck line, new line, source, two retrieval items) on SCR-changes, and an EROSION entry on SCR-assurance (W5-T08). Items that cite a changed run get a new `itemRev`, so events graded against the old revision show "re-check" and never deduct.

---

## 10. Receipt v1

A receipt is the Bench's report of what real tools said about one lab stage. It is produced by `statespace check` (and by `statespace trace validate`), stored in the lab repo, and imported into the tab, where it yields stamps and claims, never evidence of learning (spine §8.2).

### 10.1 Schema outline

One JSON Schema source generates the TypeScript and Python types (W0-T02); GATE-schema keeps them in sync. The published file, `schemas/receipt.schema.json`, is the source of truth, and this outline abbreviates it, in YAML notation:

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: receipt@1
title: statespace receipt, version 1
type: object
additionalProperties: false
required: [schema, lab, stage, lane, createdAt, cli, environment, tools, statements, runs, checks, provenance]
properties:
  schema:    { const: statespace/receipt@1 }
  lab:       { type: string, pattern: '^LAB-[0-9]+$' }
  stage:     { type: string, pattern: '^LAB-[0-9]+\.[0-9]+$' }
  lane:      { enum: [reported, self-assessed] }
             # badge words: reported from your machine | self-assessed.
             # re-checked here is never stored: only the tab assigns it, at read time (§10.3, §17.3).
  createdAt: { type: string, format: date-time }
  cli:       { type: object, required: [name, version],
               properties: { name: { const: statespace }, version: { type: string } } }
  environment:
    type: object
    required: [devcontainer, os, sandbox]
    properties:
      devcontainer:  { type: [string, 'null'] }        # image digest; null when LAB-1 runs under uv
      os:            { type: object, properties: { name: { type: string }, version: { type: string }, arch: { type: string } } }
      sandbox:       { enum: ['on', 'off', 'failed'] }  # recorded, never required; quoted so YAML 1.1 parsers keep strings
      sandboxDetail: { type: string }                   # the verbatim sandbox error line when failed
  tools:                                                # tool hashes
    type: array
    items:
      type: object
      required: [name, version, sha256]
      properties:
        name:    { type: string }                       # lean, lake, tlc, java, z3, cvc5, postgres, souffle, cargo
        version: { type: string }                       # the tool's own version string, verbatim
        sha256:  { type: string, pattern: '^[0-9a-f]{64}$' }   # binary, jar or wheel
        pinned:  { type: boolean }                      # whether sha256 equals the course's pin; false flags an unpinned tool
  statements:                                           # statement hashes (I7)
    type: array
    items:
      type: object
      required: [path, kind, sha256]
      properties:
        path:   { type: string }
        kind:   { enum: [lean-challenge, tla, smt2, yaml, sql] }
        sha256: { type: string, pattern: '^[0-9a-f]{64}$' }    # sha256(trimRight(text) + "\n"): Comparator Live's rule
  runs:
    type: array
    items:
      type: object
      required: [engine, version, argv, inputSha256, budget, exitCode, verdictLines, verdict]
      properties:
        step:         { type: string }                  # the pipeline step: build, axioms, check, comparator, ...
        engine:       { type: string }
        version:      { type: string }
        argv:         { type: array, items: { type: string } }  # verbatim, flags included
        inputSha256:  { type: string, pattern: '^[0-9a-f]{64}$' }
        budget:       { type: object, properties: { rlimit: { type: integer }, workers: { type: integer }, seed: { type: integer } } }
        exitCode:     { type: integer }                 # recorded, never read alone
        verdictLines: { type: array, items: { type: string } }  # copied verbatim from the tool's output
        verdict:      { enum: [accepted, rejected, sat, unsat, unknown, no-error, violated, deadlock, stopped, passed, failed, error] }
        ms:           { type: integer }
  lean:
    type: object
    properties:
      toolchain:       { type: string }
      challengeSha:    { type: string }                 # the challenge module's hash
      permittedAxioms: { type: array, items: { type: string } }  # from comparator.json
      checkers:                                         # one row per checker, --paranoid included
        type: array
        items: { type: object, required: [name, version, verdict],
                 properties: { name: { type: string }, version: { type: string }, verdict: { enum: [accepts, rejects, not-run] } } }
      theorems:                                         # axioms per theorem, from #print axioms
        type: array
        items: { type: object, required: [name, axioms],
                 properties: { name: { type: string }, axioms: { type: array, items: { type: string } } } }
      nativeAxioms:    { type: array, items: { type: string } }
      sorryCount:      { type: integer, minimum: 0 }
      automation:      { type: object, properties: { manualMode: { type: boolean }, grind: { type: boolean }, omega: { type: boolean }, decide: { type: boolean } } }
      statementCheck:  { enum: [comparator, goldens, weak] }     # weak renders "statement check: weak"
      goldens:         { type: object, properties: { count: { type: integer }, kernelChecked: { type: boolean }, referenceSha: { type: string } } }
      lints:           { type: array, items: { type: string } }    # lint findings, such as a flagged declare_syntax_cat (D-22)
  goldens:                                              # a run of a pool of kernel-checked goldens
    type: object
    required: [poolSha, n, passed, failed, noVerdict]
    properties:
      poolSha:   { type: string, pattern: '^[0-9a-f]{64}$' }
      n:         { type: integer }
      passed:    { type: integer }
      failed:    { type: integer }
      noVerdict: { type: integer }
  tlc:
    type: object
    properties:
      specSha256:     { type: string }
      configSha256:   { type: string }
      constants:      { type: object }
      flags:          { type: array, items: { type: string } }   # TLC flags as passed
      distinctStates: { type: integer }
      depth:          { type: integer }
      result:         { enum: [no-error, violated, deadlock, stopped] }
      complete:       { type: boolean }
      traceFile:      { type: string }
  z3:
    type: object
    properties:
      smtlibSha256:   { type: string }
      entry:          { enum: [cli, api] }              # SMT-LIB command line or Python API: the two can answer differently [X RUN-z3-11179]
      rlimit:         { type: integer }
      verdict:        { enum: [sat, unsat, unknown] }
      reason_unknown: { type: string }
  pg:
    type: object
    properties:
      serverVersion:   { type: string }
      isolationLevel:  { enum: [read-committed, repeatable-read, serializable, mixed] }
      historySha256:   { type: string }
      sqlstateClasses: { type: object, additionalProperties: { type: integer } }   # SQLSTATE -> count
      rls:                                              # row-level security
        type: object
        properties: { roleMode: { type: string }, policySha256: { type: string }, readBacks: { type: integer }, disagreements: { type: integer } }
  traces:                                               # statespace trace validate
    type: object
    required: [n, seedListSha256, verdicts]
    properties:
      n:               { type: integer }                # counts accepted traces only
      seedListSha256:  { type: string, pattern: '^[0-9a-f]{64}$' }
      verdicts:                                         # W5-T14 adds the error verdict and per-trace line counts
        type: array
        items: { type: object, required: [trace, verdict],
                 properties: { trace: { type: string }, seed: { type: integer },
                               verdict: { enum: [accepted, rejected, partial] },
                               firstNonConformingLine: { type: [integer, 'null'] } } }
  datalog:
    type: object
    required: [engine, relations]
    properties:
      engine:      { type: string }                     # such as souffle@2.5
      relations:   { type: object, additionalProperties: { type: string } }   # relation -> SHA-256 of its sorted tuples
      derivations: { type: object, properties: { checked: { type: integer }, invalid: { type: integer } } }
      generator:   { type: object }                     # the generator's own statistics
  pairs:                                                # a paired-state check
    type: object
    required: [witnessSha256, relationSha256, observerSha256, bound]
    properties:
      witnessSha256:  { type: string }
      relationSha256: { type: string }
      observerSha256: { type: string }
      bound:          { type: string }                  # printed with the stamp (I10)
  checks:
    type: array
    items: { type: object, required: [id, pass],
             properties: { id: { type: string, pattern: '^LAB-[0-9]+\.c[0-9]+$' }, pass: { type: boolean } } }
  provenance:
    type: object
    required: [assisted, agent, guard]
    properties:
      assisted: { enum: [none, explain, code] }         # self-reported (OD-8)
      agent:    { type: boolean }                       # self-reported
      guard:    { enum: ['on', 'off'] }                 # off when the agent-guardrail hook was switched off with STATESPACE_GUARD=off
  claims:                                               # claims to mint or update
    type: array
    items: { type: object, required: [template],
             properties: { template: { type: string, pattern: '^CL-[0-9]+\.[0-9]+$' }, id: { type: string } } }
  tcb:
    type: array
    items: { type: object, properties: { component: { type: string }, status: { enum: [proved, validated, tested, trusted] } } }
  attestation: { type: object }                         # absent by default (OD-13)
  ext:         { type: object }                         # forward-compatible extras; ignored by the stamp deriver
```

### 10.2 Coverage of BRIEF §4.3

| BRIEF §4.3 requirement | Where the receipt carries it |
|---|---|
| Challenge packs: a read-only `Challenge` module and a `comparator.json` of permitted axioms | `lean.challengeSha`, `lean.permittedAxioms`, a `statements[]` entry of kind `lean-challenge` |
| Comparator verdicts (accepted; statement mismatch; constant mismatch) | the comparator's `runs[]` entry (`verdictLines`, `verdict`) and `lean.checkers[]` |
| Two verdicts, not one: a planted axiom fails `lake check` while the log says the kernel accepts; a `sorry` build exits 0; a kernel bypass builds green | each pipeline step is its own `runs[]` entry with `exitCode` and `verdictLines`; `lean.theorems[].axioms`, `lean.nativeAxioms`, `lean.sorryCount`; the parsing rules of §10.3 |
| Hashed statements in `claims/*.tla`, `*.smt2` and `*.yaml`; a changed hash voids the claim to UNKNOWN | `statements[]`; the void rule in the stamp deriver (§8.5) |
| Learner-owned semantics checked by a pinned reference evaluator and kernel-checked goldens; the fallback stamped "statement check: weak" | `lean.statementCheck`, `lean.goldens` |
| Statement hashes | `statements[].sha256` |
| argv | `runs[].argv` |
| Exit codes | `runs[].exitCode` |
| Verdicts | `runs[].verdictLines`, `runs[].verdict`, and the engine blocks |
| `sandbox: on \| off \| failed`, recorded and never required | `environment.sandbox`, `environment.sandboxDetail` |
| Tool hashes | `tools[].sha256` |
| TLC flags | `tlc.flags`, and `runs[].argv` |
| Z3 `rlimit` | `z3.rlimit`, and `runs[].budget.rlimit` |
| The lane: re-checked here, reported from your machine, or self-assessed | `lane` stores `reported` or `self-assessed`; the tab assigns *re-checked here* at read time (§10.3, §17.3) |
| Agent claims shown as quoted UNREVIEWED text, never stamped | `provenance.agent`; agent-written claim cards live in `proposals/` and are never minted from a receipt |

### 10.3 Parsing and validation on import

On the instrument origin, in this order:

1. **Caps.** The size cap and structural limits of §5.6, before and during JSON parsing.
2. **Schema.** Validation with the compiled `receipt@1` validator; unknown top-level fields are rejected, and `ext` is ignored.
3. **Re-parse every verdict.** The course's TypeScript line parsers re-derive each `runs[].verdict` from its `verdictLines`; a disagreement rejects the receipt. Neither the CLI's normalization nor an exit code is trusted alone, and the executed runs show why. Without bubblewrap the comparator exits 2, and bubblewrap under default Docker exits 1, the code of a rejection [X RUN-lean-bwrap-docker]. `lake check` errors on non-standard axioms while its log still says the default kernel accepts, and a file containing `sorry` exits 0 [X RUN-lean-axioms]. A `debug.skipKernelTC` proof of `False` builds with exit code 0, and only `leanchecker` rejects it [X RUN-lean-skipkernel].
4. **Lane.** `lane` is `reported` or `self-assessed`; a value outside the enum, `rechecked-here` included, fails schema validation (step 2). Only the tab assigns "re-checked here", at read time, to checks it re-ran itself, and it never stores that value.
5. **Consistency.** `stage` and every `checks[].id` belong to `lab`; every `claims[].template` exists in content.
6. **Statements.** When the mirror holds a statement's text, its hash is recomputed and compared; otherwise the hash is displayed as reported.

The main origin then re-validates the structured result and renders it as text (§5.7).

### 10.4 From receipt to stamps and claims

The stamp deriver (§8.5) maps each verdict to a stamp by spine §8.8, with the qualifier taken from the receipt: checker and version ("Lean 4.35.0 kernel · axioms listed", plus "6 checkers" when `--paranoid` ran [X RUN-lean-comparator]), or the solver, version, `rlimit` and "uncertified". A matching cvc5 `unsat` on the same `inputSha256` adds "Z3 and cvc5 agree" and keeps "uncertified", as CL-4.2's qualifier does, because two solvers agreeing is not a checked certificate; certificate replay stays in deferred drawer D-32 (§20, item 11). `claims[]` names the cards to mint or update in the mirror. A receipt's stamps come from its checkers, whoever wrote the proof, because an agent's proof of a pinned statement is still checked against the learner's statement. Its `provenance` only sets the weight of the `receipt-import` event, and imported receipts never count toward sign-off (spine §8.2).

---

## 11. The Bench

The Bench is the learner's machine with the real tools (V2-22). It is authoritative for Lean, TLC and multi-session PostgreSQL (Lane B) and builds the learner's Lane A modules.

### 11.1 The devcontainer

One digest-pinned image, built in CI from `bench/image/` with pinned base images and checksummed tool downloads, and referenced from the lab template's `.devcontainer/devcontainer.json` by digest. A compose file adds a PostgreSQL 18.6 service container beside it. A Codespaces prebuild uses the same image. `statespace doctor` green inside it is RUN-doctor-devcontainer (W0-T05).

| Tool | Pin | Evidence |
|---|---|---|
| Lean | 4.35.0 through elan; core plus Std; `autoImplicit false`; no Mathlib, whose packages took 7.3 GB for one `Finmap` project [X RUN-lean-mathlib] | [X RUN-lean-ledger]; the toolchain unpacks to 3.0 GB [X RUN-lean-toolchain] |
| TLC | `tla2tools` 1.8.0, a pre-release pinned by SHA-256, with 1.7.4 as the text-trace fallback; Java 21 | [X RUN-tlc-jars, RUN-tlc-doublespend] |
| PostgreSQL | 18.6, as a service container | [X RUN-pg-anomalies]; re-recorded after PostgreSQL 19 GA (OD-12) |
| Z3 | 5.3.1 | [X RUN-z3-starter] |
| cvc5 | 1.4.2; the Bench binary prints 1.4.2 [X RUN-scaffold], while the Alethe proof run used the pip wheel, whose version string reads `1.4.2-modified` | [X RUN-cvc5-alethe] |
| Soufflé | 2.5, with the CPU architecture recorded; the release ships no arm64 package | [X RUN-souffle-version] |
| Rust | the toolchain with the `wasm32-unknown-unknown` target; `tokio-postgres`, `testcontainers`, `pg_query`, `proptest`, at the versions the scaffold pinned | [X RUN-scaffold] |
| Apalache (optional) | 0.62.4; its run records the version and a bounded smoke check only | D-18; [X RUN-apalache-version] |
| Alloy (optional) | 6.2.0 | D-16; [X RUN-alloy-version] |
| uv and the `statespace` CLI | the versions the scaffold pinned | [X RUN-scaffold] |

**The sandbox.** Lean's comparator sandbox (bubblewrap) is Linux-only. It is recorded as on, off or failed and never required [X RUN-lean-bwrap-docker]. In a container it starts only when the seccomp profile allows `clone`, `unshare`, `mount`, `umount2` and `pivot_root`, `/proc` is not masked and the image has a `/run/user` directory; on a stock Ubuntu 24.04 host, AppArmor's restriction on unprivileged user namespaces is a further host condition that container options cannot lift [X RUN-bwrap-lanes]. W0-S06 ran a Docker Engine container and a stock Ubuntu 24.04 virtual machine; the CI-runner, Docker Desktop and Codespaces lanes have labeled stand-ins only, and their results are {{run:RUN-bwrap-lanes}}. macOS and Windows learners use the devcontainer.

**Before the devcontainer.** LAB-1 runs with `uv run --with z3-solver==5.3.1`, as the executed spikes ran [X RUN-z3-starter], or entirely in the tab; the devcontainer arrives at S2 (D-15), because a first install was kernelspace's top drop-off risk [dp §6].

### 11.2 The `statespace` CLI

Python, managed by uv, shipped in `statespace-lab`; it keeps the course's name (spine §9.6). The brief's shorthand `bench <command>` means `statespace <command>`.

- **Types** are generated from `schemas/` (W0-T02), the same source as the site's.
- **Dependencies** are few and pinned [D]: a JSON Schema validator, a YAML parser, and psycopg for `isorun`.
- **Verdict-line parsers** exist twice, in Python for the CLI and in TypeScript for the tab (§10.3). Both are tested against one fixture set copied from executed logs: comparator lines [X RUN-lean-comparator], `lake check` lines [X RUN-lean-axioms], sandbox failure lines [X RUN-lean-bwrap-docker] and TLC lines [X RUN-tlc-doublespend].
- **The statement hash** has one written specification, `x-statementHash` in `schemas/defs.schema.json`, and two implementations, tested against the shared vectors in `schemas/vectors/statement-hash.json` (§18, item 19).
- **Nothing leaves the machine.** The CLI makes no network requests beyond local containers.

### 11.3 Commands

| Command | Brief shorthand | Does | Writes |
|---|---|---|---|
| `statespace doctor` | `bench doctor` | checks the devcontainer pins and the sandbox; prints a receipt-ready environment block | stdout |
| `statespace check <lab>[.<stage>]` | `bench check` | Lean: build → `#print axioms` → `lake check` → `lake comparator` (`lake comparator --paranoid` in CI and at the Defence: six checkers in about 3 s [X RUN-lean-comparator]; `lake check --paranoid` took 172.6 s on the LAB-2 pack [X RUN-bwrap-lanes], so it runs once per lab and nightly, not at every step, spine §9.6); TLC with recorded argv after verifying the jar's SHA-256; Z3 and cvc5 with `rlimit`; cargo; local claim@1 validation | `receipts/` |
| `statespace receipt verify <file>` | — | validates a receipt against `receipt@1` and recomputes its statement hashes | stdout |
| `statespace hash <file>` | — | the comparator-style statement hash | stdout |
| `statespace run <RUN-id>` | — | in the course repository: re-executes a registry run and diffs its outputs; `--record` records a new one | a runs diff |
| `statespace isorun <history>` | `isorun` | drives two sessions on PostgreSQL 18.6, advancing a step only when a monitor connection observes the other session waiting on a lock (`pg_blocking_pids`), never by sleeping | a `history@1` file |
| `statespace trace validate <spec> <traces>` | — | checks NDJSON traces as behaviors of the learner's spec with TLC; reports n seeds and the first non-conforming step | a receipt |
| `statespace sim <seed>` | — | runs the learner's simulator under a seeded fault schedule | an NDJSON trace |
| `statespace defend` | `bench defend` | seeds mutations of the learner's own artifact in a temporary copy (drop a hypothesis, weaken a guard, change the encoding, split an action, drop fairness, widen the observer), records the predictions and their hash first, then grades with the right checker | a Prove-it bundle for the tab |
| `statespace audit gen \| harvest` | `bench audit` | mutates the learner's repo with gap-class operators, harvests agent commits that touched statements, computes keys locally | an `auditbundle@1` file |
| `statespace stuck` | `bench stuck` | captures the failing goal or check, the statement and a required hypothesis; emits a forum-ready minimal example with private paths stripped, a short packet for the learner's own agent, and a park option (a parked goal, carried as [A] in the claim, optionally with a topic from spine §3.12's vocabulary; re-found in 7 days) | packet files; a claim update |
| `statespace export` | — | bundles claims, statement texts, specimens and receipts; exports the report | `labbundle@1`; `report@1` with Markdown |
| `statespace overlay` | — | the private overlay for "your system" | a directory outside the repo; never committed |

**Lane A builds.** Templates build with `cargo build --release --target wasm32-unknown-unknown` against the family kit crate, so a module has no imports; `cargo test` runs the same checks natively on default and extra seeds, and calibration against the private reference runs on many seeds before a lab ships (kernelspace's practice).

---

## 12. Lab zips and the agent kit

### 12.1 The packer

The vendored packer (`labs/pack/`) builds one zip per lab, `statespace-lab-LAB-{n}.zip`, from the template, the agent kit and the lab's definitions in content (stage ids, check ids and labels). It writes `.statespace/protected.txt`, the protected-paths manifest, and audits every zip: it fails on any `_solutions` path, build products (`target/`, `.lake/`), or anything matching GATE-privacy's patterns. Reference solutions never enter the course repository: `labs/_solutions/` is gitignored (spine §11.1).

### 12.2 What every zip carries

| File | Content |
|---|---|
| `AGENTS.md` | generated per lab: the lab and its stages; the real check ids and labels; the AI policy per item (agents may write proofs and code; the learner writes statements, predictions and every Prove-it and Defence answer); the explanation gate before any hint (name the failing check, the invariant it tests and a hypothesis); the hint ladder R0–R4; how the guard works and how to turn it off; pointers to `llms.txt` and the lesson Markdown |
| `CLAUDE.md` | `@AGENTS.md` |
| `.claude/settings.json` | deny rules for the protected paths (Edit, Write, MultiEdit, NotebookEdit), and a PreToolUse hook with the matcher `Edit\|Write\|MultiEdit\|NotebookEdit\|Bash\|mcp__.*` that runs `sh .claude/hooks/statespace-guard.sh` |
| `.claude/hooks/statespace-guard.sh` | the fail-closed guard (§12.3) |
| `.statespace/protected.txt` | the protected paths |
| `labs/LAB-{n}/challenge/` | the challenge pack (Lean labs) |

**Protected paths:** `labs/*/challenge/**`, every `comparator.json`, `claims/**`, `receipts/**`, the Prove-it prediction files written by `statespace defend`, and every file that contains a `TODO(you)` marker when the zip is packed. `proposals/` is deliberately not protected: it is where agents may write claims (§8.2).

### 12.3 The guard

The hook is POSIX `sh` with no `jq`, and it fails closed:

| Hook input | Decision |
|---|---|
| an edit tool whose `file_path` matches a protected path | block (exit 2) |
| a `Bash` command naming a protected path, unless it is on the read-only allow-list (`cat`, `head`, `tail`, `grep`, `rg`, `wc`, `git diff`, `git log`, `git show`, `git status`, `statespace check`, `statespace hash`, `statespace receipt verify`, `statespace doctor`, `lake build`, `cargo test`, `cargo build`) | block |
| an `mcp__*` tool whose input names a protected path | block |
| an unparseable payload | block |
| anything else | allow |
| `STATESPACE_GUARD=off` in the environment [D] | allow everything |

The block message says the file belongs to the learner and suggests asking about the failing check instead. If the hook cannot run at all, the deny rules still stop the edit tools. The guard is friction, not DRM: the threat it addresses is self-deception through one's own agent, and the learner can turn it off (§15.1).

GATE-guardrails unzips every lab zip and checks the files above, then runs the hook against a fixture matrix under `sh`: block an Edit of a protected file; block `sed -i` on one; block an `mcp__*` call naming one; block an unparseable payload; allow `statespace check`, `lake build` and `cargo test`; allow an Edit of `README.md` and of a proof file outside the protected set; allow everything with the opt-out set.

### 12.4 Agent-native surfaces on the site

The build generates `llms.txt`, per-lesson Markdown at stable URLs, and the JSON Schemas at `/schemas/*.json`, so the learner's own agent can read lessons and validate receipts and claims. The site sees nothing of that agent.

---

## 13. CI gates

### 13.1 Lanes

| Lane | Trigger | Blocks | Runs in |
|---|---|---|---|
| Fast | every pull request and every push to the main branch | merges; under 5 minutes, recorded as RUN-ci-fastlane (W0-T04) | a GitHub-hosted runner with Node, uv, Pyodide in Node, native Z3, cvc5 and Playwright |
| Nightly | a schedule, or on demand | releases; a red night downgrades the course claims it touches to "unverified since <date>" | the digest-pinned Bench image (Lean, TLC, PostgreSQL 18.6, Soufflé) and Playwright with three engines. GATE-labs also runs monthly against the newest stable Lean; it files an issue and blocks nothing. |
| Release | an edition tag | the release deploy | GATE-release over the latest green nightly on the same commit |

The heavy gates run inside the same image the learner uses, so a pin cannot differ between the course's CI and the Bench.

### 13.2 The 28 gates

| Gate | Lane | Script (`scripts/`) | Checks (spine §11.2) |
|---|---|---|---|
| GATE-numbers | fast | `verify-numbers` | tool-shaped tokens carry run references; the deny-list (§9.3) |
| GATE-facts | fast | `verify-facts` | tool-behavior sentences match their runs; also warns, never fails, on expired TTLs in the facts registry (§18, item 22) |
| GATE-calls | fast; Lean calls nightly | `verify-calls` | authored Call It answers reproduce on Pyodide in Node and native Z3, Spectacle and the interpreter; witnesses by property; every authored `unsat` cross-checked with cvc5 |
| GATE-interp | fast | `verify-interp` | INS-interp against the goldens table, which is generated from the same source as the kernel-checked Lean goldens; n reported |
| GATE-items | fast | `verify-items` (vendored lints plus statespace's rules) | option "why"s, misconception IDs, length and convergence lints, surprise share, blind strategies, CTI count |
| GATE-audit-blind | fast | `verify-audit-blind` | blind audit strategies at most chance + 2 SD, Clearinghouse incidents included |
| GATE-generators | fast | `verify-generators` | purity, determinism across three engines, template variety, `unknown` discarded, distractors distinct from keys; the determinism lint forbids `Math.random`, `Date.now`, `new Date(` and transcendental `Math` functions in seeded paths (kernelspace's rule) |
| GATE-kc | fast | `verify-kc` | DAG, counts, tags, dosage hooks, first-taught order, published paths |
| GATE-stamps | fast | `verify-stamps` | stamps derived from receipts by spine §8.8; qualifiers; requirement-fit never [P]; hue scope; grayscale separability |
| GATE-codes | fast | `verify-codes` | codes bracketed, IDs not; status vocabulary |
| GATE-claims | fast | `verify-claims` | six fields; the "if weakened" witness refutes the card's own proposition; statement hashes; the CLI's local claim@1 validation shares these rules |
| GATE-links | fast | `verify-links` | every ID resolves against the registry generated from the spine; catalog ownership; §9.1 "Used in"; `[step]` exclusions |
| GATE-budget | fast | `verify-budget` | stage plans against the roadmap; Keep load; claim cadence; one new tool per stage; the cut list |
| GATE-glyphs | fast | `verify-glyphs` | the JuliaMono subset and the speech map cover every glyph |
| GATE-bundle | fast | `verify-bundle` (Playwright) | bundle budgets (§14); no prompt or warning before an engine download, and the loader's size equal to the manifest's; route and kill-switch tests; lints that the instrument iframe carries `sandbox="allow-scripts allow-same-origin"` and that `apps/site` never assigns `document.cookie`; the Boot timing gate at 360 px, held with an engine download in flight; fragments parsed only on the instrument origin; no `localhost` in production parent lists; the fuzzed-import test (§5.7) |
| GATE-guardrails | fast | `verify-guardrails` | lab zips carry the kit; the hook fixture matrix (§12.3); no `_solutions` |
| GATE-privacy | fast | `verify-privacy` | no private-design terms, personal identifiers, emails or private paths; review JSONs absent; licenses beside vendored code |
| GATE-schema | fast | `verify-schema` | all records validate; TypeScript and Python types in sync; shared hash vectors; the keep/kill rules hash equals RUN-keepkill-rules |
| GATE-lessons | fast | `verify-lessons` | lesson anatomy; graded items name family and template; titles-only rail; at most six block types in W1–W2; no lock copy; glossary terms only |
| GATE-erosions | fast | `verify-erosions` | both endpoints, a forecast item and a remedy card per shipped ER; both published paths replayed |
| GATE-replay | nightly | `verify-replay` | Goal Replay regenerated on the pinned toolchain equals the committed strips |
| GATE-conformance | nightly | `verify-conformance` | the engine pairs in §13.3 |
| GATE-specimens | nightly | `verify-specimens` | every specimen reproduces, including 22003, 40001, 40P01 and write skew at REPEATABLE READ, and the upstream isolationtester specs that `isorun` replays (RUN-isorun-upstream) |
| GATE-labs | nightly; monthly on the newest Lean | `verify-labs` | templates fail, private solutions pass, weakening mutants fail; rungs R0–R4 on every check; Defence mutants elaborate or are predicted not to |
| GATE-audit | nightly | `verify-audit` | every anchor and variant builds or runs with its key, class, typed evidence and "based on" card |
| GATE-a11y | nightly | `a11y.mjs` (vendored) | axe with 0 serious issues at 360, 320 and 1280 px on every screen |
| GATE-runs | nightly and release; resolution also in the fast lane for non-draft content | `verify-runs` | registry integrity; every reference resolves; a tool bump re-runs everything and opens a diff |
| GATE-release | release | `verify-release` | models, proofs, differential tests and runs up to date; the nightly lane green |

### 13.3 Conformance pairs

| Pair | Compared | Fixtures | Equality |
|---|---|---|---|
| Spectacle = TLC | verdict and distinct-state count per authored spec (TLC with `-workers 1` and an explicit deadlock flag) | every authored spec | exact; equality on the double-spend family is already recorded [X RUN-spectacle, RUN-tlc-full] |
| Pyodide Z3 = native Z3 | verdict per authored call; witness validity by property | every authored Z3 cell and generator template | verdicts exact; witnesses never compared by value [X RUN-z3-bv64-pyodide] |
| PGlite = PostgreSQL 18.6 | rows, row counts, SQLSTATE, message and detail per statement | single-session specimens and the RLS specimens | exact, with `RESET SESSION AUTHORIZATION` the one documented difference [X RUN-pglite-rls] |
| Tab Datalog = Soufflé | computed relations and derivation heights | the S7 fixtures | equal relations and heights [X RUN-fixedpoint-equal] |
| Pocket checkers = Z3 | the predicate's verdict on random witnesses | property tests per pocket predicate | exact |
| Lasso validator = TLC | lasso accepted or rejected | TLC liveness fixtures | exact |

A bump of any tool waits until its pair is green.

### 13.4 Red nights

The nightly lane writes `status/nightly.json`: the commit, the date, and for each failed gate the course claims it touches. Gates map to claims through the content index; for example, GATE-interp backs SEAM-13's course claim on SCR-assurance. The nightly job then triggers a redeploy of the site, which renders those claims and any course-authored stamps resting on them as "unverified since <date>" until a green night clears them. No code change is needed and no server is involved.

### 13.5 Private solutions and deploys

- **Private solutions.** GATE-labs needs the private reference solutions, which never enter the public repository. The nightly job checks them out from a private companion repository with a read-only deploy key [D]. A fork without the key runs GATE-labs in template-only mode, and GATE-release requires the full mode.
- **Deploys.** A green fast lane on the main branch deploys both sites, draft content included, because learner-zero studies drafts. The instruments build is pushed to its repository under `b/<buildId>/`, and builds beyond the last few are pruned [D]. An edition tag deploys only through GATE-release.

---

## 14. Performance and download budgets

GATE-bundle enforces the budgets below on every build. The route figures are starting values carried over from kernelspace's budgets [ks100x §7.3]; logged measurements replace them after W1.

| Item | Budget | Basis |
|---|---|---|
| Boot route JavaScript, compressed | ≤ 200 KB | [D], kernelspace's figure |
| Today route JavaScript, compressed | ≤ 200 KB | [D], kernelspace's figure; Today must start offline |
| Entry chunk, compressed | ≤ 250 KB | [D], kernelspace's figure |
| A lesson route, excluding instrument engines | ≤ 250 KB | [D] |
| Web fonts | self-hosted subsets only (Archivo, Source Serif 4, JuliaMono), counted in the route budgets | spine §10.2; GATE-glyphs |
| Instrument host page without engines | ≤ 50 KB | [D]; Boot loads it early |
| Engine first loads | downloaded without a prompt, the loader showing each size (OD-6, §5.9): Pyodide with Z3 12,893,420 B as gzip level 5 [X RUN-phone-pyodide], which the first deployment sent as 12,935,856 B [X RUN-pages-wire-check]; PGlite 5,580,851 B as gzip level 5 [X RUN-pglite-0511]; Spectacle and the Lane A host as measured in the build manifest | GATE-bundle |
| Z3 ready time | 1.46–1.71 s in the measured desktop engines [X RUN-z3-starter-pyodide]; phones: emulated figures only [X RUN-phone-pyodide], real devices {{run:RUN-phone-pyodide}} | W0-S02 |
| Boot | the target is a first success within 4 minutes [ks100x], at most 8 minutes on a phone. A Playwright timing gate at 360 px uses the Boot timing budget of W0-S02 §5.3, derived from the emulated slowest tier and provisional until a real-device report is merged [X RUN-phone-pyodide]; at least five naive testers are recorded in RUN-boot-firstsuccess before the "external learners" label | GATE-bundle; W1-T09 |
| Today | 10–12 minutes per session; learner-zero's median is recorded descriptively (RUN-lz-today-w1) | M-today |
| Spectacle learner edits | a 10 s wall-clock budget in the worker, with no separate state cap, then "send to the Bench" | [D]; spine §9.1, §12 item 56 |
| Lane A | module ≤ 8 MiB; the per-check limit of §6.6 | [D] |
| Phone timings | from real devices only, because CI's CPU throttling did not reach the cross-origin worker [X RUN-browser-origin] | W0-S02 |

**Order of loading.** No engine loads during Boot's first screen: Boot renders its prompt and the recorded run and prefetches the small host page. Z3 downloads without a prompt when a live run or a warm asks for it, and the loader shows its size; a learner who never runs it live keeps the recorded run and the pocket checkers. Lesson content loads per route, and per-stage content is cached on the first visit (§16).

---

## 15. Security model and threat model

### 15.1 Stance

The principal threat is self-deception, not attack (BRIEF §5.1, R3). The learner builds with agents every day, and the failures that matter are an agent quietly weakening a statement, a proof that builds without being checked, an exit code read as a verdict, a bounded check read as a proof, the course printing a number nobody ran, or practice credited as learning. The architecture makes those failures visible and costly to commit by accident. It does not try to stop a determined learner from deceiving themselves, and it says so on SCR-assurance (spine §8.9, OD-8). Outside input (a crafted link or a tampered file) is a real but secondary threat; it is contained by I6.

### 15.2 Assets

| Asset | Lives | Matters because |
|---|---|---|
| The evidence log | main origin, IndexedDB | it is the learner's honest measure of what they can do (VRK₃₀, sign-off) |
| The lab repo: statements, receipts, claims, specimens | the learner's git | it is the record and the published artifact |
| The course's own correctness: numbers, keys, graders | the course repository, runs/, CI | the course teaches what each check establishes and must not violate it |
| The learner's privacy | everywhere | there are no accounts or telemetry, and "your system" stays private |

### 15.3 Threats and mitigations

| # | Threat | Example from the course | Mitigation | What remains |
|---|---|---|---|---|
| T1 | An agent weakens a statement and keeps its name | a weakened statement or a redefined function (SP-2.7, AUD-2.4) | challenge packs and `lake comparator`; statement hashes in receipts; the guard hook | the learner can turn the hook off; the honor system (OD-8) |
| T2 | A proof builds but is not checked | a `sorry` exits 0 (SP-2.4); a kernel bypass builds green (SP-2.6); `native_decide` adds the compiler to the trusted base (SP-9.5) | receipts parse every verdict; `lake check` and the comparator; `--paranoid` at every Lean Defence; axioms listed per theorem | a kernel bug: SEAM-15 is a held seam, and advisories become change cards |
| T3 | An exit code is read as a verdict | a sandbox failure exits like a rejection (SP-2.8) | `sandbox: on \| off \| failed`; verdict lines re-parsed in the tab; an exit code is never read alone (§10.3) | a tool's output format changes; GATE-runs' re-record catches it |
| T4 | A solver's `unsat` is wrong | Z3 issue #11179 (SP-4.5) | solver-only results say "uncertified"; authored `unsat`s are cross-checked with cvc5 (GATE-calls) | the learner's own `unsat`s stay uncertified unless cross-checked |
| T5 | A bounded check passes for a proof | TLC stopped at a deadlock (SP-5.2, AUD-5.3); an inductive check at fixed N | every bound printed (I10); spine §8.8's rows | — |
| T6 | Agent or assisted work is credited as learning | an agent answers Prove-it items | self-declared provenance with weights; unseen seeds; the Defence with agents closed; claims never count as evidence | the honor system (OD-8), stated openly |
| T7 | The oracle is read | generator code and pocket checkers ship to the client | seeds drawn at grade time ("unseen, not secret"); stated on SCR-assurance | a determined learner can read keys |
| T8 | The course invents or keeps stale numbers | v1's mock-ups printed un-run TLC numbers (AUD-5.3's "based on") | GATE-numbers, GATE-facts and GATE-runs; the deny-list; TTLs; re-records on tool bumps | a recorded run can itself be wrong; conformance gates and nightly re-runs narrow that |
| T9 | A course grader is wrong | a pocket checker disagrees with Z3; INS-interp disagrees with Lean | GATE-conformance, GATE-interp, GATE-calls; graders print their bounds | SEAM-13 is held and tested |
| T10 | Blind strategies beat the items | always-reject on the Audit Desk | GATE-items, GATE-audit-blind; seeded sound shares | — |
| T11 | Practice events are lost | WebKit's seven-day eviction [webkit7d]; cleared site data | the lab repo is the record; exports; the backup card; `persist()` | events since the last export |
| T12 | Crafted outside input | a malicious spec-duel link; a tampered receipt or bundle | parsed only on the instrument origin, which holds no learner data; schemas, caps, no HTML, no `eval` (§5.6, §5.7); the frame is sandboxed (§5.3) and the main origin sets no cookies (§15.4) | an exploited parser reaches only what the instrument origin holds (its engine cache, which the kill switch clears) and the replies it sends, which the main origin validates as data; a forged receipt is self-deception and shows its lane |
| T13 | Supply chain | vendored code; engine binaries | pinned SHAs with licenses; the SHA-256 manifest checked before engine assets are served (§15.4); no third-party scripts at runtime | upstream bugs, caught by conformance gates |
| T14 | Privacy leakage | non-public material and personal identifiers in the public repo; home paths in a stuck packet | GATE-privacy over the repo, zips and stuck fixtures; `statespace stuck` strips paths; the overlay never enters the repo | — |

### 15.4 Policies

**Content Security Policy.** GitHub Pages cannot send response headers, so each document carries a meta CSP [D]:

| Document | Policy |
|---|---|
| main origin pages | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://instruments.<course-domain>; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` |
| instrument host page | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'` |

W1-T02 confirms the style policy against the built app. A meta CSP cannot express `frame-ancestors`, so the instrument origin relies on the handshake allowlist, with `ancestorOrigins` as defense in depth where an engine reports it (§5.5). Nor does it govern workers loaded from URLs, so the engine workers on Pages run without a policy of their own; that is one more reason the instrument origin holds nothing worth taking.

**Engine asset integrity** [D]. The build writes a manifest of every engine asset with its SHA-256 and sizes. The instrument origin's service worker fills its cache only with bytes whose hash matches the manifest and serves engine assets only from that cache; the supervisor starts an engine only once the service worker controls the page. W0-S01 and W1-T06 confirm the mechanics in all three engines.

**Third parties.** No third-party script, style or font loads at runtime on either origin. Third-party tools are disclosed, uncredited link-outs (OD-4): live.lean-lang.org, the Natural Number Game, TLA+ By Example, Alloy4Fun and TigerBeetle's simulator. CheerpJ is not embedded.

**Cookies.** The main origin sets no cookies, and never one with a `Domain` attribute: such a cookie is the one store a same-site instrument origin can read [D] [X RUN-origin-subdomain].

**Privacy.** No accounts, cookies, analytics or telemetry. No request leaves the two origins. The private overlay (M-overlay) lives in local storage in the tab and in a directory outside the repo on the Bench.

### 15.5 Non-goals

- Anti-cheat, proctoring or any verification of "unassisted" beyond self-declaration (OD-8).
- Hiding oracles: a static site cannot (spine §8.3).
- DRM on lab files: the guard is friction.
- Server-side checking of anything: there is no server.
- Requiring the comparator sandbox: it is recorded, never required (BRIEF §5.1, R3).

---

## 16. Offline use and the PWA

**Main origin.** The vendored `sw.js` with kernelspace's rules: `index.html` network-first with a short timeout, so deploys propagate; content-hashed assets cache-first; a precache of the app shell, Boot, Today, the pocket checkers, the KC graph and the generator code; lesson content cached per stage on its first visit. A schema handshake means the worker never serves a cached shell older than the newest schema it has seen, and it never caches IndexedDB contents. The kill switch is a deployed `sw.js` that unregisters itself and clears its caches; `?nosw=1` unregisters from the app.

**Instrument origin.** Its own service worker caches engine assets cache-first under content-hashed URLs, filled when a run or warm first needs an engine, after the SHA-256 check (§15.4). The host registers it after the handshake succeeds (§5.3), and a registration from an earlier session controls the frame from its first request [X RUN-origin-subdomain]. The `evict` message and its own kill switch clear it.

**Updates.** A new deploy installs in the background, and the page offers a reload between sessions, never in the middle of an item [D]. The web app manifest supports Home Screen installation. There are no push notifications: the course sends nothing that resembles a daily counter.

**What works offline**

| Capability | Phone, offline | Laptop, offline |
|---|---|---|
| Today items keyed by pocket checkers | yes | yes |
| Today items whose key needs Z3 | only if Z3 is cached; otherwise they wait for a connection | same |
| Lessons: text, Goal Replay, Theater graphs, recorded runs | yes, for stages visited before | yes |
| Spectacle edits, PGlite cells, Datalog | if the engine is cached | if the engine is cached |
| Lane A checks | if the host is cached; the module is local | same |
| Receipt and bundle imports | yes: parsing is local | yes |
| Exports and backups | yes | yes |
| The Bench | — | yes: every tool is local |
| Third-party link-outs | no | no |

---

## 17. Module map and key interfaces

### 17.1 Repository tree

The spine's layout (§11.1), which lists the `packages/` directory for pure code shared by the two apps as of revision 3 (§18, item 8).

```
apps/
  site/                       main origin (React 19, Vite 7)
    src/app/                  shell, router (no guards), error boundaries, schema handshake
    src/screens/              one folder per SCR-* screen
    src/components/           stamp, strip, title block, run chip and run sheet, Call It sheet,
                              instrument cell, trace table, goal strip
    src/bus-client/           InstrumentClient: iframe, handshake, port, requests, watchdog
    src/storage/              IndexedDB adapter for packages/ledger; working state; the mirror
    src/consent/              M-consent: the download loader (OD-6)
    src/sw/                   vendored sw.js wrapper and registration
  instruments/                instrument origin
    src/host/                 host.html entry: origin checks, port, supervisor, caps
    src/workers/              pyodide-z3, spectacle, pglite, lane-a, pure-pool
    src/engines/              adapters: z3 (Python snippets), datalog, spectacle, pglite,
                              clearinghouse world
    src/lane-a/               vendored ABI host plus statespace's oracle composition
    src/manifest/             generated asset manifest: paths, SHA-256, sizes
    src/sw/                   engine-cache service worker
    src/pages/                SCR-instrument, the origin's own page (spec-duel and receipt links)
packages/                     pure TypeScript: no DOM, storage or network (lint-enforced)
  schema/                     generated types and compiled validators from schemas/
  ids/                        the ID registry generated from the spine (GATE-links)
  bus/                        protocol types, limits, codec
  ledger/                     events: fold, merge, canonical rule, codec
  learner/                    derived state: KC state, schedule (vendored FSRS), sign-off,
                              settled, VRK₃₀, Judgment, Mirror, Wilson intervals
  kc/                         KC graph types, loaders, path checks
  generators/                 GEN-* families: make, key, grade
  stamps/                     verdict → stamp (spine §8.8), qualifiers, strip
  claims/                     claim graph, rests-on edges, erosion derivation, report traversal
  interp/                     the Mini-Plinth reference interpreter (TypeScript port, IR@1)
  pocket/                     INS-pocket predicates
  runs/                       registry loader, {{run:}} resolver, run-sheet data
  content/                    lesson and drawer loaders, block types, rail builder
  rng/                        vendored seeded RNG
content/                      stages/S{n}/, kc/, generators/, audit/, specimens/, claims/,
                              seams/, drawers/, registry/ (dated facts, twin pins),
                              governance/ (the keep/kill rules), pg-catalog/ (the PostgreSQL
                              isolation catalog), assurance/ (gate-claims.json, assurance copy)
runs/                         RUN-*.json and runs/inputs/
schemas/                      receipt@1, claim@1, run@1, event@1, IR@1, plan@1 (the Lane A plan value),
                              and those of §18, item 12
labs/                         template/, agent-kit/, kit-rs/, pack/; _solutions/ is gitignored
bench/                        the Python CLI (statespace) and bench/image/ for the devcontainer
scripts/                      verify-* gates, build-* generators, runs/ recording, vendor-drift
vendor/kernelspace/           vendored files at a pinned SHA, VENDOR.md, LICENSE
status/                       nightly.json (§13.4)
docs/                         spine, specs, redacted evidence
```

### 17.2 Dependency rules

- `packages/*` are pure: no `window`, DOM, IndexedDB or network. A lint in the fast lane's build step enforces it, so every package runs identically in the main origin, a worker and Node (for gates).
- Only `apps/instruments` imports engine adapters, and only `apps/site` imports the storage adapter. `packages/bus` is the only contract the two apps share at run time.
- Vendored code is imported only through wrapper modules (§4.1).
- Seeded paths (`packages/generators`, `packages/pocket`, the Clearinghouse world) obey the determinism lint (§13.2).

### 17.3 Interface sketches

Sketches, not final signatures; generated schema types replace the hand-written shapes once W0-T02 lands.

```ts
// packages/ids: generated from docs/spine/SPINE.md
export type StageId = `S${number}`;
export type LessonId = `S${number}.L${number}`;
export type KcId = `KC-${number}.${string}`;
export type LabId = `LAB-${number}`;
export type CheckId = `LAB-${number}.c${number}`;
export type SpecimenId = `SP-${number}.${number}`;
export type ClaimTemplateId = `CL-${number}.${number}`;
export type SeamId = `SEAM-${number}`;
export type ErosionId = `ER-${number}`;
export type GenId = `GEN-${string}`;
export type InsId = `INS-${string}`;
export type RunId = `RUN-${string}`;

// packages/bus: the instrument bus
export type EngineId =
  | 'z3' | 'datalog' | 'spectacle' | 'pglite' | 'lane-a' | 'lasso' | 'history' | 'pairs'
  | 'interp' | 'receipt' | 'bundle' | 'fragment' | 'trace' | 'clearinghouse';

export interface Budget {
  wallMs: number;      // watchdog: expiry means terminate() and no verdict
  rlimit?: number;     // Z3; printed with the verdict (I10)
  maxStates?: number;  // lasso validator
  maxMs?: number;      // Spectacle: stop at the bound and keep the partial verdict
  maxTxns?: number;    // history search bound
  perCheckMs?: number; // Lane A
  seed?: number;       // uint32, drawn at grade time
}

export interface InstrumentRequest<I = unknown> {
  engine: EngineId;
  version: string;     // the version the content was written against
  input: I;
  budget: Budget;
}

export type RawVerdict = // printed neutrally; stamps are derived on the main origin
  | { kind: 'sat' } | { kind: 'unsat' } | { kind: 'unknown'; reason: string }
  | { kind: 'no-error'; complete: boolean }
  | { kind: 'violated'; property: string; length: number; unit: 'actions' | 'steps' | 'rows' }
  | { kind: 'stopped'; by: 'deadlock' | 'bound'; distinct?: number }
  | { kind: 'sql'; rowCount: number; sqlstate?: string }
  | { kind: 'checks'; results: LaneACheck[] }
  | { kind: 'parsed'; issues: string[] } | { kind: 'rejected'; issues: string[] };

export interface InstrumentReply<W = unknown> {
  verdict: RawVerdict;
  witness?: W;         // plain data, never HTML
  stats: { ms: number; distinct?: number; generated?: number; depth?: number; n?: number; bound?: string };
  provenance: { engine: EngineId; version: string; build: string; budget: Budget };
}

export interface LaneACheck {
  id: CheckId;
  status: 'pass' | 'fail' | 'trap' | 'timeout';
  msg: string;
  seed?: number;
  oracle?: string;    // engine@version of the composed oracle
  n?: number;
}

export interface EngineCaps { engine: EngineId; version: string; cached: boolean; firstLoadBytes: number }

export type BusErrorCode =
  | 'bad-message' | 'too-large' | 'unknown-engine' | 'version-mismatch'
  | 'budget-exhausted' | 'terminated' | 'engine-crashed' | 'invalid-input' | 'busy';

export type ToInstrument =
  | { t: 'connect'; bus: 1; build: string; nonce: string }   // with one transferred MessagePort
  | { t: 'run'; id: string; req: InstrumentRequest }
  | { t: 'cancel'; id: string }
  | { t: 'warm'; engine: EngineId }
  | { t: 'caps' }
  | { t: 'evict'; engine?: EngineId };

export type FromInstrument =
  | { t: 'hello'; bus: 1; build: string }
  | { t: 'ready'; engines: EngineCaps[] }
  | { t: 'progress'; id: string; phase: 'download' | 'init' | 'run'; loaded?: number; total?: number }
  | { t: 'result'; id: string; reply: InstrumentReply }
  | { t: 'error'; id?: string; code: BusErrorCode; detail: string };

// packages/ledger: event@1
export type EventKind =
  | 'call' | 'item' | 'probe' | 'audit' | 'prove-it' | 'lab-check' | 'receipt-import' | 'explain-back' | 'note'
  | 'view';                                  // uncredited: a drawer opened, logged as help-seeking

export interface LedgerEvent {
  id: string; v: number; kind: EventKind; ref: string; itemRev?: string;
  engine?: string;                          // "<engine>@<pinned version>"
  seed?: number; ok?: boolean; conf?: 'guess' | 'think' | 'sure';
  resp?: unknown; mis?: string;             // the response, and the misconception tag it matched
  provenance: 'own' | 'assisted' | 'agent';  // automated is a flag on receipts and claims only
  exposure: 'seen' | 'unseen';
  at: string; tz: number; day: string; dev: string; ms?: number;
  data?: Record<string, unknown>;
}

export interface EventStore {                // implemented over IndexedDB in apps/site/src/storage
  append(events: LedgerEvent[]): Promise<void>;       // outbox first, then commit, then broadcast
  all(): Promise<LedgerEvent[]>;
  merge(incoming: LedgerEvent[]): Promise<MergePreview>;
  replace(incoming: LedgerEvent[]): Promise<void>;    // writes the undo checkpoint first
  undo(): Promise<void>;
}

// packages/learner: everything here is derived (I2)
export function deriveLearner(
  events: readonly LedgerEvent[], mirror: LabMirror, content: ContentIndex, now: string,
): LearnerView;   // KC states and schedule, Today plan, stage sign-off, VRK₃₀, Judgment, Mirror, rhythm

// packages/generators: pure makers, keys from checkers (I3)
export interface EnginePort { run<I, W>(req: InstrumentRequest<I>): Promise<InstrumentReply<W>> }

export interface Generator<Inst, Ans, Key> {
  id: GenId;
  templates: readonly string[];                                       // 2–4, structurally different
  make(seed: number, level: number, template: string): Inst;          // pure and deterministic
  key(inst: Inst, port: EnginePort): Promise<Key | 'discard'>;        // a checker at grade time
  grade(inst: Inst, answer: Ans, key: Key, port: EnginePort): Promise<Grade>;
}

export interface Grade { ok: boolean; why: string; misconception?: string; witness?: unknown; bound?: string }

// packages/stamps: spine §8.7–§8.8
export type StampCode = '[P]' | '[M]' | '[T]' | '[E]' | '[C]' | '[A]' | '[?]' | '[N]' | '[R]';
export type StampWord =
  | 'PROVED' | 'MODEL-CHECKED' | 'TESTED' | 'ENFORCED' | 'CONFIGURED' | 'ASSUMED' | 'UNKNOWN' | 'NOT COVERED' | 'REFUTED';
export type Lane = 'rechecked-here' | 'reported' | 'self-assessed';   // a derived stamp's lane; a stored receipt carries only the last two

export interface Stamp { word: StampWord; code: StampCode; qualifier: string; lane: Lane; source: string }

export function deriveStamp(raw: RawOutput, ctx: StampContext): Stamp | { none: 'agent-assertion' | 'shadow-mismatch' };

// packages/claims: the typed claim graph
export type StripSegment = 'proposition' | 'correspondence' | 'requirement';
export type EdgeKind = 'states' | 'supported-by' | 'assumes' | 'rests-on' | 'trusts' | 'refutes' | 'cracks' | 'defeats';

export interface ClaimNode {
  kind: 'claim'; id: string; template?: ClaimTemplateId; agent: boolean;   // agent: from proposals/, never stamped
  statement?: { path: string; sha256: string };
  strip: Record<StripSegment, Stamp | 'pending'>;
  supersedes?: string;
}

export interface ClaimGraph {
  nodes: Map<string, ClaimNode | SeamNode | SpecimenNode | ReceiptNode | ComponentNode | DefeaterNode>;
  edges: { kind: EdgeKind; from: string; to: string }[];
  dependents(kind: EdgeKind, roots: string[]): string[];   // the blast radius
}

export interface ErosionView {
  er: ErosionId; fired: boolean;
  segment?: StripSegment | 'assumption';
  direct?: string[]; inherited?: string[];
  mintedCracked?: boolean; forecastPending?: boolean;
}

// packages/content: at most six block types in W1–W2 (V2-18)
export type Block =
  | { type: 'prose'; md: string }
  | { type: 'instrument'; ins: InsId; cell: string; callOnFirstRun: boolean; recorded: RunId }
  | { type: 'item'; family: GenId; template: string; role: 'prequestion' | 'segment' | 'exit'; kcs: KcId[] }
  | { type: 'claim'; template: ClaimTemplateId }
  | { type: 'specimen'; id: SpecimenId }
  | { type: 'card'; variant: 'build-this' | 'twin' | 'dated-incident' | 'feels-harder'; md: string; runs: RunId[] };

export interface LessonSegment { title: string; minutes: number; blocks: Block[] }   // the rail shows titles only

export interface Lesson {
  id: LessonId; tier: 'core' | 'bridge'; kcs: KcId[];
  segments: LessonSegment[];
  draft: boolean;                 // "draft: first-learner pass pending"
}
```

---

## 18. Decisions this document adds

Each item decides something the spine leaves open. They await owner review, as the spine's decisions log does (spine §12), and none changes an ID.

1. **Placement rule.** Pure course code working on course content or on the learner's typed answers may run on the main origin (INS-pocket, Goal Replay and Theater rendering, INS-interp on authored programs). Every engine, every piece of learner code and every parse of outside bytes runs on the instrument origin (§6.9). Reason: offline Today needs INS-pocket on the main origin, and I6 is about untrusted input, not about course code.
2. **Every outside byte is parsed on the instrument origin:** receipts, fragments and wasm as I6 names them, and also export bundles, lab bundles, audit bundles, histories, NDJSON traces and IR exports. Reason: they are just as untrusted.
3. **Hosting.** Both origins under one registrable domain; the instrument site in a second repository; immutable `b/<buildId>/` paths, with the main site pinned to the build it was tested with (§5.2). Reason: same-site framing, one Pages site per repository, and no version skew during deploys.
4. **Handshake.** One `MessageChannel` port after an origin-checked handshake, explicit target origins, one port per frame lifetime (§5.3). Reason: after the handshake, no window-level message is ever trusted.
5. **Caps and structural limits** as in §5.6, held in `packages/bus/limits.ts`.
6. **Downloads.** An engine's size means its compressed first load, from the build manifest; nothing asks before it downloads, and the loader shows that size (§5.9; OD-6, changed 2026-10-25).
7. **Engine asset integrity.** The instrument service worker serves engine assets only after checking their SHA-256 against the manifest (§15.4).
8. **`packages/`** holds pure code shared by the two apps; spine §11.1's layout lists it as of revision 3.
9. **`event@1`** adds kernelspace's envelope fields `v`, `tz`, `day` and `dev`, names the exposure field `exposure`, and fixes the ref grammar of §7.2.
10. **The lab mirror.** The browser holds a disposable, read-only mirror of the lab repo, replaced on each lab bundle import (§8.3).
11. **`proposals/`** holds agent-proposed claims, outside the guard's protection; `claims/` is learner-owned and protected (§8.2, §12.2).
12. **Added schemas:** `specimen@1`, `history@1`, `trace@1` (NDJSON, one object per line), `bundle@1` (the browser export), `labbundle@1`, `auditbundle@1`, `plan@1` (the Lane A plan value), and `lasso@1`, which W0-S05 fixed as TLC's `-dumpTrace json` counterexample with no wrapper and a strict schema [X RUN-tlc-lasso-json]; `report@1` as W5-T06 names it.
13. **Receipt lanes.** A receipt stores `lane` as `reported` or `self-assessed` only; `rechecked-here` exists only as the read-time `Lane` of a stamp the tab derives, and a receipt that carries it fails schema validation (§10.1, §10.3, §17.3).
14. **Value references.** `{{run:RUN-id#values.<name>}}` prints a value from a run record, beside the citation form (§9.2).
15. **`ttlDays` on `run@1`** (`ttl_days` in the published schema, mapped in `runs/README.md` §2) for runs that describe a moving upstream, such as RUN-twin-pins (§9.1).
16. **The run sheet.** Run records open in a sheet over the current screen, so no screen is added to spine §10.1.
17. **Six initial block types:** `prose`, `instrument`, `item`, `claim`, `specimen`, `card` (§3.3).
18. **Lane A.** The family ABI v2 export names are kept verbatim so the vendored host runs unchanged; oracles are composed on the host; seeds are drawn on the main origin and recorded before the run; the per-check limit defaults to the vendored host's setting (§6.6).
19. **The statement hash** has one written trim specification, `x-statementHash` in `schemas/defs.schema.json`, implemented in TypeScript and Python against the shared test vectors in `schemas/vectors/statement-hash.json` under GATE-schema.
20. **Red nights** publish `status/nightly.json` and redeploy, so "unverified since <date>" appears without a code change (§13.4).
21. **Private lab solutions** reach CI from a private companion repository through a read-only deploy key (§13.5).
22. **TTL warnings.** GATE-facts also warns, and never fails, when a dated fact in the facts registry passes its TTL.
23. **The guard's opt-out** is the environment variable `STATESPACE_GUARD=off` (§12.3).
24. **Storage persistence** is requested after the first export or import (§7.8).

---

## 19. Open items and the spikes that close them

| Unknown | Closed by | Fallback |
|---|---|---|
| The custom-subdomain origin in three engines; same-site framing; whether the framed origin's cache persists across sessions on desktop | W0-S01, [X RUN-origin-subdomain, RUN-origin-subdomain-live] | recorded runs stay available and the engine downloads again, the loader showing its size; the evidence log is unaffected |
| Pyodide with Z3 on real phones: load time, first-load size, memory, `rlimit` timing, cache persistence | W0-S02: the first load is exact and every timing emulated [X RUN-phone-pyodide]; real devices {{run:RUN-phone-pyodide}} | recorded runs and pocket checkers on phones |
| Fixedpoint yields Soufflé's relations | W0-S03 [X RUN-fixedpoint-equal]: INS-datalog is Z3 `Fixedpoint` behind an adapter (spine §9.1, §12 item 55) | the TypeScript evaluator, differential-tested against Soufflé |
| Spectacle on S5 and S8 specs: local `EXTENDS`, worker or main thread, the state-pair check | W0-S04 [X RUN-spectacle-s5s8]: the limits, speed, loading and worker of §6.3 (spine §9.1 INS-spectacle) | authored TLC graphs in INS-theater; TLC on the Bench |
| TLC's lasso JSON | W0-S05 [X RUN-tlc-lasso-json]: lasso@1 is TLC's `-dumpTrace json` counterexample, with no wrapper and a strict schema | parse the 1.7.4 text traces |
| The sandbox on CI runners, Docker Desktop and Codespaces | W0-S06 ran stand-ins only [X RUN-bwrap-lanes]; the three lanes themselves {{run:RUN-bwrap-lanes}} | record `off` or `failed`; never required |
| `vcgen` on a custom command type | W0-S07, [X RUN-vcgen-cmd] | the production twin stays dated and experimental |
| PGlite row-level security and first-load size | W0-S08 [X RUN-pglite-rls, RUN-pglite-0511]: S7.L4 runs in the tab on laptops with the Bench authoritative; the first load is 5,580,851 B as gzip level 5 | RLS on Bench PostgreSQL only |
| The PostgreSQL 18.6 isolation catalog rows | W0-S09, [X RUN-pg-catalog] | the retry policy stays tagged [D] |
| Goal Replay through `$/lean/plainGoal` | W0-S10 [X RUN-replay-gen]: Lean lays out goal text at a width the server option cannot change | recorded strips, reviewed by hand |
| Receipt schema, imported runs, number lints | W0-S11 | — |
| Stack pins, vendoring, tool versions | W0-S12, [X RUN-scaffold] and the version runs | — |
| The fast lane under 5 minutes | W0-T04, [X RUN-ci-fastlane] | a slow gate moves to the nightly lane by a logged decision |
| `statespace doctor` in the devcontainer | W0-T05, [X RUN-doctor-devcontainer] | the uv lane for Z3-only labs |
| Engine-asset verification in the instrument service worker | W0-S01, W1-T06 | the supervisor verifies bytes before handing them to an engine |

---

## 20. Spine issues

*Resolved in spine revision 3 on 2026-10-25 (spine §15); each item ends with its outcome.*

What this document believes the spine gets wrong or leaves dangerously open, most consequential first. §18 records how this architecture proceeds in each case until the spine is revised.

1. **Agent claims have no home.** §8.1 says agents may produce claims, and GATE-guardrails blocks agent edits to claim files; nothing names where an agent's claim goes. This document uses `proposals/`, rendered as quoted UNREVIEWED text and never stamped (I8). The spine should name it in §11.1 and in GATE-guardrails. *Revision 3: applied (spine §8.1, §11.1 Data, §11.2 GATE-guardrails).*
2. **GATE-labs cannot run as written.** It requires "private solutions pass", but §11.1 keeps solutions out of the repository (`labs/_solutions/` is gitignored), and nothing says how CI obtains them. This document uses a private companion repository behind a read-only deploy key (§13.5). *Revision 3: applied (spine §11.1 labs/, §11.2 GATE-labs).*
3. **I6's list of untrusted input is too narrow.** It names URL-fragment specs, imported receipts and learner wasm. The course also imports event export bundles (SCR-settings, W1-T20), lab bundles (`statespace export`), audit bundles (`statespace audit`), Bench histories (INS-history), NDJSON traces (LAB-8) and IR exports. I6 should cover every byte from outside the page. *Revision 3: already resolved (spine §1.1 I6, §11.1 Data).*
4. **§9.1's header misplaces three instruments.** "Instrument origin unless noted", with no row noted, puts INS-pocket, INS-goal-replay and INS-theater on the instrument origin, although INS-pocket must grade offline in Today and the other two render build-time course data; INS-interp, INS-history and INS-receipt split across origins. Each row should state its origin (§6.9). *Revision 3: already resolved (spine §9.1 origin note); SCR-instrument is added here (§3.2, §6.9, §17.1).*
5. **§11.1's `apps/instruments/` list is incomplete.** It omits the receipt and bundle parsers, the history checker, the paired-state evaluator, the simulator host, and the instrument origin's own service worker and engine cache. *Revision 3: applied (spine §11.1 layout).*
6. **§11.1's schema list is incomplete.** It names receipt@1, claim@1, run@1, event@1 and IR@1, but omits report@1 (which W5-T06 implements), a specimen schema (V2-17; the review digest's change B4 has the repo's records "all schema-validated" [dr2 B4]), the NDJSON trace schema that LAB-8 supplies, the `isorun` history format, the export bundle (W1-T20), the audit bundle, and the lasso JSON that W0-S05 fixes. *Revision 3: applied (spine §11.1 schemas/); plan@1 is added here (§17.1, §18 item 12).*
7. **§8.2's event record lacks the envelope fields kernelspace needed:** `v` (a per-kind shape version), `tz` and `day` (the local date frozen at write time, which M-set-your-week's "met in k of the last 12 weeks" must read), and `dev` (for the multi-device merges W1-T03 tests). *Revision 3: applied (spine §8.2); §7 here matches.*
8. **"The browser keeps practice events only"** (§0, §11.1) cannot hold literally. SCR-claims, SCR-receipt and SCR-specimens are phone-first and need lab data on the device. The spine should say the browser's only *record* is practice events, and that it may hold a disposable, read-only mirror of the lab repo. *Revision 3: applied (spine §0, §11.1 Data, §10.1 SCR-bench).*
9. **§9.4's `lane` has no values or authority.** A receipt file could claim "re-checked here". CLI receipts should carry only "reported from your machine" or "self-assessed"; only the tab assigns "re-checked here". *Revision 3: already resolved (spine §9.3, §9.4, §9.1 INS-receipt, §13 W1-T14); §10.1 and §10.3 here match.*
10. **§9.4's statement hash is underspecified across languages.** It follows Comparator Live's JavaScript `trimRight`, but the CLI is Python, whose `rstrip()` trims a different set of characters: ECMAScript's whitespace includes U+FEFF, which Python's `str.isspace` excludes, and Python's includes U+0085 and U+001C–U+001F, which ECMAScript's excludes. Without one written specification and shared test vectors, the tab and the CLI will disagree on some hashes and void claims wrongly. *Revision 3: already resolved (spine §9.4, §11.2 GATE-schema); §11.2 and §18 item 19 here name the written specification and the shared vectors.*
11. **The "uncertified" qualifier contradicts itself.** Spine §8.8 says a solver `unsat` is "uncertified" unless cross-checked, while CL-4.2's expected qualifier reads "Z3 5.3.1 and cvc5 1.4.2 agree · uncertified". Two solvers agreeing is not a checked certificate (certificate replay is the deferred drawer D-32), so this document follows CL-4.2; §8.8 should say that a cross-check adds "Z3 and cvc5 agree" and keeps "uncertified". *Revision 3: already resolved (spine §8.8, §5.2 CL-4.2).*
12. **OD-6 leaves its unit open.** "A download above 5 MB" does not say per file, per engine or per session, nor compressed or not. This document counts one engine's compressed first load (§5.9). *Revision 3: merged into T09#3 (spine §15): obsolete as asked, because OD-6 as changed has no threshold (the replaced rule was consent above 5 MB [D]); the unit survives as the size the loader shows, one engine's compressed first load (§5.9 here).*
13. **No gate checks TTLs.** BRIEF §1.2 makes every number "a dated, sourced claim with a TTL", and RUN-twin-pins carries a 60-day TTL, but none of the 28 gates warns when a dated fact expires (kernelspace's registry gate did). This document adds a warn-only check to GATE-facts. *Revision 3: already resolved (spine §11.2 GATE-facts).*
14. **"Claims registry" collides with learner claims.** §7 uses kernelspace's name for its store of dated facts (in the data columns of M-change-cards and M-production-twin), while "claim" is a learner glossary term, claim@1 a schema and SCR-claims a screen. Suggest "facts registry". *Revision 3: already resolved (spine §0, §7, §11.2 GATE-facts).*
15. **INS-receipt's URL-fragment import needs a cap.** A full Lean receipt (verdict lines, per-theorem axioms, one row per checker) can outgrow a shareable fragment. The spine should cap fragment imports and route larger receipts through files (32 KiB encoded here). *Revision 3: applied (spine §9.1 INS-receipt, §7 M-spec-duel, §13 W1-T14).*
16. **W0-S01's acceptance misses cache persistence.** RUN-origin-subdomain checks execution and storage isolation, not whether the framed instrument origin's Cache API and service worker survive across sessions in desktop engines under storage partitioning; RUN-phone-pyodide covers phones only. If the framed cache does not persist, downloads repeat and offline use degrades. *Revision 3: already resolved (spine §13 W0-S01). Closed for desktop engines by W0-S01 [X RUN-origin-subdomain, RUN-origin-subdomain-live]; Safari on macOS and phones remain owner actions.*
17. **INS-lane-a's "per-check results in a fresh worker"** differs from the vendored host, which gives each check a fresh instance of one compiled module and replaces the worker only after a timeout. For zero-import modules that isolates each check just as well at lower cost. Reword the row, or log a reason for a worker per check. *Revision 3: already resolved (spine §9.1 INS-lane-a).*

