#!/usr/bin/env node
// make-seccomp-profile.mjs: build the narrow seccomp profile of W0-S06.
//
// The profile is Docker's own default seccomp profile for the engine in use, plus one allow rule for the
// five system calls that bubblewrap needs to set up Lake's sandbox when the container does not hold
// CAP_SYS_ADMIN: clone (with namespace flags), unshare, mount, umount2 and pivot_root. Nothing else in
// the default profile changes, so every other syscall the default blocks stays blocked.
//
// The base file is Docker's (github.com/moby/profiles, Apache License 2.0, copyright The Moby authors).
// This script fetches it at run time from the engine's tag and adds the rule; it does not redistribute
// it. A summary is printed as JSON on stdout (base URL and SHA-256, output file name and SHA-256, the rule).
//
// usage: node make-seccomp-profile.mjs --out <file> (--engine-version <x.y.z> | --base <file>) [--omit <syscall>]
// --omit leaves one of the five out of the added rule, to show that each is needed (result 1 of the decision record).

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = opt('--out');
const baseFile = opt('--base');
const version = opt('--engine-version');
const omit = opt('--omit');
if (!out || (!baseFile && !version)) {
  console.error('usage: node make-seccomp-profile.mjs --out <file> (--engine-version <x.y.z> | --base <file>) [--omit <syscall>]');
  process.exit(64);
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

async function loadBase() {
  if (baseFile) {
    const text = readFileSync(baseFile, 'utf8');
    return { url: null, text };
  }
  // the engine's own tag first: `docker-v<version>` with the file under vendor/ for the 29 series, `v<version>` with
  // the file under profiles/ for the 28 series and earlier (read 2026-10-24 for 29.1.3, 28.0.4, 27.5.1 and 26.1.3);
  // then the profiles module's main branch, when the version string names no upstream tag
  const clean = version.replace(/[-+].*$/, '');
  const raw = 'https://raw.githubusercontent.com/moby/moby';
  const candidates = [
    `${raw}/docker-v${clean}/vendor/github.com/moby/profiles/seccomp/default.json`,
    `${raw}/docker-v${clean}/profiles/seccomp/default.json`,
    `${raw}/v${clean}/profiles/seccomp/default.json`,
    'https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json',
  ];
  for (const url of candidates) {
    const res = await fetch(url);
    if (res.ok) return { url, text: await res.text() };
  }
  throw new Error(`no default seccomp profile found for engine ${version} at ${candidates.join(' or ')}`);
}

const { url, text } = await loadBase();
const profile = JSON.parse(text);
if (profile.defaultAction !== 'SCMP_ACT_ERRNO' || !Array.isArray(profile.syscalls)) {
  throw new Error('the base file does not look like Docker\'s default profile (defaultAction SCMP_ACT_ERRNO, syscalls[])');
}

const names = ['clone', 'mount', 'pivot_root', 'umount2', 'unshare'];
if (omit !== undefined && !names.includes(omit)) throw new Error(`--omit must be one of ${names.join(', ')}`);
const rule = {
  names: names.filter((n) => n !== omit),
  action: 'SCMP_ACT_ALLOW',
  comment: 'W0-S06: bubblewrap sets up the sandbox of lake check and lake comparator with these, without CAP_SYS_ADMIN',
};
profile.syscalls.push(rule);

const body = JSON.stringify(profile, null, 2) + '\n';
writeFileSync(out, body);
console.log(JSON.stringify({
  base: { url, sha256: sha256(text), syscallRules: JSON.parse(text).syscalls.length },
  output: { file: basename(out), sha256: sha256(body), syscallRules: profile.syscalls.length },
  addedRule: rule,
  omitted: omit ?? null,
}, null, 2));
