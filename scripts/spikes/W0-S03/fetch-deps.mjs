// W0-S03: fetch the pinned binaries into a cache directory and verify their hashes.
//
//   node fetch-deps.mjs <cache-dir>
//
// The two Z3 wheels and the Souffle package are not committed; deps.json names where each comes from
// and the SHA-256 it must have. A file that is already present is verified and kept.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const cache = path.resolve(process.argv[2] ?? '.cache')
const deps = JSON.parse(fs.readFileSync(path.join(here, 'deps.json'), 'utf8'))
fs.mkdirSync(cache, { recursive: true })
const digest = (file, alg) => crypto.createHash(alg).update(fs.readFileSync(file)).digest('hex')

for (const [name, dep] of Object.entries(deps)) {
  const file = path.join(cache, dep.file)
  if (!fs.existsSync(file)) {
    const res = await fetch(dep.url, { redirect: 'follow' })
    if (!res.ok) throw new Error(`${name}: ${dep.url} answered ${res.status}`)
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  const got = digest(file, 'sha256')
  if (got !== dep.sha256) throw new Error(`${name}: ${dep.file} has SHA-256 ${got}, expected ${dep.sha256}`)
  if (dep.sha512 && digest(file, 'sha512') !== dep.sha512) throw new Error(`${name}: ${dep.file} fails its SHA-512`)
  console.log(`${name}: ${dep.file} ok (${fs.statSync(file).size} bytes)`)
}
