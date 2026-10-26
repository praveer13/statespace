// Each stage's planned hours and the roadmap's time, as content/stages/budget.yaml's rows print them (the spine's section
// 3.11 table, which GATE-budget holds equal to the file). Planned hours are design estimates [D]; learner-zero's logged
// times replace them after each wave. Roadmap weeks are the roadmap's own range; S1's is in sessions (2.5 h each,
// budget.yaml's `session_h`), and S10's is open, with a final pass of at most 6 weeks.

export interface StagePlan {
  readonly id: string
  readonly title: string
  /** Planned hours [D], low to high. */
  readonly hours: readonly [number, number]
  /** The roadmap's time as printed. */
  readonly roadmap: string
  /** The roadmap's range in weeks, where it gives one. */
  readonly roadmapWeeks: readonly [number, number] | null
}

export const STAGE_PLANS: readonly StagePlan[] = [
  { id: 'S1', title: 'Counterexample', hours: [5.3, 9.4], roadmap: '2–4 sessions (≤ 10 h)', roadmapWeeks: null },
  { id: 'S2', title: 'Proof', hours: [15.6, 28.4], roadmap: '3–6 weeks', roadmapWeeks: [3, 6] },
  { id: 'S3', title: 'Semantics', hours: [11.9, 23.7], roadmap: '4–8 weeks', roadmapWeeks: [4, 8] },
  { id: 'S4', title: 'Obligations', hours: [8.8, 15.6], roadmap: '3–6 weeks', roadmapWeeks: [3, 6] },
  { id: 'S5', title: 'Time', hours: [10.5, 17.6], roadmap: '3–6 weeks', roadmapWeeks: [3, 6] },
  { id: 'S6', title: 'Correspondence', hours: [9.2, 15.9], roadmap: '4–8 weeks', roadmapWeeks: [4, 8] },
  { id: 'S7', title: 'Secrecy', hours: [9.7, 17.0], roadmap: '4–8 weeks', roadmapWeeks: [4, 8] },
  { id: 'S8', title: 'Effects', hours: [7.4, 13.2], roadmap: '3–6 weeks', roadmapWeeks: [3, 6] },
  { id: 'S9', title: 'Preservation', hours: [16.1, 33.8], roadmap: '6–10 weeks', roadmapWeeks: [6, 10] },
  { id: 'S10', title: 'Assembly', hours: [12.2, 22.7], roadmap: 'open; final pass ≤ 6 weeks', roadmapWeeks: null },
]

export const ARC_HOURS: readonly [number, number] = [
  Math.round(STAGE_PLANS.reduce((s, p) => s + p.hours[0], 0)),
  Math.round(STAGE_PLANS.reduce((s, p) => s + p.hours[1], 0)),
]
