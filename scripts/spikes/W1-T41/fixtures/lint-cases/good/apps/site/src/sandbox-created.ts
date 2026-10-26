const SANDBOX = 'allow-scripts allow-same-origin'
export function mount(host: HTMLElement, src: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', SANDBOX)
  frame.src = src
  frame.hidden = true
  host.appendChild(frame)
  return frame
}
