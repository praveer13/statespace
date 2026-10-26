// reading is fine, and so is the word in a comment or a string: document.cookie = 'x' is not code here
export function assertNoCookies(): boolean {
  const note = 'the main origin sets no cookie: document.cookie = ""'
  return document.cookie === '' && note.length > 0
}
