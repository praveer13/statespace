#!/usr/bin/env node
/**
 * GATE-privacy: publication hygiene for the public repository (spine §11.2; I9, OD-5, OD-11, OD-16;
 * task W0-T01). Dependency-free; Node 22.
 *
 * What it scans. Every published path: tracked files plus untracked files that .gitignore does not
 * exclude, so research/ and docs/history/ are included. It reads file names as well as contents,
 * printable strings inside binary files, and the target of a symbolic link rather than the file it
 * points to. Given paths (an unpacked lab zip, a stuck-output fixture), it scans those instead.
 *
 * What fails it.
 *   private-term    a private-design term or a personal identifier from the hashed term list
 *   email           an email address, unless a public role address below or a reserved example domain
 *   private-path    a home directory, a per-user temporary directory or an agent session directory
 *   account-id      a shell prompt that names a user and a host
 *   credential      an access token or a private key
 *   course-domain   a real host for the instrument origin; committed files write <course-domain> (OD-5)
 *   your-system     learner-facing copy that names the learner's product instead of "your system" (I9)
 *   review-json     a raw review JSON, by name or by fingerprint, in the tree or in git history (OD-11)
 *   vendor-license  a vendored directory without its own license file
 *
 * What it allows. Everywhere: the redaction marker "[redacted: private design detail]", the generic
 * phrase "private design", and the roadmap's names Mini-Plinth, miniplinth, mini-plinth-core and
 * MiniPlinthRef (OD-2). For private-design terms: the roadmap's own wording (the roadmap itself, and
 * quotations of it at least three words long) and v1's wording inside docs/history/ and
 * design/canvas/. For names and handles: the copyright line of a license file, which the license
 * requires us to keep.
 *
 * Warnings, which --strict turns into failures: no hashed term list in the environment; fewer than
 * two course licenses at the root (OD-16, open for the owner); a .gitignore that no longer excludes
 * the review JSONs. The release lane, and the push lane once the owner has set the CI secrets, run
 * with --strict.
 *
 * The term list. The public repository never spells out the private-design terms or the owner's
 * identifiers. They live in CI configuration as keyed hashes (HMAC-SHA-256 over normalized words), so
 * the list reveals nothing without its key, and the gate never prints a matched term in CI:
 *   STATESPACE_PRIVACY_TERMS       the hashed list, as printed by --hash-terms (a CI secret)
 *   STATESPACE_PRIVACY_KEY         its HMAC key (a second CI secret)
 *   STATESPACE_PRIVACY_TERMS_FILE  for local runs: a plaintext or hashed list kept outside the repository
 *   STATESPACE_COURSE_DOMAIN       the course domain (a CI variable), checked as a personal domain
 * A plaintext list holds one term per line, `[kind[+substring]:] words [| allow=prefix,prefix]`, where
 * kind is design (the default), person, account or domain; +substring also matches inside longer
 * words; allow= names repository paths where the term may appear; a line starting with # is a comment.
 * Words match case-insensitively, across camelCase, hyphens, punctuation and line breaks, and with a
 * plural -s or -es.
 *
 * Local identity. Outside CI (CI unset), the gate also looks for whoever runs it: the operating-system
 * account name, git's user.name as a whole name, and the local part of git's user.email, skipping
 * generic names such as root, runner and vscode. It reads them at run time and writes them nowhere; a
 * match prints its text only on a terminal, never under --json or in CI. A term list's entry for the
 * same words takes precedence, allow= included. STATESPACE_PRIVACY_LOCAL_IDENTITY=0 turns this off.
 *
 * Vendored directories are the children of any vendor/ or third_party/ directory, any directory that
 * holds a VENDOR.md, and any directory that holds font files. Each carries a LICENSE*, LICENCE*,
 * COPYING*, OFL* or LICENSES/ file of its own.
 *
 * Usage:
 *   node scripts/verify-privacy.mjs [--strict] [--json] [--verbose] [--root <dir>]
 *   node scripts/verify-privacy.mjs [--learner-facing] [--json] <file-or-directory>...
 *   node scripts/verify-privacy.mjs --self-test
 *   node scripts/verify-privacy.mjs --hash-terms <plaintext-list-outside-the-repository>
 * Exit codes: 0 green, 1 problems found, 2 usage or configuration error.
 */
import { spawnSync } from 'node:child_process'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROADMAP = 'research/context/roadmap.md'
const HISTORY = ['docs/history/', 'design/canvas/']
const LEARNER_FACING = /^(?:README\.md$|(?:labs|content|apps|packages|bench)\/)/
const MAX_BYTES = 64 * 1024 * 1024
const LONG_WORD = 128 // longer runs are data (hashes, base64), not words: no camelCase or substring split
const TERMS_SCHEMA = 'statespace/privacy-terms@1'
const KINDS = {
  design: 'a private-design term',
  person: 'a personal name',
  account: 'an account identifier',
  domain: 'a personal domain',
}

// The roadmap names its toy language Mini-Plinth, and the learner's product is that name without its
// prefix. Building both patterns from the roadmap's name keeps the bare word out of this file (OD-2).
const TOY = 'Mini-Plinth'
const PRODUCT = TOY.slice(TOY.indexOf('-') + 1)
const ROADMAP_NAMES = new RegExp(`\\bmini[-_]?${PRODUCT}`, 'gi')
const PRODUCT_WORD = new RegExp(PRODUCT, 'gi')

/** Spans allowed everywhere; they are blanked before the term scan. */
const ALLOWED_SPANS = [/\[redacted: private design detail\]/gi, /\bprivate[\s-]+design\b/gi, ROADMAP_NAMES]

const EMAIL = /[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}(?![A-Za-z0-9-])/g
/** Public role addresses that may appear, each with the reason it is not personal. */
const EMAIL_ALLOW = new Map([
  ['security@lean-fro.org', "the Lean FRO's published security contact"],
  ['npm-oidc-no-reply@github.com', "npm's trusted-publishing address in saved registry metadata"],
  ['git@github.com', 'the SSH remote user, not a mailbox'],
])
const RESERVED = /(?:^|\.)(?:example\.(?:com|net|org)|example|test|invalid|localhost)$/i

