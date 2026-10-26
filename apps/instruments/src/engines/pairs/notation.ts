// The pair notation: how a pair of executions is written down, read by INS-pairs and printed with every witness
// (DESIGN.md: state pairs use "execution 1" and "execution 2"). One field per line, `#` starts a comment:
//
//   world: W0
//   execution 1: nothing changed
//   execution 2: without layoffs-memo
//   request: Open v0 (frank, layoffs-memo)
//   relation: tenant acme, release title body
//   observer: response
//
// An execution is the base world with changes, separated by commas:
//
//   nothing changed                    the base world as it is
//   without <doc>                      the document does not exist (its shares go with it)
//   <doc>.<field> = "<text>"           a field differs: title, body or internal_notes
//   share <doc> with <user>            an unrevoked share to the user
//   revoke <doc> from <user>           the user's share is revoked
//
// Requests: `Open v0|v1|leaky (<user>, <doc>)`, `Search before|after (<user>, "<term>")`, `ListShared (<user>)`,
// `CreateDoc (<user>, <team>, "<slug>")`. Relations: `tenant <tenant>, release <field> ...`, `blanket`, `identical`.
// Observers: `response` (the returned value, error code included: SEAM-10) or `pages only`.
//
// Pure.

import { W0, type Doc, type Field, type Request, type World } from './s7.ts'
import type { Observer, Pair, Relation } from './pairs.ts'

export const WORLDS: Readonly<Record<string, World>> = { W0 }

function change(w: World, text: string): World {
  const t = text.trim()
  if (t === '' || t === 'nothing changed' || t === '-') return w
  let m = /^without ([\w-]+)$/.exec(t)
  if (m) {
    const id = m[1]!
    if (!w.docs.some((d) => d.id === id)) throw new Error(`there is no document ${id} to remove`)
    return { ...w, docs: w.docs.filter((d) => d.id !== id), shareUser: w.shareUser.filter((s) => s.doc !== id), shareTeam: w.shareTeam.filter(([d]) => d !== id) }
  }
  m = /^([\w-]+)\.(title|body|internal_notes) = "([^"]*)"$/.exec(t)
  if (m) {
    const [, id, field, value] = m as unknown as [string, string, Field, string]
    if (!w.docs.some((d) => d.id === id)) throw new Error(`there is no document ${id}`)
    return { ...w, docs: w.docs.map((d): Doc => (d.id === id ? { ...d, [field]: value, version: d.version + 1 } : d)) }
  }
  m = /^share ([\w-]+) with ([\w-]+)$/.exec(t)
  if (m) {
    const [, id, user] = m as unknown as [string, string, string]
    return { ...w, shareUser: [...w.shareUser.filter((s) => !(s.doc === id && s.user === user)), { doc: id, user, revoked: false }] }
  }
  m = /^revoke ([\w-]+) from ([\w-]+)$/.exec(t)
  if (m) {
    const [, id, user] = m as unknown as [string, string, string]
    return { ...w, shareUser: w.shareUser.map((s) => (s.doc === id && s.user === user ? { ...s, revoked: true } : s)) }
  }
  throw new Error(`cannot read the change "${t}"`)
}

/** Split on commas outside double quotes. */
function changes(text: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of text) {
    if (ch === '"') quoted = !quoted
    if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

export function readRequest(text: string): Request {
  const t = text.trim()
  let m = /^Open (v0|v1|leaky) \(([\w-]+), ([\w-]+)\)$/.exec(t)
  if (m) return { view: 'Open', variant: m[1] as 'v0' | 'v1' | 'leaky', user: m[2]!, doc: m[3]! }
  m = /^Search (before|after) \(([\w-]+), "([^"]*)"\)$/.exec(t)
  if (m) return { view: 'Search', variant: m[1] as 'before' | 'after', user: m[2]!, term: m[3]! }
  m = /^ListShared \(([\w-]+)\)$/.exec(t)
  if (m) return { view: 'ListShared', user: m[1]! }
  m = /^CreateDoc \(([\w-]+), ([\w-]+), "([^"]*)"\)$/.exec(t)
  if (m) return { view: 'CreateDoc', user: m[1]!, team: m[2]!, slug: m[3]! }
  throw new Error(`cannot read the request "${t}"`)
}

export function readRelation(text: string): Relation {
  const t = text.trim()
  if (t === 'blanket') return { kind: 'blanket' }
  if (t === 'identical') return { kind: 'identical' }
  const m = /^tenant ([\w-]+)(?:, release((?: (?:title|body|internal_notes))*))?$/.exec(t)
  if (m) return { kind: 'tenant', tenant: m[1]!, release: (m[2] ?? '').trim().split(/\s+/).filter(Boolean) as Field[] }
  throw new Error(`cannot read the relation "${t}"`)
}

export function readPair(text: string): Pair {
  const fields = new Map<string, string>()
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim()
    if (line === '') continue
    const at = line.indexOf(':')
    if (at < 0) throw new Error(`expected "<field>: <value>", found "${line}"`)
    fields.set(line.slice(0, at).trim(), line.slice(at + 1).trim())
  }
  const base = WORLDS[fields.get('world') ?? 'W0']
  if (base === undefined) throw new Error(`there is no world ${fields.get('world')}`)
  const exec = (name: string): World => changes(fields.get(name) ?? 'nothing changed').reduce(change, base)
  const request = fields.get('request')
  if (request === undefined) throw new Error('a pair names its request')
  const observer = (fields.get('observer') ?? 'response') === 'pages only' ? 'pages-only' : 'response'
  if (!['response', 'pages only'].includes(fields.get('observer') ?? 'response')) throw new Error('the observer is "response" or "pages only"')
  return {
    world1: exec('execution 1'),
    world2: exec('execution 2'),
    request: readRequest(request),
    relation: readRelation(fields.get('relation') ?? 'tenant acme, release title body'),
    observer: observer as Observer,
  }
}
