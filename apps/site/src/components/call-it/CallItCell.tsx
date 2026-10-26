// The sheet bound to the ledger store: what a lesson's cell, Boot and Today mount. It reads the call that counts for the item's
// question (so a question already called shows its call, read-only, after a reload or in another tab), and writes a new call
// through commitCall.

import { CallIt } from './CallIt.tsx'
import type { CallItProps } from './CallIt.tsx'
import { COPY } from './copy.ts'
import type { CallStore } from './commit.ts'
import { useCall } from './useCall.ts'

export interface CallItCellProps extends Omit<CallItProps, 'recorded' | 'onCommit'> {
  /** The tab's ledger store (openLedgerStore); null when the browser cannot open one; undefined while the host is still opening it. */
  readonly store: CallStore | null | undefined
}

export function CallItCell({ store, item, ...rest }: CallItCellProps) {
  const { log, commit } = useCall(store, item.identity)
  if (log.status === 'unavailable') return <p className="ci-unavailable">{COPY.unavailable}</p>
  if (log.status === 'loading') return <p className="ci-loading" role="status">{COPY.loading}</p>
  return <CallIt item={item} recorded={log.recorded} onCommit={commit} {...rest} />
}
