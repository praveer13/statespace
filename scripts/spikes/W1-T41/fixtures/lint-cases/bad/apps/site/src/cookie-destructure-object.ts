// planted: an object destructuring assignment whose target is document.cookie
export function remember(saved: { value: string }): void {
  ;({ value: document.cookie } = saved)
}
