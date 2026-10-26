// planted: an instrument frame with no sandbox attribute
export function Frame({ src }: { src: string }) {
  return <iframe src={src} title="statespace instruments" hidden referrerPolicy="no-referrer" />
}
