import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Registry } from '@statespace/ids'
import { compilePage, makeSchemaChecker } from '../src/build/index.ts'
import type { CompileResult, PageContext } from '../src/build/index.ts'
import { indexRegistry } from '../src/index.ts'

export const REPO = fileURLToPath(new URL('../../../', import.meta.url))
export const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))

export const registry = JSON.parse(readFileSync(`${REPO}packages/ids/src/registry.json`, 'utf8')) as Registry
export const index = indexRegistry(registry)
export const checker = makeSchemaChecker()

/** A fixture file's text. */
export const fixture = (name: string): string => readFileSync(`${FIXTURES}${name}`, 'utf8')

/** Run records from the repository's runs/, by ID; a record that is not there is left out. */
export function realRuns(ids: readonly string[]): Map<string, unknown> {
  const runs = new Map<string, unknown>()
  for (const id of ids) {
    const file = `${REPO}runs/${id}.json`
    if (existsSync(file)) runs.set(id, JSON.parse(readFileSync(file, 'utf8')))
  }
  return runs
}

export const factsFile = JSON.parse(readFileSync(`${REPO}content/registry/facts.json`, 'utf8')) as { facts: Array<{ id: string }> }
export const facts = new Map<string, unknown>(factsFile.facts.map((f) => [f.id, f]))

/** A context for compiling a page, over the recorded runs a fixture cites and the real registry. */
export function pageContext(file: string, overrides: Partial<PageContext> = {}): PageContext {
  return { file, index, runs: realRuns(['RUN-z3-starter', 'RUN-z3-bv64']), facts, checker, ...overrides }
}

/** Compile a source text as a page. */
export function compile(text: string, file = 'content/stages/S1/S1.L1.md', overrides: Partial<PageContext> = {}): CompileResult {
  return compilePage(text, pageContext(file, overrides))
}

/** The codes of a result's problems, in order. */
export const codes = (r: CompileResult, severity?: 'error' | 'warning'): string[] => r.problems.filter((p) => severity === undefined || p.severity === severity).map((p) => p.code)

/** The fixture lesson with one replacement applied, which must change the text. */
export function mutate(name: string, from: string | RegExp, to: string): string {
  const text = fixture(name)
  const out = text.replace(from, to)
  if (out === text) throw new Error(`the fixture ${name} has no ${String(from)} to replace`)
  return out
}

/** The fenced blocks of the README with a given info string, read the way Markdown reads fences: a fence ends at a fence as long. */
export function readmeFences(info: string): string[] {
  const out: string[] = []
  let open: { marker: string; info: string; lines: string[] } | null = null
  for (const line of readFileSync(`${REPO}packages/content/README.md`, 'utf8').split('\n')) {
    if (open === null) {
      const m = /^(`{3,})(.*)$/.exec(line)
      if (m !== null) open = { marker: m[1] as string, info: (m[2] as string).trim(), lines: [] }
    } else if (new RegExp(`^\`{${open.marker.length},}\\s*$`).test(line)) {
      if (open.info === info) out.push(`${open.lines.join('\n')}\n`)
      open = null
    } else open.lines.push(line)
  }
  return out
}

/** YAML whose aliases nest, so that expanding it passes the library's limit: valid to parse, refused to read as data. */
export function aliasBomb(): string {
  const lines = ['a: &a [x, x, x, x, x, x, x, x, x, x]']
  let previous = 'a'
  for (let i = 0; i < 6; i++) {
    const name = String.fromCharCode(98 + i)
    lines.push(`${name}: &${name} [${Array.from({ length: 10 }, () => `*${previous}`).join(', ')}]`)
    previous = name
  }
  return `${lines.join('\n')}\n`
}
