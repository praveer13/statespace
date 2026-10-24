"""statespace doctor: compare the Bench with its pins, report the sandbox, print a receipt-ready block.

Spine section 9.6; ARCHITECTURE.md section 11.3; labs/README.md section 4.3. Run it first, and again
after any upgrade. It reads; it never installs, downloads or edits anything.

What it does
  * compares each tool it finds with the pin: the version string, verbatim as the tool prints it, and
    the SHA-256 of the binary, jar or native library that ran (labs/TOOLS.md section 1);
  * runs the Lake-shaped sandbox canary and reports the sandbox as on, off or failed. The sandbox is
    recorded and never required, so a failed sandbox does not make the run red (spine section 9.2);
  * prints `environment` and `tools`, the two parts of a receipt@1 that describe the machine, and checks
    them against the receipt schema when the schema package can load.

Green means the environment matches the pins. It checks no proof.

Exit status: 0 green, 1 not green, 2 a usage error.

Where the pins come from. Each is a value that a recorded run printed or hashed, copied here and not
typed from memory; the comment on a group names the run. Hashes are those of the x86_64 Linux build,
the one the Bench image is built for: on another architecture a hash has no pin, and doctor says so
instead of passing. The hashes of tools whose releases publish no checksum of their binaries (the Rust
toolchain, Java, the Z3 wheel's files) were first taken by runs/RUN-doctor-devcontainer.json.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import tomllib
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from importlib.metadata import PackageNotFoundError, version as distribution_version
from pathlib import Path
from typing import Any

from . import __version__

PINNED_ARCH = "x86_64"
LEAN_TOOLCHAIN = "leanprover/lean4:v4.35.0"
LEAN_TOOLCHAIN_DIR = "leanprover--lean4---v4.35.0"  # elan's directory name for it: "/" becomes "--", ":" becomes "---"
RUST_TOOLCHAIN = "1.96.0"
RUST_WASM_TARGET = "wasm32-unknown-unknown"
RUST_CRATES = {"tokio-postgres": "0.7.18", "testcontainers": "0.28.0", "pg_query": "6.2.1", "proptest": "1.12.0"}
POSTGRES_VERSION_PREFIX = "PostgreSQL 18.6"


@dataclass(frozen=True)
class Pin:
    version: str | None  # the version line, verbatim; None when the tool prints none
    sha256: str | None  # of the binary, jar or native library that ran; None when the check carries no hash


PINS: dict[str, Pin] = {
    # Lean 4.35.0 and what its toolchain bundles: the x86_64 release archive's binaries [RUN-bwrap-lanes].
    "lean": Pin("Lean (version 4.35.0, x86_64-unknown-linux-gnu, commit eb6cafb7290e8bd5f2937522d8d804f58f02bafc, Release)", "bf8d54e4714cc4b03d3f6bb34c83b7202b87e49c8bfcbff6895c085bb90ceb38"),
    "lake": Pin("Lake version 5.0.0-src+eb6cafb (Lean version 4.35.0)", "8ba83c98f76562d03b8dbc33f1057151ba6cbb121679dde76b2260ccc90495e1"),
    "leanchecker": Pin(None, "12c38901cdbfab178f1bf6145dd30012e9a3b2c11ca695292a5884fa3cbaddb6"),
    "leanchecker-paranoid": Pin(None, "ca74d1e9a856149ed05acb600d8931a574dd9f465745beeaf93e3de7b7cbe274"),
    "lean4lean": Pin(None, "baaec030a70c78562ced2c75866ab0d2410e81ce680b835179ed16570ad5ef97"),
    "nanoda_bin": Pin(None, "cbf13950fc4a48f635a0beceeb5ed32dd82568b870cfd081b6391c1f2cf02ba5"),
    "con-leche": Pin(None, "23a32522ea2c79f4ec8b48916272b37a423bda171e57cd83cfcf142eec50e621"),
    "con-ron": Pin(None, "60f4ca9fb9436c323789fa49aae33af6dcd1b9b54b43a66b461779ce79fd8eec"),
    "elan": Pin("elan 4.2.4 (227caca13 2026-08-25)", "e0f4b30b29c565625189744847dfef5f132b6322c5e452dbebfeae780c9749e5"),
    # TLC: the two vendored jars [RUN-tlc-jars]; the version is the banner each prints. Java 21 is the
    # Temurin build the executed TLC runs used [RUN-apalache-version].
    "tlc-1.8.0": Pin("TLC2 Version 2026.10.20.183001 (rev: d2e1472)", "5bd7b64db99ae4c6c35f290de5e809c0ee41af43f8699cf696099ffb6452b1e2"),
    "tlc-1.7.4": Pin("TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)", "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88"),
    "java": Pin("OpenJDK 64-Bit Server VM Temurin-21.0.12.1+1 (build 21.0.12.1+1-LTS, mixed mode, sharing)", "999c141a6e620c71aa4230ccb62341a89162f37818753ff006d766bf935dcbe1"),
    # Z3 through the 5.3.1.0 wheel [RUN-z3-starter]; cvc5 1.4.2, the static non-GPL build [RUN-scaffold].
    "z3": Pin("5.3.1", "8369cecb16b2320b196bbc2746dd1328eb8f7c74cb6a8634f8bf343659f1c9c7"),
    "z3-cli": Pin("Z3 version 5.3.1 - 64 bit", "29f796d291ae2dfca032b69c6f76c5b70be19078ccb52ab3cb6ec9a8600004a4"),
    "cvc5": Pin("cvc5 1.4.2 [git 282d5e0 on branch HEAD]", "6aecddf466552b83bb5883756c7955e0c9d5ddcc6d7f45b48c2f6e06a741b102"),
    # Soufflé 2.5 from the release's Ubuntu 24.04 package [RUN-souffle-version].
    "souffle": Pin("Version: 2.5 (2.5)", "e8e4d8bff0b8377d2d42ae30886121a61061ec0c8bb948f1f5129e09aecfa9a1"),
    # Rust 1.96.0 [RUN-scaffold]: the toolchain's own binaries, not rustup's proxies.
    "rustc": Pin("rustc 1.96.0 (ac68faa20 2026-05-25)", "ba4b837efb6612dfa8d941c5a72b8a50d1d03a0f36216743b173949aa8d9eb75"),
    "cargo": Pin("cargo 1.96.0 (30a34c682 2026-05-25)", "f30f9fd1b1d0b8fd10dc33219eb4cd4bec3543f40e434ac71f5a03fd0359063f"),
    # The command line's own tools [RUN-scaffold]: versions only, except uv, whose binary the run hashed.
    "uv": Pin("uv 0.10.2", "e10271e5051b432e76fc17b34ae2ae985ecd74ec9b6fe2b57a034a4544475ddf"),
    "python": Pin("3.13.12", None),
    "psycopg": Pin("3.3.6", None),
}

# A check's status. Only `ok` is green; `skipped` is the learner's choice.
OK, UNPINNED, MISMATCH, MISSING, BROKEN, SKIPPED = "ok", "unpinned", "mismatch", "missing", "broken", "skipped"

GROUPS: dict[str, str] = {
    "lean": "Lean",
    "tlc": "TLA+ (Java and tla2tools)",
    "solvers": "Z3 and cvc5",
    "souffle": "Soufflé",
    "rust": "Rust",
    "postgres": "PostgreSQL",
    "cli": "The command line (uv, Python, psycopg)",
}


@dataclass
class Check:
    id: str
    group: str
    label: str
    status: str
    version: str | None = None  # what the tool printed, verbatim
    expected_version: str | None = None
    sha256: str | None = None  # of the file that ran
    expected_sha256: str | None = None
    path: str | None = None
    detail: str | None = None
    tool: str | None = None  # the receipt's tools[].name, for a tool that belongs in the block

    @property
    def pinned(self) -> bool:
        return self.sha256 is not None and self.sha256 == self.expected_sha256

    def as_json(self) -> dict[str, Any]:
        out: dict[str, Any] = {"id": self.id, "group": self.group, "label": self.label, "status": self.status}
        out["expected"] = {"version": self.expected_version, "sha256": self.expected_sha256}
        out["found"] = {"version": self.version, "sha256": self.sha256, "path": self.path}
        if self.detail:
            out["detail"] = self.detail
        return out


# ---------------------------------------------------------------------------------------------- helpers
@dataclass
class Proc:
    rc: int | None  # None: it did not run (not found, timed out)
    out: str  # standard output, then standard error
    note: str = ""


def run(argv: Sequence[str], *, timeout: float = 30, cwd: str | None = None) -> Proc:
    try:
        done = subprocess.run(list(argv), capture_output=True, text=True, errors="replace", timeout=timeout, cwd=cwd, stdin=subprocess.DEVNULL)
    except FileNotFoundError:
        return Proc(None, "", f"{argv[0]}: not found")
    except subprocess.TimeoutExpired:
        return Proc(None, "", f"{argv[0]}: no answer in {timeout:g} s")
    except OSError as error:
        return Proc(None, "", f"{argv[0]}: {error.strerror or error}")
    return Proc(done.returncode, done.stdout + done.stderr)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def first_line(text: str, prefix: str | None = None) -> str | None:
    for line in text.splitlines():
        line = line.rstrip()
        if line.strip() and (prefix is None or line.startswith(prefix)):
            return line
    return None


def architecture() -> str:
    machine = platform.machine().lower()
    return {"amd64": "x86_64", "arm64": "aarch64"}.get(machine, machine)


def pin_for(id: str) -> Pin:
    """The pin of a check on this machine: a hash is pinned for the x86_64 build only."""
    pin = PINS[id]
    return pin if architecture() == PINNED_ARCH or pin.sha256 is None else Pin(pin.version, "")


def which(name: str) -> Path | None:
    found = shutil.which(name)
    return Path(found).resolve() if found else None


def judge(check: Check) -> Check:
    """Settle the status of a check that found its file, read its version (if it prints one) and hashed it."""
    pin = pin_for(check.id)
    check.expected_version = pin.version
    check.expected_sha256 = pin.sha256 or None
    if pin.version is not None and check.version != pin.version:
        check.status = MISMATCH
        check.detail = check.detail or f"the pin is {pin.version!r}"
    elif check.sha256 is None:  # a check that carries no hash: the version is all there is to compare
        check.status = OK
    elif not pin.sha256:
        check.status = UNPINNED
        check.detail = f"no hash is pinned for {architecture()}"
    elif check.sha256 != pin.sha256:
        check.status = UNPINNED
        check.detail = f"the file is not the pinned one (pin {pin.sha256[:12]}...)"
    else:
        check.status = OK
    return check


def probe(id: str, group: str, label: str, path: Path | None, argv: list[str] | None, *, prefix: str | None = None, tool: str | None = None) -> Check:
    """Run `argv`, the tool's own version command, hash `path`, and compare both with the pin."""
    check = Check(id, group, label, MISSING, tool=tool)
    pin = pin_for(id)
    check.expected_version, check.expected_sha256 = pin.version, pin.sha256 or None
    if path is None:
        check.detail = "not found"
        return check
    check.path = str(path)
    if argv is not None:
        done = run(argv)
        if done.rc != 0:
            check.status, check.detail = BROKEN, (first_line(done.out) or done.note or f"exit {done.rc}")
            return check
        check.version = first_line(done.out, prefix)
        if check.version is None:
            check.status, check.detail = BROKEN, "it printed no version line"
            return check
    check.sha256 = sha256_file(path)
    return judge(check)


