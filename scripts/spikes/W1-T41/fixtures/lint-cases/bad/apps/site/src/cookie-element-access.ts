// planted: the same write through an element access and an alias
const doc = globalThis.document
export function remember(): void {
  doc['cookie'] = 'seen=1; domain=.example.test'
}
