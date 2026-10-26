// correct: the bus client hands the fragment over as the raw string it is, and the instrument origin's `fragment` engine
// parses it (ARCHITECTURE.md sections 2 and 5.4)
export function handOverFragment(port: MessagePort, id: string): void {
  const input = location.hash.slice(1)
  port.postMessage({ t: 'run', id, req: { engine: 'fragment', input } })
}