# --------------------------------------------------------------------------------------------- the groups
def lean_toolchain() -> Path | None:
    home = Path(os.environ.get("ELAN_HOME") or Path.home() / ".elan")
    directory = home / "toolchains" / LEAN_TOOLCHAIN_DIR
    return directory if (directory / "bin" / "lean").is_file() else None


def check_lean() -> list[Check]:
    out: list[Check] = []
    toolchain = lean_toolchain()
    absent = f"toolchain {LEAN_TOOLCHAIN} is not installed under ELAN_HOME"
    for id in ("lean", "lake"):
        binary = toolchain / "bin" / id if toolchain else None
        check = probe(id, "lean", id, binary, [str(binary), "--version"] if binary else None, tool=id)
        if toolchain is None:
            check.detail = absent
        out.append(check)
    for id in ("leanchecker", "leanchecker-paranoid", "lean4lean", "nanoda_bin", "con-leche", "con-ron"):
        binary = toolchain / "bin" / id if toolchain else None
        check = probe(id, "lean", f"{id} (a checker bundled with the toolchain)", binary if binary and binary.is_file() else None, None)
        if check.status == MISSING:
            check.detail = absent if toolchain is None else "not in the toolchain's bin directory"
        out.append(check)
    elan = which("elan")
    out.append(probe("elan", "lean", "elan", elan, [str(elan), "--version"] if elan else None))
    return out


