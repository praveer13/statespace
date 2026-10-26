// planted: a compound assignment through the window
export function remember(name: string): void {
  window.document.cookie += `${name}=1;`
}
