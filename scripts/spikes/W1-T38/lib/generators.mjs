// What a generated item may show a learner, for the rail rule. A lesson names a generator family and a template in
// an `item` block and carries no text for it: the instance is made from a seed (invariant I3). The rail may not
// give away an option of a question on its page (V2-05), so GATE-lessons asks the family's own maker what options
// it can make: make(seed, band, template) is pure and deterministic, and over a sample of seeds and bands its
// choices and statements are the texts a title must not hold.
//
// A family's module is packages/generators/src/<slug>/index.ts and exports `generator`. A family that is not
// built yet has no module, and the rule then reads only the options the page itself authors.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** The seeds sampled, the same for every family: small ones, the edges of the seed space, and a few from the gates' starts [D]. */
export const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0x0005eed5, 0x7fffffff, 0x80000000, 0x8005eed5, 0xfffffffe, 0xffffffff]
export const BANDS = [1, 2, 3]

/** The texts of an instance's choices and statements. */
export function optionTexts(instance) {
  const parts = instance?.item?.parts
  if (!Array.isArray(parts)) return []
  const out = []
  for (const part of parts) {
    if (part?.kind === 'choice' && Array.isArray(part.options)) for (const o of part.options) out.push(o?.text)
    else if (part?.kind === 'multi-tf' && Array.isArray(part.statements)) for (const s of part.statements) out.push(s?.text)
  }
  return out.filter((t) => typeof t === 'string' && t.trim() !== '')
}

/**
 * A function (family, template, band) => Promise<{texts: string[]} | {missing: true} | {error: string}>.
 * `roots` are the trees searched in order for packages/generators/src/<slug>/index.ts, the first to hold one winning.
 */
export function generatedOptions(roots) {
  const modules = new Map()
  const samples = new Map()
  const load = (family) => {
    if (!modules.has(family)) {
      modules.set(
        family,
        (async () => {
          const slug = String(family).replace(/^GEN-/, '')
          if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) return { missing: true }
          for (const root of roots) {
            const file = path.join(root, 'packages', 'generators', 'src', slug, 'index.ts')
            if (!fs.existsSync(file)) continue
            try {
              const mod = await import(pathToFileURL(file).href)
              const generator = mod.generator ?? mod.default
              if (generator === undefined || typeof generator.make !== 'function') return { error: `${path.relative(root, file)} exports no generator with a make function` }
              return { generator }
            } catch (e) {
              return { error: `${path.relative(root, file)}: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}` }
            }
          }
          return { missing: true }
        })(),
      )
    }
    return modules.get(family)
  }
  return async (family, template, band) => {
    const key = `${family}|${template}|${band ?? ''}`
    if (samples.has(key)) return samples.get(key)
    const loaded = await load(family)
    let result
    if (loaded.generator === undefined) result = loaded
    else {
      const texts = new Set()
      for (const b of band === undefined ? BANDS : [band]) {
        for (const seed of SEEDS) {
          try {
            for (const t of optionTexts(loaded.generator.make(seed, b, template))) texts.add(t)
          } catch {
            // a seed the family cannot make at this band is GATE-generators' to report, not the rail's
          }
        }
      }
      result = { texts: [...texts] }
    }
    samples.set(key, result)
    return result
  }
}