# TLC's own check that Java and the jar work: a three-state model, one worker and an explicit deadlock flag,
# the way receipts run TLC (spine section 9.2).
SMOKE_TLA = "---- MODULE DoctorSmoke ----\nEXTENDS Naturals\nVARIABLE x\nInit == x = 0\nNext == x < 2 /\\ x' = x + 1\nSpec == Init /\\ [][Next]_x\nTypeOK == x \\in 0..2\n====\n"
SMOKE_CFG = "SPECIFICATION Spec\nINVARIANT TypeOK\n"


def check_tlc() -> list[Check]:
    out: list[Check] = []
    java = which("java")
    out.append(probe("java", "tlc", "java", java, [str(java), "-version"] if java else None, prefix="OpenJDK 64-Bit Server VM", tool="java"))
    directory = Path(os.environ.get("STATESPACE_TLA2TOOLS_DIR", "/opt/tla2tools"))
    for release in ("1.8.0", "1.7.4"):
        jar = directory / f"tla2tools-{release}.jar"
        label = f"tla2tools {release}" + (" (pre-release)" if release == "1.8.0" else " (text-trace fallback)")
        check = Check(f"tlc-{release}", "tlc", label, MISSING, tool="tlc")
        out.append(check)
        if not jar.is_file():
            check.detail = f"{jar} not found"
            continue
        check.path, check.sha256 = str(jar), sha256_file(jar)
        if java is None:
            check.status, check.detail = BROKEN, "there is no java to run it"
            continue
        with tempfile.TemporaryDirectory(prefix="statespace-doctor-") as work:
            Path(work, "DoctorSmoke.tla").write_text(SMOKE_TLA)
            Path(work, "DoctorSmoke.cfg").write_text(SMOKE_CFG)
            argv = [str(java), "-cp", str(jar), "tlc2.TLC", "-workers", "1", "-deadlock", "-metadir", str(Path(work, "states")), "-config", "DoctorSmoke.cfg", "DoctorSmoke.tla"]
            done = run(argv, timeout=120, cwd=work)
        counts = re.search(r"(\d+) states generated, (\d+) distinct states found", done.out)
        check.version = first_line(done.out, "TLC2 Version")
        if check.version is None or "Model checking completed. No error has been found." not in done.out or counts is None or counts.group(2) != "3":
            check.status = BROKEN
            check.detail = "the three-state smoke model did not check: " + (first_line(done.out) or done.note or f"exit {done.rc}")
        else:
            judge(check)
            if check.status == OK:
                check.detail = f"smoke model: {counts.group(1)} states generated, {counts.group(2)} distinct, no error"
    return out


