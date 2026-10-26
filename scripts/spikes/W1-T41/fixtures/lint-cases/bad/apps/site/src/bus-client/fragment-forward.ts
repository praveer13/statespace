// planted: the bus client decodes a fragment before it hands it over. A fragment goes to the instrument origin unparsed
// (ARCHITECTURE.md section 2, item 4), so the bus client is held to the rule like every other file in apps/site
export function forwardFragment(port: MessagePort, id: string): void {
  const payload = JSON.parse(atob(location.hash.slice(1)))
  port.postMessage({ t: 'run', id, req: { engine: 'fragment', input: payload } })
}
