"""Record LAB-3's runs: execute each in the Bench image (or Node, for INS-interp) and write runs/<RUN-id>.json.

    python3 labs/reference/mini-plinth/record_runs.py --private DIR [RUN-id ...]

Follows runs/README.md: verdict lines are copied from the tools' output, never typed; every input is hashed;
every output is written under runs/<RUN-id>/ with its SHA-256 and size; the image is named by digest and capped
at 6 GiB; host paths become <sandbox>. Inputs from the private companion (reference solutions, which never
enter this repository) are recorded by name and SHA-256 only. DIR is that companion's LAB-3 folder, laid out as
the learner repository (DIR/labs/LAB-3/Lab3/Proofs.lean and so on).
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[3]
LAB = REPO / "labs" / "LAB-3"
IMAGE = "statespace-bench@sha256:701be043775cc261e84a92fe985ef94d524617fdb3d53e2255187932d2ec0f9a"
TASK = "W2-T39"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def environment() -> dict[str, Any]:
    mem = 0.0
    try:
        mem = round(int(next(ln for ln in Path("/proc/meminfo").read_text().splitlines() if ln.startswith("MemTotal")).split()[1]) / 1024 / 1024, 1)
    except (OSError, StopIteration, ValueError):
        pass
    docker = subprocess.run(["docker", "version", "--format", "{{.Server.Version}}"], capture_output=True, text=True).stdout.strip()
    return {"os": f"{platform.system()} {platform.release()}", "cpu_count": os.cpu_count(), "ram_gib": mem,
            "cpu_architecture": platform.machine(), "docker": docker, "container": {"image": IMAGE}}


LEAN_ERROR = re.compile(r"^(?:[^\s:][^:\n]*\.lean:\d+:\d+: error(?:\([^)]*\))?: |error(?:\([^)]*\))?: )")


def verdict_lines(out: str) -> list[str]:
    keep = []
    for line in out.splitlines():
        if LEAN_ERROR.match(line) or re.match(r"^'[^']+' (does not depend on any axioms|depends on axioms: \[.*\])$", line) \
                or "Your solution is okay!" in line or re.search(r"kernel (accepts|rejects) the solution", line) or "does not match" in line \
                or line.startswith(("OUT ", "WARNING: Sandbox")):
            keep.append(line)
    return keep


class Rec:
    def __init__(self, run_id: str, title: str, records: str, private: Path | None) -> None:
        self.id, self.title, self.records, self.private = run_id, title, records, private
        self.out_dir = REPO / "runs" / run_id
        self.in_dir = REPO / "runs" / "inputs" / "S3" / run_id
        self.inputs: list[dict[str, Any]] = []
        self.configs: list[dict[str, Any]] = []
        self.outputs: list[dict[str, Any]] = []
        self.notes: list[str] = []
        self.values: dict[str, Any] = {}
        self.scratch = Path(tempfile.mkdtemp(prefix=f"rec-{run_id}-"))
        self.work = self.scratch / "work"
        if self.out_dir.exists():
            shutil.rmtree(self.out_dir)
        self.out_dir.mkdir(parents=True)

    # -- inputs
    def public_input(self, rel_in_work: str, text: str, source: str, role: str = "source") -> None:
        """A file written for this run: it is committed under runs/inputs/S3/<RUN-id>/."""
        self.in_dir.mkdir(parents=True, exist_ok=True)
        dest = self.in_dir / Path(rel_in_work).name
        dest.write_text(text, encoding="utf-8")
        (self.work / rel_in_work).parent.mkdir(parents=True, exist_ok=True)
        (self.work / rel_in_work).write_text(text, encoding="utf-8")
        data = dest.read_bytes()
        self.inputs.append({"path": dest.relative_to(REPO).as_posix(), "sha256": sha(data), "bytes": len(data), "role": role, "source": source})

    def repo_input(self, rel: str, role: str = "source") -> None:
        data = (REPO / rel).read_bytes()
        self.inputs.append({"path": rel, "sha256": sha(data), "bytes": len(data), "role": role})

    def derived_input(self, rel_in_work: str, text: str, what: str, role: str = "mutant") -> None:
        """A file derived from the private companion: written to the scratch copy only, recorded by hash."""
        (self.work / rel_in_work).parent.mkdir(parents=True, exist_ok=True)
        (self.work / rel_in_work).write_text(text, encoding="utf-8")
        data = text.encode("utf-8")
        self.inputs.append({"name": f"derived from the private companion: {what}", "sha256": sha(data), "bytes": len(data), "role": role})

    def private_input(self, rel: str, role: str = "solution") -> None:
        assert self.private is not None
        data = (self.private / rel).read_bytes()
        self.inputs.append({"name": f"private companion: {rel}", "sha256": sha(data), "bytes": len(data), "role": role})

    def lab_project(self, *, overlay: bool) -> None:
        shutil.copytree(LAB, self.work, ignore=shutil.ignore_patterns(".lake", "target", "rust", "_root", "corpus"), dirs_exist_ok=True)
        for p in sorted(LAB.rglob("*.lean")) + [LAB / "lakefile.toml", LAB / "lean-toolchain", LAB / "lake-manifest.json"]:
            if ".lake" not in p.parts:
                self.repo_input(p.relative_to(REPO).as_posix(), "template")
        if overlay:
            assert self.private is not None
            src = self.private / "labs" / "LAB-3"
            for p in sorted(src.rglob("*.lean")):
                rel = p.relative_to(src)
                (self.work / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(p, self.work / rel)
                self.private_input(f"labs/LAB-3/{rel.as_posix()}")

    # -- execution
    def lean(self, cfg: str, script: str, purpose: str, *, keep: list[str] | None = None) -> tuple[int, str, list[str]]:
        name = f"ssrec-{self.id.lower()}-{cfg}"
        argv = ["docker", "run", "--rm", "--name", name, "--memory=6g", "--network", "none", "-v", f"{self.work}:/w", "-w", "/w", IMAGE, "sh", "-c", script]
        started = now()
        t0 = time.monotonic()
        done = subprocess.run(argv, capture_output=True, text=True)
        secs = round(time.monotonic() - t0, 3)
        out = (done.stdout + done.stderr).replace(str(self.work), "<sandbox>/work")
        log = self.out_dir / f"{cfg}.log"
        log.write_text(out, encoding="utf-8")
        lines = verdict_lines(out)
        if keep is not None:
            lines = [ln for ln in lines if any(k in ln for k in keep)]
        self.outputs.append({"path": log.relative_to(REPO).as_posix(), "sha256": sha(log.read_bytes()), "bytes": log.stat().st_size, "kind": "log"})
        rec_argv = [a if a != f"{self.work}:/w" else "<sandbox>/work:/w" for a in argv]
        self.configs.append({"id": cfg, "origin": "recorded", "purpose": purpose, "engine": "lean", "version": "4.35.0", "image": IMAGE,
                             "started_at": started, "duration_s": secs, "argv": rec_argv, "budget": {"container_memory": "6g", "network": "none"},
                             "exit_code": done.returncode, "verdict_lines": lines, "outputs": [log.relative_to(REPO).as_posix()]})
        return done.returncode, out, lines

    def toolchain(self) -> tuple[str, str]:
        script = "lean --version; sha256sum $(lean --print-prefix)/bin/lean"
        out = subprocess.run(["docker", "run", "--rm", "--memory=6g", "--network", "none", IMAGE, "sh", "-c", script], capture_output=True, text=True).stdout.splitlines()
        return out[0].strip(), out[1].split()[0]

    def write(self, *, primary: str, engine: str = "lean", version: str = "4.35.0", version_string: str | None = None, binary: str, binary_sha: str,
              image: str | None = IMAGE, exit_code: int | None = None, verdict: list[str] | None = None) -> None:
        prim = next(c for c in self.configs if c["id"] == primary)
        for c in self.configs:
            c["inputs"] = [i for i in self.inputs if c.get("input_filter", lambda _i: True)(i)]
            c.pop("input_filter", None)
        record = {
            "id": self.id, "title": self.title, "task": TASK, "origin": "recorded", "records": self.records,
            "engine": engine, "version": version, "version_string": version_string or prim.get("version_string") or version,
            "binary": binary, "binary_sha256": binary_sha, "image": image, "recorded_at": now(),
            "started_at": self.configs[0]["started_at"], "duration_s": round(sum(c["duration_s"] for c in self.configs), 3),
            "argv": [c["argv"] for c in self.configs], "inputs": self.inputs, "budget": prim["budget"],
            "exit_code": prim["exit_code"] if exit_code is None else exit_code, "verdict_lines": prim["verdict_lines"] if verdict is None else verdict,
            "outputs": self.outputs, "values": self.values, "environment": environment(), "primary_config": primary, "configs": self.configs,
            "notes": self.notes + [
                "<sandbox>/work in argv stands for a scratch copy of the files listed in inputs.",
                "Inputs named 'private companion: ...' are reference solutions: they never enter the public repository, so the record keeps their SHA-256 and size only.",
                "argv holds one command line per configuration, in configs order; exit_code and verdict_lines at the top level are the primary configuration's.",
            ],
        }
        (REPO / "runs" / f"{self.id}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        shutil.rmtree(self.scratch, ignore_errors=True)
        print(f"wrote runs/{self.id}.json: {len(self.configs)} configurations")


def build(rec: Rec, targets: str) -> str:
    return f"lake build {targets} >/dev/null 2>&1 || lake build {targets}"


# --------------------------------------------------------------------------------------------- the runs


def run_bigsmall(private: Path | None) -> None:
    rec = Rec("RUN-lean-bigsmall", "Big-step and S3.L4's draft small-step relation disagree on Transfer(a, b, 130) from a = 100: guardFailed versus stuck at the false guard; the full relation steps to the same error",
              "curriculum/S03-semantics.md section 2.5 and SP-3.4; S3.L4 cell 2 (INS-interp)", private)
    rec.lab_project(overlay=False)
    text = """import MiniPlinthRef
