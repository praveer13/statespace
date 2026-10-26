// Where the instrument origin is (ARCHITECTURE.md sections 5.2 and 5.5). Build-time constants:
//   VITE_INSTRUMENTS_ORIGIN  exact scheme and host (and port), no path, no wildcard;
//                            e.g. https://statespace-instruments.play.naigap.com. The dev server defaults to
//                            http://localhost:5182, where `npm run dev -w @statespace/instruments` listens.
//   VITE_INSTRUMENTS_BUILD   the instruments build id this site was built and tested against (default 'dev').
//   VITE_INSTRUMENTS_HOST    the host page's path on that origin (default /host.html; later b/<buildId>/host.html).
// A production build with no origin set embeds no frame, and every cell shows its recorded run.

const DEV_ORIGIN = 'http://localhost:5182'

function exactOrigin(s: string | undefined): string | null {
  if (s === undefined || s === '') return null
  try {
    const u = new URL(s)
    return u.origin === s ? s : null
  } catch {
    return null
  }
}

const env = import.meta.env as Record<string, string | undefined>

export const INSTRUMENT_ORIGIN: string | null = exactOrigin(env.VITE_INSTRUMENTS_ORIGIN ?? (import.meta.env.DEV ? DEV_ORIGIN : undefined))
export const INSTRUMENT_BUILD: string = env.VITE_INSTRUMENTS_BUILD ?? 'dev'
const HOST_PATH = env.VITE_INSTRUMENTS_HOST ?? '/host.html'
export const HOST_URL: string | null = INSTRUMENT_ORIGIN === null ? null : new URL(HOST_PATH, INSTRUMENT_ORIGIN).href
