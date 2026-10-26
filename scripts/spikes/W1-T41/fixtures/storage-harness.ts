// The page for seed-adapter-check.mjs: the site's real storage adapter, bundled, on window.ledger. It is not type-checked with this
// folder (tsconfig.json excludes it): it belongs to apps/site and is compiled by esbuild when the check runs.
import { openLedgerStore } from '../../../../apps/site/src/storage/index.ts'

;(window as unknown as { ledger: Record<string, unknown> }).ledger = { openLedgerStore }
document.title = 'storage harness ready'
