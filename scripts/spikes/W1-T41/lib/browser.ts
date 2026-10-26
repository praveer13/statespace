// Where the gate's browsers come from. Browsers do not run on every host (a developer's machine may lack the system
// libraries, and CI's hosted runner has no Playwright browsers until a lane installs them), so a gate script uses a
// browser it can launch, else runs itself inside the pinned Playwright image, mcr.microsoft.com/playwright:v1.63.0-noble
// (the version of @playwright/test, recorded in RUN-scaffold), with the repository mounted. Inside the image the script
// finds browsers in place, so it never nests. Neither available is a harness failure (exit 2), never a pass.

import { spawn, spawnSync } from 'node:child_process'

export type EngineName = 'chromium' | 'firefox' | 'webkit'
export const ALL_ENGINES: readonly EngineName[] = ['chromium', 'firefox', 'webkit']

/** The image of the pinned Playwright version; the course's CI and the Bench use the same one. */
export const PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.63.0-noble'

export function parseEngines(spec: string | undefined, fallback: readonly EngineName[] = ['chromium']): EngineName[] {
  if (spec === undefined || spec.trim() === '') return [...fallback]
  if (spec.trim() === 'all') return [...ALL_ENGINES]
  const names = spec.split(',').map((s) => s.trim()).filter(Boolean)
  for (const n of names) if (!ALL_ENGINES.includes(n as EngineName)) throw new Error(`unknown engine ${n}: use ${ALL_ENGINES.join(', ')} or all`)
  return [...new Set(names)] as EngineName[]
}

/** True when this process is already inside the pinned image (a gate script sets SS_IN_DOCKER for the run it starts). */
export const insideImage = (): boolean => process.env['SS_IN_DOCKER'] === '1'

export interface LaunchProbe {
  ok: boolean
  version?: string
  why?: string
}

/** Can Playwright launch this engine here? A launch that fails or hangs is "no". */
export async function probeLaunch(engine: EngineName, timeoutMs = 30_000): Promise<LaunchProbe> {
  let browser: { version(): string; close(): Promise<void> } | undefined
  try {
    const pw = await import('playwright-core')
    const launched = pw[engine].launch({ timeout: timeoutMs, ...(engine === 'chromium' && process.env['PW_CHROMIUM_EXECUTABLE'] ? { executablePath: process.env['PW_CHROMIUM_EXECUTABLE'] } : {}) })
    browser = await launched
    return { ok: true, version: browser.version() }
  } catch (e) {
    return { ok: false, why: (e instanceof Error ? e.message : String(e)).split('\n')[0] ?? 'launch failed' }
  } finally {
    await browser?.close().catch(() => undefined)
  }
}

export function dockerReady(image: string = PLAYWRIGHT_IMAGE): { ok: boolean; why?: string } {
  const v = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf8', timeout: 20_000 })
  if (v.error || v.status !== 0) return { ok: false, why: 'docker is not available' }
  const has = (): boolean => spawnSync('docker', ['image', 'inspect', image, '--format', '{{.Id}}'], { encoding: 'utf8', timeout: 20_000 }).status === 0
  if (has()) return { ok: true }
  // A runner that has docker and not the image fetches it (about a gigabyte) when it is a CI runner, which is ephemeral and meant to
  // be set up this way, or when told to (SS_DOCKER_PULL=1); a developer's machine is never made to download it unasked (SS_DOCKER_PULL=0
  // turns it off in CI).
  const pull = process.env['SS_DOCKER_PULL'] === '1' || (process.env['SS_DOCKER_PULL'] !== '0' && Boolean(process.env['CI']))
  if (pull) {
    process.stderr.write(`pulling ${image}\n`)
    spawnSync('docker', ['pull', image], { stdio: ['ignore', 'ignore', 'inherit'], timeout: 900_000 })
    if (has()) return { ok: true }
  }
  return { ok: false, why: `the image ${image} is not present (docker pull ${image}, or set SS_DOCKER_PULL=1)` }
}

export type Runner = 'local' | 'docker'
export type RunnerChoice = { kind: Runner } | { kind: 'none'; why: string }

/** `requested` is auto (a local browser, else the image), or a fixed choice. */
export async function chooseRunner(requested: 'auto' | Runner, engines: readonly EngineName[]): Promise<RunnerChoice> {
  if (insideImage()) return { kind: 'local' }
  if (requested !== 'docker') {
    const probes = await Promise.all(engines.map((e) => probeLaunch(e)))
    if (probes.every((p) => p.ok)) return { kind: 'local' }
    if (requested === 'local') return { kind: 'none', why: `a local browser does not launch (${probes.find((p) => !p.ok)?.why ?? 'unknown reason'})` }
  }
  const d = dockerReady()
  if (d.ok) return { kind: 'docker' }
  return { kind: 'none', why: `no local browser launches and ${d.why ?? 'docker is not usable'}; run \`npx playwright install\` or install docker` }
}

export interface Mount {
  host: string
  guest: string
  readOnly?: boolean
}

export interface DockerRun {
  repoRoot: string
  /** The arguments to `node` inside the container, the script first (relative to the repository). */
  nodeArgs: string[]
  mounts?: Mount[]
  env?: Record<string, string>
}

/** Run `node <args>` in the pinned image with the repository at /work; resolves with the container's exit status. */
export function runInDocker(run: DockerRun): Promise<number> {
  const name = `ss-w1t41-${process.pid}-${Date.now().toString(36)}`
  const uid = process.getuid?.() ?? 1000
  const gid = process.getgid?.() ?? 1000
  const args = [
    'run', '--rm', '--init', '--name', name,
    '--memory=6g', '--shm-size=1g', '--network', 'none',
    '--user', `${uid}:${gid}`,
    '-e', 'HOME=/tmp/home', '-e', 'CI=1', '-e', 'SS_IN_DOCKER=1',
    '--tmpfs', '/tmp:exec,mode=1777',
    '-v', `${run.repoRoot}:/work`,
  ]
  for (const m of run.mounts ?? []) args.push('-v', `${m.host}:${m.guest}${m.readOnly ? ':ro' : ''}`)
  for (const [k, v] of Object.entries(run.env ?? {})) args.push('-e', `${k}=${v}`)
  args.push('-w', '/work', PLAYWRIGHT_IMAGE, 'sh', '-c', 'mkdir -p "$HOME" && exec node "$@"', 'sh', ...run.nodeArgs)
  return new Promise((resolve) => {
    const child = spawn('docker', args, { stdio: 'inherit' })
    const stop = (): void => {
      spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
    }
    const onSignal = (): void => {
      stop()
      process.exit(130)
    }
    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
    child.on('close', (code) => {
      process.removeListener('SIGINT', onSignal)
      process.removeListener('SIGTERM', onSignal)
      resolve(code ?? 2)
    })
    child.on('error', () => resolve(2))
  })
}
