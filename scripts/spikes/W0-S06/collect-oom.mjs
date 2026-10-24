#!/usr/bin/env node
// collect-oom.mjs: the kernel's out-of-memory report for one container, read after its run.
//
//   node collect-oom.mjs <out-file> <container-id-file> <start-epoch> <end-epoch>
//
// When a memory cap kills a process, Lake's own output names only an exit code (137) and prints
// "<checker> kernel rejected the solution" for the killed checker. The kernel's log says which process was
// killed and how much anonymous memory the container held. An event is attributed to the container by its
// id (the cgroup name in the kernel's lines, which this script replaces by <container> in what it writes), so
// another job's kill in the same minutes is never taken for this one. Reading the log needs journalctl and
// the right to read it; without them the file says so and records nothing else. Needs Node 18 or later.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const [out, idFile, start, end] = process.argv.slice(2);
if (!out || !idFile || !start || !end) {
  console.error('usage: node collect-oom.mjs <out-file> <container-id-file> <start-epoch> <end-epoch>');
  process.exit(64);
}
const until = Number(end) + 2;
const iso = (e) => new Date(Number(e) * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
const head = `# kernel log, ${iso(start)} to ${iso(until)}; events are attributed to the container by its id`;
const finish = (lines) => {
  writeFileSync(out, [head, ...lines].join('\n') + '\n');
  process.exit(0);
};

let cid = '';
try { cid = readFileSync(idFile, 'utf8').trim(); } catch { /* handled below */ }
if (!/^[0-9a-f]{64}$/.test(cid)) finish(['# no container id: nothing attributed']);

const r = spawnSync('journalctl', ['-k', '--no-pager', '-o', 'short-unix', '--since', `@${start}`, '--until', `@${until}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
if (r.error || r.status !== 0) finish([`# not readable: ${r.error ? (r.error.code ?? r.error.message) : String(r.stderr).split('\n')[0]}`]);
// without the right group journalctl exits 0 and shows nothing from the system: an empty report would then mean nothing
if (/not seeing messages from other users/.test(String(r.stderr))) finish(['# not readable: this user is not in group adm or systemd-journal, so journalctl shows no kernel messages']);

const msgs = r.stdout.split('\n').map((l) => l.replace(/^\d+\.\d+ \S+ kernel: /, ''));
// one event runs from "<task> invoked oom-killer" to "... Killed process <pid> (<name>) ..."; the kernel serializes them
const events = [];
let cur = null;
for (const m of msgs) {
  if (/ invoked oom-killer: /.test(m)) { cur = { lines: [m] }; continue; }
  if (!cur) continue;
  cur.lines.push(m);
  if (/^(Memory cgroup out of memory|Out of memory): Killed process /.test(m)) { events.push(cur); cur = null; }
}
const keep = (m) => / invoked oom-killer: |^memory: usage |^swap: usage |^Memory cgroup stats for |^anon \d+$|^file \d+$|^oom-kill:|Killed process /.test(m);
const mine = events.filter((e) => e.lines.some((m) => m.includes(cid)));
const lines = mine.flatMap((e) => e.lines.filter(keep).map((m) => m.split(cid).join('<container>')));
finish(lines.length > 0 ? lines : ['# no out-of-memory event for this container']);
