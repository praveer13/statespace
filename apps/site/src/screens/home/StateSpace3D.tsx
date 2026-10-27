// The start cover's figure in the round. Balances (a, b, c) are points of a 3D integer lattice; the cube holds every
// triple from 0 to 6, and the invariant a + b + c = 6 is the diagonal plane through it. The page explores Boot's
// transfer breadth-first (graph.ts, unchanged) and lights the reached states on the plane, depth by depth. Under the
// guard as written the wave spills off the plane's triangle, past the cube's faces, into overdraft; under the fix it
// fills the triangle and stops. "View head-on" turns the camera down the (1, 1, 1) axis, where the figure is exactly the
// flat triangle StateGraph draws. The line language holds: overdrafts and the witness path use .line-violation, the
// frontier ring .line-bounded; nothing here spells a stamp colour.
//
// Drawing: React renders a fixed set of SVG elements (every state either guard can reach, the cube, the axes) and sets
// their classes from the exploration. A requestAnimationFrame loop owns the geometry: it projects through space3d.ts,
// writes attributes through refs and orders elements by depth (the painter's algorithm, split by the plane: the
// cube's far side, then the plane, then its near side). No React state changes per frame.

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { onPrefs, reducedMotion } from '../../storage/prefs.ts'
import { MAX_DEPTH, START, explore, isOverdraft, key, label, lattice, pathTo, type Guard, type State } from './graph.ts'
import { status } from './StateGraph.tsx'
import {
  HEAD_ON,
  REST,
  asVec,
  cameraSide,
  bounds,
  clampTilt,
  easeInOut,
  easeOut,
  nearestSpin,
  project,
  radialFade,
  sideOf,
  type Camera,
  type Vec3,
} from './space3d.ts'

const UNIT = 20
const SPIN_PER_MS = 0.00011
const IDLE_MS = 3500
const CAMERA_MS = 700
const LEVEL_MS = 260
const STAGGER_MS = 14
const LAND_MS = 340

interface Seg {
  readonly id: string
  readonly from: Vec3
  readonly to: Vec3
  readonly cls: string
  /** Runs through the pivot's diagonal: head-on it would point straight out of the start state, so it fades there. */
  readonly radial: boolean
}
interface Dot {
  readonly id: string
  readonly at: Vec3
  readonly cls: string
  readonly r: number
}

/** Every state either guard reaches by the deepest bound, plus the lattice: the fixed set of marks the figure owns. */
function universe() {
  const all = new Map<string, State>()
  for (const s of lattice()) all.set(key(s), s)
  for (const g of ['as-written', 'fixed'] as const) for (const [k, s] of explore(g, MAX_DEPTH).states) all.set(k, s)
  const states = [...all.values()]
  return { lattice: states.filter((s) => !isOverdraft(s)), over: states.filter(isOverdraft) }
}

/** The cube, the axes under zero, and the ticks, each assigned to its side of the plane. */
function frame() {
  const corners: Vec3[] = []
  for (const a of [0, 6]) for (const b of [0, 6]) for (const c of [0, 6]) corners.push([a, b, c])
  const segs: Seg[] = []
  for (let i = 0; i < corners.length; i++)
    for (let j = i + 1; j < corners.length; j++) {
      const p = corners[i]!
      const q = corners[j]!
      const diff = [0, 1, 2].filter((n) => p[n] !== q[n]).length
      const corner = (v: Vec3) => v[0] === v[1] && v[1] === v[2]
      if (diff === 1) segs.push({ id: `e${i}${j}`, from: p, to: q, cls: 'space-cube', radial: corner(p) || corner(q) })
    }
  const axis = (n: number, v: number): Vec3 => [n === 0 ? v : 0, n === 1 ? v : 0, n === 2 ? v : 0]
  for (let n = 0; n < 3; n++) segs.push({ id: `u${n}`, from: axis(n, -3.4), to: axis(n, 0), cls: 'space-under', radial: true })
  const dots: Dot[] = []
  for (let n = 0; n < 3; n++)
    for (const v of [-3, -2, -1, 1, 2, 3, 4, 5])
      dots.push({ id: `t${n}${v}`, at: axis(n, v), cls: v < 0 ? 'space-tick space-tick-under' : 'space-tick', r: 1.5 })
  const sideItems = (side: -1 | 1) => ({
    segs: segs.filter((s) => (sideOf(s.from) + sideOf(s.to) <= 0 ? -1 : 1) === side),
    dots: dots.filter((d) => (sideOf(d.at) <= 0 ? -1 : 1) === side),
  })
  return { near: sideItems(-1), far: sideItems(1) }
}