open MiniPlinth MiniPlinthRef

/-- S3.L4 cell 2: from mint -100 · a 100 · b 0, `Transfer(a, b, 130)`. -/
def call130 : Call := ⟨"Transfer", [.acct a, .acct b, .int 130]⟩
def env130 : Env := [("from", .acct a), ("to", .acct b), ("amount", .int 130)]

/-- Big step: the reference evaluator answers guardFailed. -/
theorem bigstep_guardFailed : exec refProgram call130 s0 = .error (.guardFailed "Transfer") := by decide

/-- The draft relation reaches the guard configuration... -/
theorem draft_reaches_guard : DraftStep Policy.reference (.bind transfer call130.args s0) (.guard transfer env130 s0) :=
  .bind_ok (by decide) (by decide) (by decide)

/-- ...whose guard is false, and then has no rule: the configuration is stuck. -/
theorem draft_stuck : ∀ c', ¬ DraftStep Policy.reference (.guard transfer env130 s0) c' := by
  intro c' h
  cases h with
  | guard_true hg => exact absurd hg (by decide)

theorem stuck_not_final : ¬ Final (.guard transfer env130 s0) := by
  intro h; cases h

/-- The full relation has the rule from a false guard to `err`, and it agrees with the big step. -/
theorem full_steps_to_error : Step Policy.reference (.guard transfer env130 s0) (.err (.guardFailed "Transfer")) :=
  .guard_false_error (by decide) rfl

