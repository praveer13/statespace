// planted: a frame already in the page loses a token through its DOMTokenList
export function loosen(frame: HTMLIFrameElement): void {
  frame.sandbox.remove('allow-same-origin')
}
