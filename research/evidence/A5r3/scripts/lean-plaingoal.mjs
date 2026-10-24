// A5 spike: extract Lean goal states at build time via the Lean language server ($/lean/plainGoal). No extra packages.
// Usage: node lean-plaingoal.mjs <dir-with-Ledger.lean>
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2]; const file = 'Ledger.lean'; const text = fs.readFileSync(path.join(dir, file), 'utf8');
const p = spawn('docker', ['run', '-i', '--rm', '--network', 'none', '-v', '/etc/localtime:/etc/localtime:ro', '-v', `${dir}:/w`, '-w', '/w', 'ss-lean:4.35.0', 'lean', '--server']);
let buf = Buffer.alloc(0); const pending = new Map(); let id = 0;
p.stdout.on('data', (d) => { buf = Buffer.concat([buf, d]); for (;;) { const h = buf.indexOf('\r\n\r\n'); if (h < 0) break; const len = +/Content-Length: (\d+)/i.exec(buf.slice(0, h).toString())[1]; if (buf.length < h + 4 + len) break; const msg = JSON.parse(buf.slice(h + 4, h + 4 + len).toString()); buf = buf.slice(h + 4 + len); if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } } });
p.stderr.on('data', (d) => process.stderr.write(d));
const send = (m) => { const s = JSON.stringify({ jsonrpc: '2.0', ...m }); p.stdin.write(`Content-Length: ${Buffer.byteLength(s)}\r\n\r\n${s}`); };
const req = (method, params) => new Promise((r) => { const i = ++id; pending.set(i, r); send({ id: i, method, params }); });
const uri = 'file:///w/' + file; const t0 = Date.now();
await req('initialize', { processId: null, rootUri: 'file:///w', capabilities: {} });
send({ method: 'initialized', params: {} });
send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'lean4', version: 1, text } } });
// 0-based positions: before each tactic of transfer_conserves and run_conserves, and inside the induction cases
const probes = [ ['transfer_conserves: before `unfold`', 14, 2], ['transfer_conserves: before `split`', 15, 2], ['run_conserves: before `induction`', 32, 2], ['run_conserves: nil case, before `rfl`', 33, 11], ['run_conserves: cons case, before `simp`', 34, 20] ];
for (const [label, line, character] of probes) {
  const r = await req('$/lean/plainGoal', { textDocument: { uri }, position: { line, character } });
  console.log(`--- ${label} (t=${Date.now() - t0} ms)`); console.log(r.result ? r.result.goals.join('\n\n') : JSON.stringify(r.error || r.result));
}
p.kill(); process.exit(0);
