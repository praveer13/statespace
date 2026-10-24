// classify.mjs: tell a sandbox failure from a rejection.
//
// Under default Docker, `lake check` and `lake comparator` exit 1 when bubblewrap cannot start, the same
// code as a rejection [X RUN-lean-bwrap-docker]. This module is the reference rule for reading what a run
// actually said. It takes the command's argv, its exit code and its merged output, and returns
//
//   sandbox  'on' | 'off' | 'failed' | 'unknown'
//   verdict  'accepted' | 'rejected' | 'no-verdict'
//   reason   a short machine-readable reason
//   evidence the verbatim lines that decided it
//   detail   the verbatim sandbox error line when sandbox is 'failed', else null
//   checkers the per-checker verdict lines, only when a verdict was reached
//   warnings contradictions in the evidence (a contradiction yields no verdict)
//
// The rule is positive evidence for every claim; an exit code decides nothing alone:
//   1. Sandbox 'failed' needs a line that bubblewrap itself wrote (it starts "bwrap: ") on a run that did not
//      exit 0, or one of Lake's two exit-2 lines ("needs `bwrap` ... was not found", "which needs Linux
//      namespaces"). "error: Child exited with N" is NOT evidence: Lake prints it for any child that exits
//      non-zero, including a project that fails to build. A bubblewrap line on a run that exits 0 is a warning
//      (bubblewrap 0.9.0 prints one, "Only the last ... option will take effect", without failing) and is kept
//      in `warnings`.
//   2. Sandbox 'off' needs --inadvisably-no-sandbox in the argv we built, and Lake's warning line.
//   3. A verdict needs verdict lines: 'accepted' needs exit 0, an accept line and no "error:" line;
//      'rejected' needs a rejection line (statement or constant mismatch, an axiom that is not permitted,
//      a kernel rejection, a named theorem the solution does not contain, or a build that failed with Lean
//      diagnostics).
//   4. A sandbox failure outranks every verdict line, because a failed sandbox judged nothing.
//   5. A "kernel rejected" line whose checker the kernel killed (exit 137 or 143 on the "error: <name> exited with N"
//      line, which names the first failing checker) is no verdict: Lake prints that line for any non-zero exit.
//   6. Anything else is 'no-verdict', whatever the exit code was. An unexplained non-zero exit leaves the
//      sandbox 'unknown'; the Lake-shaped canary (classifyCanary) settles that case.
//
// The output of a project can contain any text, so a project that prints a "bwrap: " line can downgrade its
// own receipt to 'failed'. That costs it its stamp and gains it nothing. Accepting needs exit 0, which only
// Lake sets, and no "error:" line.

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

export function lines(output) {
  return String(output).replace(ANSI, '').split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
}

const RE = {
  bwrap: /^bwrap: /,
  noBwrap: /^error: `lake (check|comparator)` needs `.+` to sandbox the code it checks, and it was not found\.$/,
  notLinux: /^error: `lake (check|comparator)` sandboxes the code it checks with `bwrap`, which needs Linux namespaces\.$/,
  off: /^WARNING: Sandbox disabled, this run is not trustworthy\.$/,
  statement: /^error: Challenge and solution theorem statement do not match: '(.+)'$/,
  constant: /^error: Const does not match between challenge and target '(.+)'$/,
  illegalAxiom: /^error: Illegal axiom detected: '(.+)'$/,
  axiomNotPermitted: /^error: Axiom '(.+)' is not permitted; it is used by '(.+)'$/,
  kernelRejected: /^(.+) kernel rejected the solution$/,
  checkerExited: /^error: (.+) exited with (\d+)$/,
  theoremMissing: /^PANIC at LeanExport\.dumpConstant .*: Constant (.+) not found in environment\.$/,
  buildFailed: /^error: build failed$/,
  leanError: /^error: \S+\.lean:\d+:\d+: /,
  okay: /^Your solution is okay!$/,
  kernelAccepts: /^(.+) kernel accepts the solution$/,
  anyError: /^error: /,
  noManifest: /^error: '.*' has no `lake-manifest\.json`/,
  badConfig: /^error: malformed configuration in /,
  missingConfig: /^error: could not read the configuration/,
};

const first = (ls, re) => ls.find((l) => re.test(l));

