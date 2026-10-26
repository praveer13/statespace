// planted: the frame is put in the page before its sandbox attribute is set
export function mount(host: HTMLElement, src: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.src = src
  host.appendChild(frame)
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  return frame
}
