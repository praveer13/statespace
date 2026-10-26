// the control for GATE-bundle's lints: the frame of ARCHITECTURE.md section 5.3, and nothing else
export function InstrumentFrame({ src }: { src: string }) {
  return <iframe src={src} title="statespace instruments" hidden referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" />
}
