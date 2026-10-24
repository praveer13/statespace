// Planted violations: the global object does not hide a platform global.
export const a = globalThis.document // PURE-GLOBALTHIS
export const b = globalThis['fetch'] // PURE-GLOBALTHIS
export function c(name: string): unknown {
  return globalThis[name as 'x'] // PURE-GLOBALTHIS: a computed key could be anything
}
