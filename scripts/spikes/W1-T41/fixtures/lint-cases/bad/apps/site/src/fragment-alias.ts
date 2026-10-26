// planted: the payload is read into a name first, then decoded
export function readDuel(): string {
  const raw = location.hash.slice(1)
  const text = raw.replace(/-/g, '+')
  return decodeURIComponent(text)
}