/** The plane past the cube: its lattice lines a = k, b = k and c = k over the region the overdrafts occupy (every
 * balance from -3 to 9), drawn faintly so a spilled state visibly sits on the same sheet, past the cube's faces. */
function planeSheet(): Array<[Vec3, Vec3]> {
  const lo = -3
  const hi = 9
  const out: Array<[Vec3, Vec3]> = []
  for (let k = lo; k <= hi; k++) {
    const b0 = Math.max(lo, 6 - k - hi)
    const b1 = Math.min(hi, 6 - k - lo)
    if (b1 <= b0) continue
    const at = (n: number, x: number, y: number): Vec3 => (n === 0 ? [k, x, y] : n === 1 ? [y, k, x] : [x, y, k])
    for (let n = 0; n < 3; n++) out.push([at(n, b0, 6 - k - b0), at(n, b1, 6 - k - b1)])
  }
  return out
}

/** The plane's lattice lines inside the triangle: a = k, b = k and c = k for k from 1 to 5. */
function planeGrid(): Array<[Vec3, Vec3]> {
  const out: Array<[Vec3, Vec3]> = []
  for (let k = 1; k <= 5; k++) {
    out.push([[k, 6 - k, 0], [k, 0, 6 - k]])
    out.push([[6 - k, k, 0], [0, k, 6 - k]])
    out.push([[6 - k, 0, k], [0, 6 - k, k]])
  }
  return out
}

const LABELS: ReadonlyArray<{ id: string; at: Vec3; text: string }> = [
  { id: 'a', at: [8.2, 0, 0], text: 'a' },
  { id: 'b', at: [0, 8.2, 0], text: 'b' },
  { id: 'c', at: [0, 0, 8.2], text: 'c' },
]
const TRIANGLE: Vec3[] = [
  [6, 0, 0],
  [0, 6, 0],
  [0, 0, 6],
]

function readReduced(): boolean {
  return reducedMotion()
}

