import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import type { ExpSeedDraw, Log, MergePreview } from '@statespace/ledger'
import { useEvents, useStore } from '../../app/ledger.ts'
import { useTitle } from '../../app/title.ts'
import type { LedgerStore } from '../../storage/index.ts'
import { backupState, bundleFileName, exportBundle, importableWorking, LAST_EXPORT_KEY, readBundle, type ReadBundle } from '../../storage/bundle.ts'
import { PREFS_WORKING_KEY, readPrefs, writePrefs, type Motion, type Prefs, type Theme } from '../../storage/prefs.ts'
import { offlineState, registerServiceWorker, retireServiceWorker, type OfflineState } from '../../sw/register.ts'
import './settings.css'

// SCR-settings (DESIGN.md section 8, SCR-settings): appearance, the practice record (export, merge-import with undo,
// the backup card), the offline copy and its kill switch, and the honesty statement (OD-8). Desktop shows a section list
// on the left. Nothing here locks anything, counts anything against the learner, or frames a loss: the backup card says
// what an export keeps (ARCHITECTURE.md section 7.8).

const SECTIONS = [
  { id: 'appearance', title: 'Appearance' },
  { id: 'data', title: 'Your practice record' },
  { id: 'offline', title: 'Offline copy' },
  { id: 'honesty', title: 'Honesty and privacy' },
] as const

const day = (iso: string): string => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const bytes = (n: number): string => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

function Choice<T extends string>({ legend, name, value, options, onChange, note }: { legend: string; name: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void; note?: ReactNode }) {
  return (
    <fieldset className="set-choice">
      <legend className="set-key">{legend}</legend>
      <div className="set-seg">
        {options.map((o) => (
          <label key={o.value} className="set-seg-item">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="set-seg-face">{o.label}</span>
          </label>
        ))}
      </div>
      {note !== undefined ? <p className="set-note">{note}</p> : null}
    </fieldset>
  )
}

function Appearance({ store }: { store: LedgerStore | null | undefined }) {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)
  const set = (next: Prefs) => {
    setPrefs(next)
    writePrefs(next)
    if (store) void store.setWorking(PREFS_WORKING_KEY, next).catch(() => undefined)
  }
  return (
    <div className="set-body">
      <Choice<Theme>
        legend="Theme"
        name="theme"
        value={prefs.theme}
        onChange={(theme) => set({ ...prefs, theme })}
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'night', label: 'Night' },
        ]}
        note="System follows this device, and reads as light when the device states no preference."
      />
      <Choice<Motion>
        legend="Motion"
        name="motion"
        value={prefs.motion}
        onChange={(motion) => set({ ...prefs, motion })}
        options={[
          { value: 'system', label: 'System' },
          { value: 'reduce', label: 'Reduce' },
          { value: 'full', label: 'Full' },
        ]}
        note="Reduce stops every transition, in the page’s styles and in its scripts. Nothing on this site autoplays either way."
      />
    </div>
  )
}

type ImportState =
  | { readonly step: 'idle' }
  | { readonly step: 'error'; readonly message: string }
  | { readonly step: 'preview'; readonly name: string; readonly read: ReadBundle; readonly preview: MergePreview }
  | { readonly step: 'merged'; readonly name: string; readonly added: number; readonly kept: number }
  | { readonly step: 'undone' }

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function askPersist(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    // the browser decides; the screen reports what it decided
  }
}

function useAsync<T>(load: () => Promise<T>, keys: readonly unknown[]): [T | undefined, () => void] {
  const [value, setValue] = useState<T>()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    void load()
      .then((v) => {
        if (live) setValue(v)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...keys, tick])
  return [value, useCallback(() => setTick((t) => t + 1), [])]
}

