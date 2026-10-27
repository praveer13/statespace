"""reply.py TAG: AUD-8.2's variant pair v2 (content/audit/AUD-8.2.yaml). Run the course's reference simulator
(bench/statespace/sim.py, mounted read-only) on seed 1 with its reference machine as it stands (q5), or with the reply
branch of ReferenceMachine.step replaced by the case's (q6, the block between the "--- q6" markers, verbatim); write the
NDJSON trace, print it numbered, run the end-state suite the agent ran, print the harness's own monitor line, and
validate the trace against labs/LAB-8/reference/OutboxRef.tla with `statespace trace validate`, as
RUN-tlc-trace-validation does. Every printed line is prefixed with "[TAG] ".
"""
import subprocess, sys
from statespace import sim

TAG = sys.argv[1]
out = lambda line: print(f"[{TAG}] {line}", flush=True)

class Machine(sim.ReferenceMachine):
    def step(self, inp):
        kind = inp[0]
# --- q6 begin
        if kind == "reply":
            _, cmd, key, _att = inp
            i = self.intents.get(cmd)
            if i and not i.stored and not i.acked and i.key == key:
                i.stored = i.acked = True
                return [("ack", cmd), ("store", cmd)]
            return []
# --- q6 end
        return super().step(inp)

if TAG == 'q6':
    sim.ReferenceMachine = Machine        # run() builds the reference world with this name

world_end = {}
orig_run = sim._World.run
def run_and_keep(self):
    o = orig_run(self)
    world_end['db'] = {c: (r.status, r.stored) for c, r in self.db.items()}
    world_end['charges'] = dict(self.charges)
    return o
sim._World.run = run_and_keep

o = sim.run(sim.Config(seed=1))
path = f'traces/{TAG}-seed-1.ndjson'
import os
os.makedirs('traces', exist_ok=True)
open(path, 'w').write(o.ndjson())
out(f"seed 1: {len(o.log)} trace lines written to {path}")
for n, line in enumerate(o.log, 1):
    out(f"{n:6}\t{line}")
status, stored = world_end['db']['c1']
charged = world_end['charges'].get('c1', 0)
ok = status == sim.ACKED and stored and charged == 1
out(f"suite: c1 {status}, result stored {stored}, charged {charged} time(s): {'ok' if ok else 'FAILED'}")
out(f"monitor: {sim.describe(1, o)}")
r = subprocess.run([sys.executable, '-m', 'statespace', 'trace', 'validate', 'labs/LAB-8/reference/OutboxRef.tla', path], capture_output=True, text=True)
for line in (r.stdout + r.stderr).splitlines():
    out(line)
out(f"validate exit={r.returncode}")
