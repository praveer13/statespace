import { defineConfig } from '@playwright/test'

// GATE-bundle's browser checks (spine section 11.2; ARCHITECTURE.md section 13.2). Run them through
// `node scripts/verify-bundle.mjs`, which decides what is under test (the build, the budget, which features their owners have
// delivered), runs this configuration where a browser is available (a local one, else the pinned Playwright image) and
// folds the result into one report. The checks read their inputs from SS_GATE_ENV, so they do not run on their own.
//
//   SS_ENGINES   chromium (the default), firefox, webkit, a comma-separated list, or all
//   SS_PW_JSON   where the JSON report goes (the gate reads it)
//   SS_PW_OUT    Playwright's own output directory
//   PW_CHROMIUM_EXECUTABLE   another Chromium binary, for hosts where the downloaded one cannot start (as kernelspace's harness reads it)
//
// The checks are scripts/spikes/W1-T41/e2e/*.spec.ts. A task adds its own GATE-bundle test as apps/<app>/e2e/<name>.gate.ts,
// importing `test` and `expect` from scripts/spikes/W1-T41/e2e/fixtures.ts; the scaffold's smoke tests (apps/*/e2e/*.spec.ts
// under each app's own configuration) are separate and stay so. One worker: the timing checks measure the machine, and a
// second test running beside them would be measured too.
const out = process.env['SS_PW_OUT'] ?? 'node_modules/.cache/playwright/bundle'
const engines = (process.env['SS_ENGINES'] ?? 'chromium').split(',').map((e) => e.trim()).filter(Boolean)

export default defineConfig({
  testDir: '.',
  testMatch: ['scripts/spikes/W1-T41/e2e/*.spec.ts', 'apps/*/e2e/**/*.gate.ts'],
  testIgnore: ['**/node_modules/**', '**/dist/**'],
  outputDir: `${out}/results`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env['CI'],
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: process.env['SS_PW_JSON'] ?? `${out}/report.json` }]],
  use: {
    viewport: { width: 360, height: 800 },
    serviceWorkers: 'allow',
    actionTimeout: 15_000,
  },
  projects: engines.map((name) => ({
    name,
    use: {
      browserName: name as 'chromium' | 'firefox' | 'webkit',
      ...(name === 'chromium' && process.env['PW_CHROMIUM_EXECUTABLE'] ? { launchOptions: { executablePath: process.env['PW_CHROMIUM_EXECUTABLE'] } } : {}),
    },
  })),
})
