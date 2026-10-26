// planted for GATE-bundle's sandbox lint: the instrument frame without its sandbox attribute
export function InstrumentFrame({ src }: { src: string }) {
  return <iframe src={src} title="statespace instruments" hidden referrerPolicy="no-referrer" />
}
