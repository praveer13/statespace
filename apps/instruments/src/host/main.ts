// The bus host (ARCHITECTURE.md section 5): origin checks, the one MessagePort after an origin-checked
// handshake, the supervisor, the size caps and schema validation arrive with the bus task (W1). This
// scaffold only proves that the page builds, loads under its meta CSP, and holds nothing.
const status = document.getElementById('status')
if (status) status.textContent = 'Scaffold build: no bus and no engines yet.'
