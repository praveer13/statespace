// Records RUN-juliamono-glyphs: JuliaMono's glyph coverage against the course's own content (DESIGN.md section
// 3.1: "W0-S12 re-records coverage against the course's own content"). The corpus is the committed tree at HEAD:
// README.md, docs/*.md, docs/spine/*.md, curriculum/*.md, labs/*.md and tracker/README.md. docs/history,
// design/canvas and research/ are history or evidence, not course content.
//   TMPDIR=<scratch> node scripts/spikes/W0-S12/record-juliamono.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  REPO, environment, exec, fetchPinned, gitHead, must, scratch, sha256, sha256File, writeOutput, writeRun,
} from './lib.mjs'

const ID = 'RUN-juliamono-glyphs'
const URL = 'https://github.com/cormullion/juliamono/releases/download/v0.63.2/JuliaMono-ttf.tar.gz'
const TAR_SHA256 = 'be6517295198ec5c92bdbaad42f4f6f8d83f921d80512b79f54fe036add95c0c'
const FONTTOOLS = '4.67.0'

const work = scratch('juliamono')
const dl = path.join(work, 'dl')
mkdirSync(dl)
const tar = path.join(dl, 'JuliaMono-ttf.tar.gz')
const asset = fetchPinned(URL, TAR_SHA256, tar)
const fonts = path.join(work, 'fonts')
mkdirSync(fonts)
must('tar', ['xzf', tar, '-C', fonts])
const regular = path.join(fonts, 'JuliaMono-Regular.ttf')
const semibold = path.join(fonts, 'JuliaMono-SemiBold.ttf')
const licenseSha = sha256File(path.join(fonts, 'LICENSE'))

// the corpus: committed text only, so the record names a commit and not a working tree
const commit = gitHead()
const tracked = must('git', ['-C', REPO, 'ls-tree', '-r', '--name-only', commit]).stdout.split('\n').filter(Boolean)
const inCorpus = (p) => p === 'README.md' || p === 'tracker/README.md' || /^(docs|docs\/spine|curriculum|labs)\/[^/]+\.md$/.test(p)
const paths = tracked.filter(inCorpus).sort()
const corpus = {}
const manifest = []
for (const p of paths) {
  const text = must('git', ['-C', REPO, 'show', `${commit}:${p}`]).stdout
  corpus[p] = text
  manifest.push(`${sha256(Buffer.from(text))}  ${p}`)
}
const corpusFile = path.join(work, 'corpus.json')
writeFileSync(corpusFile, JSON.stringify(corpus))
const manifestOut = writeOutput(ID, 'corpus.txt', `${manifest.join('\n')}\n`, 'corpus manifest', 'bytes')

const argv = ['uv', 'run', '--no-project', '--with', `fonttools==${FONTTOOLS}`, 'python', '-I', 'scripts/spikes/W0-S12/glyph-coverage.py', '<corpus.json>', '<JuliaMono-Regular.ttf>', '<JuliaMono-SemiBold.ttf>']
const run = exec('uv', ['run', '--no-project', '--with', `fonttools==${FONTTOOLS}`, 'python', '-I', path.join(REPO, 'scripts/spikes/W0-S12/glyph-coverage.py'), corpusFile, regular, semibold], { cwd: work })
if (run.status !== 0) throw new Error(`glyph-coverage.py exited ${run.status}\n${run.stderr}`)
const result = JSON.parse(run.stdout)
const { rows, ...summary } = result

const tsv = [
  ['codepoint', 'char', 'name', 'category', 'notation_block', 'in_code', 'in_prose', 'in_speech_map', 'in_review_sample', 'regular', 'semibold'].join('\t'),
  ...rows.map((r) => [r.codepoint, r.char, r.name, r.category, r.notation_block ?? '', r.in_code, r.in_prose, r.in_speech_map, r.in_review_sample, r.regular, r.semibold].join('\t')),
].join('\n')
const table = writeOutput(ID, 'codepoints.tsv', `${tsv}\n`, 'code point table', 'bytes')
const summaryOut = writeOutput(ID, 'summary.json', `${JSON.stringify(summary, null, 2)}\n`, 'coverage summary', 'bytes')

