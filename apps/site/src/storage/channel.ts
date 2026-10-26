// Cross-tab sync (ARCHITECTURE.md section 7.5, item 1): after a commit, a BroadcastChannel message tells the
// other tabs of this origin to re-derive. The message carries no events, only that the log changed; each
// tab reads the log again from IndexedDB, so a missed message costs only a stale view until the next read,
// which compares the change counter anyway.

export const CHANNEL_NAME = 'statespace-ledger'

export type ChangeReason = 'append' | 'merge' | 'replace' | 'undo' | 'reset' | 'exp-seed' | 'working' | 'mirror'

/** A message as a tab sends it; the channel adds the sender's tab id. */
export type OutgoingMessage = { readonly t: 'changed'; readonly reason: ChangeReason } | { readonly t: 'reload' }

/** A message as a tab receives it. */
export type LedgerMessage = OutgoingMessage & { readonly from: string }

/** The part of BroadcastChannel this adapter uses, so tests and other runtimes can supply one. */
export interface ChannelLike {
  postMessage(message: unknown): void
  onmessage: ((event: MessageEvent) => void) | null
  close(): void
}

export type ChannelFactory = (name: string) => ChannelLike

const isMessage = (v: unknown): v is LedgerMessage => {
  if (typeof v !== 'object' || v === null) return false
  const m = v as { t?: unknown; from?: unknown; reason?: unknown }
  return typeof m.from === 'string' && (m.t === 'reload' || (m.t === 'changed' && typeof m.reason === 'string'))
}

export class Channel {
  private readonly port: ChannelLike | null
  private readonly tabId: string

  constructor(factory: ChannelFactory | null, tabId: string, onMessage: (m: LedgerMessage) => void) {
    this.tabId = tabId
    let port: ChannelLike | null = null
    try {
      port = factory === null ? null : factory(CHANNEL_NAME)
    } catch {
      port = null
    }
    this.port = port
    if (port !== null) {
      port.onmessage = (ev) => {
        if (isMessage(ev.data) && ev.data.from !== this.tabId) onMessage(ev.data)
      }
    }
  }

  /** True when other tabs can hear this one. */
  get connected(): boolean {
    return this.port !== null
  }

  post(message: OutgoingMessage): void {
    try {
      this.port?.postMessage({ ...message, from: this.tabId })
    } catch {
      // a closed channel: the other tabs re-read on their next access
    }
  }

  close(): void {
    try {
      this.port?.close()
    } catch {
      // already closed
    }
  }
}
