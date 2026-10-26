// Time as the event log needs it: exact comparison of RFC 3339 instants that carry their own offset,
// calendar-day arithmetic on the frozen local dates, and the formatting of a clock reading into an event's
// at, tz and day. Integer arithmetic only (Howard Hinnant's civil-day algorithms), with no Date object, so
// years 0000-0099 and every runtime agree.
//
// Pure: no DOM, storage or network, and no clock: callers pass the time in.

/** An instant reduced to UTC: whole seconds since 1970-01-01T00:00:00Z and the fraction's digits. */
export interface InstantKey {
  readonly s: number
  /** Fraction-of-second digits with trailing zeros removed ('' for a whole second). */
  readonly f: string
}

export const SECONDS_PER_DAY = 86_400

const INSTANT_RE =
  /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]+))?(?:Z|([+-])([0-9]{2}):([0-9]{2}))$/
const DATE_RE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/

/** Days since 1970-01-01 of a proleptic Gregorian date. A day past the month's end rolls over, as the schema's pattern allows it. */
export function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146_097 + doe - 719_468
}

/** The proleptic Gregorian date of a day number (days since 1970-01-01). */
export function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719_468
  const era = Math.floor(z / 146_097)
  const doe = z - era * 146_097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day }
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0')

/** The key of an instant; throws on a string that is not an instant. */
export function instantKey(at: string): InstantKey {
  const m = INSTANT_RE.exec(at)
  if (!m) throw new RangeError(`not an RFC 3339 instant: ${JSON.stringify(at)}`)
  const [, Y, M, D, h, mi, s, frac, sign, oh, om] = m
  const days = daysFromCivil(Number(Y), Number(M), Number(D))
  const offset = sign === undefined ? 0 : (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om))
  const seconds = days * SECONDS_PER_DAY + Number(h) * 3600 + Number(mi) * 60 + Number(s) - offset * 60
  return { s: seconds, f: (frac ?? '').replace(/0+$/, '') }
}

/** Compare two instant keys: negative, zero or positive. */
export function compareKeys(a: InstantKey, b: InstantKey): number {
  if (a.s !== b.s) return a.s < b.s ? -1 : 1
  const n = Math.max(a.f.length, b.f.length)
  const fa = a.f.padEnd(n, '0')
  const fb = b.f.padEnd(n, '0')
  return fa < fb ? -1 : fa > fb ? 1 : 0
}

/** Compare two instants exactly, whatever offsets they carry. */
export function compareInstants(a: string, b: string): number {
  return compareKeys(instantKey(a), instantKey(b))
}

/** An instant key moved by a whole number of seconds. */
export function shiftKey(key: InstantKey, seconds: number): InstantKey {
  return { s: key.s + seconds, f: key.f }
}

/** Milliseconds since the epoch, truncated: for display and medians, never for ordering. */
export function instantMs(at: string): number {
  const k = instantKey(at)
  return k.s * 1000 + Number(k.f.slice(0, 3).padEnd(3, '0'))
}

/** The day number of a local date YYYY-MM-DD. */
export function dayNumber(day: string): number {
  const m = DATE_RE.exec(day)
  if (!m) throw new RangeError(`not a local date: ${JSON.stringify(day)}`)
  return daysFromCivil(Number(m[1]), Number(m[2]), Number(m[3]))
}

/** The local date YYYY-MM-DD of a day number. */
export function dayFromNumber(n: number): string {
  const { year, month, day } = civilFromDays(n)
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

/** A local date moved by n days. */
export function addDays(day: string, n: number): string {
  return dayFromNumber(dayNumber(day) + n)
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a)
}

/** The day of the week of a local date: 0 Sunday, 1 Monday, ... 6 Saturday. */
export function weekday(day: string): number {
  return (((dayNumber(day) + 4) % 7) + 7) % 7
}

/** The local date in the offset an instant carries: its own date part. */
export function localDayOf(at: string): string {
  if (!INSTANT_RE.test(at)) throw new RangeError(`not an RFC 3339 instant: ${JSON.stringify(at)}`)
  return at.slice(0, 10)
}

/** The local time hh:mm:ss in the offset an instant carries: its own time part, without the fraction. */
export function localTimeOf(at: string): string {
  if (!INSTANT_RE.test(at)) throw new RangeError(`not an RFC 3339 instant: ${JSON.stringify(at)}`)
  return at.slice(11, 19)
}

/** The schema's bounds on tz, minutes east of UTC. */
export const TZ_MIN = -720
export const TZ_MAX = 840

/**
 * A clock reading as an event stamps it: at in local time with its offset, millisecond precision; tz in
 * minutes east of UTC; and day, the local date, frozen now so travel never rewrites history.
 */
export function stampTime(epochMs: number, tzMinutesEast: number): { at: string; tz: number; day: string } {
  if (!Number.isFinite(epochMs)) throw new RangeError(`not a time: ${epochMs}`)
  if (!Number.isFinite(tzMinutesEast)) throw new RangeError(`not a UTC offset: ${tzMinutesEast}`)
  const tz = Math.round(tzMinutesEast) + 0 // + 0 turns -0 into 0
  if (tz < TZ_MIN || tz > TZ_MAX) throw new RangeError(`a UTC offset of ${tzMinutesEast} minutes is outside ${TZ_MIN}..${TZ_MAX}`)
  const year = civilFromDays(Math.floor((Math.floor(epochMs) + tz * 60_000) / 86_400_000)).year
  if (year < 0 || year > 9999) throw new RangeError(`year ${year} has no four-digit form`)
  const local = Math.floor(epochMs) + tz * 60_000
  const days = Math.floor(local / 86_400_000)
  let rest = local - days * 86_400_000
  const hours = Math.floor(rest / 3_600_000)
  rest -= hours * 3_600_000
  const minutes = Math.floor(rest / 60_000)
  rest -= minutes * 60_000
  const seconds = Math.floor(rest / 1000)
  const millis = rest - seconds * 1000
  const day = dayFromNumber(days)
  const sign = tz < 0 ? '-' : '+'
  const abs = Math.abs(tz)
  const offset = `${sign}${pad(Math.floor(abs / 60), 2)}:${pad(abs % 60, 2)}`
  return { at: `${day}T${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}${offset}`, tz, day }
}
