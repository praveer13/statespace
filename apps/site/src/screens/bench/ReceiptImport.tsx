// Import a receipt on SCR-bench: paste its text or choose (or drop) its file. The tab reads it (receipt-model.ts),
// keeps one receipt-import event and a read-only copy of the file, and shows what it carries. Nothing is uploaded:
// there is no server. A rejected receipt is reported with every reason, and nothing is kept.

import { useId, useState, type DragEvent } from 'react'
import { keepReceipt } from '../../app/ledger.ts'
import type { LedgerStore } from '../../storage/index.ts'
import { importData, provenanceOf, readReceipt, RECEIPT_MAX_BYTES, type ImportedReceipt } from './receipt-model.ts'
import { ReceiptView, type CheckLabel } from './ReceiptView.tsx'
import { claimExists } from './useReceipts.ts'

type Outcome =
  | { readonly kind: 'idle' }
  | { readonly kind: 'working' }
  | { readonly kind: 'rejected'; readonly problems: readonly string[] }
  | { readonly kind: 'kept'; readonly imported: ImportedReceipt; readonly fresh: boolean }
  | { readonly kind: 'shown'; readonly imported: ImportedReceipt; readonly why: string }

export function ReceiptImport({ store, checkLabel }: { readonly store: LedgerStore | null | undefined; readonly checkLabel?: CheckLabel }) {
  const [text, setText] = useState('')
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' })
  const [over, setOver] = useState(false)
  const ids = { text: useId(), file: useId(), status: useId() }

  async function importText(t: string): Promise<void> {
    setOutcome({ kind: 'working' })
    const read = readReceipt(t, claimExists)
    if (!read.ok) {
      setOutcome({ kind: 'rejected', problems: read.problems })
      return
    }
    const imp = read.imported
    if (store === null || store === undefined) {
      setOutcome({ kind: 'shown', imported: imp, why: 'This browser is not keeping a practice record, so the receipt is shown and not kept.' })
      return
    }
    try {
      const fresh = await keepReceipt(store, { sha256: imp.sha256, path: imp.path, text: t, provenance: provenanceOf(imp.receipt), data: { ...importData(imp) } })
      setOutcome({ kind: 'kept', imported: imp, fresh })
      setText('') // kept: the box is ready for the next receipt
    } catch (e) {
      setOutcome({ kind: 'shown', imported: imp, why: `The receipt could not be kept (${e instanceof Error ? e.message : String(e)}); it is shown only.` })
    }
  }

  async function importFile(file: File | undefined): Promise<void> {
    if (file === undefined) return
    if (file.size > RECEIPT_MAX_BYTES) {
      setOutcome({ kind: 'rejected', problems: [`${file.name} is ${file.size.toLocaleString('en')} bytes; a receipt is read up to ${RECEIPT_MAX_BYTES.toLocaleString('en')}.`] })
      return
    }
    const t = await file.text()
    setText(t)
    await importText(t)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setOver(false)
    void importFile(e.dataTransfer.files[0])
  }

  return (
    <div className="rimp">
      <div
        className="rimp-plate"
        data-over={over ? 'true' : undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <p className="rimp-strip">
          <span className="rimp-strip-word">Import a receipt</span>
          <span className="rimp-strip-path">receipts/LAB-n.k/*.json</span>
        </p>
        <div className="rimp-body">
          <div className="rimp-file">
            <label htmlFor={ids.file} className="rimp-label">
              Choose the file, or drop it here
            </label>
            <input
              id={ids.file}
              type="file"
              accept="application/json,.json"
              className="rimp-file-input"
              onChange={(e) => {
                void importFile(e.currentTarget.files?.[0])
                e.currentTarget.value = ''
              }}
            />
          </div>
          <div className="rimp-paste">
            <label htmlFor={ids.text} className="rimp-label">
              Or paste its text
            </label>
            <textarea
              id={ids.text}
              className="rimp-text"
              rows={6}
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder={'{ "schema": "statespace/receipt@1", … }'}
            />
            <button type="button" className="rimp-go" disabled={text.trim() === '' || outcome.kind === 'working'} onClick={() => void importText(text)}>
              Import the pasted receipt
            </button>
          </div>
        </div>
        <p className="rimp-caption">
          The tab checks the file against <code>receipt@1</code>, reads every verdict line again with its own parsers, and derives the stamps. It
          keeps one import event and a read-only copy of the file; the receipt itself stays in your repository, and nothing leaves this
          device.
        </p>
      </div>

      <div id={ids.status} className="rimp-status" role="status" aria-live="polite">
        {outcome.kind === 'working' ? <p>Reading the receipt…</p> : null}
        {outcome.kind === 'rejected' ? (
          <div className="rimp-rejected">
            <p>
              <strong>Not imported.</strong> The tab could not accept this receipt, and kept nothing:
            </p>
            <ul>
              {outcome.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {outcome.kind === 'kept' ? (
          <p>
            <strong>Imported {outcome.imported.receipt.stage}.</strong>{' '}
            {outcome.fresh ? 'Its checks and claim cards are below and on the lab and claims pages.' : 'This exact receipt was imported before; its copy is refreshed.'}
          </p>
        ) : null}
        {outcome.kind === 'shown' ? <p>{outcome.why}</p> : null}
      </div>

      {outcome.kind === 'kept' || outcome.kind === 'shown' ? <ReceiptView imported={outcome.imported} checkLabel={checkLabel} /> : null}
    </div>
  )
}