def check_solvers() -> list[Check]:
    out: list[Check] = []
    api = Check("z3", "solvers", "z3 (Python API)", MISSING, tool="z3")
    cli = Check("z3-cli", "solvers", "z3 (command line)", MISSING, tool="z3-cli")
    out += [api, cli]
    try:
        z3: Any = importlib.import_module("z3")
    except ImportError:
        api.detail = "z3 is not importable: install z3-solver==5.3.1 (uv run --with z3-solver==5.3.1)"
        cli.detail = "the command line comes with the z3-solver wheel"
    else:
        root = Path(z3.__file__).resolve().parent
        library = next(iter(sorted((root / "lib").glob("libz3*"))), None)
        api.version = str(z3.get_version_string())
        api.path = str(library) if library else None
        x = z3.Int("x")
        solver = z3.Solver()
        solver.add(x > 0, x < 0)
        answer = str(solver.check())
        try:
            wheel = distribution_version("z3-solver")
        except PackageNotFoundError:
            wheel = "none"
        if library is None:
            api.status, api.detail = BROKEN, "the package holds no libz3"
        elif answer != "unsat":
            api.status, api.detail = BROKEN, f"the smoke query x > 0 and x < 0 gave {answer}, not unsat"
        else:
            api.sha256 = sha256_file(library)
            judge(api)
            if api.status == OK:
                api.detail = f"wheel {wheel}; x > 0 and x < 0 is {answer}"
        executable = Path(sys.executable).parent / "z3"
        binary = executable if executable.is_file() else which("z3")
        out[1] = probe("z3-cli", "solvers", "z3 (command line)", binary, [str(binary), "--version"] if binary else None, tool="z3-cli")
    cvc5 = which("cvc5")
    out.append(probe("cvc5", "solvers", "cvc5", cvc5, [str(cvc5), "--version"] if cvc5 else None, tool="cvc5"))
    return out


def check_souffle() -> list[Check]:
    souffle = which("souffle")
    return [probe("souffle", "souffle", "souffle", souffle, [str(souffle), "--version"] if souffle else None, prefix="Version:", tool="souffle")]


def rust_binary(name: str) -> Path | None:
    """The toolchain's own binary, not rustup's proxy, so that the hash is the compiler's. Read-only: `rustup which`
    installs nothing, and naming the toolchain keeps a rust-toolchain file in the current directory out of it."""
    rustup = which("rustup")
    if rustup is not None:
        done = run([str(rustup), "which", "--toolchain", RUST_TOOLCHAIN, name])
        if done.rc == 0 and done.out.strip():
            return Path(done.out.strip().splitlines()[0])
    return which(name)


def check_rust() -> list[Check]:
    out: list[Check] = []
    for id in ("rustc", "cargo"):
        binary = rust_binary(id)
        out.append(probe(id, "rust", id, binary, [str(binary), "--version"] if binary else None, tool=id))
    rustc = rust_binary("rustc")
    sysroot = run([str(rustc), "--print", "sysroot"]).out.strip() if rustc else ""
    target = Check("wasm-target", "rust", f"target {RUST_WASM_TARGET}", MISSING, expected_version=RUST_WASM_TARGET)
    installed = Path(sysroot) / "lib" / "rustlib" / RUST_WASM_TARGET
    if sysroot and (installed / "lib").is_dir():
        target.status, target.version, target.path = OK, RUST_WASM_TARGET, str(installed)
    else:
        target.detail = f"not installed for toolchain {RUST_TOOLCHAIN}"
    out.append(target)
    out.append(check_crates())
    return out


