// planted: the attribute is set and then taken off again before the frame goes in the page
export function mount(host: HTMLElement, src: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  frame.src = src
  frame.removeAttribute('sandbox')
  host.append(frame)
  return frame
}
