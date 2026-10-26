// planted: a third token added through the DOMTokenList
export function mount(host: HTMLElement, src: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-popups')
  frame.src = src
  host.append(frame)
  return frame
}