export function classify({ argv, exitCode, output }) {
  const ls = lines(output);
  const warnings = [];
  const flagOff = argv.includes('--inadvisably-no-sandbox');
  const warnOff = ls.some((l) => RE.off.test(l));
  if (flagOff !== warnOff) warnings.push('the --inadvisably-no-sandbox flag and Lake\'s sandbox-disabled warning disagree');

  const bwrapRaw = first(ls, RE.bwrap);
  if (bwrapRaw && exitCode === 0) warnings.push(`a bwrap line appears on a run that exits 0: ${bwrapRaw}`);
  const bwrapLine = (exitCode === 0 ? undefined : bwrapRaw) ?? first(ls, RE.noBwrap) ?? first(ls, RE.notLinux);
  if (bwrapLine) {
    if (flagOff) warnings.push('a bwrap diagnostic appears although the sandbox was switched off');
    return {
      sandbox: 'failed',
      verdict: 'no-verdict',
      reason: first(ls, RE.noBwrap) ? 'bwrap-not-found' : first(ls, RE.notLinux) ? 'not-linux' : 'bwrap-diagnostic',
      evidence: [bwrapLine],
      detail: bwrapLine,
      checkers: [],
      warnings,
    };
  }

  // rejection evidence, in a fixed priority
  const rejections = [
    ['statement-mismatch', first(ls, RE.statement)],
    ['const-mismatch', first(ls, RE.constant)],
    ['illegal-axiom', first(ls, RE.illegalAxiom)],
    ['axiom-not-permitted', first(ls, RE.axiomNotPermitted)],
    ['kernel-rejected', first(ls, RE.kernelRejected)],
    ['theorem-missing', first(ls, RE.theoremMissing)],
    ['build-failed', first(ls, RE.buildFailed) ?? first(ls, RE.leanError)],
  ].filter(([, line]) => line !== undefined);

  const accepts = ls.filter((l) => RE.kernelAccepts.test(l) || RE.okay.test(l));
  const sandboxOf = (reached) => (flagOff && warnOff ? 'off' : reached ? 'on' : 'unknown');

  // Lake prints "<name> kernel rejected the solution" for ANY non-zero exit of a checker, so a checker that the kernel
  // killed (137, SIGKILL, as the out-of-memory killer does; 143, SIGTERM) reads like a rejection. The
  // "error: <name> exited with N" line names the first failing checker's code, and Lake runs the later checkers anyway
  // (the recorded import-Std run has an accept line after it); a kill there is no verdict.
  // (A checker that rejects by crashing exits 134 or 101 and still counts: lean4lean and nanoda do that.)
  const exited = ls.map((l) => RE.checkerExited.exec(l)).find(Boolean);
  if (exitCode !== 0 && rejections.length > 0 && rejections.every(([k]) => k === 'kernel-rejected') && exited && ['137', '143'].includes(exited[2])) {
    return {
      sandbox: sandboxOf(false),
      verdict: 'no-verdict',
      reason: `checker-killed-${exited[2]}`,
      evidence: [exited[0], ...rejections.map(([, l]) => l)],
      detail: null,
      checkers: [],
      warnings,
    };
  }

  if (rejections.length > 0) {
    if (exitCode === 0) {
      warnings.push('a rejection line appears with exit code 0');
      return { sandbox: sandboxOf(false), verdict: 'no-verdict', reason: 'contradictory', evidence: rejections.map(([, l]) => l), detail: null, checkers: [], warnings };
    }
    return {
      sandbox: sandboxOf(true),
      verdict: 'rejected',
      reason: rejections[0][0],
      evidence: rejections.map(([, l]) => l),
      detail: null,
      checkers: checkerRows(ls),
      warnings,
    };
  }

  if (exitCode === 0 && ls.some((l) => RE.anyError.test(l))) {
    warnings.push('an error line appears with exit code 0');
    return { sandbox: sandboxOf(false), verdict: 'no-verdict', reason: 'contradictory', evidence: ls.filter((l) => RE.anyError.test(l)), detail: null, checkers: [], warnings };
  }
  if (exitCode === 0 && accepts.length > 0) {
    return { sandbox: sandboxOf(true), verdict: 'accepted', reason: 'accepted', evidence: accepts, detail: null, checkers: checkerRows(ls), warnings };
  }

  // no verdict: say why when the tool said why
  if (exitCode === 2) {
    const why = first(ls, RE.noManifest) ? 'no-manifest' : first(ls, RE.badConfig) ? 'bad-config' : first(ls, RE.missingConfig) ? 'missing-config' : 'could-not-start';
    const line = first(ls, RE.noManifest) ?? first(ls, RE.badConfig) ?? first(ls, RE.missingConfig) ?? ls.find((l) => l.length > 0) ?? '';
    return { sandbox: sandboxOf(false), verdict: 'no-verdict', reason: why, evidence: [line], detail: null, checkers: [], warnings };
  }
  const tail = ls.filter((l) => RE.anyError.test(l) || /FATAL/.test(l));
  if (exitCode === 0) warnings.push('exit code 0 without an accept line');
  return {
    sandbox: sandboxOf(false),
    verdict: 'no-verdict',
    reason: exitCode === 0 ? 'no-accept-line' : `unexplained-exit-${exitCode}`,
    evidence: tail.length > 0 ? tail : ls.filter((l) => l.length > 0).slice(-2),
    detail: null,
    checkers: [],
    warnings,
  };
}

// Per-checker rows from "<name> kernel accepts the solution" / "<name> kernel rejected the solution".
function checkerRows(ls) {
  const rows = [];
  for (const l of ls) {
    let m = RE.kernelAccepts.exec(l);
    if (m) rows.push({ name: m[1], verdict: 'accepts' });
    m = RE.kernelRejected.exec(l);
    if (m) rows.push({ name: m[1], verdict: 'rejects' });
  }
  return rows;
}

// The Lake-shaped canary: bwrap with Lake's flag set around `lean --version`. It settles the sandbox state
// when a Lake run leaves it 'unknown' (an exit code with no sandbox evidence), and it is what
// `statespace doctor` reports. A canary fails 'inside' when bwrap started but the program could not run in
// the sandbox's mount layout (a foreign-binary loader such as nix-ld is one example) [X RUN-lean-toolchain].
export function classifyCanary({ exitCode, output }) {
  const ls = lines(output);
  const bwrapLine = first(ls, RE.bwrap);
  if (exitCode === 0) return { sandbox: 'on', reason: 'started', detail: null };
  if (bwrapLine) return { sandbox: 'failed', reason: 'bwrap-diagnostic', detail: bwrapLine };
  const line = ls.find((l) => l.length > 0) ?? `exit ${exitCode}`;
  return { sandbox: 'failed', reason: 'program-failed-inside-sandbox', detail: line };
}
