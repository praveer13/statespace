// None of this is a violation. Comments that mention window, fetch or indexedDB never trip the lint.
const history: string[] = [] // a local name is not the global of the same name
export function note(entry: string): number {
  history.push(entry)
  return history.length
}
export const label = 'the window and the document' // strings never trip it
export const table = { window: 1, fetch: 2, localStorage: 3 } // property keys
export class Port {
  location = 'here' // a member
  fetch(): number {
    return 1
  }
}
export function takesWindow(window: { id: number }): number {
  return window.id // a parameter shadows the global
}
export type Handle = Window | null // a type position
export const reach = globalThis.Math // the global object itself is fine
