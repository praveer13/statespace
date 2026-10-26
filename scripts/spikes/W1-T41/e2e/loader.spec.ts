// The download loader (OD-6, changed 2026-10-25; spine section 11.2; ARCHITECTURE.md sections 5.9 and 14): no download asks
// first and none warns, and while an engine downloads the loader shows its size, one engine's compressed first load, from the
// build manifest through caps.firstLoadBytes. These checks tap "Run it live in this tab" on /boot and read what the learner
// sees (scripts/spikes/W1-T41/e2e/engine-session.ts), against the manifest the instruments build carries.
//   loader.noprompt  on /boot before the tap, and from the tap to the first byte, anywhere on the page (main, header, a toast or
//                    a status region, an aside): no browser dialog (alert, confirm, prompt), no rendered dialog element, no
//                    consent or warning wording (engine-session.ts PROMPT_COPY: "Warning", "heads up", "downloads 3.0 MB", "a
//                    large file", "will download about …", consent, mobile data and the like), and no size stated anywhere but
//                    the loader's own box (before the tap there is no loader, so no size at all; a line the box has shown, as
//                    a live region repeating it, is the loader's); and the one tap starts the download, so a byte shows in the
//                    loader within 12 s with no second step
//   loader.size      in every frame of the loader, from the first to the live verdict: each place that states a total (the
//                    bar's aria-valuetext, its aria-label, the text around it) states the manifest's figure to the digits it
//                    shows, and a bar that counts bytes has the figure as its maximum; the first frame states it somewhere. A
//                    loader that rounds a different number, types its own, takes the host's progress total for it, or says one
//                    thing to the eye and another to a screen reader fails, naming the frame and the place
//   frame.sandbox    the instrument frame the page creates carries sandbox="allow-scripts allow-same-origin" and
//                    referrerpolicy="no-referrer", and points at the instrument origin (the runtime half of the lint)

import { loaderMismatches } from '../lib/loader.ts'
import { sandboxOk } from '../lib/lints.ts'
import { describeBytes } from '../lib/units.ts'
import { sharedObservation } from './engine-session.ts'
import { enforce, expect, test } from './fixtures.ts'

test('[loader.noprompt] nothing prompts or warns before the engine downloads', async ({ browser, world, gate }) => {
  enforce(gate, 'loader.noprompt')
  const o = await sharedObservation(browser, world)
  expect(o.error ?? '', 'the session could not start').toBe('')
  expect(o.dialogs, `a browser dialog opened: ${o.dialogs.join(' | ')}`).toEqual([])
  expect(o.dialogElements, 'a dialog element was rendered on /boot before the first byte').toBe(0)
  expect(o.promptCopy, `the page read like a prompt or a size warning before the first byte (OD-6: none asks and none warns): ${o.promptCopy.join(' | ')}`).toEqual([])
  expect(o.loader, 'the loader never appeared: expected a progress bar with "Downloading … of …" (DESIGN.md section 6.2)').not.toBeNull()
  expect(o.firstByte, 'no byte of the engine showed in the loader within 12 s of the one tap: the tap starts the download, with no second step (OD-6)').toBe(true)
})

test("[loader.size] the loader's size is the build manifest's first-load figure", async ({ browser, world, gate }) => {
  enforce(gate, 'loader.size')
  expect(world.manifest, world.manifestProblem ?? 'the instruments build has no engine manifest').not.toBeNull()
  const z3 = world.manifest?.engines.get('z3')
  expect(z3, 'the manifest lists no z3 engine').toBeDefined()
  const figure = z3?.firstLoadBytes ?? 0
  const o = await sharedObservation(browser, world)
  expect(o.error ?? '', 'the session could not start').toBe('')
  expect(o.loader, 'no loader appeared after the tap: expected a progress bar with "Downloading … of …" (DESIGN.md section 6.2)').not.toBeNull()
  const loader = o.loader as NonNullable<typeof o.loader>
  expect(loader.total, `the loader's first frame states no size (${loader.where}); it prints the manifest's ${describeBytes(figure)}`).not.toBeNull()
  // every frame, every place: the first frame's figure alone would let a loader that switches to another total pass
  const wrong = loaderMismatches(o.loaderFrames, figure)
  expect(wrong, `the loader disagrees with the build manifest's first load, ${describeBytes(figure)}, over the ${o.loaderFrames.length} frames read: ${wrong.slice(0, 4).join('; ')}${wrong.length > 4 ? ` (+${wrong.length - 4} more)` : ''}`).toEqual([])
})

test('[frame.sandbox] the instrument frame carries the sandbox and the no-referrer policy of ARCHITECTURE.md section 5.3', async ({ browser, world, gate }) => {
  enforce(gate, 'frame.sandbox')
  const o = await sharedObservation(browser, world)
  expect(o.error ?? '', 'the session could not start').toBe('')
  expect(o.frame, 'the page created no instrument frame').not.toBeNull()
  const frame = o.frame as NonNullable<typeof o.frame>
  expect(frame.sandbox, 'sandbox attribute').not.toBeNull()
  expect(sandboxOk(frame.sandbox ?? ''), `sandbox="${frame.sandbox}" must be exactly "allow-scripts allow-same-origin"`).toBe(true)
  expect(frame.referrerPolicy).toBe('no-referrer')
  expect(new URL(frame.src ?? '', world.siteOrigin).origin, 'the frame points at the instrument origin').toBe(world.instrumentOrigin)
})
