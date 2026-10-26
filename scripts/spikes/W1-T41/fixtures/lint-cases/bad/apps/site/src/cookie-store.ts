// planted: the Cookie Store API writes a cookie too
export async function remember(): Promise<void> {
  await (globalThis as unknown as { cookieStore: { set(name: string, value: string): Promise<void> } }).cookieStore.set('seen', '1')
}
