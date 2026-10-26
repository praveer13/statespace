# Deploying the instrument origin

The instrument origin is its own GitHub Pages site. It is served from the `main` branch root of the public repository
`praveer13/statespace-instruments`, with the custom domain `statespace-instruments.play.naigap.com`. This repository
builds it (`apps/instruments`). Third-party engine payloads ship only in that repository's published tree. They are
never committed here: `apps/instruments/public/engines/` is gitignored and `scripts/instruments/fetch-engines.mjs`
downloads them, checks each SHA-256, and writes them on every build.

The main site (`apps/site`) is served from the `gh-pages` branch of `praveer13/statespace` at
`https://statespace.play.naigap.com`. These two names are the whole pairing. The instruments build accepts that origin
as its only parent, and the site build names the instrument origin in its frame source and handshake (ARCHITECTURE.md
sections 5.2 and 5.5).

Nothing here runs from CI yet. The release lane's deploy step is W6-T14, behind GATE-release.

## What the instruments repository holds now

Checked on 2026-10-26 from a fresh clone:

| Path | What it is | On deploy |
|---|---|---|
| `CNAME` | `statespace-instruments.play.naigap.com` | **keep, unchanged.** Pages loses the custom domain without it |
| `.nojekyll` | turns Jekyll off, so `_`-prefixed and dot paths are served | **keep** |
| `LICENSE`, `LICENSES/` (MPL-2.0, Python-2.0, Z3-MIT) | the course's MIT licence and the engine licence texts | **keep**, then add the new engines' texts (step 5) |
| `README.md`, `THIRD-PARTY.md` | what the origin is; the engine notice table | **keep**, then update `THIRD-PARTY.md` (step 5) |
| `index.html` | a plain front page describing the origin | **keep** (the build has no `index.html`) |
| `b/96137b0f594f/` | the W0-S02 spike build (host, worker, its own Pyodide and Z3 copy) | **keep**. Recorded spike runs cite it, and it lives under its own path |
| `sw.js` | the W0-S02 spike service worker, registered at scope `/` by that spike host | **replace** with the retirement worker in step 4 |

