// The six block types of a lesson or a drawer (packages/content/README.md section 1.5), drawn from the built page record.
// Prose is Markdown with sidenotes; an instrument cell shows its code and direction, asks its Call It before the reveal
// on a lesson's first run, then shows the recorded run, every option's why and the text after the run; an item with a
// fixed choice is answered here and written to the practice record; a claim or specimen block is a card named from the
// spine; a card is a card.

import { useRef, useState } from 'react'
import { Link } from 'react-router'
import type { LessonCardBlock, LessonChoice, LessonInstrumentBlock, LessonItemBlock, LessonRunSnapshot } from '@statespace/schema'
import type { Lesson } from '@statespace/content'
import type { LedgerEvent } from '@statespace/ledger'
import { CallItCell, itemFromCell } from '../call-it/index.ts'
import type { LedgerStore } from '../../storage/index.ts'
import { InlineMd, Markdown, RUN_PENDING } from '../markdown/Markdown.tsx'
import { claimName, specimenName } from '../../app/content.ts'
import { callRef, itemRef } from '../../app/progress.ts'

/** What a block needs from its page and the practice record. */
export interface BlockContext {
  readonly page: Lesson
  /** A lesson asks its Call Its; a drawer's cells are free runs. */
  readonly kind: 'lesson' | 'drawer'
  readonly store: LedgerStore | null | undefined
  /** The events in fold order, or null while they load or when this browser keeps none. */
  readonly events: readonly LedgerEvent[] | null
  /** The first answer to each question, by key (progress.ts). */
  readonly answered: ReadonlyMap<string, LedgerEvent>
}

/** Boot says "result" where every other page says "run" (packages/content/README.md section 2.3). */
const runWord = (page: Lesson): string => (page.id === 'S1.L0' ? 'result' : 'run')

const INSTRUMENTS: Readonly<Record<string, string>> = {
  'INS-z3': 'Z3',
  'INS-goal-replay': 'Goal Replay',
  'INS-interp': 'The interpreter',
  'INS-derivation': 'The Derivation Board',
  'INS-theater': 'The Theater',
  'INS-spectacle': 'Spectacle',
  'INS-lasso': 'The lasso viewer',
  'INS-pglite': 'PGlite',
  'INS-history': 'The history viewer',
  'INS-datalog': 'Datalog',
  'INS-pairs': 'Paired states',
  'INS-sim': 'The simulator',
  'INS-lane-a': 'Your module',
  'INS-receipt': 'A receipt',
  'INS-pocket': 'The pocket checker',
}

const instrumentName = (ins: string): string => INSTRUMENTS[ins] ?? (ins.startsWith('INS-bench-') ? `The Bench: ${ins.slice('INS-bench-'.length)}` : ins)

const ENGINE = /^[a-z][a-z0-9-]*@[A-Za-z0-9][A-Za-z0-9._+-]*$/

const runOf = (page: Lesson, id: string | undefined): LessonRunSnapshot | undefined =>
  id === undefined || (page.unresolved ?? []).includes(id) ? undefined : page.runs?.[id]

const engineLine = (run: LessonRunSnapshot): string => [run.engine, run.version].filter((x) => x !== undefined && x !== '').join(' ')

// ---------------------------------------------------------------- prose

export function ProseBlock({ md, noteStart }: { readonly md: string; readonly noteStart: number }) {
  return <Markdown md={md} noteStart={noteStart} className="prose-block" />
}

// ---------------------------------------------------------------- instrument

function RecordedRun({ page, id }: { readonly page: Lesson; readonly id: string }) {
  const run = runOf(page, id)
  const word = runWord(page)
  if (run === undefined) {
    return (
      <div className="cell-output" data-pending="true">
        <p className="cell-output-label">
          Recorded {word} <code>{id}</code>
        </p>
        <p className="cell-pending">{word === 'run' ? RUN_PENDING : 'result not yet recorded'}</p>
      </div>
    )
  }
  const lines = run.verdict_lines ?? []
  const engine = engineLine(run)
  return (
    <div className="cell-output">
      <p className="cell-output-label">
        Recorded {word} <code>{run.id}</code>
        {engine !== '' ? ` · ${engine}` : ''}
        {run.recorded_at !== undefined ? ` · ${run.recorded_at.slice(0, 10)}` : ''}
      </p>
      {lines.length > 0 ? (
        <div className="code-block" role="region" aria-label={`What the ${word} printed`} tabIndex={0}>
          <pre>{lines.join('\n')}</pre>
        </div>
      ) : (
        <p className="cell-pending">This {word} recorded no output lines.</p>
      )}
    </div>
  )
}

