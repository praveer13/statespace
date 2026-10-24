// Round trip of the vendored ABI: a module built against the vendored kit (labs/kit), driven by the vendored host
// code (src/lib/forge/abi.ts and src/lib/wasm-lab.ts), under Node. Prints one `ok` or `FAIL` line per assertion
// and exits 1 on any failure. Used by record-scaffold.mjs; the vendored files are imported as they are.
//
//   node scripts/spikes/W0-S12/kit-roundtrip.ts <module.wasm>
import { readFileSync } from 'node:fs'
import { HOST_ABI, LIST_INPUT, compatFor, onlyInput, parseListReply, parseOnlyReply, splitLabId, trapMessage } from '../../../vendor/kernelspace/src/lib/forge/abi.ts'
import { LabTrapError, runLabWasm } from '../../../vendor/kernelspace/src/lib/wasm-lab.ts'

const bytes = readFileSync(process.argv[2] ?? '')
let failed = 0
const check = (name: string, cond: boolean, detail = '') => {
  if (!cond) failed++
  console.log(`${cond ? 'ok' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`)
}

const module = await WebAssembly.compile(bytes)
const imports = WebAssembly.Module.imports(module)
const exportNames = WebAssembly.Module.exports(module).map((e) => e.name).sort()
check('the module has zero imports', imports.length === 0, `${imports.length} imports`)
const wanted = ['ks_abi_version', 'ks_alloc', 'ks_free', 'ks_panic_msg', 'ks_run', 'ks_trace_drain', 'memory']
check('the module exports the kit ABI', wanted.every((n) => exportNames.includes(n)), exportNames.join(' '))

type Exports = {
  memory: WebAssembly.Memory
  ks_abi_version(): number
  ks_alloc(len: number): number
  ks_free(ptr: number, len: number): void
  ks_run(ptr: number, len: number): bigint
  ks_panic_msg(): bigint
}
const fresh = async () => (await WebAssembly.instantiate(module, {})).exports as unknown as Exports
const decoder = new TextDecoder()
const encoder = new TextEncoder()
const read = (ex: Exports, packed: bigint) => decoder.decode(new Uint8Array(ex.memory.buffer, Number(packed >> 32n), Number(packed & 0xffff_ffffn)))
function call(ex: Exports, input: string): string {
  const data = encoder.encode(input)
  const ptr = ex.ks_alloc(data.length)
  new Uint8Array(ex.memory.buffer, ptr, data.length).set(data)
  try {
    return read(ex, ex.ks_run(ptr, data.length))
  } finally {
    ex.ks_free(ptr, data.length)
  }
}

const first = await fresh()
check(`ks_abi_version() is ${HOST_ABI}, a version the host speaks`, first.ks_abi_version() === HOST_ABI && compatFor(first.ks_abi_version())?.perCheck === true)

const list = parseListReply(JSON.parse(call(first, LIST_INPUT)))
check('list parses and names the lab and its checks', typeof list !== 'string', typeof list === 'string' ? list : `${list.lab}: ${list.checks.map((c) => c.id).join(', ')}`)
if (typeof list === 'string') process.exit(1)
check('the lab id has no reference suffix', splitLabId(list.lab).reference === false)

const only = async (id: string, seed?: number) => {
  const ex = await fresh()
  return { ex, reply: parseOnlyReply(JSON.parse(call(ex, onlyInput(id, seed))), id, list.lab) }
}

const sum = (await only('sum')).reply
check('an unseeded check passes in a fresh instance', typeof sum !== 'string' && sum.pass, typeof sum === 'string' ? sum : sum.msg)

const seeded = (await only('seeded', 12345)).reply
check('a seeded check sees the seed the host drew', typeof seeded !== 'string' && seeded.pass && seeded.seed === 12345 && seeded.msg === 'seed 12345', typeof seeded === 'string' ? seeded : `${seeded.msg}, reported seed ${seeded.seed}`)
const again = (await only('seeded', 12345)).reply
check('the same seed gives the same reply twice', JSON.stringify(seeded) === JSON.stringify(again))
const dflt = (await only('seeded')).reply
check('with no seed line a seeded check runs on its default seed', typeof dflt !== 'string' && dflt.msg === 'seed 7', typeof dflt === 'string' ? dflt : dflt.msg)

const trapped = await fresh()
let trap: unknown = null
try {
  call(trapped, onlyInput('todo'))
} catch (e) {
  trap = e
}
check('an unfinished check traps the module', trap instanceof WebAssembly.RuntimeError, String(trap))
const panic = read(trapped, trapped.ks_panic_msg())
check('the same instance still reports the panic text', panic.includes('construct your allocator'), panic)
const shown = trapMessage(panic)
check('the host words the trap as "not implemented yet"', /^not implemented yet: construct your allocator \(src\/lib\.rs:\d+:\d+\)$/.test(shown), shown)

let v1: unknown = null
try {
  await runLabWasm(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
} catch (e) {
  v1 = e
}
check('a whole-module v1 run of a module with an unfinished check throws LabTrapError', v1 instanceof LabTrapError, v1 instanceof Error ? v1.name : String(v1))

process.exit(failed === 0 ? 0 : 1)
