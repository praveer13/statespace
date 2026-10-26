/// <reference types="vite/client" />

/** The instruments build id the main origin must name in its handshake (ARCHITECTURE.md section 5.2). */
declare const __INSTRUMENTS_BUILD__: string
/** The exact parent origins this build talks to (section 5.5); a production build holds only the main origin. */
declare const __ALLOWED_PARENTS__: readonly string[]
