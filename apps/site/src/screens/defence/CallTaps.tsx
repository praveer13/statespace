// The confidence taps (DESIGN.md, Exercise): guess / think so / sure as one segmented control, the chosen segment
// reversed in ink, each with its printed band (ASSESSMENT.md section 5.2).

export type Conf = 'guess' | 'think' | 'sure'

const TAPS: ReadonlyArray<readonly [Conf, string, string]> = [
  ['guess', 'guess', 'below 67%'],
  ['think', 'think so', '67–80%'],
  ['sure', 'sure', 'above 80%'],
]

export function CallTaps({ name, value, onChange, disabled, legend }: { readonly name: string; readonly value: Conf | null; readonly onChange: (c: Conf) => void; readonly disabled?: boolean; readonly legend: string }) {
  return (
    <fieldset className="dfn-taps-field" disabled={disabled}>
      <legend className="dfn-legend">{legend}</legend>
      <div className="dfn-taps">
        {TAPS.map(([v, word, band]) => (
          <label key={v} className="dfn-tap" data-picked={value === v || undefined}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            <span className="dfn-tap-word">{word}</span>
            <span className="dfn-tap-band">{band}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
