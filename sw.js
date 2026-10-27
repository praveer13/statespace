/* statespace service worker: written by apps/site/src/sw/build-sw.mjs from the vendored kernelspace worker,
   with statespace's rewrites applied. Do not edit; edit the build step. */
/* kernelspace service worker (docs/specs/wave-1.md §6.10; docs/specs/ledger-v3.md §9.7).
   Today and Boot work offline after one visit. Four rules:
     1. Kill switch: set KILL_SWITCH to true and deploy, and install/activate unregister this worker and delete
        every cache. A copy that scripts/build-sw-manifest.ts never patched (BUILD is still null) does the same,
        so a build that skipped the script cannot leave a half-configured worker behind. Install only clears caches
        and skips waiting: unregistering inside install deadlocks in Chromium (the unregister job queues behind the
        update job that is waiting on this install), so the unregister happens in activate.
        App code (src/main.tsx) also unregisters on ?nosw=1 (it sends a `kill` message first, so the live worker
        stops caching), and a navigation carrying it bypasses this worker.
     2. index.html is network-first with a 3 s timeout, then the precached shell. Hashed assets are cache-first.
        A navigation to a static page that is not the app (capstone-sandbox.html, the Capstone's sandboxed frame)
        bypasses the worker: answering with the shell would load the app inside the frame, which never answers
        the sandbox handshake, so Capstone would fall back to "sandbox: worker only" with no hint why.
        Cache lookups pass ignoreVary: the Cache API enforces Vary, and a host that sends `Vary: Origin` (vite preview
        does) would otherwise miss every asset, because the precache request carried no Origin header.
     3. Schema handshake: pages post { t: 'hello', schemaVersion }. The highest value seen is kept, and a cached
        shell built for a lower schema is never served once a newer one has been seen.
     4. It never caches kernelspace:* storage or IndexedDB. It touches no storage API except its own caches, and
        it handles only same-origin GETs inside its scope: the precache list below plus hashed assets.
   scripts/build-sw-manifest.ts replaces the BUILD placeholder in dist/sw.js after `vite build`. */

