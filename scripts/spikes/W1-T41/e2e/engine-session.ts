// One learner session on /boot that taps "Run it live in this tab" and watches the page while the engine downloads, shared
// by the loader checks and the Boot gate. What it relies on is what the documents say a learner sees:
//   * DESIGN.md SCR-boot: the Z3 cell opens on the recorded result, "labeled recorded result", with "Run it live in this tab"
//     beside it; the tap downloads Z3 without asking while the loader shows its size
//   * DESIGN.md section 6.2, state Loading: "no prompt and no warning first (OD-6, M-consent); a determinate progress bar by
//     bytes, with text ("Downloading <engine> · <received> of <size>", the size from the build manifest), while the recorded
//     run stays in view"
//   * DESIGN.md section 6.2, result panel: a live verdict carries the lane badge "re-checked here"
// A page that departs from them makes a check fail with the sentence it expected, not pass.

import type { Browser, Page } from '@playwright/test'
import { loaderSources, promptReason, type LoaderFrame, type ProgressState } from '../lib/loader.ts'
import { loaderTotal, type ParsedSize } from '../lib/units.ts'
import type { World } from '../lib/world.ts'
import { newPage } from './fixtures.ts'

export const RUN_LIVE = /run it live in this tab/i
export const RECORDED = /recorded (result|run)/i
export const RECHECKED = /re-checked here/i

export { PROMPT_COPY, promptReason, loaderSources, type LoaderFrame, type ProgressState } from '../lib/loader.ts'

export interface Snapshot {
  t: number
  dialogs: number
  /** The text of the whole page (document.body): a warning in a toast, a banner or an aside counts as one in <main>. */
  text: string
  progress: ProgressState | null
}