The old `sw.js` must not stay as it is. It answers every same-origin request whose path contains `/engines/` from
its own cache and returns 504 when that cache misses. The new build serves its engines at `/engines/…`, so any browser
that still has the spike worker registered (the owner's phones from the W0-S02 sessions) would get 504s for every
engine file. Deleting the file is not enough either: a failed update check leaves the old worker installed. Replace it
with a worker that unregisters itself.

## 1. Build the instruments app

From a clean checkout of this repository, at the commit you mean to deploy:

```sh
npm ci
BUILD_ID=$(git rev-parse --short=12 HEAD)
MAIN_ORIGIN=https://statespace.play.naigap.com \
INSTRUMENTS_BUILD=$BUILD_ID \
  npm run build -w @statespace/instruments
```

`npm run build` runs `fetch-engines.mjs` first. It downloads Pyodide 314.0.7, the z3_solver 5.3.1.0 wheel, PGlite
0.5.11 and Spectacle at commit 5827c22. Each download is checked against its pinned SHA-256 before anything is
unpacked, and downloads are cached in `node_modules/.cache/statespace-engines`. The script then writes
`public/engines/<family>/<version>/` and `public/engines/manifest.json`, and Vite copies both into `dist/`. The build
then typechecks and bundles `host.html`, `instrument.html` and the six engine workers.

With `MAIN_ORIGIN` set, the build accepts that one parent origin. A production build (`vite build`) with neither
`MAIN_ORIGIN` nor `DEV_PARENTS` set also defaults to `https://statespace.play.naigap.com` alone
(`apps/instruments/vite.config.ts`). **Never** deploy a build made with `DEV_PARENTS`. That variable is only for local
cross-origin tests.

Check the output before publishing it:

```sh
# the parent list: exactly the main origin, no localhost
grep -o 'localhost:[0-9]*' apps/instruments/dist/assets/host-*.js && echo 'STOP: localhost in a production build'
grep -c 'https://statespace.play.naigap.com' apps/instruments/dist/assets/host-*.js   # 1
# the engine manifest and its first-load figures
node -e 'const m=require("./apps/instruments/dist/engines/manifest.json");for(const[k,e]of Object.entries(m.engines))console.log(k,e.version,e.firstLoadBytes)'
# GATE-bundle's lint.parents on this build
node scripts/verify-bundle.mjs --only lint.parents   # pass: the production instrument build names no localhost
```

The expected manifest lines are `z3 5.3.1 12893420`, `datalog 5.3.1 12893420`, `derivation 5.3.1 12893420`,
`pglite 0.5.11 5580851`, `spectacle 5827c22 428159` and `goal-replay 4.35.0 7474`. The `dist/` tree is about 42 MB,
and its largest file is under GitHub's 100 MB per-file limit.

## 2. Clone the instruments repository

```sh
WORK=$(mktemp -d)
git clone https://github.com/praveer13/statespace-instruments.git "$WORK/inst"
cat "$WORK/inst/CNAME"    # statespace-instruments.play.naigap.com
```

## 3. Copy the build in

Copy the build's published files to the root of the repository. Copy nothing else, and leave out `dist/.vite/`
(Vite's own build manifest):

```sh
D=apps/instruments/dist
rm -rf "$WORK/inst/assets" "$WORK/inst/engines"      # the previous root build, if any; never b/ or CNAME
cp    "$D/host.html" "$D/instrument.html" "$D/favicon.svg" "$WORK/inst/"
cp -R "$D/assets" "$D/engines" "$WORK/inst/"
```

The host is then at `https://statespace-instruments.play.naigap.com/host.html`, which is the site's default
`VITE_INSTRUMENTS_HOST` (`/host.html`). Versioned paths (`b/<buildId>/host.html`) are a follow-up. When they land,
copy the build under `b/$BUILD_ID/` with `VITE_BASE=/b/$BUILD_ID/` set at build time, and set
`VITE_INSTRUMENTS_HOST=/b/$BUILD_ID/host.html` on the site.

## 4. Retire the spike service worker

Overwrite `sw.js` with a worker that clears the spike's shell cache, unregisters itself and leaves the engine cache to
the new build. Do not delete the engine cache: the new build's `assets.ts` uses the same name, `ss-engines-v1`, and
checks every entry's SHA-256 on read.

```sh
cat > "$WORK/inst/sw.js" <<'EOF'
// Retires the W0-S02 spike service worker (scope /). The instrument host no longer uses a service worker; engine
// files are fetched, SHA-256-checked and cached by the engine workers themselves (apps/instruments/src/workers/shared).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ss-shell-')) await caches.delete(k)
    await self.registration.unregister()
  })())
})
EOF
```

## 5. Update the notices

Edit `THIRD-PARTY.md` so it lists every engine the root build serves (paths under `engines/`, not `b/<build>/engines/`).
Keep the existing rows for the `b/96137b0f594f/` build. Add rows for these:

| Path under `engines/` | Component | Version | License |
|---|---|---|---|
| `pyodide/314.0.7/` | Pyodide (with CPython's stdlib zip) | 314.0.7 | MPL-2.0; PSF for `python_stdlib.zip` |
| `z3/5.3.1.0/` | Z3, the `z3-solver` wheel for Pyodide | 5.3.1.0 | MIT |
| `pglite/0.5.11/` | PGlite (`@electric-sql/pglite`), with PostgreSQL 18.6 compiled in | 0.5.11 | Apache-2.0 (PGlite); PostgreSQL License (PostgreSQL) |
| `spectacle/5827c22/` | Spectacle `eval.js`, with web-tree-sitter, tree-sitter-tlaplus, lodash and hash-sum as Spectacle ships them | commit 5827c22 | MIT, each library under its own MIT licence |
| `goal-replay/4.35.0/` | the course's own goal strips (RUN-goal-replay) | 4.35.0 | CC-BY-4.0, the course's content licence |

Add the licence texts under `LICENSES/`: `Apache-2.0.txt` (from `engines/pglite/0.5.11/LICENSE`), `PostgreSQL.txt`
(the PostgreSQL 18 `COPYRIGHT` file), and `Spectacle-MIT.txt` (from `engines/spectacle/5827c22/license/LICENSE`).
`MPL-2.0.txt`, `Python-2.0.txt` and `Z3-MIT.txt` are already there. Update the first sentence of `THIRD-PARTY.md` so
it names the root `host.html`, `instrument.html` and `assets/` as the course's own MIT files.

## 6. Publish

```sh
cd "$WORK/inst"
git add -A
git status --short | grep -v '^A  \(assets\|engines\)/' # read the rest: only host.html, instrument.html, favicon.svg, sw.js, THIRD-PARTY.md, LICENSES/
test "$(cat CNAME)" = statespace-instruments.play.naigap.com
git commit -m "Instrument build $BUILD_ID: bus v1 host and six engines (z3, datalog, derivation, pglite, spectacle, goal-replay)"
git push origin main
```

Pages rebuilds from `main` (`/`). Wait for `gh api repos/praveer13/statespace-instruments/pages/builds/latest --jq .status`
to report `built`, then check:

```sh
curl -sI https://statespace-instruments.play.naigap.com/host.html | head -1                     # 200
curl -s  https://statespace-instruments.play.naigap.com/engines/manifest.json | head -c 200
curl -sI https://statespace-instruments.play.naigap.com/engines/pyodide/314.0.7/pyodide.asm.wasm | grep -i content-type   # application/wasm
```

## 7. Point the site's build at the instrument origin

The site reads the instrument origin at build time from `VITE_INSTRUMENTS_ORIGIN`. That one value feeds the CSP's
`frame-src` (`apps/site/vite.config.ts`) and the frame URL and handshake check (`apps/site/src/instruments/config.ts`).
`VITE_INSTRUMENTS_BUILD` must equal the `INSTRUMENTS_BUILD` of step 1, or the host's `hello` is ignored and every cell
stays on its recorded run.

```sh
VITE_INSTRUMENTS_ORIGIN=https://statespace-instruments.play.naigap.com \
VITE_INSTRUMENTS_BUILD=$BUILD_ID \
  npm run build -w @statespace/site
grep -o 'frame-src [^;]*' apps/site/dist/index.html   # frame-src https://statespace-instruments.play.naigap.com
```

Do not rely on `COURSE_DOMAIN` for this. Its fallback writes `frame-src https://instruments.<domain>`, which is not
the instrument origin's name, and `config.ts` does not read it. A production site build with no
`VITE_INSTRUMENTS_ORIGIN` embeds no frame: every cell shows its recorded run and nothing goes live.

Publish `apps/site/dist/` to the `gh-pages` branch of `praveer13/statespace` in the same way: keep that branch's
`CNAME` (`statespace.play.naigap.com`) and `.nojekyll`. **Deploy the instruments first.** A site that names a build
the instrument origin does not serve yet falls back to recorded runs: every cell still reads, but nothing runs live.

## 8. Smoke the pair

Open `https://statespace.play.naigap.com/lessons/S1.L0` in a fresh profile. Make the call on Figure 1.1 and check:

1. The cell shows the loader with "12.9 MB (12,893,420 bytes …)" and no prompt.
2. The run reads "Run in this tab · Z3 5.3.1 · rlimit 5,000,000" with `sat`.
3. The network panel shows requests only to the two origins.

Then repeat on S7.L1 Figure 2.2 (Datalog), S4.L2 cell 1 (Derivation), S2.L3 cell 1 (Goal Replay), S6.L1 cell 1
(PGlite) and S5.L3 Figure 2.1 (Spectacle). The local equivalent is
`scratchpad/final/sweep.mjs` from Phase 4 (site on :5181, a `DEV_PARENTS=http://localhost:5181` instruments build
previewed on :5182).

## Rolling back

Revert the publish commit in `statespace-instruments` and push. The site keeps working either way: if the handshake
fails, every live cell shows its recorded run and the words "live · unavailable".
