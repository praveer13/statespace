// planted: a frame made by createElement and never given a sandbox attribute
export function mount(host: HTMLElement, src: string): void {
  const frame = document.createElement('iframe')
  frame.src = src
  frame.hidden = true
  host.append(frame)
}
