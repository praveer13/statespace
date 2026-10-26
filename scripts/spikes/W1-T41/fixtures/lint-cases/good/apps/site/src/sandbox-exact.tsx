// the frame of ARCHITECTURE.md section 5.3, attributes in another order
export function Frame({ src }: { src: string }) {
  return <iframe src={src} title="statespace instruments" hidden referrerPolicy="no-referrer" sandbox="allow-same-origin allow-scripts" />
}
