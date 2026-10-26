#!/usr/bin/env node
// Builds the self-hosted font subsets of DESIGN.md section 3.4 into apps/site/public/fonts/ (W1-T01).
//
//   node scripts/spikes/W1-T01/build-fonts.mjs --work <scratch directory> [--check]
//
// It downloads each pinned source into <work>/dl (checked against the SHA-256 below), subsets it with fontTools
// under uv (versions pinned below; scripts/spikes/W1-T01/subset-fonts.py), copies each face's license beside the
// subsets, writes apps/site/public/fonts/fonts.json (every file with its SHA-256, size and code points, every
// source with its URL and SHA-256, the tool versions and the command) and rewrites the generated @font-face block
// of apps/site/src/styles/tokens.css. Each face is split into a core file and an extension file with
// unicode-range, so a page downloads the extension only when it sets one of its characters. The fallback faces are
// metric-matched to Liberation Sans, Serif and Mono, which share their advance widths with Arial, Times New Roman
// and Courier New. With --check it rebuilds into <work> and fails unless the committed files are byte-identical
// (the build is deterministic: no timestamps are recalculated). Nothing outside apps/site/public/fonts/,
// apps/site/src/styles/tokens.css and <work> is written.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..', '..')
const OUT = path.join(REPO, 'apps', 'site', 'public', 'fonts')
const argv = process.argv.slice(2)
const opt = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const work = opt('--work')
if (!work) {
  console.error('usage: node scripts/spikes/W1-T01/build-fonts.mjs --work <scratch directory> [--check]')
  process.exit(2)
}
const check = argv.includes('--check')

const FONTTOOLS = '4.67.0'
const BROTLI = '1.1.0'
const GOOGLE_FONTS = '08dc85da6bca7ae308a6f1d38d0b137465646071' // google/fonts, committed 2026-04-24
const gf = (p) => `https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS}/${p.replaceAll('[', '%5B').replaceAll(']', '%5D').replaceAll(',', '%2C')}`