/** Account names that identify nobody: container, CI and devcontainer users, and placeholders. */
const GENERIC_NAMES = new Set(
  (
    'root runner vscode codespace codespaces node pwuser ubuntu user ci builder gitpod coder dev lean postgres nobody app shared public default ' +
    'you me username yourname your-name name example someone somebody alice bob jdoe foo bar test tester demo guest student learner'
  ).split(' '),
)
const isGenericAccount = (name) => name.length === 1 || GENERIC_NAMES.has(name.toLowerCase())
/** CI=true in GitHub Actions; CI=0 or CI=false count as unset. */
const inCI = (env) => Boolean(env.CI) && !/^(?:0|false)$/i.test(env.CI)
const OFF = /^(?:0|false|no|off)$/i
const PATH_RULES = [
  { re: /(?<![\w.~-])\/home\/([A-Za-z0-9._-]+)/g, what: 'a home directory' },
  { re: /(?<![\w.~-])\/Users\/([A-Za-z0-9._-]+)/g, what: 'a home directory' },
  { re: /(?<![\w.~-])\/mnt\/[a-z]\/Users\/([A-Za-z0-9._-]+)/gi, what: 'a home directory' },
  { re: /\b[A-Za-z]:[\\/]+Users[\\/]+([A-Za-z0-9._-]+)/g, what: 'a home directory' },
  { re: /(?<![\w.~-])\/tmp\/claude-[\w.-]*/g, what: 'an agent session directory' },
  { re: /(?<![\w.~-])(?:\/private)?\/var\/folders\/[\w+-]{2}\/[\w+-]+/g, what: 'a per-user temporary directory' },
]
const PROMPT = /(?<![\w.@-])([a-z_][a-z0-9_.-]{0,31})@([A-Za-z0-9][A-Za-z0-9-]{0,62}):(?:~|\/)\S*?[$#](?=\s|$)/gm
const CREDENTIALS = [
  [/\bgh[pousr]_[A-Za-z0-9]{36,}/g, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}/g, 'a GitHub token'],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, 'an AWS access key id'],
  [/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g, 'a private key'],
  [/\bxox[abposr]-[A-Za-z0-9-]{10,}/g, 'a Slack token'],
  [/\bsk-(?:ant|proj)-[A-Za-z0-9_-]{20,}/g, 'an API key'],
  [/\bnpm_[A-Za-z0-9]{36}\b/g, 'an npm token'],
  [/\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g, 'a Google API key'],
]
const INSTRUMENT_URL =
  /\b(?:https?|wss?):\/\/instruments\.((?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24})(?![A-Za-z0-9-])/g

/**
 * The two merged review JSONs (OD-11), fingerprinted from the provenance lines of the digests that
 * replace them: byte size, SHA-256 prefix and suffix. A renamed copy still matches.
 */
const REVIEW_FINGERPRINTS = [
  { name: 'review-merged-1.json', bytes: 304452, prefix: '6dbc5446', suffix: '183202', source: 'research/synthesis/digest-review-1.md' },
  { name: 'review-merged-2.json', bytes: 309739, prefix: 'ca46d4fa', suffix: '02f79', source: 'research/synthesis/digest-review-2.md' },
]
const REVIEW_IGNORE_PROBES = ['research/review-merged-1.json', 'research/reviews/review-merged-2.json', 'research/reviews/A1-fidelity.json']

const LICENSE_FILE = /^(?:licen[cs]e|copying|unlicense|ofl)(?:[-_. ][\w. -]*)?$/i
const COPYRIGHT = /copyright|\(c\)|©/i
const VENDOR_DIR = /^(?:vendor|third[-_]party)$/i
const FONT_FILE = /\.(?:woff2?|ttf|otf)$/i

class ConfigError extends Error {}

const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const mac = (key, s) => createHmac('sha256', key).update('statespace-privacy-v1\0').update(s).digest('hex')
const keyCheck = (key) => mac(key, '\0key-check').slice(0, 16)
const NONE = Object.freeze([])
const WORD = /[\p{L}\p{N}]+/gu
const norm = (w) => w.normalize('NFKC').toLowerCase()
const isLicenseFile = (p) => LICENSE_FILE.test(basename(p))

// ---------------------------------------------------------------------------------------------
// Words

/** Words in text order: { t: normalized, s: start, e: end, main: index }. */
function tokenize(text) {
  const out = []
  for (const m of text.matchAll(WORD)) out.push({ raw: m[0], t: norm(m[0]), s: m.index, e: m.index + m[0].length, main: out.length })
  return out
}

/** camelCase and letter-digit boundaries: MiniParser2 → Mini, Parser, 2. */
function splitCamel(raw) {
  if (raw.length > LONG_WORD) return [raw]
  return raw
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1\0$2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1\0$2')
    .replace(/(\p{L})(\p{N})/gu, '$1\0$2')
    .replace(/(\p{N})(\p{L})/gu, '$1\0$2')
    .split('\0')
}

/** The same words with camelCase split, or null when nothing splits. */
function subStream(main) {
  let split = false
  const out = []
  for (const tok of main) {
    const parts = splitCamel(tok.raw)
    if (parts.length === 1) {
      out.push(tok)
      continue
    }
    split = true
    let off = tok.s
    for (const p of parts) {
      out.push({ raw: p, t: norm(p), s: off, e: off + p.length, main: tok.main })
      off += p.length
    }
  }
  return split ? out : null
}

function maskSpans(text) {
  let out = text
  for (const re of ALLOWED_SPANS) out = out.replace(re, (m) => ' '.repeat(m.length))
  return out
}

const canonicalWords = (text) => tokenize(text).map((x) => x.t)
const roadmapIndex = (text) => ` ${canonicalWords(text).join(' ')} `

/** True when a window of at least three words around words i..j, and one word wider than the hit, occurs in the roadmap. */
function isRoadmapQuote(main, i, j, index) {
  if (!index) return false
  const w = Math.max(3, j - i + 2)
  for (let s = j - w + 1; s <= i; s++) {
    if (s < 0 || s + w > main.length) continue
    let q = ' '
    for (let k = s; k < s + w; k++) q += `${main[k].t} `
    if (index.includes(q)) return true
  }
  return false
}

function tokenIndexAt(main, offset) {
  let lo = 0
  let hi = main.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (main[mid].e <= offset) lo = mid + 1
    else if (main[mid].s > offset) hi = mid - 1
    else return mid
  }
  return -1
}

function lineAt(text, offset) {
  const a = text.lastIndexOf('\n', offset - 1) + 1
  const b = text.indexOf('\n', offset)
  return text.slice(a, b < 0 ? text.length : b)
}

function locator(text) {
  let starts = null
  return (offset) => {
    if (!starts) {
      starts = [0]
      for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) starts.push(i + 1)
    }
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return { line: lo + 1, col: offset - starts[lo] + 1 }
  }
}

// ---------------------------------------------------------------------------------------------
// The hashed term list

class TermMatcher {
  /** Terms with the same hash keep the last one given. */
  constructor(key, terms) {
    this.key = key
    this.byHash = new Map(terms.map((t) => [t.h, t]))
    this.count = this.byHash.size
    this.anchors = new Map() // hash of a first word → the word counts of the terms it starts
    for (const t of terms) {
      if (t.n < 2) continue
      if (!this.anchors.has(t.first)) this.anchors.set(t.first, new Set())
      this.anchors.get(t.first).add(t.n)
    }
    this.subLens = [...new Set(terms.filter((t) => t.substring).map((t) => t.len))]
    this.words = new Map()
  }

  /** One word: its hash, and the one-word terms it matches exactly, as a plural, or as a substring. */
  word(w) {
    let entry = this.words.get(w)
    if (entry) return entry
    const h = mac(this.key, w)
    const found = new Set()
    const exact = (hash) => {
      const t = this.byHash.get(hash)
      if (t && t.n === 1) found.add(t)
    }
    exact(h)
    if (w.length > 3 && w.endsWith('s')) exact(mac(this.key, w.slice(0, -1)))
    if (w.length > 4 && w.endsWith('es')) exact(mac(this.key, w.slice(0, -2)))
    if (w.length <= LONG_WORD) {
      for (const len of this.subLens) {
        for (let j = 0; j + len <= w.length && len < w.length; j++) {
          const t = this.byHash.get(mac(this.key, w.slice(j, j + len)))
          if (t?.substring) found.add(t)
        }
      }
    }
    entry = { h, single: found.size ? [...found] : NONE }
    this.words.set(w, entry)
    return entry
  }

