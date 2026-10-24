#!/usr/bin/env node
// W0-S08: the registry's record of the PGlite builds the harness runs, and a hash of each tarball as downloaded.
//
//   node npm-meta.mjs --out <npm-meta.json> --version 0.5.11 --version 0.5.10
//
// Only fields that identify a build are kept (version, publish time, tarball integrity, sizes, license, dependencies).

import { parseArgs } from 'node:util'
import { writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const { values: a } = parseArgs({ options: { out: { type: 'string' }, version: { type: 'string', multiple: true } } })
const name = '@electric-sql/pglite'
const packument = await (await fetch('https://registry.npmjs.org/' + name.replace('/', '%2f'))).json()
const lock = JSON.parse(readFileSync(new URL('./package-lock.json', import.meta.url), 'utf8'))
const lockEntry = (v) => Object.values(lock.packages).find((p) => p.version === v && p.resolved?.includes('pglite'))
const out = { fetched_at: new Date().toISOString(), name, dist_tags: packument['dist-tags'], versions: {} }
for (const v of a.version) {
  const m = packument.versions[v]
  const tarball = Buffer.from(await (await fetch(m.dist.tarball)).arrayBuffer())
  out.versions[v] = {
    published: packument.time[v], license: m.license, dependencies: m.dependencies ?? {}, peer_dependencies: m.peerDependencies ?? {},
    dist: { integrity: m.dist.integrity, shasum: m.dist.shasum, unpacked_size: m.dist.unpackedSize, file_count: m.dist.fileCount },
    tarball_bytes: tarball.length, tarball_sha256: createHash('sha256').update(tarball).digest('hex'),
    tarball_sha512_integrity: 'sha512-' + createHash('sha512').update(tarball).digest('base64'),
    tarball_sha1: createHash('sha1').update(tarball).digest('hex'),
    lockfile_integrity: lockEntry(v)?.integrity ?? null,
  }
  out.versions[v].integrity_matches_registry = out.versions[v].tarball_sha512_integrity === m.dist.integrity
  out.versions[v].integrity_matches_lockfile = out.versions[v].tarball_sha512_integrity === out.versions[v].lockfile_integrity
}
writeFileSync(a.out, JSON.stringify(out, null, 2) + '\n')
for (const [v, m] of Object.entries(out.versions)) console.log(`${name}@${v}: published ${m.published}, tarball ${m.tarball_bytes} B, integrity matches registry ${m.integrity_matches_registry}, lockfile ${m.integrity_matches_lockfile}; latest is ${out.dist_tags.latest}`)
