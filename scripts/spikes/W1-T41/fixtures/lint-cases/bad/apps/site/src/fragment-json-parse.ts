// planted: the main origin parses a fragment's payload
export function readDuel(): unknown {
  return JSON.parse(atob(window.location.hash.slice(1)))
}