#print axioms bigstep_guardFailed
#print axioms draft_reaches_guard
#print axioms draft_stuck
#print axioms stuck_not_final
#print axioms full_steps_to_error
"""
    rec.public_input("BigSmall.lean", text, "written for curriculum/S03-semantics.md section 2.5 (SP-3.4), over the template's reference module")
    rc, out, lines = rec.lean("bigsmall", build(rec, "MiniPlinthRef") + " && lake env lean BigSmall.lean", "the draft relation stuck where the big step and the full relation give guardFailed")
    lean_line, lean_sha = rec.toolchain()
    rec.values = {"exit_code": rc, "big_step": "guardFailed \"Transfer\"", "draft": "stuck at the guard configuration (no rule for a false guard)",
                  "full": "steps to err (guardFailed \"Transfer\")",
                  "axioms": {m.group(1): (m.group(2) or "").split(", ") if m.group(2) else [] for m in re.finditer(r"'([^']+)' (?:does not depend on any axioms|depends on axioms: \[(.*)\])", out)}}
    rec.write(primary="bigsmall", version_string=lean_line, binary="bin/lean of the Lean 4.35.0 toolchain in the Bench image", binary_sha=lean_sha)


def run_postings(private: Path | None) -> None:
    rec = Rec("RUN-lean-postings-refine", "The reference's postings refine Stage 2's ledger: for distinct existing user accounts and a positive amount, Transfer commits as Stage 2's transfer, or fails its guard exactly when Stage 2 leaves the ledger unchanged; with one account named twice the square does not commute",
              "CL-3.4 (curriculum/S03-semantics.md sections 3 (S3.L6 segment 3) and 7)", private)
    rec.lab_project(overlay=False)
    text = (REPO / "labs" / "reference" / "mini-plinth" / "PostingsRefine.lean").read_text()
    (rec.work / "PostingsRefine.lean").write_text(text)
    rec.repo_input("labs/reference/mini-plinth/PostingsRefine.lean", "proof")
    rc, out, lines = rec.lean("refine", build(rec, "MiniPlinthRef") + " && lake env lean PostingsRefine.lean", "the course's proof of postings_refine_ledger and the self-transfer counterexample")
    lean_line, lean_sha = rec.toolchain()
    rec.values = {"exit_code": rc, "axioms": {m.group(1): (m.group(2) or "").split(", ") if m.group(2) else []
                  for m in re.finditer(r"'([^']+)' (?:does not depend on any axioms|depends on axioms: \[(.*)\])", out)},
                  "needed_hypothesis": "u₁ ≠ u₂", "outside": "a self-transfer: the reference leaves a at 10 while Stage 2's transfer gives (5, 15)"}
    rec.write(primary="refine", version_string=lean_line, binary="bin/lean of the Lean 4.35.0 toolchain in the Bench image", binary_sha=lean_sha)


def run_step_invariant(private: Path) -> None:
    rec = Rec("RUN-lean-step-invariant", "Every successful step of a well-typed program keeps Inv: post_inv, the five operation lemmas, covers_sound and step_preserves_inv elaborate against the pinned statements, comparator accepts all eight, and the roadmap's Transfer elaborates as a Cmd",
              "CL-3.3; curriculum/S03-semantics.md sections 2 and 2.6; S3.L1 cell 1 (INS-interp); S3.L6 cells 1 and 2 (INS-goal-replay)", private)
    rec.lab_project(overlay=True)
    names = ["post_inv", "deposit_inv", "move_inv", "hold_inv", "capture_inv", "release_inv", "covers_sound", "step_preserves_inv"]
    ax = "import Lab3.Proofs\n" + "".join(f"#print axioms Lab3.{n}\n" for n in names)
    rec.public_input("Axioms.lean", ax, "written by the recorder: one #print axioms per pinned theorem")
    cfg = {"challenge_module": "Lab3Challenge.Statements", "solution_module": "Lab3.Proofs", "theorem_names": [f"Lab3.{n}" for n in names],
           "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]}
    rec.public_input("comparator-step.json", json.dumps(cfg, indent=2) + "\n", "the configuration statespace check lab3.4 and lab3.5 write", "config")
    cell = (REPO / "content" / "stages" / "S3" / "S3.L1.md").read_text()
    m = re.search(r":::instrument ins=INS-interp cell=1 recorded=RUN-lean-step-invariant.*?```lean\n(.*?)```", cell, flags=re.S)
    assert m is not None
    rec.public_input("S3L1Cell1.lean", "import Lab3.Syntax\nopen MiniPlinth Lab3\n\n" + m.group(1) + "\n#check transfer\n", "content/stages/S3/S3.L1.md, INS-interp cell 1, verbatim after two header lines")
    rc1, out1, l1 = rec.lean("proofs", build(rec, "Lab3.Proofs") + " && lake env lean Axioms.lean", "the eight pinned theorems built, with their axioms")
    rc2, out2, l2 = rec.lean("comparator", "lake comparator --config comparator-step.json --inadvisably-no-sandbox", "comparator on all eight against the frozen challenge, sandbox off")
    rc3, out3, l3 = rec.lean("s3l1-cell1", "lake env lean S3L1Cell1.lean", "the roadmap's Transfer as a value of the learner's Cmd type")
    lean_line, lean_sha = rec.toolchain()
    rec.values = {"axioms": {m.group(1): (m.group(2) or "").split(", ") if m.group(2) else [] for m in re.finditer(r"'([^']+)' (?:does not depend on any axioms|depends on axioms: \[(.*)\])", out1)},
                  "comparator": "Your solution is okay!" if "Your solution is okay!" in out2 else "rejected", "theorems": len(names),
                  "s3l1_cell1_exit_code": rc3, "grind": False}
    rec.notes.append("Comparator ran with --inadvisably-no-sandbox: bubblewrap cannot start in a default Docker container (RUN-lean-bwrap-docker); Lean prints 'WARNING: Sandbox disabled, this run is not trustworthy', copied in the log.")
    rec.notes.append("The proofs use no grind; omega closes the arithmetic, which adds no axiom beyond the permitted three.")
    rec.write(primary="comparator", version_string=lean_line, binary="bin/lean of the Lean 4.35.0 toolchain in the Bench image", binary_sha=lean_sha)


def run_golden_redef(private: Path) -> None:
    rec = Rec("RUN-lean-golden-redef", "SP-3.5: an evaluator redefined to fail every call passes comparator on step_preserves_inv, vacuously, and fails golden_transfer_ok",
              "SP-3.5; curriculum/S03-semantics.md section 3 (S3.L9 cell 2, INS-bench-lean)", private)
    rec.lab_project(overlay=True)
    eval_path = rec.work / "Lab3" / "Eval.lean"
    text = eval_path.read_text()
    cell = (REPO / "content" / "stages" / "S3" / "S3.L9.md").read_text()
    m = re.search(r"```lean\n(def exec \(p : Program\).*?)\n\ntheorem golden_transfer_ok", cell, flags=re.S)
    assert m is not None
    redef = m.group(1).strip() + "\n"
    i = text.index("/-- The evaluator, under `policy`. -/")
    text = text[:i] + "/-- SP-3.5: the evaluator redefined (S3.L9 cell 2, verbatim). -/\n" + redef + "\nend Lab3\n"
    rec.public_input("ExecRedef.lean", redef, "content/stages/S3/S3.L9.md, INS-bench-lean cell 2: the redefined exec, verbatim", "mutant")
    rec.derived_input("Lab3/Eval.lean", text, "labs/LAB-3/Lab3/Eval.lean with exec replaced by ExecRedef.lean")
    proofs = rec.work / "Lab3" / "Proofs.lean"
    ptext = proofs.read_text()
    j = ptext.index("/-! ## The assembly -/")
    vac = """theorem step_preserves_inv (p : Program) (c : Call) (s s' : State) (o : Output) (es : List Effect)
    (hp : p.WellTyped) (hs : Inv s) (h : exec p c s = .ok (s', o, es)) :
    Inv s' := by
  simp [exec] at h

end Lab3
"""
    rec.public_input("VacuousStep.lean", vac.replace("\nend Lab3\n", "\n"), "written by the recorder: step_preserves_inv proved vacuously over the redefined exec", "mutant")
    rec.derived_input("Lab3/Proofs.lean", ptext[:j] + vac, "labs/LAB-3/Lab3/Proofs.lean up to its per-operation lemmas, then VacuousStep.lean")
    cfg = {"challenge_module": "Lab3Challenge.Statements", "solution_module": "Lab3.Proofs", "theorem_names": ["Lab3.step_preserves_inv"],
           "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]}
    rec.public_input("comparator-step.json", json.dumps(cfg, indent=2) + "\n", "the configuration statespace check lab3.5 writes, for step_preserves_inv", "config")
    pool = json.loads((LAB / "challenge" / "goldens.json").read_text())
    sys.path.insert(0, str(REPO / "bench"))
    from statespace.labs import lab3

    g = next(x for x in pool["goldens"] if x["pool"] == "eval" and x["id"] == "e001" and lab3.policy_key(x["policy"]) == "reject/allow/error/unbounded")
    gtext, _ = lab3.golden_module(pool, kind="eval", header="import Lab3.Eval\nopen Lab3", evaluator="Lab3.exec", program_type="Lab3.Program",
                                  goldens=[dict(g, theorem="golden_transfer_ok")], namespace="Lab3Gen", cmd_type="Lab3.Cmd")
    rec.public_input("Lab3Gen/Goldens.lean", gtext, "golden e001 of labs/LAB-3/challenge/goldens.json (S3.L9's golden_transfer_ok), rendered as statespace check lab3.3 renders it")
    rc1, out1, l1 = rec.lean("comparator", build(rec, "Lab3.Proofs") + " && lake comparator --config comparator-step.json --inadvisably-no-sandbox", "comparator on step_preserves_inv over the redefined exec")
    rc2, out2, l2 = rec.lean("golden", "lake env lean Lab3Gen/Goldens.lean", "golden_transfer_ok over the redefined exec")
    lean_line, lean_sha = rec.toolchain()
    rec.values = {"comparator": "Your solution is okay!" if "Your solution is okay!" in out1 else "rejected",
                  "golden": "decide proved the proposition false" if "is false" in out2 else "other", "golden_exit_code": rc2}
    rec.notes.append("Comparator ran with --inadvisably-no-sandbox, as in RUN-lean-step-invariant.")
    rec.write(primary="comparator", version_string=lean_line, binary="bin/lean of the Lean 4.35.0 toolchain in the Bench image", binary_sha=lean_sha)


def run_unsafe(private: Path) -> None:
    rec = Rec("RUN-lean-unsafe-cmd", "With force move admitted, ForcePay type-checks and cex_force, the negation of step_preserves_inv for the extended language, is proved by witnesses and decide with no axioms; comparator's export replay cannot reduce decide over String equality, so it rejects the same proofs",
              "SP-3.2; LAB-3.6; curriculum/S03-semantics.md section 3 (S3.L9 cell 1)", private)
    rec.lab_project(overlay=True)
    names = ["force_typechecks", "cex_force"]
    rec.public_input("ForceAxioms.lean", "import Lab3Broken.Cex\n" + "".join(f"#print axioms Lab3.{n}\n" for n in names), "written by the recorder")
    cfg = {"challenge_module": "Lab3Challenge.ForceStatements", "solution_module": "Lab3Broken.Cex", "theorem_names": [f"Lab3.{n}" for n in names],
           "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]}
    rec.public_input("comparator-force.json", json.dumps(cfg, indent=2) + "\n", "a comparator configuration for the two LAB-3.6 theorems", "config")
    probe = """theorem s1 : ("ab" == "ab") = true := by decide
theorem s3 : decide ("ab" = "ac") = false := by decide
theorem n1 : decide ((3 : Nat) = 4) = false := by decide
theorem c1 : decide ('a' = 'b') = false := by decide
"""
    rec.public_input("probe/Rp.lean", probe, "a probe the recorder wrote: decide over String, Nat and Char equality")
    rec.public_input("probe/lakefile.toml", 'name = "rp"\ndefaultTargets = ["Rp"]\n[[lean_lib]]\nname = "Rp"\n', "the probe's lake project", "config")
    rec.public_input("probe/lean-toolchain", "leanprover/lean4:v4.35.0\n", "the probe's toolchain pin", "config")
    rc1, out1, l1 = rec.lean("cex", build(rec, "Lab3Broken.Cex") + " && lake env lean ForceAxioms.lean", "force_typechecks and cex_force elaborate, kernel-checked in process")
    rc2, out2, l2 = rec.lean("comparator", "lake comparator --config comparator-force.json --inadvisably-no-sandbox", "comparator on the same two theorems")
    B = "/opt/elan/toolchains/leanprover--lean4---v4.35.0/bin"
    probe_script = (f"cd probe && lake build >/dev/null 2>&1 && for t in s1 s3 n1 c1; do lake env {B}/leanexport Rp -- $t > /tmp/e.ndjson 2>/dev/null; "
                    f"echo \"OUT $t: $({B}/leanchecker --from-export /tmp/e.ndjson 2>&1 | grep -m1 'kernel')\"; done")
    rc3, out3, l3 = rec.lean("replay-probe", probe_script, "leanexport and leanchecker --from-export, the replay comparator runs, on decide over String, Nat and Char")
    lean_line, lean_sha = rec.toolchain()
    rec.values = {"axioms": {m.group(1): (m.group(2) or "").split(", ") if m.group(2) else [] for m in re.finditer(r"'([^']+)' (?:does not depend on any axioms|depends on axioms: \[(.*)\])", out1)},
                  "witness": "ForcePay(a, b, 1) from mint 0 · a 0 · b 0 commits with a at -1", "comparator": "rejected" if "Your solution is okay!" not in out2 else "accepted",
                  "replay": {ln.split(":", 1)[0][4:]: ("accepts" if "accepts" in ln else "rejects") for ln in out3.splitlines() if ln.startswith("OUT ")}}
    rec.notes.append("The in-process kernel accepts both theorems with no axioms; comparator's default kernel, replaying the export, rejects them. The probe shows why: replay rejects decide over String equality and accepts it over Nat and Char. LAB-3.c6 therefore matches the pinned statements in process (statement check: weak) and keeps comparator for the fixed semantics.")
    rec.notes.append("Comparator ran with --inadvisably-no-sandbox.")
    rec.write(primary="cex", version_string=lean_line, binary="bin/lean of the Lean 4.35.0 toolchain in the Bench image", binary_sha=lean_sha)


def run_safety(private: Path, which: str) -> None:
    other = {"progress": "Typed configurations are final or step", "preservation": "steps keep typing"}[which]
    rec = Rec(f"RUN-lean-{which}", f"{which.capitalize()} for the template's small-step relation ({other}), under any policy, accepted by comparator; with R-cover deleted from the reference type checker it still holds",
              "CL-3.1 and CL-3.2; curriculum/S03-semantics.md section 3 (S3.L5); LAB-3.12 and LAB-3.13", private)
    rec.lab_project(overlay=True)
    cfg = {"challenge_module": "Lab3Challenge.Stretch", "solution_module": "Lab3Stretch.Safety", "theorem_names": [f"Lab3Stretch.{which}"],
           "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]}
    rec.public_input(f"comparator-{which}.json", json.dumps(cfg, indent=2) + "\n", f"the configuration statespace check lab3.{12 if which == 'progress' else 13} writes", "config")
    rec.public_input("Axioms.lean", f"import Lab3Stretch.Safety\n#print axioms Lab3Stretch.{which}\n", "written by the recorder")
    typing = (rec.work / "reference" / "MiniPlinthRef" / "Typing.lean").read_text()
    no_cover = typing.replace("  if covers g x n then .ok () else .error .unguardedDebit", "  .ok ()  -- R-cover deleted")
    assert no_cover != typing
    rc1, out1, l1 = rec.lean("comparator", build(rec, "Lab3Stretch.Safety") + f" && lake env lean Axioms.lean && lake comparator --config comparator-{which}.json --inadvisably-no-sandbox",
                             f"{which} built and matched against the pinned statement")
    rec.public_input("no-rcover/Typing.lean", no_cover, "reference/MiniPlinthRef/Typing.lean with checkCover returning .ok (): R-cover deleted (S3.L5's call)", "mutant")
    shutil.copy2(rec.work / "no-rcover" / "Typing.lean", rec.work / "reference" / "MiniPlinthRef" / "Typing.lean")
    rc2, out2, l2 = rec.lean("no-rcover", build(rec, "Lab3Stretch.Safety") + " && lake env lean Axioms.lean", f"{which} rebuilt over the type checker without R-cover")
    lean_line, lean_sha = rec.toolchain()
    rec.values = {"comparator": "Your solution is okay!" if "Your solution is okay!" in out1 else "rejected",
                  "axioms": {m.group(1): (m.group(2) or "").split(", ") if m.group(2) else [] for m in re.finditer(r"'([^']+)' (?:does not depend on any axioms|depends on axioms: \[(.*)\])", out1)},
                  "without_rcover": "builds" if rc2 == 0 and "sorryAx" not in out2 else "fails"}
    rec.notes.append("Comparator ran with --inadvisably-no-sandbox.")
    rec.write(primary="comparator", version_string=lean_line, binary="bin/lean of the Lean 4.35.0 toolchain in the Bench image", binary_sha=lean_sha)


def run_interp(_private: Path | None) -> None:
    rec = Rec("RUN-interp-goldens", "INS-interp, the course's TypeScript port of the reference semantics, agrees with every kernel-checked golden of LAB-3's pool and gives the S3 lesson cells their outcomes",
              "SEAM-13 and GATE-interp; S3.L2 cells 1 and 2, S3.L3 cells 1 and 2, S3.L7 cells 1 and 3 (INS-interp); S10.L1 and S10.L2 (INS-lane-a)", None)
    for rel in ["labs/LAB-3/challenge/goldens.json", *sorted(p.relative_to(REPO).as_posix() for p in (REPO / "packages" / "interp").rglob("*.ts"))]:
        rec.repo_input(rel, "source" if "src" in rel else ("fixture" if rel.endswith(".json") else "test"))
    cells = []
    for lesson in ("S3.L2", "S3.L3", "S3.L7", "S3.L9"):
        text = (REPO / "content" / "stages" / "S3" / f"{lesson}.md").read_text()
        for m in re.finditer(r":::instrument ins=INS-interp cell=(\d+) recorded=(\S+)\n.*?```text\n(.*?)```", text, flags=re.S):
            cells.append({"lesson": lesson, "cell": int(m.group(1)), "recorded": m.group(2), "text": m.group(3)})
    script = "import { runCell } from '../../../../packages/interp/src/index.ts'\nconst cells = " + json.dumps(cells, indent=1) + "\nfor (const c of cells) {\n  console.log(`== ${c.lesson} cell ${c.cell} (recorded ${c.recorded})`)\n  for (const line of runCell(c.text)) console.log(`OUT ${line.text}`)\n}\n"
    dest = rec.in_dir / "cells.mjs"
    rec.in_dir.mkdir(parents=True, exist_ok=True)
    dest.write_text(script)
    data = dest.read_bytes()
    rec.inputs.append({"path": dest.relative_to(REPO).as_posix(), "sha256": sha(data), "bytes": len(data), "role": "script", "source": "the S3 lessons' INS-interp cells, verbatim, written by the recorder"})
    node = shutil.which("node") or "node"
    version = subprocess.run([node, "--version"], capture_output=True, text=True).stdout.strip()
    for cfg, argv, purpose in (("goldens", [node, "--test", "packages/interp/test/goldens.test.ts", "packages/interp/test/cells.test.ts"], "every golden of the pool, and the lesson cells' keys, as tests"),
                               ("cells", [node, dest.relative_to(REPO).as_posix()], "what the evaluator, typing and posting views print for each S3 lesson cell")):
        started = now()
        t0 = time.monotonic()
        done = subprocess.run(argv, cwd=REPO, capture_output=True, text=True)
        secs = round(time.monotonic() - t0, 3)
        out = done.stdout + done.stderr
        log = rec.out_dir / f"{cfg}.log"
        log.write_text(out)
        rec.outputs.append({"path": log.relative_to(REPO).as_posix(), "sha256": sha(log.read_bytes()), "bytes": log.stat().st_size, "kind": "log"})
        lines = [ln for ln in out.splitlines() if ln.startswith(("# tests", "# pass", "# fail", "# evaluator goldens agreed", "# typing goldens agreed", "ok ", "not ok ", "== ", "OUT "))]
        rec.configs.append({"id": cfg, "origin": "recorded", "purpose": purpose, "engine": "node", "version": version.lstrip("v"), "image": None,
                            "started_at": started, "duration_s": secs, "argv": ["node", *argv[1:]], "budget": {}, "exit_code": done.returncode,
                            "verdict_lines": lines, "outputs": [log.relative_to(REPO).as_posix()]})
        if cfg == "goldens":
            agreed = {m.group(1): int(m.group(2)) for m in re.finditer(r"# (evaluator|typing) goldens agreed: (\d+)", out)}
            rec.values.update({"evaluator_goldens": agreed.get("evaluator"), "typing_goldens": agreed.get("typing"),
                               "n": (agreed.get("evaluator") or 0) + (agreed.get("typing") or 0),
                               "tests_passed": int(re.search(r"# pass (\d+)", out).group(1)), "tests_failed": int(re.search(r"# fail (\d+)", out).group(1))})
        else:
            rec.values["cells"] = {}
            current = None
            for ln in out.splitlines():
                if ln.startswith("== "):
                    current = ln[3:].split(" (")[0]
                    rec.values["cells"][current] = []
                elif ln.startswith("OUT ") and current:
                    rec.values["cells"][current].append(ln[4:])
    # The pool itself: every golden kernel-checked against the reference, as build_goldens.py checks it.
    sys.path.insert(0, str(REPO / "bench"))
    from statespace.labs import lab3

    pool = json.loads((LAB / "challenge" / "goldens.json").read_text())
    shutil.copytree(LAB, rec.work, ignore=shutil.ignore_patterns(".lake", "target", "rust", "_root", "corpus"), dirs_exist_ok=True)
    policies = []
    for g in pool["goldens"]:
        if g["pool"] == "eval" and lab3.policy_key(g["policy"]) not in policies:
            policies.append(lab3.policy_key(g["policy"]))
    ref_eval = [dict(g, theorem=f"ref_{g['id']}_p{policies.index(lab3.policy_key(g['policy']))}") for g in pool["goldens"] if g["pool"] == "eval"]
    header = "import MiniPlinthRef\nopen MiniPlinth MiniPlinthRef\n"
    text_e, _ = lab3.golden_module(pool, kind="eval", header=header, evaluator="execWith {policy}", goldens=ref_eval)
    text_t, _ = lab3.golden_module(pool, kind="typing", header=header, evaluator="typecheck")
    rec.public_input("Gen/RefEval.lean", text_e, "every evaluator golden of labs/LAB-3/challenge/goldens.json as a theorem over the reference, rendered by bench/statespace/labs/lab3.py as build_goldens.py renders it")
    rec.public_input("Gen/RefTyping.lean", text_t, "every typing golden as a theorem over the reference type checker, rendered the same way")
    rc, out, _lines = rec.lean("pool-kernel", "lake build MiniPlinthRef >/dev/null 2>&1; lake env lean Gen/RefEval.lean && lake env lean Gen/RefTyping.lean",
                               "the pool kernel-checked: every golden, under every policy, closed by decide against the reference")
    rec.values["pool_kernel"] = {"exit_code": rc, "goldens": len(ref_eval) + sum(1 for g in pool["goldens"] if g["pool"] == "typing"),
                                 "axiom_free": sum(1 for ln in out.splitlines() if "does not depend on any axioms" in ln)}
    probe = """inductive V where
  | i (n : Int)
  | b (x : Bool)

def wildcard (o : Option V) : Option V :=
  match o with
  | some (.i n) => some (.i (-n))
  | _ => none

set_option backward.match.sparseCases false in
def wildcardNoSparse (o : Option V) : Option V :=
  match o with
  | some (.i n) => some (.i (-n))
  | _ => none

#print axioms wildcard
#print axioms wildcardNoSparse
"""
    rec.public_input("SparseCases.lean", probe, "a probe the recorder wrote: one match with a wildcard, compiled with and without backward.match.sparseCases")
    rc2, out2, _ = rec.lean("sparse-cases", "lean SparseCases.lean", "why the goldens use no axioms: the template's lakefile sets backward.match.sparseCases = false")
    rec.values["sparse_cases"] = {m.group(1): (m.group(2) or "").split(", ") if m.group(2) else [] for m in re.finditer(r"'([^']+)' (?:does not depend on any axioms|depends on axioms: \[(.*)\])", out2)}
    rec.notes.append("Configurations goldens and cells ran in Node on the host; pool-kernel and sparse-cases ran Lean 4.35.0 in the Bench image.")
    node_sha = sha(Path(os.path.realpath(node)).read_bytes())
    rec.notes.append("INS-interp runs in Node here, as GATE-interp runs it; in the tab it runs the same sources. Its outcomes and the goldens' are compared as canonical JSON.")
    rec.write(primary="goldens", engine="node", version=version.lstrip("v"), version_string=version, binary="the node binary on the recording host's PATH", binary_sha=node_sha, image=None)


RUNS = {
    "RUN-lean-bigsmall": run_bigsmall,
    "RUN-lean-postings-refine": run_postings,
    "RUN-lean-step-invariant": run_step_invariant,
    "RUN-lean-golden-redef": run_golden_redef,
    "RUN-lean-unsafe-cmd": run_unsafe,
    "RUN-lean-progress": lambda p: run_safety(p, "progress"),
    "RUN-lean-preservation": lambda p: run_safety(p, "preservation"),
    "RUN-interp-goldens": run_interp,
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--private", type=Path, default=None)
    ap.add_argument("runs", nargs="*")
    args = ap.parse_args()
    for run_id in args.runs or list(RUNS):
        RUNS[run_id](args.private.resolve() if args.private else None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