/** The pinned sources: a download URL and the SHA-256 the bytes must have. */
const SOURCES = {
  jost: { url: gf('ofl/jost/Jost[wght].ttf'), file: 'Jost[wght].ttf', sha256: '6343b70971000b04c5d401c96ae08ce371086135e999d5e1e1413039c0213076' },
  jostLicense: { url: gf('ofl/jost/OFL.txt'), file: 'Jost-OFL.txt', sha256: '1af3438a4d5f0ed2bdbc5751a5a67ebf6d537334161184b7fbb68503ef0ea0c5' },
  serif: { url: gf('ofl/sourceserif4/SourceSerif4[opsz,wght].ttf'), file: 'SourceSerif4[opsz,wght].ttf', sha256: '97b2d4da6e3cb494b5a1e66ae176914d852ccabef49e0c02c0df25f3e39aca0b' },
  serifItalic: { url: gf('ofl/sourceserif4/SourceSerif4-Italic[opsz,wght].ttf'), file: 'SourceSerif4-Italic[opsz,wght].ttf', sha256: '15fbc7e4679489a501998c3669272637a6646388ef7e4bd77eebb5bf967a1f42' },
  serifLicense: { url: gf('ofl/sourceserif4/OFL.txt'), file: 'SourceSerif4-OFL.txt', sha256: '5f94c3fd3a23131a417ab5a0c8452de57e70c3cfb9f604d88241f7065ebf9fd9' },
  juliamono: {
    url: 'https://github.com/cormullion/juliamono/releases/download/v0.63.2/JuliaMono-ttf.tar.gz',
    file: 'JuliaMono-ttf.tar.gz',
    sha256: 'be6517295198ec5c92bdbaad42f4f6f8d83f921d80512b79f54fe036add95c0c', // as RUN-juliamono-glyphs records it
    members: {
      'JuliaMono-Regular.ttf': '40a07da0d1601215eb6b89312eb44128a3e2f36675d3e1f518264bd391fc7023',
      'JuliaMono-SemiBold.ttf': '6c455a2488c1a69585d8a8f9d07e6ee394fc060b705dc607e7a4120bb2e3e630',
      LICENSE: 'bae3beff9e15f1a680c2764c4bbdb25b995b9bf539aeaf8467482a495c75ad0c',
    },
  },
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

// ------------------------------------------------------------------ code points
/** Reading and structure faces. Core: ASCII, Latin-1, typographic punctuation, euro, trade mark, minus. */
const TEXT_CORE = [...range(0x20, 0x7e), ...range(0xa0, 0xff), ...range(0x2000, 0x206f), 0x20ac, 0x2122, 0x2212]
/** Extension: Latin Extended-A and the spacing modifiers names use. */
const TEXT_EXT = [...range(0x100, 0x17f), 0x192, 0x2bb, 0x2bc, 0x2c6, 0x2da, 0x2dc]

/** The code face sets code, logic and inline math (DESIGN.md section 3.3). */
const CORPUS_TSV = 'runs/RUN-juliamono-glyphs/codepoints.tsv'
function corpusCodepoints() {
  const lines = readFileSync(path.join(REPO, CORPUS_TSV), 'utf8').trim().split('\n').slice(1)
  return lines.map((l) => Number.parseInt(l.split('\t')[0].replace('U+', ''), 16))
}
/** The logic symbols the speech map names and the notation the course writes most (DESIGN.md section 10.6). */
const LOGIC = [...'∀∃∄¬∧∨⇒⇔→←↔↦⟶⟹⊢⊨⊤⊥≜≡≠≤≥≈∼∈∉∋⊂⊃⊆⊇∪∩∅∖∘∑∏√∞ℕℤℚℝ⟨⟩⟦⟧⌈⌉⌊⌋□◇○●◐◉▸▾◂△✓✗⊕⊗↑↓⇄≔∣⊑⊒⊓⊔⋮'].map((c) => c.codePointAt(0))
/** Core: ASCII, Latin-1, basic Greek, punctuation, superscripts and subscripts, the logic set and the corpus. */
const codeCore = (corpus) => [
  ...range(0x20, 0x7e),
  ...range(0xa0, 0xff),
  ...range(0x391, 0x3a9),
  ...range(0x3b1, 0x3c9),
  0x3d5,
  0x3f5,
  ...range(0x2000, 0x206f),
  ...range(0x2070, 0x209f),
  ...LOGIC,
  ...corpus,
]
/** Extension: the rest of the notation blocks, for code and goal strips that reach past the core. */
const CODE_BLOCKS = [
  ...range(0x2100, 0x214f),
  ...range(0x2190, 0x21ff),
  ...range(0x2200, 0x22ff),
  ...range(0x2308, 0x230b),
  0x2315,
  0x2318,
  ...range(0x2500, 0x257f),
  ...range(0x25a0, 0x25ff),
  0x2713,
  0x2717,
  ...range(0x27c0, 0x27ef),
  ...range(0x27f0, 0x27ff),
  0x2a7d,
  0x2a7e,
]

/** Default shaping, kerning and ligatures, plus tabular and lining figures and case forms (DESIGN.md section 3.2). */
const FEATURES = ['ccmp', 'locl', 'mark', 'mkmk', 'kern', 'liga', 'calt', 'rlig', 'rvrn', 'tnum', 'lnum', 'case']

/** The text the fallbacks' average advance is measured on: course prose, so the match is for the words it sets. */
const SAMPLE = 'Every result wears its status. A transfer never overdraws the sender; the checker states what it established, within its bound, at version 5.3.1. Call it before you run it.'

/** Fallback faces with the advance widths of the system faces the stacks name. */
const FALLBACK_FAMILIES = { sans: 'Liberation Sans', serif: 'Liberation Serif', mono: 'Liberation Mono' }
const FALLBACK_LOCALS = {
  sans: ['Arial', 'Liberation Sans', 'Arimo'],
  serif: ['Times New Roman', 'Liberation Serif', 'Tinos'],
  mono: ['Courier New', 'Liberation Mono', 'Cousine'],
}

// ------------------------------------------------------------------ build
function fetchPinned(src, dir) {
  const dest = path.join(dir, src.file)
  if (!existsSync(dest)) {
    const r = spawnSync('curl', ['-fsSL', '--retry', '3', '-o', dest, src.url], { stdio: ['ignore', 'inherit', 'inherit'] })
    if (r.status !== 0) throw new Error(`download failed: ${src.url}`)
  }
  const got = sha256(readFileSync(dest))
  if (got !== src.sha256) throw new Error(`${src.file}: SHA-256 ${got}, expected ${src.sha256}`)
  return dest
}

const dl = path.join(work, 'dl')
const out = check ? path.join(work, 'out') : OUT
mkdirSync(dl, { recursive: true })
if (check) rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const files = {}
for (const [key, src] of Object.entries(SOURCES)) files[key] = fetchPinned(src, dl)
const jm = path.join(work, 'juliamono')
rmSync(jm, { recursive: true, force: true })
mkdirSync(jm)
if (spawnSync('tar', ['xzf', files.juliamono, '-C', jm, ...Object.keys(SOURCES.juliamono.members)]).status !== 0) throw new Error('tar failed')
for (const [member, want] of Object.entries(SOURCES.juliamono.members)) {
  const got = sha256(readFileSync(path.join(jm, member)))
  if (got !== want) throw new Error(`${member}: SHA-256 ${got}, expected ${want}`)
}

const corpus = corpusCodepoints()
const uniq = (xs) => [...new Set(xs)].sort((a, b) => a - b)
const CODE_CORE = uniq(codeCore(corpus))
const CODE_EXT = uniq(CODE_BLOCKS).filter((cp) => !CODE_CORE.includes(cp))
const fallbackFiles = Object.fromEntries(
  Object.entries(FALLBACK_FAMILIES).map(([k, family]) => {
    const r = spawnSync('fc-match', ['-f', '%{file}', `${family}:style=Regular`], { encoding: 'utf8' })
    if (r.status !== 0 || !r.stdout.trim()) throw new Error(`fc-match found no ${family}`)
    return [k, r.stdout.trim()]
  }),
)
/** Each face: its CSS family, weight, style and stretch, and its two files. */
const FACES = [
  { family: 'Jost', weight: '100 900', style: 'normal', fallback: 'sans', source: files.jost, axes: {}, stem: 'jost-var', core: TEXT_CORE, ext: TEXT_EXT },
  { family: 'Source Serif 4', weight: '400', style: 'normal', fallback: 'serif', source: files.serif, axes: { wght: 400, opsz: 'default' }, stem: 'source-serif-4-400', core: TEXT_CORE, ext: TEXT_EXT },
  { family: 'Source Serif 4', weight: '600', style: 'normal', fallback: 'serif', source: files.serif, axes: { wght: 600, opsz: 'default' }, stem: 'source-serif-4-600', core: TEXT_CORE, ext: TEXT_EXT },
  { family: 'Source Serif 4', weight: '400', style: 'italic', fallback: 'serif', source: files.serifItalic, axes: { wght: 400, opsz: 'default' }, stem: 'source-serif-4-400-italic', core: TEXT_CORE, ext: TEXT_EXT },
  { family: 'JuliaMono', weight: '400', style: 'normal', fallback: 'mono', source: path.join(jm, 'JuliaMono-Regular.ttf'), stem: 'juliamono-400', core: CODE_CORE, ext: CODE_EXT },
  { family: 'JuliaMono', weight: '600', style: 'normal', fallback: 'mono', source: path.join(jm, 'JuliaMono-SemiBold.ttf'), stem: 'juliamono-600', core: CODE_CORE, ext: CODE_EXT },
]
const plan = {
  sample: SAMPLE,
  fallbacks: fallbackFiles,
  outputs: FACES.flatMap((f) => [
    { file: `${f.stem}-core.woff2`, source: f.source, axes: f.axes, codepoints: f.core, features: FEATURES, measure: true },
    { file: `${f.stem}-ext.woff2`, source: f.source, axes: f.axes, codepoints: f.ext, features: FEATURES },
  ]),
}
const planFile = path.join(work, 'plan.json')
writeFileSync(planFile, JSON.stringify(plan))
const uvArgs = ['run', '--no-project', '--with', `fonttools==${FONTTOOLS}`, '--with', `brotli==${BROTLI}`, 'python', '-I', path.join(HERE, 'subset-fonts.py'), planFile, out]
const run = spawnSync('uv', uvArgs, { encoding: 'utf8', cwd: work, maxBuffer: 64 * 1024 * 1024 })
if (run.status !== 0) throw new Error(`subset-fonts.py exited ${run.status}\n${run.stderr}`)
const report = JSON.parse(run.stdout)

copyFileSync(files.jostLicense, path.join(out, 'OFL-Jost.txt'))
copyFileSync(files.serifLicense, path.join(out, 'OFL-SourceSerif4.txt'))
copyFileSync(path.join(jm, 'LICENSE'), path.join(out, 'OFL-JuliaMono.txt'))

const python = spawnSync('uv', ['run', '--no-project', 'python', '-I', '-c', 'import platform; print(platform.python_version())'], { encoding: 'utf8', cwd: work }).stdout.trim()
const uv = spawnSync('uv', ['--version'], { encoding: 'utf8' }).stdout.trim()
const relSource = (p) => (p.startsWith(jm) ? `JuliaMono-ttf.tar.gz:${path.basename(p)}` : path.basename(p))
const sourceOf = (p) => (p.startsWith(jm) ? SOURCES.juliamono : Object.values(SOURCES).find((s) => s.file === path.basename(p)))
const hex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0')

/** Code points as a CSS unicode-range: U+0020-007E, U+00A0-00FF, ... */
function unicodeRange(cps) {
  const sorted = uniq(cps)
  const parts = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1
    parts.push(i === j ? `U+${hex(sorted[i])}` : `U+${hex(sorted[i])}-${hex(sorted[j])}`)
    i = j + 1
  }
  return parts.join(', ')
}

