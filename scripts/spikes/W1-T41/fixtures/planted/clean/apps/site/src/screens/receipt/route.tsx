// the control: a hash that names a receipt is looked up, never parsed
export function receiptFromHash(hash: string): string | null {
  return /^#[0-9a-f]{64}$/.test(hash) ? hash.slice(1) : null
}
