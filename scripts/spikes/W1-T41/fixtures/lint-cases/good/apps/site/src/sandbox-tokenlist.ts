// the same two tokens through the DOMTokenList, before the frame is inserted
export function mount(host: HTMLElement, src: string): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  frame.sandbox.add('allow-scripts')
  frame.sandbox.add('allow-same-origin')
  frame.src = src
  host.append(frame)
  return frame
}