  /** Hits over one word stream: { term, i, j } with stream indices. */
  match(stream) {
    const hits = []
    for (let i = 0; i < stream.length; i++) {
      const { h, single } = this.word(stream[i].t)
      for (const term of single) hits.push({ term, i, j: i })
      const ns = this.anchors.get(h)
      if (!ns) continue
      for (const n of ns) {
        if (i + n > stream.length) continue
        let s = stream[i].t
        for (let k = i + 1; k < i + n; k++) s += ` ${stream[k].t}`
        const term = this.byHash.get(mac(this.key, s))
        if (term && term.n === n) hits.push({ term, i, j: i + n - 1 })
      }
    }
    return hits
  }
}

/** A plaintext list → [{ kind, words, substring, allow }]. */
function parsePlainTerms(text) {
  const terms = []
  text.split(/\r?\n/).forEach((line, n) => {
    let rest = line.trim()
    if (!rest || rest.startsWith('#')) return
    let allow = []
    const a = rest.match(/^(.*?)\s+\|\s*allow=(\S+)\s*$/)
    if (a) {
      rest = a[1]
      allow = a[2].split(',').filter(Boolean)
    }
    const k = rest.match(/^(design|person|account|domain)(\+substring)?\s*:\s*(.+)$/i)
    const words = canonicalWords(k ? k[3] : rest)
    const substring = Boolean(k?.[2])
    if (!words.length) throw new ConfigError(`term list line ${n + 1}: no words`)
    if (substring && words.length !== 1) throw new ConfigError(`term list line ${n + 1}: +substring needs a one-word term`)
    terms.push({ kind: k ? k[1].toLowerCase() : 'design', words, substring, allow })
  })
  return terms
}

function hashTerm(key, { kind, words, substring, allow }) {
  const t = { h: mac(key, words.join(' ')), n: words.length, kind }
  if (words.length > 1) t.first = mac(key, words[0])
  if (substring) Object.assign(t, { substring: true, len: words[0].length })
  if (allow?.length) t.allow = allow
  return t
}

function hashedDocument(key, plain) {
  return { schema: TERMS_SCHEMA, alg: 'hmac-sha256', keyId: keyCheck(key), terms: plain.map((t) => hashTerm(key, t)) }
}

function parseHashedList(text, origin) {
  let doc
  try {
    doc = JSON.parse(text)
  } catch {
    throw new ConfigError(`${origin} is not JSON; produce it with --hash-terms`)
  }
  // keyId is required: under a wrong key nothing would match, and the check would pass without checking
  if (doc?.schema !== TERMS_SCHEMA || doc.alg !== 'hmac-sha256' || !/^[0-9a-f]{16}$/.test(doc.keyId ?? '') || !Array.isArray(doc.terms)) {
    throw new ConfigError(`${origin} is not a ${TERMS_SCHEMA} list with alg hmac-sha256 and a keyId`)
  }
  const hex = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s)
  doc.terms.forEach((t, i) => {
    const ok =
      hex(t?.h) &&
      Number.isInteger(t.n) &&
      t.n >= 1 &&
      t.kind in KINDS &&
      (t.n === 1 || hex(t.first)) &&
      (!t.substring || (t.n === 1 && Number.isInteger(t.len) && t.len > 0)) &&
      (t.allow === undefined || (Array.isArray(t.allow) && t.allow.every((p) => typeof p === 'string')))
    if (!ok) throw new ConfigError(`${origin}: term ${i} is malformed`)
  })
  return doc
}

