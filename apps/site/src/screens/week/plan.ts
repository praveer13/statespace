// The learner's week plan (M-set-your-week, M-monthly-retro): settings in the store's working state under `week-plan`
// (apps/site/src/storage README: settings live there, last writer wins, and an export carries them). The weekly review's
// answer is kept under `week-review:<Monday>`. Nothing here is evidence, and nothing reads a keep/kill arm.

import { useCallback, useEffect, useState } from 'react'
import { stampTime } from '@statespace/ledger'
import { DEFAULT_PLAN, readPlan } from '@statespace/learner/schedule'
import type { WeekPlan } from '@statespace/learner/schedule'
import { systemClock } from '../../storage/index.ts'
import type { LedgerStore } from '../../storage/index.ts'

export const PLAN_KEY = 'week-plan'
export const reviewKey = (monday: string): string => `week-review:${monday}`

/** The learner's local date now, as the record's `day` would freeze it. */
export function localToday(): string {
  const ms = systemClock.nowMs()
  return stampTime(ms, systemClock.tzAt(ms)).at.slice(0, 10)
}

export type PlanState = { readonly status: 'loading' | 'ready' | 'unavailable'; readonly plan: WeekPlan; readonly saved: boolean }

/** The plan, and a save that writes it to working state; the default plan until the learner sets one. */
export function useWeekPlan(store: LedgerStore | null | undefined): [PlanState, (plan: WeekPlan) => Promise<void>] {
  const [state, setState] = useState<PlanState>({ status: 'loading', plan: DEFAULT_PLAN, saved: false })
  useEffect(() => {
    if (store === undefined) return
    if (store === null) {
      setState({ status: 'unavailable', plan: DEFAULT_PLAN, saved: false })
      return
    }
    let live = true
    const read = async (): Promise<void> => {
      try {
        const v = await store.getWorking(PLAN_KEY)
        if (live) setState({ status: 'ready', plan: v === undefined ? DEFAULT_PLAN : readPlan(v), saved: v !== undefined })
      } catch {
        if (live) setState({ status: 'unavailable', plan: DEFAULT_PLAN, saved: false })
      }
    }
    void read()
    const stop = store.subscribe(() => void read())
    return () => {
      live = false
      stop()
    }
  }, [store])
  const save = useCallback(
    async (plan: WeekPlan): Promise<void> => {
      setState({ status: 'ready', plan, saved: true })
      if (store !== null && store !== undefined) await store.setWorking(PLAN_KEY, plan)
    },
    [store],
  )
  return [state, save]
}
