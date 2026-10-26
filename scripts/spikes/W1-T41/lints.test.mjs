// Tests of GATE-bundle's lints on planted fixtures: every file under lint-cases/bad must trip the rule its name gives, and
// no file under lint-cases/good may trip any (so the lints cannot weaken, or grow trigger-happy, in silence).
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { lintCookie, lintFragment, lintParents, lintSandbox, productionSources, sandboxOk } from './lib/lints.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const BAD = join(HERE, 'fixtures/lint-cases/bad')
const GOOD = join(HERE, 'fixtures/lint-cases/good')

const sources = (root, dir = 'apps/site') => productionSources(root, dir)
const byPrefix = (all, prefix) => all.filter((s) => s.file.split('/').pop().startsWith(prefix))

describe('the sandbox lint', () => {
  test('accepts exactly the two tokens, in either order', () => {
    assert.equal(sandboxOk('allow-scripts allow-same-origin'), true)
    assert.equal(sandboxOk('  allow-same-origin   allow-scripts '), true)
    assert.equal(sandboxOk('allow-scripts'), false)
    assert.equal(sandboxOk(''), false)
    assert.equal(sandboxOk('allow-scripts allow-same-origin allow-popups'), false)
    assert.equal(sandboxOk('allow-top-navigation allow-scripts allow-same-origin'), false)
  })

  const bad = byPrefix(sources(BAD), 'sandbox-')
  test('the planted cases exist', () => assert.ok(bad.length >= 6, `found ${bad.length} sandbox cases`))
  for (const s of bad) {
    test(`trips on ${s.file.split('/').pop()}`, () => {
      const found = lintSandbox([s])
      assert.ok(found.length >= 1, 'no finding')
      assert.ok(found.every((f) => f.rule === 'iframe-sandbox'))
      assert.ok(found.every((f) => f.line >= 1 && f.file === s.file))
    })
  }
  test('passes the correct frames', () => {
    const good = byPrefix(sources(GOOD), 'sandbox-')
    assert.ok(good.length >= 2)
    for (const s of good) assert.deepEqual(lintSandbox([s]), [], s.file)
  })
})

describe('the document.cookie lint', () => {
  const bad = byPrefix(sources(BAD), 'cookie-')
  test('the planted cases exist', () => assert.ok(bad.length >= 6, `found ${bad.length} cookie cases`))
  for (const s of bad) {
    test(`trips on ${s.file.split('/').pop()}`, () => {
      const found = lintCookie([s])
      assert.ok(found.length >= 1, 'no finding')
      assert.ok(found.every((f) => f.rule === 'document-cookie'))
    })
  }
  test('passes a read and a mention in a comment or a string', () => {
    for (const s of byPrefix(sources(GOOD), 'cookie-')) assert.deepEqual(lintCookie([s]), [], s.file)
  })
})

describe('the fragment lint', () => {
  const bad = byPrefix(sources(BAD), 'fragment-')
  test('the planted cases exist', () => assert.ok(bad.length >= 4, `found ${bad.length} fragment cases`))
  for (const s of bad) {
    test(`trips on ${s.file.split('/').pop()}`, () => {
      const found = lintFragment([s])
      assert.ok(found.length >= 1, 'no finding')
      assert.ok(found.every((f) => f.rule === 'fragment-parse'))
    })
  }
  test('passes a lookup of a hash and a parse of other text', () => {
    for (const s of byPrefix(sources(GOOD), 'fragment-')) assert.deepEqual(lintFragment([s]), [], s.file)
  })
  test('holds the bus client to the rule: it hands a fragment over unparsed (ARCHITECTURE.md section 2, item 4)', () => {
    const decoded = sources(BAD).find((s) => s.file === 'apps/site/src/bus-client/fragment-forward.ts')
    assert.ok(decoded, 'the planted bus-client case exists')
    const found = lintFragment([decoded])
    assert.deepEqual(found.map((f) => f.message.split(' ')[0]), ['JSON.parse()', 'atob()'])
    assert.ok(found.every((f) => f.file === decoded.file && f.line === 4))
    const raw = sources(GOOD).find((s) => s.file === 'apps/site/src/bus-client/fragment-handover.ts')
    assert.ok(raw, 'the correct bus-client case exists')
    assert.deepEqual(lintFragment([raw]), [], 'posting the raw string to the instrument origin is the rule, not a breach of it')
    // the same decode anywhere else in apps/site is the same finding
    assert.equal(lintFragment([{ file: 'apps/site/src/screens/receipt/route.tsx', text: decoded.text }]).length, found.length)
  })
})