function insideRoot(root, abs) {
  const real = (p) => {
    try {
      return realpathSync(p)
    } catch {
      return resolve(p)
    }
  }
  const rel = relative(real(root), real(abs))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

const expandHome = (p) => (p === '~' || p.startsWith(`~${sep}`) || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p)

/** Who runs the gate: the operating-system account and git's user.name and user.email, each null when unknown. */
function localIdentity(root) {
  let username = null
  try {
    username = userInfo().username
  } catch {}
  const config = (k) => {
    const r = git(root, ['config', '--get', k])
    return !r.error && r.status === 0 ? r.stdout.toString('utf8').trim() || null : null
  }
  return { username, gitName: config('user.name'), gitEmail: config('user.email') }
}
const NO_IDENTITY = () => ({})

/** Plaintext terms for a local identity, skipping names that identify nobody. */
function identityTerms({ username, gitName, gitEmail } = {}) {
  const terms = []
  const add = (kind, value, from) => {
    const words = value ? canonicalWords(value) : []
    const joined = words.join('')
    if (joined.length < 3 || isGenericAccount(joined) || isGenericAccount(words.join('-')) || words.every(isGenericAccount)) return
    terms.push({ kind, words, substring: false, allow: [], from })
  }
  add('account', username, 'matching your operating-system account name')
  add('person', gitName, 'matching your git user.name')
  if (gitEmail?.includes('@')) add('account', gitEmail.slice(0, gitEmail.lastIndexOf('@')), 'matching the local part of your git user.email')
  return terms
}

/**
 * The term list from the environment, plus the local identity outside CI:
 * { matcher, count, listed, identity, sources }. Throws ConfigError on a bad list or key.
 */
function loadTerms(env, root, identity = localIdentity) {
  const sources = []
  const plain = []
  const hashed = []
  if (env.STATESPACE_PRIVACY_TERMS) {
    hashed.push(parseHashedList(env.STATESPACE_PRIVACY_TERMS, 'STATESPACE_PRIVACY_TERMS'))
    sources.push('STATESPACE_PRIVACY_TERMS')
  }
  if (env.STATESPACE_PRIVACY_TERMS_FILE) {
    const abs = resolve(expandHome(env.STATESPACE_PRIVACY_TERMS_FILE))
    if (insideRoot(root, abs)) throw new ConfigError('STATESPACE_PRIVACY_TERMS_FILE points inside the repository; keep the term list outside it')
    let text
    try {
      text = readFileSync(abs, 'utf8')
    } catch {
      throw new ConfigError('STATESPACE_PRIVACY_TERMS_FILE cannot be read')
    }
    if (text.trimStart().startsWith('{')) hashed.push(parseHashedList(text, 'STATESPACE_PRIVACY_TERMS_FILE'))
    else plain.push(...parsePlainTerms(text))
    sources.push('STATESPACE_PRIVACY_TERMS_FILE')
  }
  const listed = plain.length + hashed.reduce((n, d) => n + d.terms.length, 0)
  if (env.STATESPACE_COURSE_DOMAIN) {
    const words = canonicalWords(env.STATESPACE_COURSE_DOMAIN)
    if (words.length) plain.push({ kind: 'domain', words, substring: false, allow: [], from: 'from STATESPACE_COURSE_DOMAIN' })
    sources.push('STATESPACE_COURSE_DOMAIN')
  }
  const local = inCI(env) || OFF.test(env.STATESPACE_PRIVACY_LOCAL_IDENTITY ?? '') ? [] : identityTerms(identity(root))
  if (local.length) sources.push('local identity')
  if (!hashed.length && !plain.length && !local.length) return { matcher: null, count: 0, listed, identity: 0, sources }
  let key = env.STATESPACE_PRIVACY_KEY || null
  if (hashed.length && !key) throw new ConfigError('a hashed term list needs STATESPACE_PRIVACY_KEY')
  for (const doc of hashed) {
    if (doc.keyId !== keyCheck(key)) throw new ConfigError('STATESPACE_PRIVACY_KEY does not match the hashed term list')
  }
  key ??= randomBytes(32) // plaintext terms only: hashed in memory under a one-off key
  // The local identity goes first, so a list's entry for the same words, with its allow=, takes precedence
  const terms = [
    ...local.map((t) => ({ ...hashTerm(key, t), from: t.from })),
    ...plain.map((t) => ({ ...hashTerm(key, t), from: t.from ?? 'from the term list' })),
    ...hashed.flatMap((d) => d.terms.map((t) => ({ ...t, from: 'from the hashed term list' }))),
  ]
  const matcher = new TermMatcher(key, terms)
  return { matcher, count: matcher.count, listed, identity: local.length, sources }
}

// ---------------------------------------------------------------------------------------------
// Scanning

const newReport = () => ({ findings: [], warnings: [], notes: [], allowed: [] })

function makeContext({ root = SCRIPT_ROOT, matcher = null, roadmapText = null, reveal = false, learnerFacingAll = false, strict = false } = {}) {
  return {
    root,
    matcher,
    reveal,
    learnerFacingAll,
    strict,
    roadmapRaw: roadmapText ? roadmapIndex(roadmapText) : null,
    roadmapMasked: roadmapText ? roadmapIndex(maskSpans(roadmapText)) : null,
  }
}

/**
 * Scan one text. `how` is 'text', 'binary' (printable strings of a binary file, no lines) or 'name'
 * (the path itself).
 */
function scanText(path, text, ctx, out, how = 'text') {
  const loc = how === 'text' ? locator(text) : null
  const at = (offset) => (loc ? loc(offset) : { in: how })
  const add = (check, offset, message, excerpt) =>
    out.findings.push({ check, path, ...at(offset), message, ...(excerpt ? { excerpt } : {}) })
  const allow = (check, offset, reason) => out.allowed.push({ check, path, ...at(offset), reason })

  for (const m of text.matchAll(EMAIL)) {
    const addr = m[0].toLowerCase()
    const domain = addr.slice(addr.lastIndexOf('@') + 1)
    if (EMAIL_ALLOW.has(addr)) allow('email', m.index, EMAIL_ALLOW.get(addr))
    else if (RESERVED.test(domain)) allow('email', m.index, 'a reserved example domain')
    else if (isLicenseFile(path) && COPYRIGHT.test(lineAt(text, m.index))) allow('email', m.index, 'the copyright line of a license file')
    else add('email', m.index, 'an email address', m[0])
  }
  for (const rule of PATH_RULES) {
    for (const m of text.matchAll(rule.re)) {
      if (m[1] && isGenericAccount(m[1])) continue
      add('private-path', m.index, rule.what, m[0])
    }
  }
  for (const m of text.matchAll(PROMPT)) {
    if (!isGenericAccount(m[1])) add('account-id', m.index, 'a shell prompt naming a user and a host', m[0])
  }
  for (const [re, what] of CREDENTIALS) {
    for (const m of text.matchAll(re)) add('credential', m.index, what, `${m[0].slice(0, 4)}…`)
  }
  for (const m of text.matchAll(INSTRUMENT_URL)) {
    if (!RESERVED.test(m[1])) add('course-domain', m.index, 'a real host for the instrument origin; committed files write <course-domain> (OD-5)', m[0])
  }
  if (how !== 'binary' && (ctx.learnerFacingAll || LEARNER_FACING.test(path))) checkYourSystem(text, ctx, add, allow)
  if (ctx.matcher) checkTerms(path, text, ctx, add, allow)
}

/** I9 and OD-2: learner-facing copy says "your system"; only the roadmap's names and quotations keep the word. */
function checkYourSystem(text, ctx, add, allow) {
  let main = null
  for (const m of text.matchAll(PRODUCT_WORD)) {
    if (/mini[-_]?$/i.test(text.slice(Math.max(0, m.index - 5), m.index))) continue
    main ??= tokenize(text)
    const i = tokenIndexAt(main, m.index)
    if (i >= 0 && isRoadmapQuote(main, i, i, ctx.roadmapRaw)) {
      allow('your-system', m.index, 'a quotation of the roadmap')
      continue
    }
    const context = text.slice(Math.max(0, m.index - 24), m.index + PRODUCT.length + 24).replace(/\s+/g, ' ').trim()
    add('your-system', m.index, 'learner-facing copy names the learner\'s product; write "your system" (I9) or a roadmap name (OD-2)', context)
  }
}

function checkTerms(path, text, ctx, add, allow) {
  const main = tokenize(maskSpans(text))
  const hits = ctx.matcher.match(main).map((h) => ({ ...h, stream: main }))
  const sub = subStream(main)
  if (sub) for (const h of ctx.matcher.match(sub)) hits.push({ ...h, stream: sub })
  const seen = new Set()
  for (const { term, i, j, stream } of hits) {
    const s = stream[i].s
    const e = stream[j].e
    const id = `${s}:${term.h}`
    if (seen.has(id)) continue
    seen.add(id)
    const why = termAllowance(path, text, s, term, main, stream[i].main, stream[j].main, ctx)
    if (why) {
      allow('private-term', s, why)
      continue
    }
    const excerpt = ctx.reveal ? text.slice(s, e) : `#${term.h.slice(0, 8)}`
    add('private-term', s, `${KINDS[term.kind]} ${term.from ?? 'from the term list'}`, excerpt)
  }
}

function termAllowance(path, text, offset, term, main, mi, mj, ctx) {
  if (term.allow?.some((p) => path === p || path.startsWith(p))) return 'allowed for this path by the term list'
  if (term.kind === 'design') {
    if (path === ROADMAP) return "the roadmap's own wording"
    if (HISTORY.some((p) => path.startsWith(p))) return "v1's wording inside docs/history/ or design/canvas/"
    if (isRoadmapQuote(main, mi, mj, ctx.roadmapMasked)) return 'a quotation of the roadmap'
  }
  if ((term.kind === 'person' || term.kind === 'account') && isLicenseFile(path) && COPYRIGHT.test(lineAt(text, offset))) {
    return 'the copyright line of a license file'
  }
  return null
}

/** Printable ASCII runs of six or more bytes, one per line. */
function printableStrings(buf) {
  const out = []
  let start = -1
  for (let i = 0; i <= buf.length; i++) {
    const c = i < buf.length ? buf[i] : 0
    if (c === 9 || (c >= 32 && c < 127)) {
      if (start < 0) start = i
    } else {
      if (start >= 0 && i - start >= 6) out.push(buf.toString('latin1', start, i))
      start = -1
    }
  }
  return out.join('\n')
}

function scanBuffer(path, buf, ctx, out) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return scanText(path, buf.toString('utf16le', 2), ctx, out)
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const body = Buffer.from(buf.subarray(2, 2 + ((buf.length - 2) & ~1)))
    return scanText(path, body.swap16().toString('utf16le'), ctx, out)
  }
  if (buf.subarray(0, 8000).includes(0)) return scanText(path, printableStrings(buf), ctx, out, 'binary')
  return scanText(path, buf.toString('utf8'), ctx, out)
}

