import { defineConfig } from '@playwright/test'

// `npm run build` first: this serves dist/ with `vite preview` and drives it in the three engines.
// Browsers do not run natively on every host; the course's CI and the Bench use the Playwright container
// (mcr.microsoft.com/playwright, the same version as @playwright/test). PW_PORT picks another port,
// PW_JSON writes the JSON report to that path, and PW_OUTDIR serves another build directory than dist/
// (scripts/site/smoke.sh serves a build with test content that way).
const PORT = Number(process.env.PW_PORT) || 4173
const OUTDIR = process.env.PW_OUTDIR ? ` --outDir ${JSON.stringify(process.env.PW_OUTDIR)}` : ''

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../../node_modules/.cache/playwright/site',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.PW_JSON ? [['list'], ['json', { outputFile: process.env.PW_JSON }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 360, height: 800 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort${OUTDIR}`,
    cwd: '..',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
