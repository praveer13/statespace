// expectations.mjs: what each recorded step was built to show, written from how the step is constructed and
// from the exploratory runs made before the recorded run, and not from the classifier's output. The
// assembler and the tests compare the classifier with these.

// Whether the sandbox starts under each local container profile (run-matrix.sh), as observed in the
// exploratory runs. The recorded canary is the independent check on this table. The table holds for the local
// configurations only; a virtual machine or a real lane has no prediction, and its canary alone sets what its
// steps are expected to show.
export const PROFILE_SANDBOX = {
  default: 'failed',
  'seccomp-unconfined': 'failed', // bwrap: Can't mount proc on /newroot/proc
  'systempaths-unconfined': 'failed', // bwrap: No permissions to create new namespace
  'cap-sys-admin': 'failed', // bwrap: pivot_root: Operation not permitted
  'cap-sys-admin-systempaths': 'failed',
  'unconfined-both': 'on',
  narrow: 'on',
  'narrow-no-systempaths': 'failed',
  'narrow-no-run-user': 'failed', // bwrap: Can't mkdir /run/user
  'narrow-without-clone': 'failed', // bwrap: No permissions to create new namespace
  'narrow-without-unshare': 'failed', // bwrap: unshare user ns: Operation not permitted
  'narrow-without-mount': 'failed', // bwrap: Failed to make / slave: Operation not permitted
  'narrow-without-umount2': 'failed', // bwrap: unmount old root: Operation not permitted
  'narrow-without-pivot_root': 'failed', // bwrap: pivot_root: Operation not permitted
  'narrow-no-apparmor': 'on', // this host has no AppArmor, so the option changes nothing here
  'narrow-root': 'on',
  privileged: 'on',
  'narrow-cpus2': 'on',
  'narrow-cpuset': 'on',
  'narrow-std': 'on',
  'narrow-mem1g': 'on',
  'narrow-mem2g': 'on',
  'narrow-mem3g': 'on',
  'narrow-mem4g': 'on',
};

// Step name (the repeat suffix -rN removed) -> what a correct reading of its output is when the sandbox works.
// verdict: accepted | rejected | no-verdict; reason: the classifier's reason, when the step fixes one (a pattern).
const WORKING = [
  [/^(comparator|comparator-paranoid|check|check-paranoid)$/, { verdict: 'accepted', sandbox: 'on' }],
  [/^(comparator|comparator-paranoid|check|check-paranoid)-off$/, { verdict: 'accepted', sandbox: 'off' }],
  [/^discover-(comparator|check)-paranoid$/, { verdict: 'accepted', sandbox: 'on' }],
  [/^variant-weak$/, { verdict: 'rejected', reason: 'statement-mismatch', sandbox: 'on' }],
  [/^variant-redef$/, { verdict: 'rejected', reason: 'const-mismatch', sandbox: 'on' }],
  [/^variant-(sorry|axiom|native)$/, { verdict: 'rejected', reason: 'illegal-axiom', sandbox: 'on' }],
  [/^variant-kernelskip$/, { verdict: 'rejected', reason: 'kernel-rejected', sandbox: 'on' }],
  [/^variant-missing$/, { verdict: 'rejected', reason: 'theorem-missing', sandbox: 'on' }],
  [/^variant-builderror$/, { verdict: 'rejected', reason: 'build-failed', sandbox: 'on' }],
  [/^variant-sorry-check$/, { verdict: 'rejected', reason: 'axiom-not-permitted', sandbox: 'on' }],
  [/^variant-builderror-check$/, { verdict: 'rejected', reason: 'build-failed', sandbox: 'on' }],
  [/^start-no-manifest(-check)?$/, { verdict: 'no-verdict', reason: 'no-manifest', sandbox: 'unknown' }],
  [/^start-bad-config$/, { verdict: 'no-verdict', reason: 'bad-config', sandbox: 'unknown' }],
  [/^start-missing-config$/, { verdict: 'no-verdict', reason: 'missing-config', sandbox: 'unknown' }],
  [/^start-no-bwrap(-check)?$/, { verdict: 'no-verdict', reason: 'bwrap-not-found', sandbox: 'failed' }],
  [/^inject-(comparator|check)(-paranoid)?-call\d+$/, { verdict: 'no-verdict', reason: 'bwrap-diagnostic', sandbox: 'failed' }],
  [/^discover-kernelskip-paranoid$/, { verdict: 'rejected', reason: 'kernel-rejected', sandbox: 'on' }],
];

// What a step shows when the sandbox cannot start: every sandboxed Lake run is a failure with no verdict.
const FAILING = [
  [/^(comparator|comparator-paranoid|check|check-paranoid)$/, { verdict: 'no-verdict', reason: 'bwrap-diagnostic', sandbox: 'failed' }],
  [/^(comparator|comparator-paranoid|check|check-paranoid)-off$/, { verdict: 'accepted', sandbox: 'off' }],
];

// Under a memory cap the run either completes or the kernel kills a process. A kill is a resource failure: it must
// never read as a rejection and never as a sandbox failure, whatever line Lake prints about it.
const MEMORY = [
  [/^(comparator-paranoid|check-paranoid)$/, { anyOf: [{ verdict: 'accepted', sandbox: 'on' }, { verdict: 'no-verdict', sandbox: 'unknown', reason: '(unexplained-exit|checker-killed)-\\d+' }] }],
];

export const stepBase = (name) => name.replace(/-r\d+$/, '');

// Predictions the recording refuted. The expectation tables above stay as they were written before the run; when the
// classifier's reading of a step is exactly the one listed here, the assembler counts the step as a missed prediction
// (kept in the record, with this note) and not as a classifier mismatch: the prediction was about the world, and the
// classifier read what the output says. Every entry names the output that shows it.
export const MISSED = [
  {
    profile: 'narrow-std',
    step: 'check-paranoid',
    got: { verdict: 'no-verdict', sandbox: 'unknown', reason: 'checker-killed-137' },
    note: 'predicted to accept within the 6 GiB cap, as the same pack does without `import Std`; nanoda was killed (exit 137, with the container at its memory cap), the other five checkers accepted, and Lake printed "nanoda kernel rejected the solution" for the killed one. No exploratory run of this profile preceded the recording.',
  },
];

export function missedFor(profile, stepName, got) {
  return MISSED.find((m) => m.profile === profile && m.step === stepBase(stepName) && m.got.verdict === got.verdict && m.got.sandbox === got.sandbox && m.got.reason === got.reason) ?? null;
}

// Lake runs that the classifier reads; the canaries and `lake build` are not among them.
export const isLakeCheck = (argv) => argv[0] === 'lake' && (argv[1] === 'check' || argv[1] === 'comparator');

export function expectedFor(profile, canarySandbox, stepName) {
  const base = stepBase(stepName);
  const table = /^narrow-mem\d+g$/.test(profile) ? MEMORY : canarySandbox === 'on' ? WORKING : FAILING;
  for (const [re, exp] of table) if (re.test(base)) return exp;
  return null;
}