const KILL_SWITCH = false
const BUILD = {
  "id": "bb0d354ddb32",
  "schema": 1,
  "shell": "index.html",
  "precache": [
    "assets/AssuranceScreen-8xyg1xq_.css",
    "assets/AssuranceScreen-Cdc7sBGn.js",
    "assets/AuditScreen-DzN3VTjH.js",
    "assets/BenchScreen-C5m7cJZl.js",
    "assets/BenchScreen-CsRTiHp7.css",
    "assets/CallItCell-6Xyb9f_t.css",
    "assets/CallItCell-CTfeNbbL.js",
    "assets/CaseScreen-CPSOT88c.js",
    "assets/ClaimsScreen-B0-LikFC.css",
    "assets/ClaimsScreen-BLV0GjBZ.js",
    "assets/DefenceIndex-CyqsFFtL.js",
    "assets/DefenceScreen-CZuXq-77.js",
    "assets/DerivationView-BiIcWWTF.js",
    "assets/DrawerRoute-CAWJp91Y.js",
    "assets/ErosionScreen-BIIfMqyK.js",
    "assets/Feedback-CslPWstr.js",
    "assets/Figure-DM2weF7E.js",
    "assets/GeneratedItem-DQ6xDYKc.js",
    "assets/LabScreen-A53YTXln.css",
    "assets/LabScreen-BVPr70jW.js",
    "assets/LessonRoute-CLi2h2We.js",
    "assets/Markdown-B9pNgG65.js",
    "assets/Markdown-DhH5HjoL.css",
    "assets/MirrorRoute-C4Kopc-P.js",
    "assets/MirrorRoute-C4UeOiPV.css",
    "assets/PageView-B9XHYc_6.css",
    "assets/PageView-NI_hkN-G.js",
    "assets/ReceiptView-SRxRxnzi.js",
    "assets/ReportScreen-D4nPdrk-.js",
    "assets/SearchScreen-BGOCWssf.js",
    "assets/SearchScreen-FPP-30vv.css",
    "assets/SessionScreen-CP-pDcXA.js",
    "assets/SettingsScreen-BqLoLLRW.css",
    "assets/SettingsScreen-CKiqtoIo.js",
    "assets/SpecimensRoute-BfmG_u1r.js",
    "assets/SpecimensRoute-DpkDY6UY.css",
    "assets/StageScreen-IGyNqPL3.js",
    "assets/StagesScreen-CDbrpBXK.js",
    "assets/Stamp-DGh_TzIk.js",
    "assets/Stamp-rEl26vr_.css",
    "assets/StateSpace3D-BlUyzOuI.js",
    "assets/TodayScreen-C8zrw7I7.css",
    "assets/TodayScreen-CGnym-Ys.js",
    "assets/Toy-B0wdUiTz.js",
    "assets/Toy-B3dX-YZ-.js",
    "assets/Toy-BE_tEBZ6.css",
    "assets/Toy-BREXvcmb.js",
    "assets/Toy-BggrqcsT.js",
    "assets/Toy-BhP8z1_x.js",
    "assets/Toy-Bn8nPq2f.css",
    "assets/Toy-BtxHnyY9.js",
    "assets/Toy-BvlOigQ7.js",
    "assets/Toy-By2U5_nh.js",
    "assets/Toy-C0Kbm0On.css",
    "assets/Toy-C8ym6Fse.css",
    "assets/Toy-C9lxxvP2.css",
    "assets/Toy-CEWmH0IL.js",
    "assets/Toy-CFCCNOzC.css",
    "assets/Toy-CHGxH1J0.js",
    "assets/Toy-CN37NuX4.css",
    "assets/Toy-CNETePVI.js",
    "assets/Toy-CNpf0HX7.css",
    "assets/Toy-CUZOmFnj.js",
    "assets/Toy-C_c-HtQC.css",
    "assets/Toy-Cu0G14jp.css",
    "assets/Toy-CudPyVlT.js",
    "assets/Toy-CxtZgn0w.js",
    "assets/Toy-D-SM0SK4.css",
    "assets/Toy-D1CBSuTQ.js",
    "assets/Toy-DIKy5Z6s.css",
    "assets/Toy-DLloZ2hJ.js",
    "assets/Toy-DY7FJpG0.js",
    "assets/Toy-DcfAl46c.css",
    "assets/Toy-DqAkZuk1.css",
    "assets/Toy-DzkHsdfv.css",
    "assets/Toy-IVncI3Oa.js",
    "assets/Toy-MpoSxgWf.css",
    "assets/Toy-_MQu9FXZ.css",
    "assets/Toy-cH1LiQmM.js",
    "assets/Toy-eQMzeTFv.css",
    "assets/Toy-iuuL77Fi.css",
    "assets/Toy-jeHHfD0R.js",
    "assets/Toy-v7tqj16B.css",
    "assets/ToyFrame-D5tLW-qo.js",
    "assets/ToyFrame-DcAm_ysB.css",
    "assets/WeekScreen-CSBNSlk6.css",
    "assets/WeekScreen-CvUcyVtZ.js",
    "assets/WorldScreen-tI7F4TMN.css",
    "assets/WorldScreen-thOYQJVX.js",
    "assets/audit-CNwPLw-a.css",
    "assets/bands-3Wp2tJ3X.js",
    "assets/blocks-C2HfMuMj.js",
    "assets/data-C9b9FDbT.js",
    "assets/defence-C7ilWiMt.js",
    "assets/defence-CRe2Ci6l.css",
    "assets/derive-D-WxxDRl.js",
    "assets/draft-BsTaaOGG.js",
    "assets/draw-CuRbYhZA.js",
    "assets/draw-JRL3n2RK.js",
    "assets/facts-CKsfTgNI.js",
    "assets/generated-CRxAuawI.css",
    "assets/generated-JsymfUOt.js",
    "assets/grade-CDSLFUA1.js",
    "assets/graph-CK0wXIMo.js",
    "assets/graph.generated-6v5gJLC0.js",
    "assets/index-B2s-lYZP.js",
    "assets/index-BDpvXVpT.js",
    "assets/index-BE9YFaD1.js",
    "assets/index-BFvPFno4.js",
    "assets/index-BLISambp.js",
    "assets/index-BRAiP-I4.js",
    "assets/index-CIJnw74l.css",
    "assets/index-CPu1mmU3.js",
    "assets/index-CR32S94W.js",
    "assets/index-D7V9mZbP.js",
    "assets/index-DGon3RWz.js",
    "assets/index-DVpWRlAt.js",
    "assets/index-DW0ZsPER.js",
    "assets/index-DX6SItyX.js",
    "assets/index-DflOEu74.js",
    "assets/index-Dp8mOSPM.js",
    "assets/index-DvvcKuZ5.js",
    "assets/inline-Bj5HzIih.js",
    "assets/ledger-ZAOM80Jo.js",
    "assets/page-CYL4P20B.css",
    "assets/parse-DO1LcGq5.js",
    "assets/plan-DELfmpsY.js",
    "assets/pool-ETzrworv.js",
    "assets/port-Di5Rqm5r.js",
    "assets/progress-DkLFfm6G.js",
    "assets/receipt-Bgdnloi4.js",
    "assets/receipt-aEVwEc_7.css",
    "assets/receipt-model-d1JGSMTp.js",
    "assets/record-CW5Vrtfo.js",
    "assets/report-B1EM72yN.js",
    "assets/report-CJ-JEzi0.css",
    "assets/rng-ClP2v2oA.js",
    "assets/seed-BfShY4BO.js",
    "assets/stages-CHMYgy5U.css",
    "assets/stats-ClB97aV5.js",
    "assets/stats-DsySiSMI.js",
    "assets/status-CjmsBvEw.js",
    "assets/store-BW1qJswq.js",
    "assets/strip-B1An1dcC.js",
    "assets/time-DuUNeBoL.js",
    "assets/today-D45NTFPh.js",
    "assets/useErosions-BER0Ej4Q.js",
    "assets/useReceipts-B69wgmFM.js",
    "assets/weights-B6v_qIAf.js",
    "content/S1.L0.50ae321b39ef.json",
    "content/manifest.json",
    "content/search.b210c7412fe1.json",
    "content/stages.82dac10e4fbd.json",
    "fonts/jost-var-core.woff2",
    "fonts/jost-var-ext.woff2",
    "fonts/juliamono-400-core.woff2",
    "fonts/juliamono-400-ext.woff2",
    "fonts/juliamono-600-core.woff2",
    "fonts/juliamono-600-ext.woff2",
    "fonts/source-serif-4-400-core.woff2",
    "fonts/source-serif-4-400-ext.woff2",
    "fonts/source-serif-4-400-italic-core.woff2",
    "fonts/source-serif-4-400-italic-ext.woff2",
    "fonts/source-serif-4-600-core.woff2",
    "fonts/source-serif-4-600-ext.woff2",
    "index.html"
  ],
  "staticPages": []
}