const outputOf = (file) => {
  const r = report.outputs.find((x) => x.file === file)
  if (!r) throw new Error(`no report for ${file}`)
  return r
}
const pct = (x) => `${(x * 100).toFixed(2)}%`

/** A fallback face per family, metric-matched to the family's regular core file (DESIGN.md section 3.4). */
const fallbacks = []
for (const f of FACES) {
  if (fallbacks.some((x) => x.family === `${f.family} fallback`)) continue
  const r = outputOf(`${f.stem}-core.woff2`)
  const m = r.metrics
  const fb = report.fallbacks[f.fallback]
  const sizeAdjust = r.averageAdvance / fb.averageAdvance
  const asc = m.useTypoMetrics ? m.typoAscender : m.hheaAscender
  const desc = Math.abs(m.useTypoMetrics ? m.typoDescender : m.hheaDescender)
  const gap = m.useTypoMetrics ? m.typoLineGap : m.hheaLineGap
  fallbacks.push({
    family: `${f.family} fallback`,
    locals: FALLBACK_LOCALS[f.fallback],
    measuredOn: { face: FALLBACK_FAMILIES[f.fallback], version: fb.version, averageAdvance: fb.averageAdvance },
    sizeAdjust: pct(sizeAdjust),
    ascentOverride: pct(asc / m.unitsPerEm / sizeAdjust),
    descentOverride: pct(desc / m.unitsPerEm / sizeAdjust),
    lineGapOverride: pct(gap / m.unitsPerEm / sizeAdjust),
  })
}