function EveryWhy({ choice }: { readonly choice: LessonChoice }) {
  return (
    <div className="whys">
      <p className="whys-head">Every option, and why</p>
      <ul className="whys-list">
        {choice.options.map((o) => (
          <li key={o.id} data-key={o.id === choice.key ? 'true' : undefined}>
            <p className="whys-option">
              <span className="opt-id">{o.id}.</span> <InlineMd text={o.text} />
              {o.id === choice.key ? <span className="whys-key"> · the answer</span> : null}
            </p>
            <Markdown md={o.why} className="whys-why" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InstrumentBlock({ block, ctx, kc, figure }: { readonly block: LessonInstrumentBlock; readonly ctx: BlockContext; readonly kc: string | undefined; readonly figure?: string }) {
  const { page } = ctx
  const asks = ctx.kind === 'lesson' && block.callOnFirstRun && block.call !== undefined
  const keyRun = runOf(page, block.call?.keyRun ?? block.recorded)
  const engine = keyRun?.engine !== undefined && keyRun.version !== undefined ? `${keyRun.engine}@${keyRun.version}` : undefined
  const item = asks ? itemFromCell(block, { lesson: page.id, ...(kc === undefined ? {} : { kc }), ...(engine !== undefined && ENGINE.test(engine) ? { engine } : {}) }) : undefined
  const [committed, setCommitted] = useState(false)
  const revealed = !asks || committed || ctx.answered.has(callRef(page.id, block.cell))
  const word = runWord(page)
  return (
    <figure className="cell no-margin" aria-label={`${figure !== undefined ? `Figure ${figure}, ` : ''}${instrumentName(block.ins)}, cell ${block.cell}`}>
      <div className="cell-head">
        <span className="cell-ins">
          {figure !== undefined ? <span className="cell-fig">Figure {figure}</span> : null}
          {figure !== undefined ? ' · ' : ''}
          {instrumentName(block.ins)}
          <span className="cell-lane"> · recorded {word}</span>
        </span>
        <code className="cell-run">{block.recorded}</code>
      </div>
      <div className="cell-body">
        {block.md !== undefined ? <Markdown md={block.md} /> : null}
        {block.code !== undefined ? (
          <div className="code-block cell-code" role="region" aria-label={`${block.code.lang} code`} tabIndex={0}>
            <pre>
              <code>{block.code.text}</code>
            </pre>
          </div>
        ) : null}
        {block.direction !== undefined ? <Markdown md={block.direction} className="cell-direction" /> : null}
        {block.tap !== undefined && revealed ? (
          <p className="cell-tap">
            The property this query tests: <InlineMd text={block.tap.property} />
          </p>
        ) : null}
        {item !== undefined ? (
          <CallItCell
            store={ctx.store}
            item={item}
            layout="inline"
            actionLabel={`Show the recorded ${word}`}
            revealed={revealed}
            onCommitted={() => setCommitted(true)}
          />
        ) : null}
        {item !== undefined && ctx.store === null && !revealed ? (
          // No record can be kept in this browser, so no call is asked; the run can still be read.
          <p className="actions">
            <button type="button" className="button button-secondary" onClick={() => setCommitted(true)}>
              Show the recorded {word}
            </button>
          </p>
        ) : null}
        {revealed ? <RecordedRun page={page} id={block.recorded} /> : null}
        {revealed && asks && block.call !== undefined ? <EveryWhy choice={block.call} /> : null}
        {revealed && block.after !== undefined ? <Markdown md={block.after} className="cell-after" /> : null}
      </div>
    </figure>
  )
}

// ---------------------------------------------------------------- item

const ROLE_LABEL: Readonly<Record<LessonItemBlock['role'], string>> = {
  prequestion: 'Before this segment',
  segment: 'Question',
  exit: 'Exit question',
}

function pickedOf(e: LedgerEvent | undefined): string | undefined {
  const resp = e?.resp as { picked?: unknown } | undefined
  return typeof resp?.picked === 'string' ? resp.picked : undefined
}

/** "Exercise 1.2 · Before this segment": the question's number in its segment, set like a textbook's exercise. */
function ExerciseHead({ exercise, role }: { readonly exercise: string | undefined; readonly role: LessonItemBlock['role'] }) {
  return (
    <p className="exercise-head">
      {exercise !== undefined ? (
        <>
          <span className="exercise-word">Exercise</span> <span className="exercise-n">{exercise}</span>
          <span className="exercise-role"> · {ROLE_LABEL[role]}</span>
        </>
      ) : (
        <span className="exercise-word">{ROLE_LABEL[role]}</span>
      )}
    </p>
  )
}

function ChoiceItem({ block, choice, n, ctx, exercise }: { readonly block: LessonItemBlock; readonly choice: LessonChoice; readonly n: number; readonly ctx: BlockContext; readonly exercise: string | undefined }) {
  const { page } = ctx
  const prior = ctx.answered.get(`item:${page.id}/i${n}`)
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [submitted, setSubmitted] = useState<string | undefined>(undefined)
  const [note, setNote] = useState<string | undefined>(undefined)
  const shownAt = useRef(performance.now())
  const answer = pickedOf(prior) ?? submitted
  const done = answer !== undefined
  const name = `q-${page.id}-i${n}`.replace(/[^A-Za-z0-9_-]/g, '-')

  const submit = async (): Promise<void> => {
    if (picked === undefined || done) return
    setSubmitted(picked)
    const store = ctx.store
    if (store === null || store === undefined) {
      setNote('This browser is not keeping your record, so the answer was not saved.')
      return
    }
    const ref = itemRef(page.id, block.family, block.template, n)
    const seen = (ctx.events ?? []).some((e) => e.ref === ref && e.itemRev === block.itemRev && block.itemRev !== undefined)
    const mis = choice.options.find((o) => o.id === picked)?.mis
    try {
      await store.record({
        kind: 'item',
        ref,
        provenance: 'own',
        exposure: seen ? 'seen' : 'unseen',
        ok: picked === choice.key,
        resp: { picked },
        ...(mis !== undefined && picked !== choice.key ? { mis } : {}),
        ...(block.itemRev !== undefined ? { itemRev: block.itemRev } : {}),
        ms: Math.max(0, Math.round(performance.now() - shownAt.current)),
        data: { page: page.id, item: `i${n}` },
      })
    } catch (e) {
      setNote(`The answer was not saved: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const promptId = `${name}-prompt`
  return (
    <div className="question no-margin" data-role={block.role}>
      <ExerciseHead exercise={exercise} role={block.role} />
      <div id={promptId} className="question-prompt">
        <Markdown md={choice.prompt} />
      </div>
      <fieldset className="question-options" aria-labelledby={promptId} disabled={done}>
        {choice.options.map((o) => (
          <label key={o.id} className="question-option" data-picked={(done ? answer : picked) === o.id ? 'true' : undefined}>
            <input type="radio" name={name} value={o.id} checked={(done ? answer : picked) === o.id} onChange={() => setPicked(o.id)} />
            <span className="opt-id">{o.id}</span>
            <span className="question-option-text">
              <InlineMd text={o.text} />
            </span>
          </label>
        ))}
      </fieldset>
      {!done ? (
        <div className="actions">
          <button type="button" className="button button-primary" disabled={picked === undefined} onClick={() => void submit()}>
            Submit
          </button>
          {picked === undefined ? <span className="question-need">Pick an answer first.</span> : null}
        </div>
      ) : null}
      <div role="status" aria-live="polite">
        {done ? (
          <>
            <p className="question-result">
              <strong>{answer === choice.key ? 'Your answer matched.' : 'Your answer missed.'}</strong> You answered {answer}; the answer is {choice.key}.
            </p>
            <EveryWhy choice={choice} />
          </>
        ) : null}
        {note !== undefined ? <p className="question-note">{note}</p> : null}
      </div>
    </div>
  )
}

export function ItemBlock({ block, n, ctx, exercise }: { readonly block: LessonItemBlock; readonly n: number; readonly ctx: BlockContext; readonly exercise?: string }) {
  if (block.choice !== undefined) return <ChoiceItem block={block} choice={block.choice} n={n} ctx={ctx} exercise={exercise} />
  return (
    <div className="question question-generated no-margin" data-role={block.role}>
      <ExerciseHead exercise={exercise} role={block.role} />
      <p className="question-later">A fresh question is generated here for each learner. The generator arrives in a later build.</p>
    </div>
  )
}

// ---------------------------------------------------------------- claim, specimen, card

export function ClaimBlock({ template }: { readonly template: string }) {
  return (
    <aside className="ref-card no-margin" data-kind="claim" aria-label={`Claim ${template}`}>
      <p className="ref-card-title">{claimName(template) !== undefined ? <InlineMd text={claimName(template) as string} /> : template}</p>
      <p className="ref-card-id">
        <code>{template}</code> · claim
      </p>
      <p className="ref-card-text">
        This lesson mints the claim once you have answered its questions; it then sits under <Link to="/claims">Claims</Link>.
      </p>
    </aside>
  )
}

/** A claim or a specimen whose questions are still open: its name would give their answer away. */
export function Waiting({ what }: { readonly what: 'claim' | 'specimen' }) {
  return (
    <aside className="ref-card ref-card-waiting no-margin" aria-label={what === 'claim' ? 'A claim' : 'A specimen'}>
      <p className="ref-card-id">{what === 'claim' ? 'Claim' : 'Specimen'}</p>
      <p className="ref-card-text">{what === 'claim' ? 'A claim' : 'A specimen'} is shown here once you have answered the questions above.</p>
    </aside>
  )
}

export function SpecimenBlock({ id, mount }: { readonly id: string; readonly mount: boolean }) {
  return (
    <aside className="ref-card no-margin" data-kind="specimen" aria-label={`Specimen ${id}`}>
      <p className="ref-card-title">{specimenName(id) !== undefined ? <InlineMd text={specimenName(id) as string} /> : id}</p>
      <p className="ref-card-id">
        <code>{id}</code> · specimen
      </p>
      <p className="ref-card-text">
        {mount ? 'Mounted in your specimen cabinet, labeled from the run that found it. ' : 'Kept in the specimen cabinet, labeled from the run that found it. '}
        <Link to="/specimens">Open the cabinet</Link>
      </p>
    </aside>
  )
}

const CARD_LABEL: Readonly<Record<LessonCardBlock['variant'], string>> = {
  'build-this': 'Build this',
  twin: 'Production twin',
  'dated-incident': 'Dated incident',
  'feels-harder': 'This will feel harder',
  reading: 'Reading',
}

/** The lab a lab stage belongs to: LAB-1.3 is in LAB-1. */
export const labOf = (stage: string): string => stage.replace(/\.[0-9]+$/, '')

/** Build-this and reading cards stand in the margin as plates from 1100 px; the rest stay in the column. */
const MARGIN_PLATES: ReadonlySet<LessonCardBlock['variant']> = new Set(['build-this', 'reading'])

export function CardBlock({ block }: { readonly block: LessonCardBlock }) {
  const label = CARD_LABEL[block.variant]
  const plate = MARGIN_PLATES.has(block.variant)
  const title = block.title !== undefined && block.title !== label ? block.title : undefined
  return (
    <aside className={`content-card no-margin${plate ? ' content-plate' : ''}`} data-variant={block.variant} aria-label={block.title ?? label}>
      {plate ? <p className="content-card-band">{label}</p> : null}
      {plate ? (
        title !== undefined ? (
          <p className="content-card-title">
            <InlineMd text={title} />
          </p>
        ) : null
      ) : (
        <p className="content-card-title">
          {title !== undefined ? (
            <>
              <span className="content-card-kind">{label}: </span>
              <InlineMd text={title} />
            </>
          ) : (
            label
          )}
        </p>
      )}
      <Markdown md={block.md} />
      {block.variant === 'build-this' && block.lab !== undefined ? (
        <p className="content-card-link">
          <Link to={`/labs/${labOf(block.lab)}`} className="button button-secondary">
            Open {block.lab}
            {block.minutes !== undefined ? ` · ${block.minutes} min` : ''}
          </Link>
        </p>
      ) : null}
    </aside>
  )
}
