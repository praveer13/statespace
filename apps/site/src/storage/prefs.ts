// Appearance preferences of SCR-settings: theme and motion. They are per-viewer conveniences, so they live in this
// browser's localStorage and are applied to the root element before the first paint (tokens.css reads data-theme and
// data-motion). Every read and write tolerates a storage that refuses: the page then follows the system settings.
// The settings screen also copies them into working state, so an export carries them.

export type Theme = 'system' | 'light' | 'night'
export type Motion = 'system' | 'reduce' | 'full'

export interface Prefs {
  readonly theme: Theme
  readonly motion: Motion
}

const KEY = 'statespace.prefs'
export const PREFS_WORKING_KEY = 'settings.appearance'
const DEFAULTS: Prefs = { theme: 'system', motion: 'system' }
const THEMES: readonly Theme[] = ['system', 'light', 'night']
const MOTIONS: readonly Motion[] = ['system', 'reduce', 'full']

export function normalizePrefs(value: unknown): Prefs {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof Prefs, unknown>>
  return {
    theme: THEMES.includes(v.theme as Theme) ? (v.theme as Theme) : DEFAULTS.theme,
    motion: MOTIONS.includes(v.motion as Motion) ? (v.motion as Motion) : DEFAULTS.motion,
  }
}

export function readPrefs(): Prefs {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    return raw ? normalizePrefs(JSON.parse(raw)) : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

/** Sets data-theme and data-motion on the root element; "system" removes the attribute so the media queries decide. */
export function applyPrefs(prefs: Prefs, root: HTMLElement | undefined = globalThis.document?.documentElement): void {
  if (root === undefined) return
  if (prefs.theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', prefs.theme)
  if (prefs.motion === 'system') root.removeAttribute('data-motion')
  else root.setAttribute('data-motion', prefs.motion)
}

const listeners = new Set<(p: Prefs) => void>()

export function writePrefs(prefs: Prefs): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // a refusing storage: the choice holds for this page only
  }
  applyPrefs(prefs)
  for (const l of listeners) l(prefs)
}

export function onPrefs(listener: (p: Prefs) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True when motion should be skipped: the setting, or the system setting when the setting is "system". */
export function reducedMotion(prefs: Prefs = readPrefs()): boolean {
  if (prefs.motion !== 'system') return prefs.motion === 'reduce'
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/** Apply the stored preferences now, and follow a change made in another tab. */
export function installPrefs(): void {
  applyPrefs(readPrefs())
  try {
    globalThis.addEventListener?.('storage', (e: StorageEvent) => {
      if (e.key === KEY) applyPrefs(readPrefs())
    })
  } catch {
    // no window: nothing to follow
  }
}
