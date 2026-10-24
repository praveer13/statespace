// Planted violations: a package imports code, never a Node module or a URL.
import { readFileSync } from 'node:fs' // PURE-IMPORT
import { join } from 'path' // PURE-IMPORT
export * from 'node:os' // PURE-IMPORT
export async function load() {
  await import('https://example.invalid/x.js') // PURE-IMPORT
  return import('node:net') // PURE-IMPORT
}
export { readFileSync, join }
