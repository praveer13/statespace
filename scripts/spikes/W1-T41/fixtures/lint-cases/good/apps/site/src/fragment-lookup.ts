// the fragment names a learner object (SCR-receipt): a hash value is looked up, never decoded or parsed
const SHA256 = /^[0-9a-f]{64}$/
export function receiptId(): string | null {
  const id = location.hash.slice(1)
  return SHA256.test(id) ? id : null
}
export function parseSettings(text: string): unknown {
  return JSON.parse(text)
}