export default function StateSpace3D() {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const [guard, setGuard] = useState<Guard>('as-written')
  const [k, setK] = useState(2)
  const [headOn, setHeadOn] = useState(false)
  const [reduced, setReduced] = useState(readReduced)

  const u = useMemo(universe, [])
  const fr = useMemo(frame, [])
  const grid = useMemo(planeGrid, [])
  const sheet = useMemo(planeSheet, [])
  const e = useMemo(() => explore(guard, k), [guard, k])

  const reached = [...e.states.values()]
  const over = reached.filter(isOverdraft)
  const witnessDepth = e.witness === null ? 0 : (e.depth.get(key(e.witness)) ?? 0)
  const pathKeys = e.witness === null ? [] : pathTo(e, e.witness)
  const statusText = status(guard, k, reached.length, over.length, e.witness, witnessDepth, e.exhausted)
  const frontier = (s: State) => !isOverdraft(s) && e.depth.get(key(s)) === k && !e.exhausted

  // The frame: a square centred on the box that holds every mark under every camera the figure can reach, with room
  // below zero for the overdrafts.
  const viewBox = useMemo(() => {
    const pts: Vec3[] = [...u.lattice, ...u.over].map(asVec)
    for (const l of LABELS) pts.push(l.at)
    for (const n of [0, 1, 2]) pts.push([n === 0 ? -3.4 : 0, n === 1 ? -3.4 : 0, n === 2 ? -3.4 : 0])
    for (const a of [0, 6]) for (const b of [0, 6]) for (const c of [0, 6]) pts.push([a, b, c])
    const bx = bounds(pts, UNIT)
    const half = Math.ceil(Math.max(bx.x1 - bx.x0, bx.y1 - bx.y0) / 2 + 10)
    const cx = Math.round((bx.x0 + bx.x1) / 2)
    const cy = Math.round((bx.y0 + bx.y1) / 2)
    return `${cx - half} ${cy - half} ${2 * half} ${2 * half}`
  }, [u])

  // ---------------------------------------------------------------- refs the frame loop writes through
  const svgRef = useRef<SVGSVGElement>(null)
  const nearRef = useRef<SVGGElement>(null)
  const farRef = useRef<SVGGElement>(null)
  const planeRef = useRef<SVGGElement>(null)
  const fillsRef = useRef<SVGGElement>(null)
  const els = useRef(new Map<string, SVGElement>())
  const reg = (id: string) => (el: SVGElement | null) => {
    if (el === null) els.current.delete(id)
    else els.current.set(id, el)
  }

  // ---------------------------------------------------------------- camera and motion, kept out of React state
  const cam = useRef<Camera>(REST)
  const move = useRef<{ from: Camera; to: Camera; t0: number } | null>(null)
  const born = useRef(new Map<string, number>())
  const live = useRef({ hover: false, focus: false, drag: false, last: -Infinity, headOn: false, reduced, dirty: true })
  const dragAt = useRef<{ x: number; y: number; id: number } | null>(null)
  const prev = useRef<{ guard: Guard; k: number } | null>(null)
  const kick = useRef(() => {})
  const model = useRef({ e, pathKeys })
  model.current = { e, pathKeys }
  live.current.headOn = headOn
  live.current.reduced = reduced

  useEffect(() => {
    const update = () => setReduced(readReduced())
    const off = onPrefs(update)
    let mq: MediaQueryList | null = null
    try {
      mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
      mq?.addEventListener('change', update)
    } catch {
      mq = null
    }
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    return () => {
      off()
      mq?.removeEventListener('change', update)
      obs.disconnect()
    }
  }, [])

  // The wave: when the exploration changes, each newly reached state gets the moment it lands. A new guard replays the
  // whole breadth-first wave from the start; a deeper bound lands only the new levels.
  useEffect(() => {
    const now = performance.now()
    const p = prev.current
    const fresh = p === null || p.guard !== guard
    const b = born.current
    if (fresh) b.clear()
    for (const id of [...b.keys()]) if (!e.depth.has(id)) b.delete(id)
    const base = fresh ? 0 : p.k + 1
    const count = new Map<number, number>()
    for (const [id, d] of e.depth) {
      if (b.has(id)) continue
      const i = count.get(d) ?? 0
      count.set(d, i + 1)
      b.set(id, live.current.reduced ? -Infinity : now + Math.max(0, d - base) * LEVEL_MS + i * STAGGER_MS)
    }
    prev.current = { guard, k }
    live.current.dirty = true
    kick.current()
  }, [e, guard, k])

  // A change of view or of the motion setting redraws, and may start or stop the spin.
  useEffect(() => {
    live.current.dirty = true
    kick.current()
  }, [headOn, reduced])

  // The frame loop.
  useEffect(() => {
    let raf = 0
    let idle = 0
    let visible = true
    let wasActive = false
    let order = { near: '', far: '', fills: '', side: 0 }
    let t = performance.now()
    const svg = svgRef.current
    const io =
      typeof IntersectionObserver === 'function' && svg !== null
        ? new IntersectionObserver((entries) => {
            visible = entries.some((x) => x.isIntersecting)
            schedule()
          })
        : null
    if (io !== null && svg !== null) io.observe(svg)

    // The loop runs only while something moves, lands or needs redrawing; a still figure costs no frames.
    function schedule() {
      if (visible && raf === 0) raf = requestAnimationFrame(tick)
    }
    kick.current = schedule

    const setLine = (el: SVGElement | undefined, a: Vec3, b: Vec3, c: Camera) => {
      if (el === undefined) return 0
      const p = project(a, c, UNIT)
      const q = project(b, c, UNIT)
      el.setAttribute('x1', p.x.toFixed(2))
      el.setAttribute('y1', p.y.toFixed(2))
      el.setAttribute('x2', q.x.toFixed(2))
      el.setAttribute('y2', q.y.toFixed(2))
      return (p.z + q.z) / 2
    }
    const setCircle = (el: SVGElement | undefined, at: Vec3, r: number, c: Camera) => {
      if (el === undefined) return 0
      const p = project(at, c, UNIT)
      el.setAttribute('cx', p.x.toFixed(2))
      el.setAttribute('cy', p.y.toFixed(2))
      el.setAttribute('r', Math.max(0, r * p.f).toFixed(2))
      return p.z
    }
    // Reorder a group's children by depth (far first), touching the DOM only when the order changed.
    const sortGroup = (g: SVGGElement | null, depth: Map<Element, number>, last: string): string => {
      if (g === null) return last
      const kids = [...g.children].sort((x, y) => (depth.get(x) ?? 0) - (depth.get(y) ?? 0))
      const sig = kids.map((x) => x.getAttribute('data-k')).join('|')
      if (sig !== last) for (const x of kids) g.appendChild(x)
      return sig
    }

    function tick(now: number) {
      raf = 0
      if (!visible) return
      const dt = Math.min(64, now - t)
      t = now
      const L = live.current
      let c = cam.current
      let moving = false
      const m = move.current
      if (m !== null) {
        const p = L.reduced ? 1 : Math.min(1, (now - m.t0) / CAMERA_MS)
        const k2 = easeInOut(p)
        c = { spin: m.from.spin + (m.to.spin - m.from.spin) * k2, tilt: m.from.tilt + (m.to.tilt - m.from.tilt) * k2 }
        if (p >= 1) move.current = null
        moving = true
      } else if (!L.reduced && !L.headOn && !L.hover && !L.focus && !L.drag && now - L.last > IDLE_MS) {
        c = { spin: c.spin + dt * SPIN_PER_MS, tilt: c.tilt }
        moving = true
      }
      cam.current = c

      // Landing marks: any state whose moment is still ahead or within its landing.
      let landing = false
      for (const at of born.current.values()) if (at > -Infinity && now - at < LAND_MS) landing = true
      const active = moving || landing
      // One more frame after motion stops, so every mark settles at its final size.
      if (active || wasActive || L.dirty) {
        L.dirty = false
        draw(c, now)
      }
      wasActive = active
      window.clearTimeout(idle)
      if (active) schedule()
      else if (!L.reduced && !L.headOn && !L.hover && !L.focus && !L.drag)
        idle = window.setTimeout(schedule, Math.max(0, L.last + IDLE_MS - now) + 16)
    }

    function draw(c: Camera, now: number) {
      const E = els.current
      const land = (id: string) => {
        const at = born.current.get(id)
        if (at === undefined) return 0
        if (at === -Infinity) return 1
        return Math.max(0, easeOut((now - at) / LAND_MS))
      }
      // The two sides of the plane.
      for (const [g, items, which] of [
        [nearRef.current, fr.near, 'near'],
        [farRef.current, fr.far, 'far'],
      ] as const) {
        const depth = new Map<Element, number>()
        for (const s of items.segs) {
          const el = E.get(s.id)
          if (el) depth.set(el, setLine(el, s.from, s.to, c))
        }
        for (const d of items.dots) {
          const el = E.get(d.id)
          if (el) depth.set(el, setCircle(el, d.at, d.r, c))
        }
        order = { ...order, [which]: sortGroup(g, depth, order[which]) }
      }
      // Head-on, the cube's edges through the diagonal, the axes under zero and their ticks would run out of the start
      // state like transitions; they fade as the camera comes onto the diagonal, leaving the triangle and the cube's
      // outline hexagon.
      const fade = radialFade(c.tilt).toFixed(3)
      const faded = (el: SVGElement | null | undefined) => {
        if (el && el.style.opacity !== fade) el.style.opacity = fade
      }
      faded(nearRef.current)
      for (const s of fr.far.segs) if (s.radial) faded(E.get(s.id))
      // Far side, plane, near side: the camera's side of the plane is drawn last.
      const side = cameraSide(c)
      if (side !== order.side) {
        const svg = svgRef.current
        const near = nearRef.current
        const far = farRef.current
        const plane = planeRef.current
        if (svg && near && far && plane) {
          const [back, front] = side === -1 ? [far, near] : [near, far]
          svg.insertBefore(back, plane)
          plane.after(front)
        }
        order.side = side
      }

      // The plane: the halftone triangle, its grid, its edge.
      const tri = TRIANGLE.map((p) => project(p, c, UNIT))
      const pts = tri.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
      E.get('tri-fill')?.setAttribute('points', pts)
      E.get('tri-edge')?.setAttribute('points', pts)
      grid.forEach(([a, b], i) => setLine(E.get(`g${i}`), a, b, c))
      sheet.forEach(([a, b], i) => setLine(E.get(`s${i}`), a, b, c))
      for (const l of LABELS) {
        const el = E.get(`l-${l.id}`)
        if (!el) continue
        const p = project(l.at, c, UNIT)
        el.setAttribute('x', p.x.toFixed(1))
        el.setAttribute('y', (p.y + 5).toFixed(1))
      }

      // The states: hollow rings for the lattice, then the marks that landed, sorted by depth.
      const depth = new Map<Element, number>()
      for (const s of u.lattice) {
        const id = key(s)
        setCircle(E.get(`r-${id}`), asVec(s), 2.6, c)
        const z = setCircle(E.get(`f-${id}`), asVec(s), 4.2 * land(id), c)
        const f = E.get(`f-${id}`)
        if (f) depth.set(f, z)
        setCircle(E.get(`q-${id}`), asVec(s), 9 * land(id), c)
      }
      for (const s of u.over) {
        const id = key(s)
        const el = E.get(`f-${id}`)
        if (!el) continue
        const p = project(asVec(s), c, UNIT)
        const h = 3.6 * p.f * land(id)
        el.setAttribute('x', (p.x - h).toFixed(2))
        el.setAttribute('y', (p.y - h).toFixed(2))
        el.setAttribute('width', (2 * h).toFixed(2))
        el.setAttribute('height', (2 * h).toFixed(2))
        depth.set(el, p.z)
      }
      order.fills = sortGroup(fillsRef.current, depth, order.fills)
      setCircle(E.get('start'), asVec(START), 9, c)

      // The witness path, inked once its last state has landed.
      const { e: ex, pathKeys: path } = model.current
      const casing = E.get('w-casing')
      const line = E.get('w-line')
      const text = E.get('w-label')
      const done = path.length > 1 && land(path[path.length - 1]!) >= 0.99
      const wpts = done
        ? path
            .map((id) => project(asVec(ex.states.get(id)!), c, UNIT))
            .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(' ')
        : ''
      casing?.setAttribute('points', wpts)
      line?.setAttribute('points', wpts)
      if (text) {
        if (done && ex.witness !== null) {
          // Outward along the last step's direction on screen, anchored on the side it leaves by.
          const p = project(asVec(ex.witness), c, UNIT)
          const q = project(asVec(ex.states.get(path[path.length - 2]!)!), c, UNIT)
          const dx = p.x - q.x
          const dy = p.y - q.y
          const len = Math.hypot(dx, dy) || 1
          const ux = dx / len
          const uy = dy / len
          text.setAttribute('x', (p.x + ux * 12).toFixed(1))
          text.setAttribute('y', (p.y + uy * 12 + 4 + uy * 4).toFixed(1))
          text.setAttribute('text-anchor', ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle')
          text.removeAttribute('visibility')
        } else text.setAttribute('visibility', 'hidden')
      }
    }

    schedule()
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      window.clearTimeout(idle)
      kick.current = () => {}
      io?.disconnect()
    }
  }, [fr, grid, sheet, u])

  // ---------------------------------------------------------------- the camera's controls
  // Every camera move takes the short way round: the target spin is the one nearest the current spin.
  const goTo = (to: Camera) => {
    const from = cam.current
    move.current = { from, to: { spin: nearestSpin(from.spin, to.spin), tilt: to.tilt }, t0: performance.now() }
    live.current.last = performance.now()
    live.current.dirty = true
    kick.current()
  }
  const toggleHeadOn = () => {
    if (headOn) {
      setHeadOn(false)
      goTo(REST)
    } else {
      setHeadOn(true)
      goTo(HEAD_ON)
    }
  }
  const nudge = (dSpin: number, dTilt: number) => {
    move.current = null
    if (headOn) setHeadOn(false)
    cam.current = { spin: cam.current.spin + dSpin, tilt: clampTilt(cam.current.tilt + dTilt) }
    live.current.last = performance.now()
    live.current.dirty = true
    kick.current()
  }
  const onKey = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return
    const step = ev.shiftKey ? 0.45 : 0.15
    switch (ev.key) {
      case 'ArrowLeft':
        nudge(-step, 0)
        break
      case 'ArrowRight':
        nudge(step, 0)
        break
      case 'ArrowUp':
        nudge(0, -step)
        break
      case 'ArrowDown':
        nudge(0, step)
        break
      case 'Home':
        setHeadOn(false)
        goTo(REST)
        break
      case 'h':
      case 'H':
        toggleHeadOn()
        break
      default:
        return
    }
    ev.preventDefault()
  }
  const onDown = (ev: PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return
    dragAt.current = { x: ev.clientX, y: ev.clientY, id: ev.pointerId }
    // A camera move in flight keeps going until the pointer actually drags (nudge cancels it and leaves head-on), so a
    // plain click never strands the camera part way with the head-on state still claimed.
    live.current.drag = true
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId)
    } catch {
      // A pointer the browser already took for scrolling; the drag simply ends.
    }
  }
  const onMove = (ev: PointerEvent<HTMLDivElement>) => {
    const d = dragAt.current
    if (d === null || d.id !== ev.pointerId) return
    const dx = ev.clientX - d.x
    const dy = ev.clientY - d.y
    dragAt.current = { ...d, x: ev.clientX, y: ev.clientY }
    if (dx !== 0 || dy !== 0) nudge(dx * 0.009, ev.pointerType === 'mouse' ? dy * 0.009 : 0)
  }
  const onUp = (ev: PointerEvent<HTMLDivElement>) => {
    if (dragAt.current?.id !== ev.pointerId) return
    dragAt.current = null
    live.current.drag = false
    live.current.last = performance.now()
    kick.current()
  }

  const view = headOn
    ? 'Seen head-on, down the (1, 1, 1) axis: the plane where the total stays 6 faces you as the flat triangle, corners a left, b top, c right.'
    : 'A cube of every balance from 0 to 6 on each account, turned at an angle, cut by the diagonal plane where the total stays 6.'
  const spill = over.length > 0 ? ' The overdrafts lie on the plane but outside the cube, past its faces.' : ''
  const isOn = (s: State) => e.depth.has(key(s))

  return (
    <figure className="graph space" aria-labelledby={`${uid}-cap`}>
      <div
        className="space-stage"
        tabIndex={0}
        role="group"
        aria-label="The state space in the round. Turn it with the arrow keys; Home resets the view, H looks head-on."
        onKeyDown={onKey}
        onFocus={(ev) => (live.current.focus = ev.currentTarget.matches(':focus-visible'))}
        onBlur={() => {
          live.current.focus = false
          live.current.last = performance.now()
          kick.current()
        }}
        onPointerEnter={(ev) => {
          if (ev.pointerType === 'mouse') live.current.hover = true
        }}
        onPointerLeave={(ev) => {
          if (ev.pointerType === 'mouse') {
            live.current.hover = false
            live.current.last = performance.now()
            kick.current()
          }
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <svg ref={svgRef} className="graph-svg space-svg" viewBox={viewBox} role="img" aria-label={`${view}${spill} ${statusText}`}>
          <defs>
            <pattern id={`${uid}-screen`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
              <circle className="space-screen-dot" cx="3" cy="3" r="1.15" />
            </pattern>
          </defs>
          <g ref={farRef} className="space-side">
            {fr.far.segs.map((s) => (
              <line key={s.id} data-k={s.id} ref={reg(s.id)} className={s.cls} />
            ))}
            {fr.far.dots.map((d) => (
              <circle key={d.id} data-k={d.id} ref={reg(d.id)} className={d.cls} />
            ))}
          </g>
          <g ref={planeRef} className="space-plane">
            <g className="space-sheet">
              {sheet.map((_, i) => (
                <line key={i} ref={reg(`s${i}`)} />
              ))}
            </g>
            <polygon ref={reg('tri-fill')} className="space-tri-fill" fill={`url(#${uid}-screen)`} />
            <g className="graph-grid">
              {grid.map((_, i) => (
                <line key={i} ref={reg(`g${i}`)} />
              ))}
            </g>
            <polygon ref={reg('tri-edge')} className="graph-edge" />
            <g className="graph-unreached">
              {u.lattice.map((s) => (
                <circle key={key(s)} ref={reg(`r-${key(s)}`)} />
              ))}
            </g>
            <polyline ref={reg('w-casing')} className="graph-casing" />
            <polyline ref={reg('w-line')} className="line-violation graph-witness" />
            <g ref={fillsRef} className="space-fills">
              {u.lattice.map((s) => (
                <circle key={key(s)} data-k={key(s)} ref={reg(`f-${key(s)}`)} className={isOn(s) ? 'space-reached' : 'is-off'} />
              ))}
              {u.over.map((s) => (
                <rect key={key(s)} data-k={key(s)} ref={reg(`f-${key(s)}`)} className={isOn(s) ? 'line-violation space-over' : 'is-off'} />
              ))}
            </g>
            <g>
              {u.lattice.map((s) => (
                <circle key={key(s)} ref={reg(`q-${key(s)}`)} className={frontier(s) ? 'line-bounded graph-frontier' : 'is-off'} />
              ))}
            </g>
            <circle ref={reg('start')} className="graph-start" />
          </g>
          <g ref={nearRef} className="space-side">
            {fr.near.segs.map((s) => (
              <line key={s.id} data-k={s.id} ref={reg(s.id)} className={s.cls} />
            ))}
            {fr.near.dots.map((d) => (
              <circle key={d.id} data-k={d.id} ref={reg(d.id)} className={d.cls} />
            ))}
          </g>
          <g className="space-labels" aria-hidden="true">
            {LABELS.map((l) => (
              <text key={l.id} ref={reg(`l-${l.id}`)} className="graph-corner space-axis" textAnchor="middle">
                {l.text}
              </text>
            ))}
            <text ref={reg('w-label')} className="graph-label" visibility="hidden">
              {e.witness === null ? '' : label(e.witness)}
            </text>
          </g>
        </svg>
      </div>

      <div className="graph-controls">
        <fieldset className="graph-guard">
          <legend>The guard</legend>
          <label>
            <input type="radio" name={`${uid}-guard`} value="as-written" checked={guard === 'as-written'} onChange={() => setGuard('as-written')} />
            <span>
              As the pull request wrote it: <code>amount ≤ dst.balance</code>
            </span>
          </label>
          <label>
            <input type="radio" name={`${uid}-guard`} value="fixed" checked={guard === 'fixed'} onChange={() => setGuard('fixed')} />
            <span>
              Fixed: <code>amount ≤ src.balance</code>
            </span>
          </label>
        </fieldset>
        <div className="space-side-controls">
          <label className="graph-depth">
            <span className="graph-depth-name">
              Explore to depth <output htmlFor={`${uid}-k`}>{k}</output>
            </span>
            <input id={`${uid}-k`} type="range" min={0} max={MAX_DEPTH} step={1} value={k} onChange={(ev) => setK(Number(ev.target.value))} />
          </label>
          <button type="button" className="space-headon" aria-pressed={headOn} onClick={toggleHeadOn}>
            View head-on
          </button>
        </div>
        <p id={`${uid}-status`} className="graph-status" aria-live="polite">
          {statusText}
        </p>
      </div>
      <figcaption id={`${uid}-cap`} className="graph-cap">
        Three accounts share 6 and start at (2, 2, 2). One step moves 1, 2 or 3 from one account to another when the guard
        allows it. The cube is every whole-number triple of balances from 0 to 6, the plane is where the total stays 6, and
        this page computes which of its points the steps reach, with no solver. An overdraft falls off the cube, past a face.
        Drag the figure or use the arrow keys to turn it; head-on, the plane is the flat triangle, with a, b and c holding all
        6 at its corners, left, top and right.
      </figcaption>
    </figure>
  )
}