// ---------------------------------------------------------------------------------------------
// Repository-level checks

function isReviewJsonPath(p) {
  const b = basename(p).toLowerCase()
  if (!b.endsWith('.json')) return false
  return b.startsWith('review-merged') || /^research\/(?:reviews|synthesis)\//.test(p) || (p.startsWith('research/') && b.includes('review'))
}

function checkReviewJsonPaths(paths, out) {
  for (const p of paths) {
    if (isReviewJsonPath(p)) out.findings.push({ check: 'review-json', path: p, message: 'a review JSON; review JSONs stay out of the repository (OD-11)' })
  }
}

function reviewFingerprint(path, size, sha, out, fingerprints = REVIEW_FINGERPRINTS) {
  for (const f of fingerprints) {
    if (size === f.bytes && sha.startsWith(f.prefix) && sha.endsWith(f.suffix)) {
      out.findings.push({ check: 'review-json', path, message: `the raw review file ${f.name}, by its fingerprint in ${f.source} (OD-11)` })
    }
  }
}

const git = (root, args, input) => spawnSync('git', ['-C', root, ...args], { input, maxBuffer: 1 << 30 })

/** Review JSONs anywhere in reachable git history, by path and by fingerprint. */
function reviewJsonHistory(root, current, out) {
  const rl = git(root, ['rev-list', '--objects', '--all'])
  if (rl.error || rl.status !== 0) {
    out.notes.push('git history was not checked for review JSONs (git rev-list failed)')
    return null
  }
  const shas = []
  const names = new Set()
  for (const line of rl.stdout.toString('utf8').split('\n')) {
    if (!line) continue
    const sp = line.indexOf(' ')
    shas.push(sp < 0 ? line : line.slice(0, sp))
    const p = sp < 0 ? '' : line.slice(sp + 1)
    if (p && isReviewJsonPath(p) && !current.has(p)) names.add(p)
  }
  for (const p of names) out.findings.push({ check: 'review-json', path: `history:${p}`, message: 'a review JSON in git history (OD-11)' })
  const sizes = new Set(REVIEW_FINGERPRINTS.map((f) => f.bytes))
  if (shas.length) {
    const bc = git(root, ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], `${shas.join('\n')}\n`)
    for (const line of bc.stdout.toString('utf8').split('\n')) {
      const [sha, type, size] = line.split(' ')
      if (type !== 'blob' || !sizes.has(Number(size))) continue
      const blob = git(root, ['cat-file', 'blob', sha])
      reviewFingerprint(`history:${sha.slice(0, 12)}`, Number(size), sha256(blob.stdout), out)
    }
  }
  const count = git(root, ['rev-list', '--all', '--count'])
  const shallow = git(root, ['rev-parse', '--is-shallow-repository'])
  return {
    commits: Number(count.stdout.toString().trim()) || 0,
    objects: shas.length,
    shallow: shallow.stdout.toString().trim() === 'true',
  }
}

function reviewIgnoreGuard(root, out) {
  const missing = REVIEW_IGNORE_PROBES.filter((p) => git(root, ['check-ignore', '-q', '--no-index', p]).status !== 0)
  if (missing.length) {
    out.warnings.push({ check: 'review-json', message: `.gitignore does not exclude ${missing.join(', ')}; keep the review-JSON rules (OD-11)` })
  }
}

function checkVendorLicenses(paths, out) {
  const dirs = new Map()
  const note = (dir, why) => dir && dir !== '.' && !dirs.has(dir) && dirs.set(dir, why)
  for (const p of paths) {
    const parts = p.split('/')
    if (parts.includes('node_modules')) continue
    const v = parts.findIndex((x, i) => i < parts.length - 2 && VENDOR_DIR.test(x))
    if (v >= 0) note(parts.slice(0, v + 2).join('/'), `inside ${parts.slice(0, v + 1).join('/')}/`)
    if (basename(p) === 'VENDOR.md') note(dirname(p), 'it holds VENDOR.md')
    if (FONT_FILE.test(p)) note(dirname(p), 'it holds font files')
  }
  for (const [dir, why] of dirs) {
    const licensed = paths.some((q) => (dirname(q) === dir && isLicenseFile(q)) || q.startsWith(`${dir}/LICENSES/`))
    if (!licensed) out.findings.push({ check: 'vendor-license', path: `${dir}/`, message: `a vendored directory (${why}) without its own license file` })
  }
  return [...dirs.keys()]
}

function checkCourseLicenses(paths, out) {
  const found = paths.filter((p) => !p.includes('/') && isLicenseFile(p) && !/^ofl/i.test(p))
  if (found.length >= 2) return found
  out.warnings.push({
    check: 'course-license',
    message: found.length
      ? `one course license at the root (${found[0]}); OD-16 names one for content and one for code`
      : 'no course license at the root yet; OD-16 (one license for content, one for code) is open for the owner',
  })
  return found
}

// ---------------------------------------------------------------------------------------------
// Listing and driving