const faces = FACES.map((f) => ({
  family: f.family,
  weight: f.weight,
  style: f.style,
  ...(f.stretch ? { stretch: f.stretch } : {}),
  files: [`${f.stem}-core.woff2`, `${f.stem}-ext.woff2`].map((file) => ({ file, unicodeRange: unicodeRange(outputOf(file).codepoints) })),
}))

const css = [
  '/* @font-face: generated by scripts/spikes/W1-T01/build-fonts.mjs from apps/site/public/fonts/fonts.json; do not edit by hand. */',
  ...faces.flatMap((f) =>
    f.files.map((x) =>
      [
        '@font-face {',
        `  font-family: '${f.family}';`,
        `  src: url('/fonts/${x.file}') format('woff2');`,
        `  font-weight: ${f.weight};`,
        `  font-style: ${f.style};`,
        ...(f.stretch ? [`  font-stretch: ${f.stretch};`] : []),
        '  font-display: swap;',
        `  unicode-range: ${x.unicodeRange};`,
        '}',
      ].join('\n'),
    ),
  ),
  ...fallbacks.map((fb) =>
    [
      '@font-face {',
      `  font-family: '${fb.family}';`,
      `  src: ${fb.locals.map((l) => `local('${l}')`).join(', ')};`,
      `  size-adjust: ${fb.sizeAdjust};`,
      `  ascent-override: ${fb.ascentOverride};`,
      `  descent-override: ${fb.descentOverride};`,
      `  line-gap-override: ${fb.lineGapOverride};`,
      '}',
    ].join('\n'),
  ),
  '/* @font-face end */',
].join('\n')

