// apps/site/src/storage: the IndexedDB adapter for packages/ledger, the working state and the lab mirror
// (ARCHITECTURE.md sections 3.4, 7.4 to 7.8 and 17.1). Screens open one store per tab and derive their views
// from its log at read time (I2); they never store a status.

export { CHANNEL_NAME } from './channel.ts'
export type { ChangeReason, ChannelFactory, ChannelLike, LedgerMessage, OutgoingMessage } from './channel.ts'
export { DB_NAME, DB_VERSION, LEDGER_DATA_VERSION, STORE } from './db.ts'
export { OUTBOX_PREFIX } from './outbox.ts'
export { KEEPKILL_READ_PREFIX, openLedgerStore, systemClock } from './store.ts'
export type {
  CheckpointInfo,
  CheckpointReason,
  Clock,
  KeepKillReadRequest,
  LedgerChange,
  LedgerStore,
  LedgerStoreOptions,
  MirrorEntry,
  ReadOnlyReason,
  StoreStatus,
  WorkingRecord,
} from './store.ts'