/** Files under a directory, skipping .git and node_modules, as paths relative to it. */
function walk(absDir, rel = '', files = []) {
  for (const ent of readdirSync(join(absDir, rel), { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules') continue
    const r = rel ? `${rel}/${ent.name}` : ent.name
    if (ent.isDirectory()) walk(absDir, r, files)
    else files.push(r)
  }
  return files
}

/** Published paths: tracked plus untracked-and-not-ignored, from git; every file when git is absent. */
function listPublished(root) {
  const r = git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
  if (!r.error && r.status === 0) {
    const paths = [...new Set(r.stdout.toString('utf8').split('\0').filter(Boolean))].sort()
    return { via: 'git', paths }
  }
  return { via: 'walk', paths: walk(root).sort() }
}

function readEntry(abs) {
  const st = lstatSync(abs)
  if (st.isSymbolicLink()) return { buf: Buffer.from(readlinkSync(abs)) }
  if (st.isDirectory()) return { dir: true }
  if (st.size > MAX_BYTES) return { tooLarge: st.size }
  return { buf: readFileSync(abs) }
}

/** Scan one listed file; returns its digest line or null. */
function scanEntry(path, abs, ctx, out) {
  scanText(path, path, ctx, out, 'name')
  let entry
  try {
    entry = readEntry(abs)
  } catch {
    out.notes.push(`${path}: listed but not on disk; not scanned`)
    return null
  }
  if (entry.tooLarge) {
    out.warnings.push({ check: 'size', message: `${path}: ${entry.tooLarge} bytes, above the ${MAX_BYTES}-byte scan limit; not scanned` })
    return null
  }
  const sha = sha256(entry.buf)
  reviewFingerprint(path, entry.buf.length, sha, out)
  scanBuffer(path, entry.buf, ctx, out)
  return { line: `${sha}  ${path}\n`, bytes: entry.buf.length }
}

function scanRepository(ctx) {
  const out = newReport()
  const { via, paths } = listPublished(ctx.root)
  const files = []
  for (const p of paths) {
    const clean = p.replace(/\/$/, '')
    let entry = null
    try {
      entry = lstatSync(join(ctx.root, clean))
    } catch {}
    if (entry?.isDirectory()) {
      out.warnings.push({ check: 'listing', message: `${clean}/ is an embedded repository; git would publish a gitlink, not its files (scanned anyway)` })
      for (const r of walk(join(ctx.root, clean))) files.push(`${clean}/${r}`)
    } else files.push(clean)
  }
  const lines = []
  let bytes = 0
  for (const p of files) {
    const d = scanEntry(p, join(ctx.root, p), ctx, out)
    if (d) {
      lines.push(d.line)
      bytes += d.bytes
    }
  }
  out.scanned = { via, paths: files.length, files: lines.length, bytes, digest: sha256(lines.join('')) }
  checkReviewJsonPaths(files, out)
  if (via === 'git') {
    out.history = reviewJsonHistory(ctx.root, new Set(files), out)
    reviewIgnoreGuard(ctx.root, out)
  } else out.notes.push('not a git checkout: every file under the root was scanned, and history was not checked')
  out.vendored = checkVendorLicenses(files, out)
  out.courseLicenses = checkCourseLicenses(files, out)
  return out
}

/** Scan given files or directories (an unpacked lab zip, a stuck-output fixture), with paths relative to each target. */
function scanTargets(targets, ctx) {
  const out = newReport()
  const lines = []
  let bytes = 0
  for (const t of targets) {
    const abs = resolve(t)
    let st
    try {
      st = lstatSync(abs)
    } catch {
      throw new ConfigError(`no such file or directory: ${t}`)
    }
    const entries = st.isDirectory() ? walk(abs).map((r) => [r, join(abs, r)]) : [[basename(abs), abs]]
    for (const [label, file] of entries) {
      if (isReviewJsonPath(label)) checkReviewJsonPaths([label], out)
      const d = scanEntry(label, file, ctx, out)
      if (d) {
        lines.push(d.line)
        bytes += d.bytes
      }
    }
  }
  out.scanned = { via: 'paths', paths: lines.length, files: lines.length, bytes, digest: sha256(lines.join('')) }
  return out
}

// ---------------------------------------------------------------------------------------------
// Reporting

const where = (f) => `${f.path}${f.line ? `:${f.line}:${f.col}` : f.in === 'binary' ? ' (binary strings)' : f.in === 'name' ? ' (file name)' : ''}`

function finish(out, ctx, terms) {
  out.terms = { checked: terms.listed > 0, listed: terms.listed, identity: terms.identity, count: terms.count, sources: terms.sources }
  if (!terms.listed) {
    const local = terms.identity ? `; only your local identity was checked (${terms.identity} term${terms.identity === 1 ? '' : 's'})` : ''
    out.warnings.push({
      check: 'private-term',
      message: `not checked: no hashed term list (set STATESPACE_PRIVACY_TERMS and STATESPACE_PRIVACY_KEY, or STATESPACE_PRIVACY_TERMS_FILE)${local}`,
    })
  }
  if (ctx.strict) {
    out.findings.push(...out.warnings.map((w) => ({ ...w, path: '(strict)', message: w.message })))
    out.warnings = []
  }
  out.ok = out.findings.length === 0
  return out
}

function summary(out) {
  const s = out.scanned
  const parts = [`${s.files} published files (${s.bytes} bytes, digest ${s.digest.slice(0, 12)})`]
  parts.push(out.terms.checked ? `${out.terms.listed} term-list entries checked` : 'no term list checked')
  if (out.terms.identity) parts.push(`${out.terms.identity} local identity term${out.terms.identity === 1 ? '' : 's'} checked`)
  if (out.history) {
    const n = out.history.commits
    parts.push(`review JSONs absent from the tree and from ${n} commit${n === 1 ? '' : 's'} of history${out.history.shallow ? ' (a shallow clone)' : ''}`)
  }
  if (out.vendored) parts.push(`${out.vendored.length} vendored director${out.vendored.length === 1 ? 'y' : 'ies'} licensed`)
  parts.push(`${out.allowed.length} allowed matches`)
  return parts.join('; ')
}

function printReport(out, args) {
  if (args.json) {
    const allowedBy = {}
    for (const a of out.allowed) allowedBy[a.reason] = (allowedBy[a.reason] ?? 0) + 1
    const { allowed, ...rest } = out
    console.log(JSON.stringify({ gate: 'GATE-privacy', node: process.version, strict: args.strict, ...rest, allowed: allowedBy }, null, 2))
    return
  }
  for (const n of out.notes) console.log(`note: ${n}`)
  for (const w of out.warnings) console.log(`warning: ${w.check}: ${w.message}`)
  if (args.verbose) for (const a of out.allowed) console.log(`allowed: ${a.check} ${where(a)} (${a.reason})`)
  if (out.findings.length) {
    console.error(`verify-privacy: ${out.findings.length} problem(s)`)
    for (const f of out.findings) console.error(`  ${f.check.padEnd(14)} ${where(f)}  ${f.message}${f.excerpt ? `: ${f.excerpt}` : ''}`)
    return
  }
  console.log(`verify-privacy: ok, ${summary(out)}`)
}

// ---------------------------------------------------------------------------------------------
// Self-test: planted fixtures for every check and allowance

function selfTest() {
  const key = randomBytes(32)
  const plain = parsePlainTerms(
    ['# fixtures only', 'design: Zorblax Engine', 'design+substring: quuxwidget', 'design: gizmo', 'design: frobnitz', 'design: design detail', 'person: Ada Byron', 'account: adab | allow=research/'].join('\n'),
  )
  const roadmap = `Stage 10. Integration: assemble Zorblax Engine Core. Keep one evolving ${PRODUCT.toLowerCase()}-lab repository; assemble ${PRODUCT} Core.`
  const ctx = makeContext({ matcher: new TermMatcher(key, plain.map((t) => hashTerm(key, t))), roadmapText: roadmap, reveal: true })
  const at = (...p) => p.join('@')
  const home = ['', `ho${'me'}`, ''].join('/')
  const users = ['', `Us${'ers'}`, ''].join('/')
  const scan = (files, c = ctx) => (out) => {
    for (const [p, content] of files) scanBuffer(p, Buffer.isBuffer(content) ? content : Buffer.from(content), c, out)
  }
  const fp = Buffer.from('x'.repeat(100))
  const fpSha = sha256(fp)
  const keyHex = randomBytes(32).toString('hex')
  const cases = [
    ['an email outside the allow-list fails', scan([['docs/a.md', `mail ${at('grace.h', 'analytical-engine.org')} today`]]), { email: 1 }],
    ['role addresses, reserved domains and the removal placeholder pass', scan([['docs/a.md', 'security@lean-fro.org someone@example.com a@b.test [email removed]']]), {}],
    [
      'home, per-user and agent session directories fail',
      scan([['docs/a.md', `${home}grace/x ${users}grace/x C:\\${`Us${'ers'}`}\\grace\\x /tmp/cla${'ude'}-1000/x /mnt/c${users}grace/x`]]),
      { 'private-path': 5 },
    ],
    [
      'URLs, container homes, CI accounts and placeholders pass',
      scan([['docs/a.md', `https://www.example.org/home/wp-content/a.pdf /root/.cache ${home}runner/w ${home}vscode/w ${home}x/Challenge.lean ${users}learner/lab`]]),
      {},
    ],
    ['a prompt naming a user fails; root in a container passes', scan([['docs/a.log', `${at('grace', 'engine')}:~/work$ ls\n${at('root', '3f2a9c')}:/work# ls\n`]]), { 'account-id': 1 }],
    ['tokens and private keys fail', scan([['docs/a.md', `${'gh'}p_${'a'.repeat(36)}\n-----BEGIN ${'OPENSSH'} PRIVATE KEY-----`]]), { credential: 2 }],
    [
      'a real instrument host fails; the placeholder and example hosts pass',
      scan([['docs/a.md', `https://instruments.${'grace-h'}.dev/ https://instruments.<course-domain>/ https://instruments.example.com/`]]),
      { 'course-domain': 1 },
    ],
    ['a private-design term fails outside the roadmap and history', scan([['docs/a.md', 'the Zorblax Engine runs']]), { 'private-term': 1 }],
    ['camelCase, hyphens and a line break still match', scan([['docs/a.md', 'ZorblaxEngine, zorblax-engine and Zorblax\nEngine']]), { 'private-term': 3 }],
    ['plurals in -s and -es, and a substring, match', scan([['docs/a.md', 'two gizmos, three frobnitzes and one superquuxwidgetx']]), { 'private-term': 3 }],
    [
      'the roadmap, a quotation of it and v1 history pass',
      scan([
        ['docs/a.md', 'we assemble Zorblax Engine Core'],
        [ROADMAP, 'Zorblax Engine'],
        ['docs/history/v1/a.md', 'Zorblax Engine'],
        ['design/canvas/a.html', 'Zorblax Engine'],
      ]),
      {},
    ],
    [
      'the redaction marker and the generic phrase are masked',
      scan([
        ['docs/a.md', 'see [redacted: private design detail] and the private design'],
        ['docs/b.md', 'one design detail'],
      ]),
      { 'private-term': 1 },
    ],
    [
      'a personal name fails except on the copyright line of a license file',
      scan([
        ['README.md', 'written by Ada Byron'],
        ['vendor/k/LICENSE', 'Copyright (c) 2026 Ada Byron'],
      ]),
      { 'private-term': 1 },
    ],
    [
      'a term allowed for a path passes only there',
      scan([
        ['research/notes.md', 'https://github.com/adab/kernel'],
        ['docs/a.md', 'https://github.com/adab/kernel'],
      ]),
      { 'private-term': 1 },
    ],
    ['file names are scanned', (out) => scanText('docs/zorblax-engine-notes.md', 'docs/zorblax-engine-notes.md', ctx, out, 'name'), { 'private-term': 1 }],
    ['learner copy keeps the roadmap names', scan([['labs/README.md', 'Mini-Plinth, `miniplinth check`, mini-plinth-core, MiniPlinthRef, mini_plinth_core']]), {}],
    [
      'learner copy naming the product fails; a roadmap quotation passes; design docs are out of scope',
      scan([
        ['labs/README.md', `your ${PRODUCT} platform`],
        ['content/a.md', `then assemble ${PRODUCT} Core`],
        ['docs/a.md', `the ${PRODUCT} roadmap`],
      ]),
      { 'your-system': 1 },
    ],
    [
      'printable strings inside a binary file are scanned',
      scan([['apps/site/public/a.png', Buffer.concat([Buffer.from([0, 1, 2, 0]), Buffer.from(`author ${at('grace.h', 'analytical-engine.org')}`), Buffer.from([0])])]]),
      { email: 1 },
      (out) => (out.findings.every((f) => f.in === 'binary') ? null : 'not reported as binary strings'),
    ],
    [
      'a UTF-16 text file is decoded',
      scan([['docs/a.txt', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`mail ${at('grace.h', 'analytical-engine.org')}`, 'utf16le')])]]),
      { email: 1 },
    ],
    [
      'review JSONs fail by name',
      (out) => checkReviewJsonPaths(['research/review-merged-1.json', 'research/reviews/A1-fidelity.json', 'research/synthesis/n.json', 'content/s/review-items.json'], out),
      { 'review-json': 3 },
    ],
    [
      'review JSONs fail by fingerprint under any name',
      (out) => reviewFingerprint('docs/data.json', fp.length, fpSha, out, [{ name: 'f.json', bytes: fp.length, prefix: fpSha.slice(0, 8), suffix: fpSha.slice(-6), source: 'self-test' }]),
      { 'review-json': 1 },
    ],
    [
      'a vendored directory without its own license fails',
      (out) => checkVendorLicenses(['vendor/foo/a.js', 'vendor/README.md', 'tools/x/VENDOR.md', 'tools/x/a.js', 'apps/site/public/fonts/a.woff2'], out),
      { 'vendor-license': 3 },
    ],
    [
      'a vendored directory with its license passes',
      (out) =>
        checkVendorLicenses(
          ['vendor/foo/a.js', 'vendor/foo/LICENSE', 'tools/x/VENDOR.md', 'tools/x/COPYING', 'apps/site/public/fonts/a.woff2', 'apps/site/public/fonts/OFL.txt', 'vendor/bar/b.js', 'vendor/bar/LICENSES/MIT.txt'],
          out,
        ),
      {},
    ],
    [
      'missing course licenses are a warning, and a failure under --strict',
      (out) => {
        checkCourseLicenses([], out)
        finish(out, { strict: true }, { matcher: ctx.matcher, count: 1, listed: 1, identity: 0, sources: [] })
      },
      { 'course-license': 1 },
    ],
    [
      'a key that does not match the hashed list is refused',
      () => loadTerms({ STATESPACE_PRIVACY_TERMS: JSON.stringify(hashedDocument(keyHex, plain)), STATESPACE_PRIVACY_KEY: 'another key' }, SCRIPT_ROOT, NO_IDENTITY),
      { throws: /does not match/ },
    ],
    [
      'a hashed list without its keyId is refused',
      () => {
        const { keyId, ...doc } = hashedDocument(keyHex, plain)
        loadTerms({ STATESPACE_PRIVACY_TERMS: JSON.stringify(doc), STATESPACE_PRIVACY_KEY: keyHex }, SCRIPT_ROOT, NO_IDENTITY)
      },
      { throws: /keyId/ },
    ],
    [
      'a list from --hash-terms round-trips',
      (out) => {
        const { matcher } = loadTerms({ STATESPACE_PRIVACY_TERMS: JSON.stringify(hashedDocument(keyHex, plain)), STATESPACE_PRIVACY_KEY: keyHex }, SCRIPT_ROOT, NO_IDENTITY)
        scan([['docs/a.md', 'the Zorblax Engine']], makeContext({ matcher }))(out)
      },
      { 'private-term': 1 },
    ],
    [
      'a term list inside the repository is refused',
      () => loadTerms({ STATESPACE_PRIVACY_TERMS_FILE: join(SCRIPT_ROOT, ROADMAP) }, SCRIPT_ROOT, NO_IDENTITY),
      { throws: /inside the repository/ },
    ],
    [
      'the course domain from the environment is checked',
      (out) => {
        const { matcher } = loadTerms({ STATESPACE_COURSE_DOMAIN: `${'grace-h'}.dev` }, SCRIPT_ROOT, NO_IDENTITY)
        scan([['docs/a.md', `served from ${'grace-h'}.dev today`]], makeContext({ matcher }))(out)
      },
      { 'private-term': 1 },
    ],
    [
      'outside CI, your account name, git user.name and git email local part are caught',
      (out) => {
        const who = () => ({ username: 'gracehop', gitName: 'Grace Hopper', gitEmail: at('hopper.g42', 'analytical-engine.org') })
        const { matcher } = loadTerms({}, SCRIPT_ROOT, who)
        scan([['scripts/a.mjs', "if (/gracehop/.test(s)) die('leak') // by Grace Hopper, see hopper.g42"]], makeContext({ matcher }))(out)
      },
      { 'private-term': 3 },
    ],
    [
      'generic and placeholder identities add no terms',
      (out) => {
        const terms = [
          ...identityTerms({ username: 'runner', gitName: 'Your Name', gitEmail: at('you', 'example.com') }),
          ...identityTerms({ username: 'vscode', gitName: 'Test User', gitEmail: null }),
          ...identityTerms({ username: 'jo' }),
        ]
        for (const t of terms) out.findings.push({ check: 'identity-term', path: t.from })
      },
      {},
    ],
    [
      'the local identity is off in CI and when STATESPACE_PRIVACY_LOCAL_IDENTITY=0',
      (out) => {
        const count = (env) => loadTerms(env, SCRIPT_ROOT, () => ({ username: 'gracehop' })).identity
        if (count({}) !== 1) out.findings.push({ check: 'identity-missing' })
        for (const env of [{ CI: 'true' }, { CI: '1' }, { STATESPACE_PRIVACY_LOCAL_IDENTITY: '0' }]) if (count(env) !== 0) out.findings.push({ check: 'identity-on' })
        if (count({ CI: 'false' }) !== 1) out.findings.push({ check: 'identity-missing' })
      },
      {},
    ],
    [
      "a term list's allowance outranks the same local identity term",
      (out) => {
        const doc = hashedDocument(keyHex, parsePlainTerms('account: gracehop | allow=research/'))
        const { matcher } = loadTerms({ STATESPACE_PRIVACY_TERMS: JSON.stringify(doc), STATESPACE_PRIVACY_KEY: keyHex }, SCRIPT_ROOT, () => ({ username: 'gracehop' }))
        scan([
          ['research/notes.md', 'by gracehop'],
          ['docs/a.md', 'by gracehop'],
        ], makeContext({ matcher }))(out)
      },
      { 'private-term': 1 },
    ],
  ]
  let failed = 0
  console.log(`verify-privacy self-test: ${cases.length} cases`)
  for (const [name, run, expect, extra] of cases) {
    const out = newReport()
    let problem = null
    try {
      run(out)
      if (expect.throws) problem = 'expected a configuration error'
      else {
        const got = {}
        for (const f of out.findings) got[f.check] = (got[f.check] ?? 0) + 1
        const checks = new Set([...Object.keys(got), ...Object.keys(expect)])
        const diff = [...checks].filter((c) => (got[c] ?? 0) !== (expect[c] ?? 0)).map((c) => `${c}: got ${got[c] ?? 0}, want ${expect[c] ?? 0}`)
        if (diff.length) problem = diff.join('; ')
        else problem = extra?.(out) ?? null
      }
    } catch (e) {
      if (!(expect.throws && e instanceof ConfigError && expect.throws.test(e.message))) problem = `threw: ${e.message}`
    }
    if (problem) failed++
    console.log(`  ${problem ? 'FAIL' : 'ok  '} ${name}${problem ? ` (${problem})` : ''}`)
  }
  console.log(failed ? `verify-privacy self-test: ${failed} of ${cases.length} failed` : `verify-privacy self-test: ok, ${cases.length}/${cases.length}`)
  return failed ? 1 : 0
}

