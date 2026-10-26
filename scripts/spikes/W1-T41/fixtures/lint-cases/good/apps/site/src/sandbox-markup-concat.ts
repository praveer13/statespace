// iframe markup built with +, carrying exactly the sandbox of ARCHITECTURE.md section 5.3, once written out and once from a constant
const SANDBOX = 'allow-scripts allow-same-origin'
export function mount(host: HTMLElement, src: string): void {
  host.innerHTML = '<iframe sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" hidden src="' + encodeURI(src) + '" title="statespace instruments"></iframe>'
}
export function mountAgain(host: HTMLElement, src: string): void {
  host.insertAdjacentHTML('beforeend', '<iframe sandbox="' + SANDBOX + '" src="' + encodeURI(src) + '" title="statespace instruments"></iframe>')
}
