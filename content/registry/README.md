# content/registry: the facts registry

**Status:** built by W0-T08. **Date:** 2026-10-24 (machine clock).

The course's dated, sourced facts that are not tool behavior: a tool's latest version or release date, a production-twin pin, a dated incident, paper, leaderboard or quotation. Tool behavior (what a tool printed when it ran: its numbers, verdicts, flags and versions) is never a fact here: it is a run in `runs/` (invariant I4). The registry adapts kernelspace's claims registry (ARCHITECTURE.md section 4.2) and keeps its TTLs, its "stale since" badges and its errata that flag "re-check"; "claim" is a learner term in statespace, so this is the facts registry.

## 1. What is here

| File | Holds |
|---|---|
| `facts.json` | the facts, each with its source and its clock |
| `errata.json` | published corrections; none yet, because no lesson has shipped |
| `README.md` | this page |

The seed of `facts.json` is ten items of the watch list of docs/LANDSCAPE.md section 6.3, as the landscape pass checked them on 2026-10-23, each with the source its section 10 gives, and three of the dated incidents of its section 7.2. Two of the tool facts keep a saved copy of their source (`evidence`), which the gate checks.

## 2. Kinds and clocks

| Kind | What | Clock | TTL |
|---|---|---|---|
| `tool` | a tool's status read from its release page or registry: a version, a release date, a "latest" or "newest stable" statement | `checked_at`, the day a person last read the source | `ttl_days`, 60 to 90 (BRIEF section 2.3) |
| `twin` | a production-twin pin (M-production-twin): a commit SHA, or a documentation page's content hash and read date | the run that records the pin, RUN-twin-pins | that run's `ttl_days`, which must be 60 (spine section 11.2) |
| `incident`, `paper`, `leaderboard`, `quotation` | a dated fact | its own `date` | none: it states its own date |

A fact checked on day D with a TTL of N days is stale from day D + N on. The seed, checked on 2026-10-23 with 60 days, is stale since 2026-12-22, the date docs/LANDSCAPE.md section 6.2 gives. Stale is not wrong: wherever the fact is printed it shows "stale since <date>", it asks for a re-check, and nothing deducts. The seed gives every tool fact 60 days, the short end, because each says what is latest [D].

A twin follows its run's clock, so a pin is re-checked by re-recording RUN-twin-pins, which the wave that authors each stage refreshes (spine section 9.5). Any other run that describes a moving upstream carries `ttl_days` too and is watched the same way; RUN-lean-asset carries 60 days [X RUN-lean-asset].

## 3. A fact

| Field | Kinds | Holds |
|---|---|---|
| `id` | all | dotted lowercase, at least two segments (`tool.pyodide.latest`); stable once published |
| `kind` | all | one of the six kinds above |
| `statement` | all | the fact in one sentence, at most 400 characters |
| `value`, `unit` | any, optional | what a fact reference prints: a non-empty string or a number, which the statement must state, and its unit |
| `source` | all | `url` (https) and `title`; optionally `key`, the source key of docs/LANDSCAPE.md section 10, and `quote`, the source's own words, verbatim |
| `evidence` | any, optional | `{path, sha256}`: a saved copy of the source in the repository |
| `checked_at` | `tool` (required); dated kinds (optional, the read date) | YYYY-MM-DD, never in the future |
| `ttl_days` | `tool` only | a whole number of days, 60 to 90 |
| `date` | dated kinds only | the date the fact states: YYYY, YYYY-MM or YYYY-MM-DD |
| `run`, `pin` | `twin` only | the run that records the pin, and the pin's path in it, such as `values.pins.<name>` |
| `boundary`, `via`, `notes` | any, optional | when the fact holds; where the check is recorded; anything else |

A field the table does not name fails, so a misspelled `ttl_days` cannot drop a TTL without a word.

## 4. Citing a fact

Copy prints a fact with a fact reference, `{{fact:<id>}}`: the site renders its `value` and, once its TTL has passed, the "stale since" badge (`packages/runs` computes both). A reference to an id the registry does not hold fails GATE-facts. Documents keep citing sources with `[V]` and a source key.

## 5. Errata and "re-check"

`errata.json` holds `{format, about, errata}`. An erratum:

| Field | Holds |
|---|---|
| `id` | `<date>-<slug>`, such as `2026-11-20-postgresql-19-ga` |
| `date` | the day the correction shipped |
| `kind` | `error`, the course was wrong; or `changed`, a tool or the field moved and the course caught up |
| `lessons` | the lessons it flags "re-check" (lesson IDs); at least one |
| `runs`, `facts` | optional: the runs whose change caused it (a runs diff), and the registry facts it corrects |
| `title`, `before`, `after` | the change card's title, struck line and new line, at most 240 characters each |
| `why` | optional, at most 40 words |
| `source` | optional: `url` (https) and `title` |
| `supersedes` | optional: the id of an earlier erratum it replaces; they share a lesson |

A learner who finished a named lesson on or before an erratum's date sees "re-check" on it, and nothing deducts (`recheckFlags` in `packages/runs`). An erratum that a newer one replaces is not shown twice. The change card's two retrieval items belong to M-change-cards (W3-T15).

## 6. Re-checking a fact

When GATE-facts warns that a fact is stale, read its source again. If the fact still holds, move `checked_at` to that day (with a saved copy, replace the file and its `sha256`). If it moved, change `statement` and `value` as well, and when a lesson taught the old value, add an erratum.

## 7. What GATE-facts checks here

`node scripts/verify-facts.mjs`, in the fast lane:

- **fails** when `facts.json` or `errata.json` is missing, does not parse, or breaks the format above: an unknown field or kind, a malformed or repeated id, a source that is not https, a date in the future, a statement that does not state its value, a tool TTL outside 60 to 90 days, a dated fact with a TTL, a twin whose run is not on disk or has no 60-day TTL, a saved copy whose SHA-256 changed or that lacks its quote, an erratum that names no lesson or names a run or fact that is not there, or that supersedes a newer one;
- **warns, and never fails**, in every lane, when a tool fact, a twin or a run with `ttl_days` passes its TTL (ARCHITECTURE.md section 18, item 22). `--today YYYY-MM-DD` judges the TTLs on another day.

The rules are in `packages/runs/src/facts.ts`; `packages/runs/README.md` describes the sentence checks and the fixtures.