export interface LoaderObservation {
  error?: string
  /** alert, confirm, prompt or beforeunload dialogs the page opened. */
  dialogs: string[]
  recordedBeforeTap: boolean
  /** The snapshots from the tap until the loader's first byte (or all of them, when no byte showed). */
  beforeFirstByte: Snapshot[]
  /** True when the loader showed a byte of the engine received after the one tap (12 s at most). */
  firstByte: boolean
  /**
   * Lines that read like a prompt or a warning, on /boot before the tap or from the tap to the first byte: consent or warning
   * wording, or a size stated anywhere but the loader's box. Each names when it showed and why it counts.
   */
  promptCopy: string[]
  /** The most dialog elements (an open dialog, role dialog or alertdialog) rendered at once, before the tap or until the first byte. */
  dialogElements: number
  /** The loader's first frame: its total (the first source that states one) and the bar's maximum when it counts bytes. */
  loader: { snapshot: Snapshot; total: ParsedSize | null; where: string; max: number | null } | null
  /** Every distinct state of the loader, from its first frame until the live verdict (or 20 s after the first byte). */
  loaderFrames: LoaderFrame[]
  tapToLoaderMs: number | null
  frame: { sandbox: string | null; referrerPolicy: string | null; src: string | null; hidden: boolean } | null
  /** Bytes the instrument host sent for the engine's files (informational: the manifest's figure is the contract). */
  engineBytesSent: number
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The paths of the engine's files, as the instrument host serves them. */
export function enginePathPattern(world: World, engine = 'z3'): RegExp {
  const assets = world.manifest?.engines.get(engine)?.assets ?? []
  if (assets.length === 0) return /\/engines\//
  return new RegExp(`^(?:${assets.map((a) => escape(`/${a.path.replace(/^\/+/, '')}`)).join('|')})$`)
}

const OBSERVER = `
(() => {
  const snap = () => {
    const el = document.querySelector('progress, [role="progressbar"]');
    let progress = null;
    if (el) {
      const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
      const isNative = el.tagName === 'PROGRESS';
      let box = el.parentElement;
      for (let up = el, i = 0; up && i < 6; i += 1, up = up.parentElement) {
        if (/download/i.test(up.innerText || '')) { box = up; break; }
      }
      progress = {
        tag: el.tagName,
        max: isNative ? el.max : num(el.getAttribute('aria-valuemax')),
        now: isNative ? el.value : num(el.getAttribute('aria-valuenow')),
        valueText: el.getAttribute('aria-valuetext'),
        label: el.getAttribute('aria-label'),
        container: box ? box.innerText : '',
      };
    }
    return {
      t: performance.now(),
      // rendered ones only: a closed sheet kept in the page with display: none asks nothing
      dialogs: [...document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')].filter((d) => d.getClientRects().length > 0).length,
      // the whole page: a toast, a status region, a banner in the header or an aside outside <main> is read like the rest
      text: document.body ? document.body.innerText : '',
      progress,
    };
  };
  // arm() starts the snapshots at the tap itself (a capturing click listener runs before the page's own handler), so every
  // snapshot is of the page after the tap, and the page before it is only ever the snapshot taken before arm(). Every 25 ms the
  // page is read, and a snapshot is kept whenever it differs from the last one kept, until stop()
  window.__ssObs = {
    snaps: [], timer: null, tapAt: null, last: '', snap,
    arm() {
      this.snaps = [];
      document.addEventListener('click', () => {
        if (this.timer !== null) return;
        this.tapAt = performance.now();
        this.timer = setInterval(() => {
          const s = snap();
          const key = JSON.stringify([s.dialogs, s.text, s.progress]);
          if (key !== this.last) { this.last = key; this.snaps.push(s); }
        }, 25);
      }, { capture: true, once: true });
    },
    stop() { clearInterval(this.timer); return { snaps: this.snaps, tapAt: this.tapAt }; },
  };
})();
`

const started = (s: Snapshot): boolean => {
  const p = s.progress
  if (!p) return false
  if (p.now !== null && p.now > 0) return true
  return /download[^\n]*?[1-9][\d.,]*\s*(?:B|KB|MB|KiB|MiB)\b/i.test(p.container) && !/\b0\s*B\b[^\n]*of/i.test(p.container)
}

export async function observeLoader(browser: Browser, world: World): Promise<LoaderObservation> {
  const obs: LoaderObservation = {
    dialogs: [],
    recordedBeforeTap: false,
    beforeFirstByte: [],
    firstByte: false,
    promptCopy: [],
    dialogElements: 0,
    loader: null,
    loaderFrames: [],
    tapToLoaderMs: null,
    frame: null,
    engineBytesSent: 0,
  }
  const { context, page } = await newPage(browser)
  const mark = world.requests.length
  world.instruments.setShape({ mbps: 40, rttMs: 30, match: enginePathPattern(world) })
  try {
    page.on('dialog', (d) => {
      obs.dialogs.push(`${d.type()}: ${d.message()}`)
      void d.dismiss()
    })
    await page.addInitScript(OBSERVER)
    await page.goto(`${world.siteOrigin}/boot`, { waitUntil: 'load' })
    const button = page.getByRole('button', { name: RUN_LIVE }).first()
    if ((await button.count()) === 0) {
      obs.error = 'no button named "Run it live in this tab" on /boot (DESIGN.md SCR-boot)'
      return obs
    }
    obs.recordedBeforeTap = (await page.getByText(RECORDED).count()) > 0
    const before = await page.evaluate(() => (window as unknown as { __ssObs: { snap(): Snapshot } }).__ssObs.snap())
    await page.evaluate(() => (window as unknown as { __ssObs: { arm(): void } }).__ssObs.arm())
    await button.click()

    // watch the page for up to 12 s for the loader's first byte (or the engine's answer); the snapshots go on being taken
    const deadline = Date.now() + 12_000
    const peek = (): Promise<Snapshot[]> => page.evaluate(() => (window as unknown as { __ssObs: { snaps: Snapshot[] } }).__ssObs.snaps)
    while (Date.now() < deadline) {
      await page.waitForTimeout(100)
      if ((await peek()).some(started) || (await page.getByText(RECHECKED).count()) > 0) break
    }
    const frame = page.locator('iframe').first()
    if ((await frame.count()) > 0) {
      obs.frame = await frame.evaluate((f: HTMLIFrameElement) => ({
        sandbox: f.getAttribute('sandbox'),
        referrerPolicy: f.getAttribute('referrerpolicy'),
        src: f.getAttribute('src'),
        hidden: f.hasAttribute('hidden'),
      }))
    }
    // let the download finish, when it will, still taking snapshots, so loader.size reads every frame of the loader and the host's
    // byte count is complete (none started: nothing to wait for)
    if ((await peek()).some(started)) await page.getByText(RECHECKED).first().waitFor({ timeout: 20_000 }).catch(() => undefined)
    const stopped = await page.evaluate(() => (window as unknown as { __ssObs: { stop(): { snaps: Snapshot[]; tapAt: number | null } } }).__ssObs.stop())
    const snaps = stopped.snaps
    const tapAt = stopped.tapAt ?? snaps[0]?.t ?? 0
    const firstByte = snaps.findIndex(started)
    obs.firstByte = firstByte >= 0
    obs.beforeFirstByte = firstByte >= 0 ? snaps.slice(0, firstByte + 1) : snaps
    // one rule for the page before the tap (no loader yet, so no size anywhere) and for every snapshot until the first byte; the
    // loader's own text is every line its box has shown so far
    const seenLines = new Set<string>()
    const loaderSoFar = new Set<string>()
    const lines = (text: string): string[] => text.split('\n').map((l) => l.trim()).filter(Boolean)
    for (const [when, s] of [['before the tap', before] as const, ...obs.beforeFirstByte.map((x) => ['after the tap', x] as const)]) {
      obs.dialogElements = Math.max(obs.dialogElements, s.dialogs)
      if (when === 'after the tap' && s.progress) for (const l of lines(s.progress.container)) loaderSoFar.add(l)
      const loaderLines = when === 'after the tap' && loaderSoFar.size > 0 ? loaderSoFar : null
      for (const line of lines(s.text)) {
        const why = promptReason(line, loaderLines)
        if (why === null || seenLines.has(line)) continue
        seenLines.add(line)
        obs.promptCopy.push(`${when}: "${line.slice(0, 160)}" (${why})`)
      }
    }
    // the loader, every frame of it
    for (const s of snaps) if (s.progress) obs.loaderFrames.push({ at: Math.round(s.t - tapAt), progress: s.progress })
    const shown = snaps.find((s) => s.progress)
    if (shown?.progress) {
      obs.tapToLoaderMs = Math.round(shown.t - tapAt)
      const p = shown.progress
      let total: ParsedSize | null = null
      let where = 'nothing near the bar states a size'
      for (const [name, text] of loaderSources(p)) {
        const t = text ? loaderTotal(text) : null
        if (t) {
          total = t
          where = name
          break
        }
      }
      obs.loader = { snapshot: shown, total, where, max: p.max !== null && p.max > 1 ? p.max : null }
    }
  } finally {
    obs.engineBytesSent = world.requests
      .slice(mark)
      .filter((r) => r.label === 'instruments' && r.status === 200 && enginePathPattern(world).test(r.path.split('?')[0] ?? ''))
      .reduce((n, r) => n + r.bytes, 0)
    world.instruments.setShape(null)
    await context.close()
  }
  return obs
}

let shared: Promise<LoaderObservation> | null = null

/** The observation is made once per run: three checks read it. */
export function sharedObservation(browser: Browser, world: World): Promise<LoaderObservation> {
  shared ??= observeLoader(browser, world)
  return shared
}

export async function liveVerdict(page: Page, ms: number): Promise<boolean> {
  return page
    .getByText(RECHECKED)
    .first()
    .waitFor({ timeout: ms })
    .then(
      () => true,
      () => false,
    )
}
