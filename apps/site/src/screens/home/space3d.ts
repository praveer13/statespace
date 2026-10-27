// The projection behind the start cover's figure in the round: balances (a, b, c) are points of a 3D integer lattice,
// and the invariant a + b + c = 6 is the diagonal plane through it. A camera is two angles. `spin` turns the lattice
// about its (1, 1, 1) diagonal, the plane's normal; `tilt` then leans the camera off that diagonal. At spin 0 and tilt 0
// the camera looks straight down the diagonal, the plane faces it, and every state on the plane lands exactly where
// graph.ts's barycentric `place` puts it (a left, b top, c right), scaled. Mild perspective on top. Pure.

import type { State } from './graph.ts'

export type Vec3 = readonly [number, number, number]

export interface Camera {
  readonly spin: number
  readonly tilt: number
}

/** The point the camera turns about: the start state, on the plane and on the diagonal through the origin. */
export const PIVOT: Vec3 = [2, 2, 2]
/** The angled view the cover rests at: chosen so the a < 0 side of the plane, where the witness (-1, 5, 2) lands,
 * projects clear of the cube's outline. */
export const REST: Camera = { spin: -1.0, tilt: 0.95 }
export const HEAD_ON: Camera = { spin: 0, tilt: 0 }
/** The tilt stays on the origin's side of the plane, from head-on (0) to this lean. */
export const TILT_LIMIT = 1.1
/** Camera distance in lattice units: far enough that the perspective stays mild. */
export const DISTANCE = 34

const S2 = Math.SQRT2
const S3 = Math.sqrt(3)
const S6 = Math.sqrt(6)
// The head-on basis. Screen right runs from a's corner to c's, screen up toward b's, and the third axis (right × up)
// points at the viewer, down the diagonal from the origin's side.
const RIGHT: Vec3 = [-1 / S2, 0, 1 / S2]
const UP: Vec3 = [-1 / S6, 2 / S6, -1 / S6]
const TOWARD: Vec3 = [-1 / S3, -1 / S3, -1 / S3]

const dot = (u: Vec3, v: Vec3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2]

/** Camera coordinates of a world point: x right, y up, z toward the viewer. */
export function toCamera(p: Vec3, cam: Camera): Vec3 {
  const q: Vec3 = [p[0] - PIVOT[0], p[1] - PIVOT[1], p[2] - PIVOT[2]]
  // Turning about the diagonal is a turn in the head-on screen plane: rotate (x, y), keep z.
  const x0 = dot(q, RIGHT)
  const y0 = dot(q, UP)
  const z0 = dot(q, TOWARD)
  const cs = Math.cos(cam.spin)
  const ss = Math.sin(cam.spin)
  const x = x0 * cs - y0 * ss
  const y1 = x0 * ss + y0 * cs
  // Then lean the camera about screen right.
  const ct = Math.cos(cam.tilt)
  const st = Math.sin(cam.tilt)
  return [x, y1 * ct - z0 * st, y1 * st + z0 * ct]
}

export interface Projected {
  readonly x: number
  readonly y: number
  /** Toward the viewer: larger is nearer. */
  readonly z: number
  /** The perspective scale at this depth, for sizing marks. */
  readonly f: number
}

/** Screen position (SVG units, y down) of a world point under the camera, `unit` pixels per lattice step. */
export function project(p: Vec3, cam: Camera, unit: number): Projected {
  const [x, y, z] = toCamera(p, cam)
  const f = DISTANCE / (DISTANCE - z)
  return { x: x * f * unit, y: -y * f * unit, z, f }
}

/** Which side of the plane the camera is on: -1 the origin's side (a + b + c < 6), +1 the far side. */
export function cameraSide(cam: Camera): -1 | 1 {
  // The camera sits at (0, 0, DISTANCE) in camera coordinates; the plane's normal (1, 1, 1) has camera z equal to
  // -cos(tilt) (it is the head-on axis pointing away, leaned by the tilt), so the sign follows from the tilt alone.
  return Math.cos(cam.tilt) > 0 ? -1 : 1
}

/** Which side of the plane a world point lies on (0 on it). */
export const sideOf = (p: Vec3): -1 | 0 | 1 => {
  const s = p[0] + p[1] + p[2] - 6
  return s < -1e-9 ? -1 : s > 1e-9 ? 1 : 0
}

/** The spin equal to `target` modulo a whole turn that lies nearest `from`, so a camera move takes the short way round
 * (and going head-on lands on the triangle the flat figure draws, not a relabelled one). */
export const nearestSpin = (from: number, target: number) => target + Math.round((from - target) / (2 * Math.PI)) * 2 * Math.PI

export const clampTilt = (t: number) => Math.max(0, Math.min(TILT_LIMIT, t))

/** How much of the line work that runs through the pivot to show: none head-on, where it would read as transitions
 * out of the start state, rising to full once the camera leans off the diagonal. */
export const radialFade = (tilt: number) => Math.min(1, Math.abs(Math.sin(tilt)) / 0.3)

/** The ease the camera moves with: cubic in-out. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
/** The ease a landing mark grows with: exponential out. */
export const easeOut = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

export interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** The box that holds every point under every camera the figure can reach (any spin, tilt 0 to TILT_LIMIT), so the
 * frame never jumps while it turns. */
export function bounds(points: readonly Vec3[], unit: number): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let ti = 0; ti <= 8; ti++) {
    const tilt = (TILT_LIMIT * ti) / 8
    for (let si = 0; si < 48; si++) {
      const cam = { spin: (si / 48) * 2 * Math.PI, tilt }
      for (const p of points) {
        const { x, y } = project(p, cam, unit)
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
    }
  }
  return { x0, y0, x1, y1 }
}

export const asVec = (s: State): Vec3 => [s[0], s[1], s[2]]
