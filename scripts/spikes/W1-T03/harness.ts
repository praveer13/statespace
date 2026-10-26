// W1-T03: the page the browser check drives. It bundles the real storage adapter (apps/site/src/storage) and
// the ledger, and exposes them to the Playwright driver (browser-check.mjs) on window.ledger.

import { OUTBOX_PREFIX, openLedgerStore } from '../../../apps/site/src/storage/index.ts'
import { eventSetDigest, logDigest, logFrom, mergeLogs } from '../../../packages/ledger/src/index.ts'

declare global {
  interface Window {
    ledger: Record<string, unknown>
  }
}

window.ledger = { openLedgerStore, OUTBOX_PREFIX, eventSetDigest, logDigest, logFrom, mergeLogs }
document.title = 'ledger harness ready'