const SHELL_TIMEOUT_MS = 3000
const PREFIX = 'ss-'
const META_CACHE = 'ss-meta'

const SCOPE = self.registration.scope
const kill = KILL_SWITCH || BUILD === null

const allCaches = () => caches.keys()

async function clearCaches() {
  const keys = await allCaches()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

async function retire() {
  await clearCaches()
  await self.registration.unregister()
}

if (kill) {
  self.addEventListener('install', (event) => {
    event.waitUntil(clearCaches().then(() => self.skipWaiting()))
  })
  self.addEventListener('activate', (event) => {
    event.waitUntil(retire())
  })
} else {
  const PRECACHE = `${PREFIX}pre-${BUILD.id}`
  const RUNTIME = `${PREFIX}run-${BUILD.id}`
  const SHELL_URL = SCOPE + BUILD.shell
  const META_URL = `${SCOPE}__ss-sw-meta`
  const precached = new Set(BUILD.precache.map((path) => SCOPE + path))
  /** Pages in public/ that are documents of their own, so a navigation to them is never answered with the app shell. */
  const STATIC_PAGES = new Set(BUILD.staticPages.map((p) => new URL(SCOPE).pathname + p))

  /** Highest schemaVersion any page has announced. Persisted, because the worker is stopped between events. */
  let seen = null
  async function readSeen() {
    if (seen !== null) return seen
    try {
      const hit = await (await caches.open(META_CACHE)).match(META_URL)
      const value = hit ? (await hit.json()).schemaVersion : 0
      seen = Number.isFinite(value) ? value : 0
    } catch {
      seen = 0
    }
    return seen
  }
  async function recordSeen(schemaVersion) {
    if (schemaVersion <= (await readSeen())) return
    seen = schemaVersion
    try {
      const body = JSON.stringify({ schemaVersion })
      await (await caches.open(META_CACHE)).put(META_URL, new Response(body, { headers: { 'content-type': 'application/json' } }))
    } catch {
      // the in-memory value still guards this run of the worker
    }
  }

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .open(PRECACHE)
        .then((cache) => cache.addAll(BUILD.precache.map((path) => new Request(SCOPE + path, { cache: 'reload' }))))
        .then(() => self.skipWaiting()),
    )
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      allCaches()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && ![PRECACHE, RUNTIME, META_CACHE].includes(key)).map((key) => caches.delete(key))))
        .then(() => self.clients.claim()),
    )
  })

  /** Set by a `kill` message (?nosw=1): the page is leaving the worker behind, so it must stop touching caches at once. */
  let killed = false

  self.addEventListener('message', (event) => {
    const data = event.data
    if (data && data.t === 'kill') {
      killed = true
      event.waitUntil(retire())
      return
    }
    if (!data || data.t !== 'hello' || typeof data.schemaVersion !== 'number' || !Number.isFinite(data.schemaVersion)) return
    event.waitUntil(
      recordSeen(data.schemaVersion).then(() => {
        // A page running a newer schema than this build means a newer worker is probably waiting on the network.
        if (data.schemaVersion > BUILD.schema) return self.registration.update()
      }),
    )
  })

  /** The precached shell, or null when it was built for a lower schema than the newest one a page has announced. */
  async function cachedShell() {
    if (BUILD.schema < (await readSeen())) return null
    const cache = await caches.open(PRECACHE)
    return (await cache.match(SHELL_URL, { ignoreVary: true })) ?? null
  }

  const offlineShell = () =>
    new Response('<!doctype html><meta charset="utf-8"><title>statespace offline</title><p>You are offline and this saved copy is out of date. Reconnect and reload.', {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })

  /** Network first. After SHELL_TIMEOUT_MS or a failure, `fallback()`; with nothing to fall back to, keep waiting for the network, then `last()`. */
  async function networkFirst(request, fallback, last) {
    const network = fetch(request)
    network.catch(() => {}) // a late rejection after the timeout has already won must not go unhandled
    let timer
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), SHELL_TIMEOUT_MS)
    })
    try {
      const response = await Promise.race([network, timeout])
      if (response) return response
    } catch {
      // offline or refused: fall through to the cache
    } finally {
      clearTimeout(timer)
    }
    const stored = await fallback()
    if (stored) return stored
    return network.catch(last)
  }

  async function assetFirst(event) {
    const hit = await caches.match(event.request, { ignoreVary: true })
    if (hit) return hit
    const response = await fetch(event.request)
    if (response.ok) event.waitUntil(caches.open(RUNTIME).then((cache) => cache.put(event.request, response.clone())))
    return response
  }

  /** Hashed content-build files (content/<name>.<12 hex>.json): immutable, so cache-first like assets/. */
  const HASHED_CONTENT = /^content\/[\w.-]+\.[0-9a-f]{12}\.json$/
  /** A lesson's file names its stage: content/S5.L3.<hash>.json. */
  const LESSON_FILE = /^content\/(S\d+)\.L\d+\.[0-9a-f]{12}\.json$/
  const stagesCached = new Set()
  /** On a stage's first lesson visit, cache the rest of that stage's lessons from the content manifest. */
  async function cacheStage(stage) {
    if (killed || stagesCached.has(stage)) return
    stagesCached.add(stage)
    try {
      const manifestUrl = SCOPE + 'content/manifest.json'
      const res = (await caches.match(manifestUrl, { ignoreVary: true })) ?? (await fetch(manifestUrl))
      const lessons = (await res.json()).lessons ?? {}
      const cache = await caches.open(RUNTIME)
      for (const [id, entry] of Object.entries(lessons)) {
        if (killed || !id.startsWith(stage + '.') || typeof entry.file !== 'string') continue
        const url = SCOPE + entry.file
        if (await caches.match(url, { ignoreVary: true })) continue
        const file = await fetch(url)
        if (file.ok) await cache.put(url, file)
      }
    } catch {
      stagesCached.delete(stage) // offline mid-way: the next visit tries again
    }
  }

  self.addEventListener('fetch', (event) => {
    const request = event.request
    if (killed || request.method !== 'GET' || request.headers.has('range')) return
    const url = new URL(request.url)
    if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return

    if (request.mode === 'navigate') {
      if (url.searchParams.get('nosw') === '1') return // the recovery link goes straight to the network
      if (STATIC_PAGES.has(url.pathname)) return // never the app shell: a real network answer or a real error
      event.respondWith(networkFirst(request, cachedShell, offlineShell))
      return
    }
    const bare = url.origin + url.pathname
    if (bare.startsWith(`${SCOPE}assets/`) || HASHED_CONTENT.test(bare.slice(SCOPE.length))) {
      event.respondWith(assetFirst(event))
      const lesson = LESSON_FILE.exec(bare.slice(SCOPE.length))
      if (lesson) event.waitUntil(cacheStage(lesson[1]))
    } else if (bare !== SHELL_URL && precached.has(bare)) {
      // claims.json and the like: data the deploy may have changed, so the network wins and the cache is the offline copy.
      // The shell is excluded: it is only ever replaced by an install, so it always matches the precached chunks.
      // Offline with nothing cached is a plain network error, never an HTML page for a JSON consumer.
      const key = new Request(bare)
      event.respondWith(
        networkFirst(request, () => caches.match(key, { ignoreVary: true }), () => Response.error()).then((response) => {
          if (response.ok && response.status === 200) event.waitUntil(caches.open(PRECACHE).then((cache) => cache.put(key, response.clone())))
          return response
        }),
      )
    }
  })
}