const f = summary.font
const verdict = [
  `JuliaMono ${f.version_string.split(';')[0]}: regular ${f.regular_cmap_codepoints} code points in ${f.regular_glyphs} glyphs, semibold ${f.semibold_cmap_codepoints} in ${f.semibold_glyphs}; fixed pitch ${f.is_fixed_pitch}`,
  `speech map (DESIGN.md 10.6): ${summary.speech_map.symbols} symbols, ${summary.speech_map.missing_regular.length} missing in regular, ${summary.speech_map.missing_semibold.length} in semibold`,
  `symbols named by the design review (A7-15): ${summary.review_named.symbols}, ${summary.review_named.missing_regular.length} missing in regular, ${summary.review_named.missing_semibold.length} in semibold`,
  `course code spans and blocks: ${summary.code_role.distinct_non_ascii} distinct non-ASCII code points (${summary.code_role.occurrences} occurrences), ${summary.code_role.missing_regular.length} missing in regular, ${summary.code_role.missing_semibold.length} in semibold`,
  `course prose: ${summary.prose_role.distinct_non_ascii} distinct non-ASCII code points (${summary.prose_role.occurrences} occurrences); ${summary.prose_role.notation_symbols} are logic or math notation (${summary.prose_role.notation_occurrences} occurrences), ${summary.prose_role.notation_missing_regular.length} of those missing in regular`,
  `advance widths of the covered symbols (units of ${f.units_per_em} per em): ${Object.entries(summary.advance_widths).map(([w, n]) => `${w} x${n}`).join(', ')}`,
]

writeRun(ID, {
  id: ID,
  title: 'JuliaMono v0.63.2: glyph coverage against the course\'s own content',
  engine: 'juliamono',
  version: f.version_string,
  binary: 'JuliaMono-Regular.ttf from the v0.63.2 release',
  binary_sha256: sha256File(regular),
  image: null,
  recorded_at: new Date().toISOString(),
  started_at: run.started_at,
  argv,
  inputs: [
    { url: URL, sha256: asset.sha256, bytes: asset.bytes, kind: 'release asset', committed: false },
    { name: 'JuliaMono-Regular.ttf', sha256: sha256File(regular), kind: 'font, regular' },
    { name: 'JuliaMono-SemiBold.ttf', sha256: sha256File(semibold), kind: 'font, semibold' },
    { path: manifestOut.path, sha256: manifestOut.sha256, bytes: manifestOut.bytes, kind: `corpus manifest: ${paths.length} files of the tree at ${commit}` },
  ],
  budget: { network: 'download only', timeout_s: 120 },
  exit_code: run.status,
  duration_s: run.duration_s,
  verdict_lines: verdict,
  outputs: [table, summaryOut],
  values: {
    version: f.version_string.split(';')[0],
    release: 'v0.63.2',
    license: 'SIL Open Font License 1.1',
    license_sha256: licenseSha,
    regular_codepoints: f.regular_cmap_codepoints,
    regular_glyphs: f.regular_glyphs,
    semibold_codepoints: f.semibold_cmap_codepoints,
    speech_map_symbols: summary.speech_map.symbols,
    speech_map_missing: summary.speech_map.missing_regular,
    review_named_symbols: summary.review_named.symbols,
    review_named_missing: summary.review_named.missing_regular,
    course_commit: commit,
    corpus_files: paths.length,
    code_codepoints: summary.code_role.distinct_non_ascii,
    code_missing_regular: summary.code_role.missing_regular,
    code_missing_semibold: summary.code_role.missing_semibold,
    prose_codepoints: summary.prose_role.distinct_non_ascii,
    prose_notation_symbols: summary.prose_role.notation_symbols,
    prose_notation_missing_regular: summary.prose_role.notation_missing_regular,
    advance_widths: summary.advance_widths,
    fonttools: f.fonttools,
    python: f.python,
  },
  environment: environment(null, { python: f.python, fonttools: f.fonttools }),
  notes: [
    'The face is the subject of this run: version_string is the font\'s own name-table string, binary_sha256 is the hash of JuliaMono-Regular.ttf, and the SemiBold file is hashed in inputs. fontTools reads the cmap tables and the advance widths; nothing renders.',
    'The corpus is the committed tree at the commit named in values.course_commit, not the working tree. No lesson, specimen, audit case, claim or goal strip exists yet, so the course\'s own content today is its authoring documents; GATE-glyphs (W1) runs the same check on the shipped content, and W6-T03 re-records this run against it.',
    'code role means a fenced block or an inline code span, which the design sets in JuliaMono. prose role is everything else, set in Archivo or Source Serif 4, which lack the logic symbols (A7-15). DESIGN.md section 3.3 asks that no logic symbol be set there, so prose_notation_symbols measures how much notation sits outside code spans in today\'s authoring documents. Those documents are not shipped copy; the count is information for GATE-glyphs\' rule on the serif (spine issues, item 7), not a failure.',
    'The design review (A7-15) sampled 49 Lean and TLA+ symbols and found none missing from JuliaMono v0.63.2. Only 27 of those 49 are named on disk, so this run checks those 27 and does not claim to reproduce the 49.',
    'The corpus holds the course\'s own text only: README.md, docs/*.md, docs/spine/*.md, curriculum/*.md, labs/*.md and tracker/README.md. docs/history, design/canvas and research are history and evidence. corpus.txt lists each file with its SHA-256.',
  ],
})
console.log(verdict.join('\n'))
