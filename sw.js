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
  "id": "46fa313bd49b",
  "schema": 1,
  "shell": "index.html",
  "precache": [
    "assets/AssuranceScreen-8xyg1xq_.css",
    "assets/AssuranceScreen-bevk2B1S.js",
    "assets/AuditScreen-DmM1Gg7r.js",
    "assets/BenchScreen-CsRTiHp7.css",
    "assets/BenchScreen-TsUXFRnN.js",
    "assets/CallItCell-6Xyb9f_t.css",
    "assets/CallItCell-CZiUghIt.js",
    "assets/CaseScreen-CB1Dj3R8.js",
    "assets/ClaimsScreen-B0-LikFC.css",
    "assets/ClaimsScreen-DQhL9D0W.js",
    "assets/DefenceIndex-ceqzo88y.js",
    "assets/DefenceScreen-CJdX_4CS.js",
    "assets/DerivationView-CdA0pOqS.js",
    "assets/DrawerRoute-BlSOmU4q.js",
    "assets/ErosionScreen-CBO0XRNk.js",
    "assets/Feedback-DzwxQNjg.js",
    "assets/Figure-DmG8VBDG.js",
    "assets/GeneratedItem-M3nxcwQm.js",
    "assets/LabScreen-A53YTXln.css",
    "assets/LabScreen-BW4GS74Y.js",
    "assets/LessonRoute-BvjHiAP4.js",
    "assets/Markdown-B_KyZZkw.js",
    "assets/Markdown-DhH5HjoL.css",
    "assets/MirrorRoute-C4UeOiPV.css",
    "assets/MirrorRoute-DedE4tek.js",
    "assets/PageView-B9XHYc_6.css",
    "assets/PageView-CENq65T7.js",
    "assets/ReceiptView-BSQYTJYg.js",
    "assets/ReportScreen-Celc12Q-.js",
    "assets/SearchScreen-FPP-30vv.css",
    "assets/SearchScreen-e7Qu6zMI.js",
    "assets/SessionScreen-QhCp_dHf.js",
    "assets/SettingsScreen-BqLoLLRW.css",
    "assets/SettingsScreen-_c6Nna8K.js",
    "assets/SpecimensRoute-CEAW7vlA.js",
    "assets/SpecimensRoute-DpkDY6UY.css",
    "assets/StageScreen-DNYzv6GF.js",
    "assets/StagesScreen-rDL8nk1P.js",
    "assets/Stamp-V9K799gK.js",
    "assets/Stamp-rEl26vr_.css",
    "assets/TodayScreen-B_GQbHDH.js",
    "assets/TodayScreen-C8zrw7I7.css",
    "assets/Toy-05EPTrtI.js",
    "assets/Toy-AoZDaKiI.js",
    "assets/Toy-BBVVD76B.js",
    "assets/Toy-BE_tEBZ6.css",
    "assets/Toy-BLJOILpv.js",
    "assets/Toy-BOFVZEj6.js",
    "assets/Toy-BP8vZwcT.js",
    "assets/Toy-Bn8nPq2f.css",
    "assets/Toy-Bxo9cGhY.js",
    "assets/Toy-C0Kbm0On.css",
    "assets/Toy-C5Qrd-cB.js",
    "assets/Toy-C8axFqdM.js",
    "assets/Toy-C8ym6Fse.css",
    "assets/Toy-C9lxxvP2.css",
    "assets/Toy-CBb2HnoD.js",
    "assets/Toy-CFCCNOzC.css",
    "assets/Toy-CN37NuX4.css",
    "assets/Toy-CNpf0HX7.css",
    "assets/Toy-CUAeii4r.js",
    "assets/Toy-C_c-HtQC.css",
    "assets/Toy-Cu0G14jp.css",
    "assets/Toy-D-SM0SK4.css",
    "assets/Toy-D1WZmGP7.js",
    "assets/Toy-DIKy5Z6s.css",
    "assets/Toy-DSeJ_EYM.js",
    "assets/Toy-D_6m36RH.js",
    "assets/Toy-D__IgypQ.js",
    "assets/Toy-DcfAl46c.css",
    "assets/Toy-DqAkZuk1.css",
    "assets/Toy-DwUwVVee.js",
    "assets/Toy-DzkHsdfv.css",
    "assets/Toy-MpoSxgWf.css",
    "assets/Toy-_MQu9FXZ.css",
    "assets/Toy-eQMzeTFv.css",
    "assets/Toy-iuuL77Fi.css",
    "assets/Toy-lXEUhuxF.js",
    "assets/Toy-mRMIgnXj.js",
    "assets/Toy-q3WGP7An.js",
    "assets/Toy-rDpp9AV_.js",
    "assets/Toy-v7tqj16B.css",
    "assets/ToyFrame-DcAm_ysB.css",
    "assets/ToyFrame-vJ7SSdPy.js",
    "assets/WeekScreen-CSBNSlk6.css",
    "assets/WeekScreen-FImePLRt.js",
    "assets/WorldScreen-BKvTALji.js",
    "assets/WorldScreen-tI7F4TMN.css",
    "assets/audit-CNwPLw-a.css",
    "assets/bands-3Wp2tJ3X.js",
    "assets/blocks-C2HfMuMj.js",
    "assets/data-C9b9FDbT.js",
    "assets/defence-BChm0tjt.js",
    "assets/defence-CRe2Ci6l.css",
    "assets/derive-D-WxxDRl.js",
    "assets/draft-BsTaaOGG.js",
    "assets/draw-CuRbYhZA.js",
    "assets/draw-Dx7p22cx.js",
    "assets/facts-CR90zo0i.js",
    "assets/generated-CRxAuawI.css",
    "assets/generated-Dul4QzQo.js",
    "assets/grade-BwDhw0Ko.js",
    "assets/graph-CK0wXIMo.js",
    "assets/graph.generated-6v5gJLC0.js",
    "assets/index-C-xg4dS4.js",
    "assets/index-C8_rEuEX.js",
    "assets/index-CEY2kEU_.js",
    "assets/index-CGUCM1QM.js",
    "assets/index-CMPZyQzz.js",
    "assets/index-CUpKjL4X.js",
    "assets/index-CYCkW9G6.js",
    "assets/index-CfvA6KSm.js",
    "assets/index-Cpyw64JM.js",
    "assets/index-CudtjrhP.css",
    "assets/index-D5oEwQ4f.js",
    "assets/index-DE-XOn3o.js",
    "assets/index-Djccb6tL.js",
    "assets/index-DrB0kst2.js",
    "assets/index-Lst327qV.js",
    "assets/index-tjtu0Op8.js",
    "assets/index-ucsuj7-8.js",
    "assets/inline-Dp_KZq6K.js",
    "assets/ledger-BUlZVjqw.js",
    "assets/page-CYL4P20B.css",
    "assets/parse-DO1LcGq5.js",
    "assets/plan-CSkLnX4V.js",
    "assets/pool-JIPhsFkc.js",
    "assets/port-Di5Rqm5r.js",
    "assets/progress-DkLFfm6G.js",
    "assets/receipt-Bgdnloi4.js",
    "assets/receipt-aEVwEc_7.css",
    "assets/receipt-model-BYyPIJer.js",
    "assets/record-CW5Vrtfo.js",
    "assets/report-CJ-JEzi0.css",
    "assets/report-CVupQAwW.js",
    "assets/rng-ClP2v2oA.js",
    "assets/seed-BfShY4BO.js",
    "assets/stages-CHMYgy5U.css",
    "assets/stats-ClutXHRM.js",
    "assets/stats-DNFghOEN.js",
    "assets/status-1_ua-xCp.js",
    "assets/store-BLitiyJz.js",
    "assets/strip-B1An1dcC.js",
    "assets/time-DuUNeBoL.js",
    "assets/today-D45NTFPh.js",
    "assets/useErosions-BqwMZ5Yk.js",
    "assets/useReceipts-Dc8w0HhZ.js",
    "assets/weights-B6XESTJa.js",
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
