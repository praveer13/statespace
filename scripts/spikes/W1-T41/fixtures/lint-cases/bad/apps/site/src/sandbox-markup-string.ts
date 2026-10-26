// planted: markup in a string that writes an iframe with no sandbox attribute into the page
export function embed(host: HTMLElement, src: string): void {
  host.insertAdjacentHTML('beforeend', `<iframe src="${src}" title="statespace instruments"></iframe>`)
}