const manifest = {
  schema: 'statespace/font-manifest@1',
  about:
    "The self-hosted font subsets (DESIGN.md section 3.4; spine section 10.2): each file pinned by SHA-256 and counted against GATE-bundle's budgets, each source pinned by URL and SHA-256, each face under the SIL Open Font License with its license file beside the subsets. Each face is a core file and an extension file with unicode-range, so a page downloads the extension only when it sets one of its characters. Written by scripts/spikes/W1-T01/build-fonts.mjs; never edited by hand. GATE-stamps checks every file's hash, and that tokens.css declares exactly these files with these ranges.",
  tool: { fonttools: FONTTOOLS, brotli: BROTLI, python, uv },
  command: ['node', 'scripts/spikes/W1-T01/build-fonts.mjs', '--work', '<scratch>'],
  subsetCommand: ['uv', ...uvArgs.slice(0, -2), '<plan.json>', '<out>'].map((a) => (a.startsWith(REPO) ? path.relative(REPO, a) : a)),
  corpus: { path: CORPUS_TSV, sha256: sha256(readFileSync(path.join(REPO, CORPUS_TSV))), codepoints: corpus.length },
  sample: SAMPLE,
  sources: Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [k, { url: s.url, sha256: s.sha256, ...(s.members ? { members: s.members } : {}) }])),
  licenses: {
    'OFL-Jost.txt': sha256(readFileSync(path.join(out, 'OFL-Jost.txt'))),
    'OFL-SourceSerif4.txt': sha256(readFileSync(path.join(out, 'OFL-SourceSerif4.txt'))),
    'OFL-JuliaMono.txt': sha256(readFileSync(path.join(out, 'OFL-JuliaMono.txt'))),
  },
  faces,
  fallbacks,
  files: plan.outputs.map((o) => {
    const r = outputOf(o.file)
    const bytes = readFileSync(path.join(out, o.file))
    return {
      file: o.file,
      sha256: sha256(bytes),
      bytes: bytes.length,
      source: relSource(o.source),
      sourceSha256: sourceOf(o.source)?.members?.[path.basename(o.source)] ?? sourceOf(o.source)?.sha256,
      axes: o.axes ?? {},
      variationAxes: r.axes,
      glyphs: r.glyphs,
      codepointsKept: r.kept,
      codepointsAbsentFromFace: r.missing.length,
      metrics: r.metrics,
    }
  }),
}
writeFileSync(path.join(out, 'fonts.json'), `${JSON.stringify(manifest, null, 2)}\n`)

const TOKENS = path.join(REPO, 'apps', 'site', 'src', 'styles', 'tokens.css')
const BLOCK = /\/\* @font-face: generated[\s\S]*?\/\* @font-face end \*\//
const tokens = readFileSync(TOKENS, 'utf8')
if (!BLOCK.test(tokens)) throw new Error('tokens.css lost its generated @font-face markers')

if (check) {
  let bad = 0
  for (const f of [...manifest.files.map((x) => x.file), 'OFL-Jost.txt', 'OFL-SourceSerif4.txt', 'OFL-JuliaMono.txt', 'fonts.json']) {
    const a = existsSync(path.join(OUT, f)) ? sha256(readFileSync(path.join(OUT, f))) : 'absent'
    const b = sha256(readFileSync(path.join(out, f)))
    if (a !== b) {
      bad += 1
      console.error(`differs: ${f} committed ${a}, rebuilt ${b}`)
    }
  }
  if (tokens.match(BLOCK)?.[0] !== css) {
    bad += 1
    console.error('differs: the @font-face block of tokens.css')
  }
  console.log(bad === 0 ? 'fonts: the committed subsets, manifest and @font-face block equal a rebuild' : `fonts: ${bad} difference(s) from a rebuild`)
  process.exit(bad === 0 ? 0 : 1)
}
writeFileSync(TOKENS, tokens.replace(BLOCK, css))
for (const f of manifest.files) console.log(`${f.file}\t${f.bytes} B\t${f.glyphs} glyphs\t${f.codepointsKept} code points (${f.codepointsAbsentFromFace} not in the face)`)
for (const fb of fallbacks) console.log(`${fb.family}\tsize-adjust ${fb.sizeAdjust}\tascent ${fb.ascentOverride}\tdescent ${fb.descentOverride}\tline gap ${fb.lineGapOverride}`)
