// The learner-state fixture against the site's real storage adapter, in three engines (seed-adapter-check.mjs). It needs a browser,
// so it runs where one is: a local Playwright, else the pinned image. It waits for the adapter, which W1-T03 builds.
//   node --test scripts/spikes/W1-T41/seed-adapter.test.mjs
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { chooseRunner, runInDocker } from './lib/browser.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '../../..')
const adapter = existsSync(join(REPO, 'apps/site/src/storage/index.ts'))

test('the fixture arrives whole in the site\'s IndexedDB adapter, in Chromium, Firefox and WebKit', { skip: !adapter && 'apps/site/src/storage does not exist yet (W1-T03)' }, async (t) => {
  const runner = await chooseRunner('auto', ['chromium', 'firefox', 'webkit'])
  if (runner.kind === 'none') return t.skip(runner.why)
  const args = ['scripts/spikes/W1-T41/seed-adapter-check.mjs', '--engines', 'chromium,firefox,webkit']
  const status = runner.kind === 'docker' ? await runInDocker({ repoRoot: REPO, nodeArgs: args }) : spawnSync(process.execPath, args, { cwd: REPO, stdio: 'inherit' }).status
  assert.equal(status, 0)
})
