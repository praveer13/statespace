// Shared by the tests: the repository root and its run records, read from disk.

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const FIXTURES = join(ROOT, 'packages', 'runs', 'test', 'fixtures', 'facts')

/** Every runs/RUN-*.json under root, by ID. */
export function loadRuns(root = ROOT): Map<string, unknown> {
  const dir = join(root, 'runs')
  const runs = new Map<string, unknown>()
  if (!existsSync(dir)) return runs
  for (const f of readdirSync(dir).filter((n) => /^RUN-.*\.json$/.test(n)).sort()) runs.set(f.slice(0, -5), JSON.parse(readFileSync(join(dir, f), 'utf8')))
  return runs
}

/** The registry context's file reader over root. */
export const fileReader =
  (root = ROOT) =>
  (path: string): { text: string; sha256: string } | null => {
    const abs = join(root, path)
    if (!existsSync(abs) || !statSync(abs).isFile()) return null
    const bytes = readFileSync(abs)
    return { text: bytes.toString('utf8'), sha256: createHash('sha256').update(bytes).digest('hex') }
  }

export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'))
