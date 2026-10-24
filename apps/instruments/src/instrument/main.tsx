import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// SCR-instrument (spine section 10.1): the importer for receipts and bundles, shown on the instrument origin's
// own page. Parsing and rendering arrive with the receipt task (W1); this scaffold renders a placeholder.
function InstrumentPage() {
  return (
    <main>
      <h1>Instrument page</h1>
      <p>Scaffold build: nothing to import yet.</p>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('instrument.html lost its #root element')
createRoot(root).render(
  <StrictMode>
    <InstrumentPage />
  </StrictMode>,
)