def check_crates() -> Check:
    """Every crate of the pinned lock is in cargo's cache with the lock's own checksum, checked offline."""
    lock_path = Path(os.environ.get("STATESPACE_RUST_LOCK", "/opt/statespace/rust/Cargo.lock"))
    check = Check("crates", "rust", "crates of the pinned Cargo.lock", MISSING, path=str(lock_path), expected_version=", ".join(f"{n} {v}" for n, v in RUST_CRATES.items()))
    if not lock_path.is_file():
        check.detail = "the pinned Cargo.lock is not there"
        return check
    packages: list[dict[str, Any]] = tomllib.loads(lock_path.read_text()).get("package", [])
    named = {p["name"]: p["version"] for p in packages if p["name"] in RUST_CRATES}
    check.version = ", ".join(f"{n} {named.get(n, 'absent')}" for n in RUST_CRATES)
    cache = Path(os.environ.get("CARGO_HOME") or Path.home() / ".cargo") / "registry" / "cache"
    registries = sorted(p for p in cache.glob("*") if p.is_dir()) if cache.is_dir() else []
    locked = [p for p in packages if str(p.get("source", "")).startswith("registry+")]
    absent: list[str] = []
    wrong: list[str] = []
    for package in locked:
        crate = f"{package['name']}-{package['version']}.crate"
        file = next((r / crate for r in registries if (r / crate).is_file()), None)
        if file is None:
            absent.append(package["name"])
        elif sha256_file(file) != package["checksum"]:
            wrong.append(package["name"])
    if named != RUST_CRATES:
        check.status, check.detail = MISMATCH, "the lock does not hold the pinned versions of the four crates"
    elif absent or wrong:
        check.status = BROKEN
        check.detail = f"{len(absent)} locked crates are not in cargo's cache and {len(wrong)} have another checksum (cargo fetch --locked, with the network on, fills it)"
    else:
        check.status, check.detail = OK, f"{len(locked)} of {len(locked)} locked crates are in cargo's cache with the lock's checksums"
    return check


def check_postgres(dsn: str | None) -> list[Check]:
    check = Check("postgres", "postgres", "PostgreSQL server", MISSING, expected_version=f"{POSTGRES_VERSION_PREFIX}...")
    try:
        psycopg: Any = importlib.import_module("psycopg")
    except ImportError:
        check.detail = "psycopg is not importable"
        return [check]
    target = dsn if dsn is not None else os.environ.get("STATESPACE_PG_DSN", "")
    try:
        with psycopg.connect(target, connect_timeout=5, autocommit=True) as connection:
            version = str(connection.execute("select version()").fetchone()[0])
            isolation = str(connection.execute("show default_transaction_isolation").fetchone()[0])
    except Exception as error:  # a refused connection, a wrong host, a bad password: all "not there"
        check.detail = (str(error).strip().splitlines() or [type(error).__name__])[0]
        return [check]
    named = re.match(r"PostgreSQL \S+ \([^)]*\)|PostgreSQL \S+", version)
    check.version = named.group(0) if named else version.splitlines()[0]
    image = os.environ.get("STATESPACE_PG_IMAGE")
    if check.version.startswith(POSTGRES_VERSION_PREFIX):
        check.status = OK
        check.detail = f"default isolation {isolation}" + (f"; service image {image}" if image else "")
    else:
        check.status, check.detail = MISMATCH, f"the pin is a server that reports {POSTGRES_VERSION_PREFIX}"
    return [check]


def check_cli() -> list[Check]:
    out: list[Check] = []
    uv = which("uv")
    out.append(probe("uv", "cli", "uv", uv, [str(uv), "--version"] if uv else None))
    python = Check("python", "cli", "Python", MISSING, version=platform.python_version(), path=sys.executable)
    out.append(judge(python))
    psycopg_check = Check("psycopg", "cli", "psycopg (with its bundled libpq)", MISSING)
    out.append(psycopg_check)
    try:
        psycopg: Any = importlib.import_module("psycopg")
    except ImportError:
        psycopg_check.detail = "not importable"
    else:
        psycopg_check.version = str(psycopg.__version__)
        judge(psycopg_check)
        psycopg_check.detail = f"implementation {psycopg.pq.__impl__}, libpq {psycopg.pq.version()}"
    return out


