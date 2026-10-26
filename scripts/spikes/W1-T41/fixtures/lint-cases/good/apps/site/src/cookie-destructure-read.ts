// reads of document.cookie inside destructuring are reads, not writes
export function firstCookie(): string {
  let first = ''
  ;[first] = [document.cookie]
  const [head] = document.cookie.split(';')
  const { cookie } = document
  return first || head || cookie
}
