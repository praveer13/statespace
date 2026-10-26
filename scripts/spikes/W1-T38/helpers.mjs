// Shared by the tests of GATE-lessons: the repository's root, the fixture tree, and the environment the rules run in.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../../verify-lessons.mjs'
import { PLANTS, TREE, copyTree, scratchTree } from './lib/plants.mjs'

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const FIXTURE_TREE = path.join(REPO, TREE)
export { PLANTS, copyTree, scratchTree }

const envs = new Map()

/** The environment of the rules over a tree (the glossary, the registry and the spine fall back to the repository's). */
export async function envFor(root = FIXTURE_TREE) {
  if (!envs.has(root)) {
    const loaded = await loadEnv(root)
    if (loaded.error !== undefined) throw new Error(loaded.error)
    envs.set(root, loaded)
  }
  return envs.get(root)
}

/** A fixture file of the tree. */
export const fixtureText = (rel) => fs.readFileSync(path.join(FIXTURE_TREE, rel), 'utf8')

/** The fixture file with one replacement applied, which must change it. */
export function mutate(rel, from, to) {
  const text = fixtureText(rel)
  if (typeof from === 'string' ? !text.includes(from) : !from.test(text)) throw new Error(`${rel} has no ${String(from)} to replace`)
  return text.replace(from, to)
}

/** Check names of the findings, in order. */
export const checks = (findings) => findings.map((f) => f.check)