# ------------------------------------------------------------------------------------------- the sandbox
# What each first line of a bubblewrap failure means, and what changes it. W0-S06 recorded each line for
# Lean 4.35.0 (decision record, result 1). First match wins, so the more specific lines come first.
HINTS: list[tuple[str, str, str]] = [
    (r"^bwrap: Failed to make / slave: Permission denied", "Docker's AppArmor profile denies the mount that bubblewrap needs", "apparmor=unconfined for the container, and on an Ubuntu 24.04 host the restriction below as well"),
    (r"^bwrap: No permissions to create new namespace", "the container's seccomp profile blocks clone with namespace flags, as Docker's default profile does, or the host forbids unprivileged user namespaces", "the devcontainer's opt-in sandbox profile; on a host, enable unprivileged user namespaces"),
    (r"^bwrap: Can't mount proc on /newroot/proc", "the container masks paths under /proc", "systempaths=unconfined for the container"),
    (r"^bwrap: Can't mkdir /run/user", "the image has no /run/user directory", "create /run/user in the image"),
    (r"^bwrap: pivot_root: Operation not permitted", "seccomp blocks pivot_root, which Docker's default profile does even with CAP_SYS_ADMIN", "allow it, as the opt-in sandbox profile does"),
    (r"^bwrap: (unshare user ns|Failed to make / slave|unmount old root): Operation not permitted", "seccomp blocks unshare, mount or umount2", "allow them, as the opt-in sandbox profile does"),
    (r"^bwrap: (setting up uid map: Permission denied|loopback: Failed RTM_NEWADDR)", "Ubuntu 24.04's AppArmor restriction on unprivileged user namespaces", "on the host, the sysctl kernel.apparmor_restrict_unprivileged_userns=0, or an AppArmor profile for /usr/bin/bwrap"),
    (r"^bwrap: not found$", "bubblewrap is not installed or not on PATH", "install bubblewrap"),
    (r"^bubblewrap needs Linux namespaces", "the platform is not Linux", "use the devcontainer"),
]
SANDBOX_NEVER_REQUIRED = "A failed sandbox judges nothing and is never required: a receipt records it as failed, with this line."


def sandbox_context() -> dict[str, str | None]:
    """The facts that decide whether bubblewrap can start, for whoever has to change one of them."""

    def read(path: str) -> str | None:
        try:
            return Path(path).read_text().strip() or None
        except OSError:
            return None

    seccomp = re.search(r"^Seccomp:\s*(\d+)", read("/proc/self/status") or "", re.M)
    return {
        "seccomp_mode": {"0": "disabled", "1": "strict", "2": "filter"}.get(seccomp.group(1)) if seccomp else None,
        "apparmor_label": read("/proc/self/attr/current"),
        "apparmor_restrict_unprivileged_userns": read("/proc/sys/kernel/apparmor_restrict_unprivileged_userns"),
        "max_user_namespaces": read("/proc/sys/user/max_user_namespaces"),
        "run_user_directory": "present" if Path("/run/user").is_dir() else "absent",
    }


def lake_canary(toolchain: Path | None) -> list[str]:
    """Bubblewrap with the flags that Lake 4.35.0 gives it (the later calls of `lake check` and `lake comparator`),
    around `lean --version`: 28 ms in a container where the sandbox works (W0-S06, decision 3 and result 2)."""
    argv = ["bwrap", "--ro-bind", "/", "/", "--tmpfs", "/home", "--tmpfs", "/root", "--tmpfs", "/run/user", "--tmpfs", "/tmp", "--dir", "/tmp/home", "--dev", "/dev", "--proc", "/proc", "--clearenv", "--tmpfs", "/run", "--tmpfs", "/var"]
    if toolchain is not None:
        argv += ["--ro-bind", str(toolchain), str(toolchain)]
    argv += ["--setenv", "PATH", "/usr/local/bin:/usr/bin:/bin", "--setenv", "LEAN_ABORT_ON_PANIC", "1", "--setenv", "HOME", "/tmp/home"]
    argv += ["--unshare-all", "--die-with-parent", "--new-session", "--"]
    if toolchain is not None:
        return argv + [str(toolchain / "bin" / "lean"), "--version"]
    return argv + [str(which("true") or "/bin/true")]


@dataclass
class Sandbox:
    state: str  # on | off | failed
    detail: str | None = None  # the first bubblewrap line, verbatim, when failed
    meaning: str | None = None
    change: str | None = None
    how: str = ""
    context: dict[str, str | None] = field(default_factory=dict[str, str | None])


def sandbox_failed(detail: str, how: str) -> Sandbox:
    meaning, change = next(((m, c) for pattern, m, c in HINTS if re.search(pattern, detail)), (None, None))
    return Sandbox("failed", detail, meaning, change, how, sandbox_context())


def probe_sandbox(choice: str) -> Sandbox:
    if choice == "off":
        return Sandbox("off", how="chosen with --sandbox=off; nothing was probed")
    if platform.system() != "Linux":
        return sandbox_failed(f"bubblewrap needs Linux namespaces; this is {platform.system()}", "not probed")
    toolchain = lean_toolchain()
    how = "the Lake-shaped canary: bubblewrap around lean --version" if toolchain else "no Lean toolchain here, so bubblewrap ran /bin/true with Lake's flags"
    if which("bwrap") is None:
        return sandbox_failed("bwrap: not found", how)
    done = run(lake_canary(toolchain), timeout=60)
    banner = first_line(done.out)
    if done.rc == 0 and (toolchain is None or (banner or "").startswith("Lean (version")):
        return Sandbox("on", how=how)
    return sandbox_failed(first_line(done.out, "bwrap: ") or banner or done.note or f"exit {done.rc}", how)