describe('the lints on the forms a review found missing, and their correct neighbours', () => {
  const sandbox = (text) => lintSandbox([{ file: 'apps/site/src/probe.tsx', text }])
  const cookie = (text) => lintCookie([{ file: 'apps/site/src/probe.ts', text }])
  const caught = {
    'React createElement imported, no sandbox': sandbox(`import { createElement } from 'react'\nexport const f = (src) => createElement('iframe', { src })`),
    'React.createElement with one token': sandbox(`import React from 'react'\nexport const f = (src) => React.createElement('iframe', { src, sandbox: 'allow-scripts' })`),
    'React.createElement with null props': sandbox(`import React from 'react'\nexport const f = () => React.createElement('iframe', null)`),
    'an element factory given props from a variable': sandbox(`import React from 'react'\nexport const f = (p) => React.createElement('iframe', p)`),
    "Preact's h with a spread after sandbox": sandbox(`import { h } from 'preact'\nexport const f = (p) => h('iframe', { sandbox: 'allow-scripts allow-same-origin', ...p })`),
    "the JSX runtime's jsx with one token": sandbox(`import { jsx as _jsx } from 'react/jsx-runtime'\nexport const f = () => _jsx('iframe', { sandbox: 'allow-scripts' })`),
    'a JSX spread after sandbox': sandbox(`export const F = (p) => <iframe sandbox="allow-scripts allow-same-origin" {...p} />`),
    "removeAttribute('sandbox') before insertion": sandbox(`const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); f.removeAttribute('sandbox'); document.body.append(f)`),
    "toggleAttribute('sandbox')": sandbox(`export const t = (f) => f.toggleAttribute('sandbox')`),
    'sandbox.remove, .toggle and .replace': sandbox(`export const t = (f) => { f.sandbox.remove('allow-scripts'); f.sandbox.toggle('allow-scripts'); f.sandbox.replace('allow-scripts', 'allow-popups') }`),
    '[document.cookie] = [v]': cookie(`;[document.cookie] = ['a=1']`),
    '({ v: document.cookie } = o)': cookie(`;({ v: document.cookie } = { v: 'a=1' })`),
    '[...document.cookie] = v': cookie(`;[...document.cookie] = 'a'`),
    'for (document.cookie of list)': cookie(`for (document.cookie of ['a=1']) {}`),
    "for (document['cookie'] in o)": cookie(`for (document['cookie'] in { a: 1 }) {}`),
    'document.cookie++': cookie('document.cookie++'),
    'document.cookie -= 1': cookie('document.cookie -= 1'),
    // iframe markup in pieces
    'markup joined with + into innerHTML': sandbox(`export function mount(host, src) { host.innerHTML = '<iframe src="' + src + '" title="instruments"></iframe>' }`),
    'markup joined with + into insertAdjacentHTML': sandbox(`export const m = (h, src) => h.insertAdjacentHTML('beforeend', '<iframe title="i" src="' + encodeURI(src) + '"></iframe>')`),
    'markup joined with + that carries one token': sandbox(`export const m = (h, s) => { h.innerHTML = '<iframe sandbox="allow-scripts" src="' + s + '"></iframe>' }`),
    'markup joined with + through parentheses': sandbox(`export const m = (h, s) => { h.innerHTML = ('<ifr' + 'ame src="') + (s + '">') }`),
    "markup from an array's join('')": sandbox(`export const m = (h, s) => { h.innerHTML = ['<iframe src="', s, '"></iframe>'].join('') }`),
    'markup built with +=': sandbox(`export function m(h, s) { let html = '<iframe src="'; html += s; html += '"></iframe>'; h.innerHTML = html }`),
    'a template and a string joined with +': sandbox('export const m = (h, s) => { h.innerHTML = `<iframe src="${s}"` + \' sandbox="allow-scripts">\' }'),
  }
  for (const [name, found] of Object.entries(caught)) test(`trips on ${name}`, () => assert.ok(found.length >= 1, 'no finding'))
  test('the multi-form case reports each of its three token changes', () => assert.equal(caught['sandbox.remove, .toggle and .replace'].length, 3))
  test('a chain of + is reported once, at its top', () => {
    assert.equal(caught['markup joined with + into innerHTML'].length, 1)
    assert.match(caught['markup joined with + into innerHTML'][0].message, /no sandbox attribute/)
    assert.match(caught["markup from an array's join('')"][0].message, /does not close/)
  })
  const clean = {
    'React.createElement with exactly the two tokens': sandbox(`import React from 'react'\nexport const f = (src) => React.createElement('iframe', { src, sandbox: 'allow-scripts allow-same-origin' })`),
    "Preact's h with a spread before sandbox": sandbox(`import { h } from 'preact'\nexport const f = (p) => h('iframe', { ...p, sandbox: 'allow-same-origin allow-scripts' })`),
    'a JSX spread before sandbox': sandbox(`export const F = (p) => <iframe {...p} sandbox="allow-scripts allow-same-origin" />`),
    'the DOM createElement with { is } options': sandbox(`const f = document.createElement('iframe', { is: 'x' }); f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); document.body.append(f)`),
    'removeAttribute and classList.remove of other things': sandbox(`export const t = (f) => { f.removeAttribute('hidden'); f.classList.remove('x') }`),
    'reads of document.cookie in patterns and loops': cookie(`let a; [a] = [document.cookie]; const { cookie } = document; for (const c of document.cookie.split(';')) a = c`),
    'Object.defineProperty, which shadows the setter and sets no cookie': cookie(`Object.defineProperty(document, 'cookie', { get: () => '' })`),
    'a destructuring assignment to a local named cookie': cookie(`let cookie, other; ({ cookie } = { cookie: 'x' }); ({ cookie: other, cookie = 'y' } = {})`),
    'markup joined with + that carries exactly the two tokens': sandbox(`export const m = (h, s) => { h.innerHTML = '<iframe sandbox="allow-same-origin allow-scripts" src="' + s + '"></iframe>' }`),
    'markup whose sandbox value is a string constant': sandbox(`const SANDBOX = 'allow-scripts allow-same-origin'\nexport const m = (h, s) => { h.innerHTML = '<iframe sandbox="' + SANDBOX + '" src="' + s + '"></iframe>' }`),
    'strings joined with + that hold no iframe': sandbox(`export const msg = (n) => 'found ' + n + ' frames, <b>' + n + '</b>'`),
  }
  for (const [name, found] of Object.entries(clean)) test(`passes ${name}`, () => assert.deepEqual(found, []))
})

describe('the production-parents lint', () => {
  test('flags localhost in a production build and nothing in a clean one', () => {
    const fs = createTemp()
    fs.write('b/x/host.js', 'const ALLOWED_PARENTS = ["https://example.test", "http://localhost:3000"]')
    fs.write('b/x/engines/pyodide.mjs', 'throw new Error("try http://localhost:8000")')
    fs.write('host.html', '<!doctype html><title>host</title>')
    const found = lintParents(fs.dir, new Set())
    assert.equal(found.length, 1)
    assert.match(found[0].message, /localhost:3000/)
    assert.equal(found[0].file, 'apps/instruments/dist/b/x/host.js')
    fs.rm()
    const clean = createTemp()
    clean.write('b/x/host.js', 'const ALLOWED_PARENTS = ["https://example.test"]')
    assert.deepEqual(lintParents(clean.dir, new Set()), [])
    clean.rm()
  })
})

function createTemp() {
  const dir = mkdtempSync(join(tmpdir(), 'ss-lint-'))
  return {
    dir,
    write(rel, text) {
      const f = join(dir, rel)
      mkdirSync(dirname(f), { recursive: true })
      writeFileSync(f, text)
    },
    rm: () => rmSync(dir, { recursive: true, force: true }),
  }
}
