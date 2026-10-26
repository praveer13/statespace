# apps/site/src/storage: the evidence log's IndexedDB adapter

**Status:** built by W1-T03. **Date:** 2026-10-25 (machine clock).

The browser keeps three kinds of state (ARCHITECTURE.md section 3.4): the event log, append-only; working state, last writer wins; and the read-only lab mirror. This directory stores all three for `packages/ledger`, which holds every rule they follow. Only `apps/site` imports it (section 17.2). Screens open one store per tab and derive their views from its log at read time; nothing here stores a learner status (I2).

```ts
import { openLedgerStore } from '../storage'

const store = await openLedgerStore()             // IndexedDB, localStorage and BroadcastChannel of this page
const call = await store.record({ kind: 'call', ref: 'call:S1.L3/c1', provenance: 'own', exposure: 'unseen', conf: 'sure' })
store.subscribe((change) => rederive())           // this tab's writes and other tabs' (change.local says which)
const events = await store.events()               // fold order; derive views from these
```

## 1. The database

IndexedDB database `statespace`, version 1 (`db.ts`):

| Store | Key | Holds |
|---|---|---|
| `events` | `id` | `event@1` records, indexed on `at` and on `[kind, ref]` |
| `working` | `key` | `{ key, value, updatedAt, dev }`: settings, drafts, the last export time (last writer wins), and keep/kill read records (kept once, never replaced) |
| `mirror` | `path` | the read-only lab mirror, replaced whole on each lab bundle import |
| `meta` | `key` | `ledger` (the data version), `device` (this profile's `dev`), `exp-seeds` (the experiment-seed draws), `generation` (a change counter) |
| `checkpoints` | `id` | the undo checkpoints, the newest five kept [D] |

## 2. The write path

1. **Durable first.** `record` and `append` validate the events, then write them to this tab's outbox in localStorage (`statespace.ledger.outbox.<tab id>`) before returning, so a call is recorded before its run is sent and can never follow its result (M-call-it: "the first call is final").
2. **Commit.** One IndexedDB transaction puts each event unless the database holds it; when it holds a different record of the same id, the canonical conflict rule decides. The outbox entry is removed after the commit.
3. **Announce.** A BroadcastChannel message (`statespace-ledger`) tells the other tabs that the log changed; each re-reads it. The message carries no events.

A tab that closes or crashes between steps 1 and 2 loses nothing: the next tab to open drains every outbox it finds (each tab writes only its own key; commits are idempotent), and `status().drained` counts what it committed. Outbox entries are validated again before they are committed; a refused one is reported in `status().problems`. When localStorage refuses writes, `status().outboxDurable` is false and a caller awaits the commit before acting on its result.

## 3. Merge, replace, undo and reset

- `merge(incoming)` is a set union under the conflict rule; `previewMerge` reports what it would add, find duplicated or decide in a conflict, without writing (SCR-settings' preview, ARCHITECTURE.md section 7.7).
- `replace(incoming)` makes the events the incoming ones. Experiment-seed draws are joined, never dropped.
- `reset()` removes every event; the draw stays, because it is never redrawn.
- `undo()` restores the log as it was before the last merge, replace, reset or undo, keeping any event appended since. It writes a checkpoint of its own first, so a second undo redoes.

Each of the four writes its undo checkpoint in the same transaction as its change, so a failure leaves neither.

Every write runs inside one transaction against the database as it is at that moment, so a tab whose view is old (a stale tab) can never undo another tab's write: a double import, a merge and a stale tab give identical logs. `log()` compares the change counter in `meta` on every read, so a tab that missed a message still reads the current log.

## 4. The schema guard

A profile whose database version is newer than `DB_VERSION`, or whose `meta.ledger` records a newer data version, opens read-only (`status().reason === 'newer-schema'`): every write is refused and the page should ask for a reload (section 7.5, item 3). When another tab upgrades the database, this tab closes its connection, becomes read-only with `reason: 'version-change'`, and tells its listeners (`{ reason: 'read-only' }`).

## 5. The experiment seed and keep/kill reads

`drawExpSeed()` is the keep/kill switch's write (SCR-settings, W1-T20): it draws expSeed with `crypto.getRandomValues`, refuses when a draw or any event exists, and stores the draw through the outbox like an event. `snapshot()` carries the draws, and `merge` joins them, the earliest governing (`packages/ledger`, section 6). A screen takes a keep/kill read with `readKeepKill({ comparison, phase, content })`: it reads this store's log, runs `readComparison` at the given instant (by default now), and keeps the read's learner-zero run record in the same call, so every read leaves its record; a read-only store refuses before reading. The read counts the events whose `at` precedes its instant, so an event stamped in the same millisecond is not counted. `recordKeepKillRead(record)` keeps a record in working state under `keepkill-read:<RUN id>`, so an export carries it, and `keepKillReads()` lists them. Each read has an id of its own (`packages/ledger`, section 7), so two reads on one day are two records. A kept record is never replaced: the same record again changes nothing, a different record under a kept id is refused (`LedgerError` with code `refused`), `importWorking` keeps the held one and reports the other in `status().problems`, and `setWorking` refuses `keepkill-read:` keys. The keep/kill code is loaded on the first read, so a page that never takes one does not carry it.

## 6. What an export carries

`snapshot()` returns `{ dev, events, expSeeds }`, the events in fold order; `listWorking()` returns the working records. W1-T20's `bundle@1` wraps them with its envelope; an imported bundle is parsed on the instrument origin (I6) and its records are validated again here before `merge` or `replace` writes them.

## 7. Tests

The adapter's tests run under Node against fake-indexeddb, in `packages/ledger/test/storage/` (they compile with the DOM types there, which this app's own tsconfig does not give tests). Their property test sends conflicting records by both write paths: `merge()`, and the commit of section 2 through appends and through closed tabs' outboxes that a later tab drains. `scripts/spikes/W1-T03/browser-check.mjs` bundles this directory and runs it in Chromium, Firefox and WebKit in the pinned Playwright image, two tabs to a profile: the outbox before the commit, the cross-tab message, stale tabs (both appending conflicting records, one re-importing others), a double import, undo, an outbox drained after a tab closed (holding records that conflict with ones another tab imported meanwhile), the experiment seed, two keep/kill reads that both keep their records, and both read-only cases. Its conflicting data is checked first to tell the conflict rule apart from a commit that applies the last writer or keeps the first.