# ------------------------------------------------------------------------------------------- the block
DIGEST = re.compile(r"(?:^|@)(sha256:[0-9a-f]{64})$")


def image_digest() -> tuple[str | None, str | None]:
    """The digest of the image this container runs, and a note when it is not known. A container cannot read its
    own image digest, so the devcontainer passes it in STATESPACE_BENCH_IMAGE, as name@sha256:<64 hex digits>."""
    value = os.environ.get("STATESPACE_BENCH_IMAGE", "").strip()
    if not value:
        inside = Path("/.dockerenv").exists() or Path("/run/.containerenv").exists()
        return None, ("STATESPACE_BENCH_IMAGE is not set, so the image's digest is unknown and a receipt will record devcontainer: null" if inside else None)
    found = DIGEST.search(value)
    if found is None:
        return None, f"STATESPACE_BENCH_IMAGE is {value!r}, which does not end in sha256:<64 hex digits>, so it is not read as a digest"
    return found.group(1), None


def build_block(checks: list[Check], sandbox: Sandbox, digest: str | None) -> dict[str, Any]:
    environment: dict[str, Any] = {
        "devcontainer": digest,
        "os": {"name": platform.system() or "unknown", "version": platform.release() or "unknown", "arch": architecture()},
        "sandbox": sandbox.state,
    }
    if sandbox.state == "failed" and sandbox.detail:
        environment["sandboxDetail"] = sandbox.detail
    tools = [{"name": c.tool, "version": c.version, "sha256": c.sha256, "pinned": c.pinned} for c in checks if c.tool and c.version and c.sha256]
    return {"environment": environment, "tools": tools}


def block_issues(block: dict[str, Any]) -> list[str] | None:
    """Validate the block as the machine part of a receipt@1; None when the schema package cannot load."""
    try:
        from .schema import validate
    except ImportError:
        return None
    receipt: dict[str, Any] = {
        "schema": "statespace/receipt@1", "lab": "LAB-1", "stage": "LAB-1.1", "lane": "reported", "createdAt": "2026-01-01T00:00:00Z",
        "cli": {"name": "statespace", "version": __version__}, **block,
        "statements": [], "runs": [], "checks": [], "provenance": {"assisted": "none", "agent": False},
    }
    try:
        issues = validate("receipt", receipt)
    except ImportError:
        return None
    return [f"{i['instancePath'] or '/'} {i['keyword']}: {i['message']}" for i in issues if i["instancePath"].startswith(("/environment", "/tools"))]


def format_block(block: dict[str, Any]) -> str:
    """The block as JSON, each tool on a line of its own so that a receipt diff reads."""
    tools = ",\n".join("    " + json.dumps(t, ensure_ascii=False) for t in block["tools"])
    environment = json.dumps(block["environment"], indent=2, ensure_ascii=False).replace("\n", "\n  ")
    return f'{{\n  "environment": {environment},\n  "tools": [\n{tools}\n  ]\n}}'


# ------------------------------------------------------------------------------------------- the report
RUNNERS: dict[str, Callable[[], list[Check]]] = {"lean": check_lean, "tlc": check_tlc, "solvers": check_solvers, "souffle": check_souffle, "rust": check_rust, "cli": check_cli}


@dataclass
class Report:
    checks: list[Check]
    sandbox: Sandbox
    digest: str | None
    notes: list[str]
    block: dict[str, Any]
    block_problems: list[str] | None

    @property
    def green(self) -> bool:
        return all(c.status in (OK, SKIPPED) for c in self.checks) and not self.block_problems


def collect(skip: set[str], sandbox_choice: str, dsn: str | None) -> Report:
    checks: list[Check] = []
    for group, title in GROUPS.items():
        if group in skip:
            checks.append(Check(group, group, title, SKIPPED, detail="left out with --skip"))
        elif group == "postgres":
            checks.extend(check_postgres(dsn))
        else:
            checks.extend(RUNNERS[group]())
    sandbox = probe_sandbox(sandbox_choice)
    digest, note = image_digest()
    notes = [note] if note else []
    if architecture() != PINNED_ARCH:
        notes.append(f"hashes are pinned for {PINNED_ARCH} only; on {architecture()} no tool can be pinned, so this run is not green")
    block = build_block(checks, sandbox, digest)
    return Report(checks, sandbox, digest, notes, block, block_issues(block))


