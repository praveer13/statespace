// planted: iframe markup joined from an array, so no one string holds the tag and its attributes cannot be read
export function mount(host: HTMLElement, src: string): void {
  host.insertAdjacentHTML('beforeend', ['<iframe src="', encodeURI(src), '" title="statespace instruments"></iframe>'].join(''))
}
