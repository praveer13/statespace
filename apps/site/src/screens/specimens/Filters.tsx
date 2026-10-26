// The filters of SCR-specimens: chips with counts for the status (all, mounted, kept, dated incidents), which are native
// radios so that one choice is one tab stop and the arrow keys move it; and, from 900 px, a stage and an idea (a KC, by its
// name), which are native selects. A chip is never colored: the chosen one is filled with ink, and says so in words to a
// reader that cannot see ink (it is a checked radio).

import { useId } from 'react'
import { COPY } from './copy.ts'
import { STATUS_FILTERS } from './model/cabinet.ts'
import type { CabinetView, Filters as FilterState, StatusFilter } from './model/cabinet.ts'

export interface FiltersProps {
  readonly view: CabinetView
  readonly filters: FilterState
  readonly onChange: (next: FilterState) => void
}

export function Filters({ view, filters, onChange }: FiltersProps) {
  const name = useId()
  const stageId = useId()
  const kcId = useId()
  return (
    <div className="sp-filters">
      <fieldset className="sp-chips">
        <legend className="sp-legend">{COPY.filters}</legend>
        {STATUS_FILTERS.map((value: StatusFilter) => (
          <label key={value} className="sp-chip">
            <input type="radio" className="visually-hidden" name={name} value={value} checked={filters.show === value} onChange={() => onChange({ ...filters, show: value })} />
            <span className="sp-chip-face">
              {COPY.chips[value]} <span className="sp-count">{view.counts[value]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="sp-selects">
        <div className="sp-select">
          <label htmlFor={stageId}>{COPY.stage}</label>
          <select id={stageId} value={filters.stage ?? ''} onChange={(e) => onChange({ ...filters, stage: e.target.value === '' ? null : e.target.value })}>
            <option value="">{COPY.anyStage}</option>
            {view.stageOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.title}
              </option>
            ))}
          </select>
        </div>
        <div className="sp-select">
          <label htmlFor={kcId}>{COPY.about}</label>
          <select id={kcId} value={filters.kc ?? ''} onChange={(e) => onChange({ ...filters, kc: e.target.value === '' ? null : e.target.value })}>
            <option value="">{COPY.anyIdea}</option>
            {view.kcOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