def report_json(report: Report) -> dict[str, Any]:
    sandbox = report.sandbox
    return {
        "doctor": {"version": __version__},
        "green": report.green,
        "image": report.digest,
        "checks": [c.as_json() for c in report.checks],
        "sandbox": {"state": sandbox.state, "detail": sandbox.detail, "meaning": sandbox.meaning, "change": sandbox.change, "how": sandbox.how, "context": sandbox.context},
        "notes": report.notes,
        "block": report.block,
        "block_problems": report.block_problems,
    }


def os_release() -> str:
    try:
        for line in Path("/etc/os-release").read_text().splitlines():
            if line.startswith("PRETTY_NAME="):
                return line.split("=", 1)[1].strip().strip('"')
    except OSError:
        pass
    return platform.platform()


def render(report: Report, verbose: bool) -> str:
    out = [f"statespace doctor {__version__}", f"  image    {report.digest or 'unknown'}", f"  host     {platform.system()} {platform.release()} {architecture()}; {os_release()}", ""]
    width = max(len(c.id) for c in report.checks)
    margin = " " * (13 + width)
    for group, title in GROUPS.items():
        out.append(title)
        for c in (c for c in report.checks if c.group == group):
            if c.status == SKIPPED:
                out.append(f"  skipped  {c.detail}")
                continue
            head = c.version or (f"sha256 {c.sha256[:12]}" if c.sha256 and not c.detail else c.detail) or "-"
            out.append(f"  {c.status.ljust(8)} {c.id.ljust(width)}  {head}")
            if c.detail and head != c.detail:
                out.append(f"{margin}{c.detail}")
            if c.sha256 and (verbose or c.status != OK):
                out.append(f"{margin}sha256 {c.sha256}" + ("" if c.pinned or not c.expected_sha256 else f" (pin {c.expected_sha256})"))
            if c.path and (verbose or c.status != OK):
                out.append(f"{margin}{c.path}")
        out.append("")
    sandbox = report.sandbox
    out.append("Sandbox (recorded, never required)")
    if sandbox.state == "failed":
        out.append(f"  failed   {sandbox.detail}")
        if sandbox.meaning:
            out.append(f"  meaning  {sandbox.meaning}")
        if sandbox.change:
            out.append(f"  change   {sandbox.change}")
        out.append("  facts    " + ", ".join(f"{k.replace('_', ' ')} {v}" for k, v in sandbox.context.items() if v is not None))
        out.append(f"  {SANDBOX_NEVER_REQUIRED}")
    else:
        out.append(f"  {sandbox.state.ljust(8)} {sandbox.how}")
    out += ["", "Environment block (the environment and tools of a receipt)", format_block(report.block), ""]
    out += [f"note: {note}" for note in report.notes]
    if report.block_problems is None:
        out.append("note: the block was not checked against receipt@1 (the schema package could not load)")
    elif report.block_problems:
        out.append("problem: the block does not validate against receipt@1: " + "; ".join(report.block_problems))
    else:
        out.append("block: valid against receipt@1 (environment and tools)")
    counted = [c for c in report.checks if c.status != SKIPPED]
    skipped = len(report.checks) - len(counted)
    words = f"{sum(1 for c in counted if c.status == OK)} of {len(counted)} checks match their pins" + (f", {skipped} groups skipped" if skipped else "")
    out.append(("green: " if report.green else "NOT green: ") + words + f"; sandbox {sandbox.state}")
    return "\n".join(out) + "\n"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="statespace doctor", description="Compare the Bench with its pins, report the sandbox and print a receipt-ready environment block. It reads; it never installs or edits anything.")
    parser.add_argument("--json", action="store_true", help="print the whole report as JSON")
    parser.add_argument("--block", action="store_true", help="print only the environment block, as JSON")
    parser.add_argument("--verbose", action="store_true", help="show every hash and path")
    parser.add_argument("--skip", action="append", default=[], metavar="GROUP", help=f"leave a group out, for a stage that does not need it yet ({', '.join(GROUPS)}); repeatable")
    parser.add_argument("--sandbox", choices=["auto", "off"], default="auto", help="auto probes the sandbox; off records your choice to run without it and probes nothing")
    parser.add_argument("--pg-dsn", default=None, help="the PostgreSQL connection string; default: STATESPACE_PG_DSN, then libpq's own settings")
    args = parser.parse_args(list(argv) if argv is not None else None)
    unknown = [name for name in args.skip if name not in GROUPS]
    if unknown:
        parser.error(f"unknown group {', '.join(unknown)}; the groups are {', '.join(GROUPS)}")
    report = collect(set(args.skip), args.sandbox, args.pg_dsn)
    if args.block:
        sys.stdout.write(format_block(report.block) + "\n")
    elif args.json:
        sys.stdout.write(json.dumps(report_json(report), indent=2, ensure_ascii=False) + "\n")
    else:
        sys.stdout.write(render(report, args.verbose))
    return 0 if report.green else 1


if __name__ == "__main__":
    raise SystemExit(main())