// ---------------------------------------------------------------------------------------------
// Command line

function hashTermsCommand(file) {
  const abs = resolve(expandHome(file))
  if (insideRoot(SCRIPT_ROOT, abs)) throw new ConfigError('the plaintext term list must stay outside the repository')
  let text
  try {
    text = readFileSync(abs, 'utf8')
  } catch {
    throw new ConfigError('the plaintext term list cannot be read')
  }
  let key = process.env.STATESPACE_PRIVACY_KEY
  if (!key) {
    key = randomBytes(32).toString('hex')
    console.error(`No STATESPACE_PRIVACY_KEY was set, so a new key was made. Store it as the CI secret STATESPACE_PRIVACY_KEY:\n${key}`)
  }
  const doc = hashedDocument(key, parsePlainTerms(text))
  process.stdout.write(`${JSON.stringify(doc)}\n`)
  console.error(`Hashed ${doc.terms.length} term(s). Store the JSON above as the CI secret STATESPACE_PRIVACY_TERMS.`)
  return 0
}

function parseArgs(argv) {
  const args = { strict: false, json: false, verbose: false, learnerFacing: false, selfTest: false, help: false, root: null, hashTerms: null, targets: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--strict') args.strict = true
    else if (a === '--json') args.json = true
    else if (a === '--verbose') args.verbose = true
    else if (a === '--learner-facing') args.learnerFacing = true
    else if (a === '--self-test') args.selfTest = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--root' || a === '--hash-terms') {
      if (i + 1 >= argv.length) throw new ConfigError(`${a} needs a path`)
      args[a === '--root' ? 'root' : 'hashTerms'] = argv[++i]
    } else if (a.startsWith('--')) throw new ConfigError(`unknown option ${a}`)
    else args.targets.push(a)
  }
  return args
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    const doc = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    console.log(doc.slice(doc.indexOf('/**') + 3, doc.indexOf('*/')).replace(/^ \* ?/gm, ''))
    return 0
  }
  if (args.selfTest) return selfTest()
  if (args.hashTerms) return hashTermsCommand(args.hashTerms)
  const started = Date.now()
  const root = args.root ? resolve(args.root) : SCRIPT_ROOT
  const terms = loadTerms(process.env, root)
  let roadmapText = null
  try {
    roadmapText = readFileSync(join(root, ROADMAP), 'utf8')
  } catch {}
  const ctx = makeContext({ root, matcher: terms.matcher, roadmapText, reveal: !inCI(process.env) && !args.json, learnerFacingAll: args.learnerFacing, strict: args.strict })
  const out = args.targets.length ? scanTargets(args.targets, ctx) : scanRepository(ctx)
  if (!roadmapText) out.notes.push(`${ROADMAP} not found: quotations of the roadmap are not allowed`)
  finish(out, ctx, terms)
  out.durationMs = Date.now() - started
  printReport(out, args)
  return out.ok ? 0 : 1
}

export { identityTerms, loadTerms, makeContext, newReport, scanBuffer, scanRepository, scanTargets }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = main(process.argv.slice(2))
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e
    console.error(`verify-privacy: ${e.message}`)
    process.exitCode = 2
  }
}
