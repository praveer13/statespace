// The receipts this tab holds a read-only copy of, read again from the mirror on every change (I2: nothing derived is
// stored). Shared by SCR-bench, SCR-lab and SCR-claims.

import { useMemo } from 'react'
import { claimName } from '../../app/content.ts'
import { useMirror, type MirrorState } from '../../app/ledger.ts'
import type { LedgerStore } from '../../storage/index.ts'
import { receiptsInMirror, type ImportedReceipt } from './receipt-model.ts'

export const claimExists = (template: string): boolean => claimName(template) !== undefined

export function useReceipts(store: LedgerStore | null | undefined): { readonly mirror: MirrorState; readonly receipts: readonly ImportedReceipt[] } {
  const mirror = useMirror(store)
  const receipts = useMemo(
    () => (mirror.status === 'ready' ? receiptsInMirror(mirror.files, claimExists).sort((a, b) => Date.parse(b.receipt.createdAt) - Date.parse(a.receipt.createdAt)) : []),
    [mirror],
  )
  return { mirror, receipts }
}
