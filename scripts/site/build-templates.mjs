#!/usr/bin/env node
// The live templates of every generator family, by family: each template's id and primary KC, in the family's own order.
// Today's plan picks templates by primary KC (apps/site/src/screens/today/sources.ts); reading them from this index keeps a
// Today visit from downloading all fourteen family modules just to list them. A family module loads only when an item of
// it is drawn (apps/site/src/components/generated/registry.ts). Writes
// apps/site/src/components/generated/templates.generated.json, which the site build regenerates before the typecheck; the
// file is written only when its text changes. A pending template (one waiting for a later engine) is left out, as
// liveTemplates() leaves it out.
//
//   node scripts/site/build-templates.mjs           write the file
//   node scripts/site/build-templates.mjs --check   exit 1 when the file is not what the families declare

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FAMILIES = join(REPO, 'packages/generators/src')
const OUT = join(REPO, 'apps/site/src/components/generated/templates.generated.json')

export async function templatesOf() {
  const { liveTemplates } = await import(pathToFileURL(join(FAMILIES, 'core/index.ts')).href)
  const families = {}
  const slugs = readdirSync(FAMILIES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'core' && existsSync(join(FAMILIES, d.name, 'index.ts')))
    .map((d) => d.name)
    .sort()
  for (const slug of slugs) {
    const mod = await import(pathToFileURL(join(FAMILIES, slug, 'index.ts')).href)
    if (mod.generator === undefined) continue
    families[mod.generator.id] = liveTemplates(mod.generator).map((t) => ({ template: t.id, primary: t.kcs.primary }))
  }
  return { generatedBy: 'scripts/site/build-templates.mjs', families }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = `${JSON.stringify(await templatesOf(), null, 2)}\n`
  const held = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
  if (process.argv.includes('--check')) {
    if (held !== text) {
      console.error(`build-templates: ${OUT} is not what the families declare; run node scripts/site/build-templates.mjs`)
      process.exit(1)
    }
    console.log('build-templates: the template index matches the families')
  } else if (held !== text) {
    writeFileSync(OUT, text)
    console.log(`build-templates: wrote ${OUT}`)
  }
}
