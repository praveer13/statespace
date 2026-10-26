// planted: Reflect.set on the document
export function remember(): void {
  Reflect.set(document, 'cookie', 'seen=1')
}