function Data({ store }: { store: LedgerStore | null | undefined }) {
  const events = useEvents(store)
  const [lastExport, reloadLast] = useAsync(async () => (store ? ((await store.getWorking(LAST_EXPORT_KEY)) as string | undefined) ?? null : null), [store])
  const [draws, reloadDraws] = useAsync(async (): Promise<readonly ExpSeedDraw[]> => (store ? (await store.snapshot()).expSeeds : []), [store, events])
  const [storage, reloadStorage] = useAsync(async () => {
    const est = await navigator.storage?.estimate?.()
    const persisted = await navigator.storage?.persisted?.()
    return { usage: est?.usage ?? null, persisted: persisted ?? null }
  }, [events])
  const [imp, setImp] = useState<ImportState>({ step: 'idle' })
  const [exported, setExported] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (store === undefined || events.status === 'loading') return <p className="set-status">Opening this browser’s practice record.</p>
  if (store === null || events.status === 'unavailable')
    return <p className="set-status">This browser keeps no practice record (IndexedDB is unavailable, as in some private windows), so there is nothing to export or import here.</p>

  const readOnly = store.status().mode === 'read-only'
  const list = events.events
  const backup = backupState(list, lastExport ?? null)

  const onExport = async () => {
    setBusy(true)
    try {
      const now = new Date()
      const bundle = await exportBundle(store, now)
      download(bundleFileName(now), JSON.stringify(bundle, null, 1))
      if (!readOnly) await store.setWorking(LAST_EXPORT_KEY, now.toISOString())
      await askPersist()
      setExported(bundleFileName(now))
      reloadLast()
      reloadStorage()
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file === undefined) return
    try {
      const read = readBundle(await file.text())
      const preview = await store.previewMerge(read.log)
      setImp({ step: 'preview', name: file.name, read, preview })
    } catch (err) {
      setImp({ step: 'error', message: `${file.name} was not imported: ${(err as Error).message}.` })
    }
  }

  const onMerge = async (read: ReadBundle, name: string) => {
    setBusy(true)
    try {
      const result = await store.merge(read.log as Log)
      await store.importWorking(importableWorking(read.working))
      await askPersist()
      setImp({ step: 'merged', name, added: result.added.length, kept: result.duplicates.length })
      reloadDraws()
      reloadStorage()
    } catch (err) {
      setImp({ step: 'error', message: `The merge did not run: ${(err as Error).message}. This browser’s record is as it was.` })
    } finally {
      setBusy(false)
    }
  }

  const onUndo = async () => {
    setBusy(true)
    try {
      await store.undo()
      setImp({ step: 'undone' })
      reloadDraws()
    } finally {
      setBusy(false)
    }
  }

  const onDraw = async () => {
    setBusy(true)
    try {
      await store.drawExpSeed()
      reloadDraws()
    } catch {
      reloadDraws()
    } finally {
      setBusy(false)
    }
  }

  const draw = draws?.[0]

  return (
    <div className="set-body">
      {backup.due ? (
        <aside className="set-card" aria-labelledby="backup-h">
          <h3 id="backup-h">Keep a copy of your practice</h3>
          <p>
            An export keeps every call, answer and session from this browser in one file, ready to merge into any other. Your lab repository already keeps your claims, specimens and receipts.
            {backup.lastExport !== null ? ` Your last export was on ${day(backup.lastExport)}.` : ''}
          </p>
          <p className="set-note">Browsers such as Safari may clear a site’s storage after seven days without a visit [webkit7d]; a file you keep is not affected.</p>
        </aside>
      ) : null}

      <dl className="set-colophon">
        <div>
          <dt className="set-key">Events</dt>
          <dd>{list.length === 0 ? 'None yet. Practice you do on this site is recorded here, in this browser only.' : `${plural(list.length, 'practice event')} in this browser`}</dd>
        </div>
        <div>
          <dt className="set-key">Last export</dt>
          <dd>{lastExport ? day(lastExport) : 'Not exported from this browser yet'}</dd>
        </div>
        <div>
          <dt className="set-key">Storage</dt>
          <dd>
            {storage?.usage != null ? `${bytes(storage.usage)} used by this site` : 'This browser does not report its use'}
            {storage?.persisted === true ? '; kept until you clear it' : storage?.persisted === false ? '; the browser may clear it when space runs short' : ''}
          </dd>
        </div>
        {readOnly ? (
          <div>
            <dt className="set-key">Mode</dt>
            <dd>Read-only: a newer version of the course is open in another tab. Reload to update, then import.</dd>
          </div>
        ) : null}
      </dl>

      <div className="set-block">
        <h3>Export</h3>
        <p className="set-note">One file (bundle@1) with your events, the comparison seed and your settings. It never leaves this device unless you move it.</p>
        <div className="set-actions">
          <button type="button" className="button button-primary" onClick={() => void onExport()} disabled={busy}>
            Export practice record
          </button>
        </div>
        <p className="set-live" role="status" aria-live="polite">
          {exported !== null ? `Saved ${exported} to your downloads.` : ''}
        </p>
      </div>

      <div className="set-block">
        <h3>Merge an export into this browser</h3>
        <p className="set-note">A merge adds what this browser lacks and keeps what it has; records that share an ID are settled by one fixed rule, so importing the same file twice changes nothing. You can undo it.</p>
        <div className="set-actions">
          <label className="button button-secondary set-file">
            Choose an export file
            <input type="file" accept=".json,application/json" onChange={(e) => void onFile(e)} disabled={busy || readOnly} />
          </label>
        </div>
        <div className="set-live" role="status" aria-live="polite">
          {imp.step === 'error' ? <p className="set-problem">{imp.message}</p> : null}
          {imp.step === 'preview' ? (
            <div className="set-preview">
              <p>
                <strong>{imp.name}</strong>
                {imp.read.exportedAt !== null ? `, exported ${day(imp.read.exportedAt)}` : ''}.
              </p>
              <ul className="set-preview-list">
                <li>{plural(imp.preview.added.length, 'event')} new to this browser</li>
                <li>{plural(imp.preview.duplicates.length, 'event')} already here</li>
                {imp.preview.conflicts.length > 0 ? <li>{plural(imp.preview.conflicts.length, 'event')} here in a different form; the fixed rule keeps one of each</li> : null}
                {imp.preview.addedDraws.length > 0 ? <li>a comparison seed{imp.preview.governingChanges ? ', drawn earlier than this browser’s, which then governs' : ''}</li> : null}
                {imp.read.working.length > 0 ? <li>{plural(imp.read.working.length, 'setting')}, the later of each kept</li> : null}
                {imp.read.problems.length > 0 ? <li>{plural(imp.read.problems.length, 'record')} that do not read as course records and are left out</li> : null}
              </ul>
              <div className="set-actions">
                <button type="button" className="button button-primary" onClick={() => void onMerge(imp.read, imp.name)} disabled={busy}>
                  Merge into this browser
                </button>
                <button type="button" className="button button-secondary" onClick={() => setImp({ step: 'idle' })} disabled={busy}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
          {imp.step === 'merged' ? (
            <div className="set-preview">
              <p>
                Merged {imp.name}: {plural(imp.added, 'event')} added, {imp.kept} already here.
              </p>
              <div className="set-actions">
                <button type="button" className="button button-secondary" onClick={() => void onUndo()} disabled={busy}>
                  Undo the merge
                </button>
              </div>
            </div>
          ) : null}
          {imp.step === 'undone' ? <p>Undone. The record is as it was before the merge, with anything recorded since kept.</p> : null}
        </div>
      </div>

      <div className="set-block">
        <h3>Comparisons</h3>
        <p className="set-note">
          The course compares a few of its own mechanics on its first learner and reports what it reads on the assurance page. A comparison needs one random seed, drawn before the first practice event, and that seed travels with your
          export. It changes no status and locks nothing.
        </p>
        <p className="set-value">
          {draw !== undefined
            ? `On: seed drawn ${day(draw.drawnAt)}.`
            : list.length > 0
              ? 'Off. Practice is already recorded in this browser, and a seed can only come first.'
              : 'Off.'}
        </p>
        {draw === undefined && list.length === 0 && !readOnly ? (
          <div className="set-actions">
            <button type="button" className="button button-secondary" onClick={() => void onDraw()} disabled={busy}>
              Turn comparisons on
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Offline() {
  const [state, setState] = useState<OfflineState>()
  const [note, setNote] = useState('')
  const refresh = useCallback(() => void offlineState().then(setState), [])
  useEffect(refresh, [refresh])
  const off = async () => {
    await retireServiceWorker()
    setNote('The offline copy is off and its saved files are deleted. Pages now load from the network only.')
    refresh()
  }
  const on = async () => {
    await registerServiceWorker()
    setNote('The offline copy is being saved. It is ready after the next page load.')
    setTimeout(refresh, 1500)
  }
  return (
    <div className="set-body">
      <p className="set-note">
        After one visit, this site keeps a copy of its shell, Today and Boot, and of each stage’s lessons once you open one, so they read without a connection. Your practice record is never part of that copy.
      </p>
      <dl className="set-colophon">
        <div>
          <dt className="set-key">State</dt>
          <dd>
            {state === undefined
              ? 'Reading.'
              : state.kind === 'unsupported'
                ? 'This browser has no service workers, so the site always loads from the network.'
                : state.kind === 'dev'
                  ? 'The development server never installs an offline copy.'
                  : state.kind === 'off'
                    ? 'Off.'
                    : state.kind === 'installing'
                      ? 'Saving.'
                      : `On: ${plural(state.files, 'file')} saved.`}
          </dd>
        </div>
      </dl>
      <div className="set-actions">
        {state?.kind === 'on' || state?.kind === 'installing' ? (
          <button type="button" className="button button-secondary" onClick={() => void off()}>
            Turn off the offline copy
          </button>
        ) : state?.kind === 'off' ? (
          <button type="button" className="button button-secondary" onClick={() => void on()}>
            Turn the offline copy on
          </button>
        ) : null}
      </div>
      <p className="set-live" role="status" aria-live="polite">
        {note}
      </p>
      <p className="set-note">
        If a page ever looks stuck on an old version, open it with <code>?nosw=1</code> at the end of its address: that removes the offline copy and loads from the network.
      </p>
    </div>
  )
}

function Honesty() {
  return (
    <div className="set-body set-prose">
      <p>
        Provenance is self-declared. Nothing on this device can tell assisted work from unassisted work; your declarations schedule and calibrate your practice, and police nothing.
      </p>
      <p>No accounts, no telemetry: data stays in this browser and in your lab repo. No page sends your practice anywhere, and an export goes only where you put it.</p>
    </div>
  )
}

export function SettingsScreen() {
  useTitle('Settings')
  const store = useStore()
  return (
    <article className="screen settings">
      <header className="settings-head">
        <h1>Settings</h1>
        <p className="settings-lede">How the pages look, what this browser keeps of your practice, and how to carry it to another.</p>
      </header>
      <div className="settings-layout">
        <nav className="settings-toc" aria-label="Settings sections">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="settings-sections">
          <section id="appearance" className="set-section" aria-labelledby="appearance-h">
            <h2 id="appearance-h">Appearance</h2>
            <Appearance store={store} />
          </section>
          <section id="data" className="set-section" aria-labelledby="data-h">
            <h2 id="data-h">Your practice record</h2>
            <Data store={store} />
          </section>
          <section id="offline" className="set-section" aria-labelledby="offline-h">
            <h2 id="offline-h">Offline copy</h2>
            <Offline />
          </section>
          <section id="honesty" className="set-section" aria-labelledby="honesty-h">
            <h2 id="honesty-h">Honesty and privacy</h2>
            <Honesty />
          </section>
        </div>
      </div>
    </article>
  )
}
