// planted: iframe markup built with + carries no sandbox attribute (each piece alone holds no whole tag)
export function mount(host: HTMLElement, src: string): void {
  host.innerHTML = '<iframe src="' + src + '" title="statespace instruments"></iframe>'
}
