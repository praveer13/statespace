// element factories that give the frame exactly the two tokens; a spread before the attribute cannot replace it
import { createElement } from 'react'
import { h } from 'preact'
const SANDBOX = 'allow-scripts allow-same-origin'
export const one = (src: string) => createElement('iframe', { src, title: 'statespace instruments', sandbox: SANDBOX })
export const two = (base: Record<string, string>) => h('iframe', { ...base, sandbox: 'allow-same-origin allow-scripts' })
export const notAFrame = (src: string) => createElement('img', { src, alt: '' })
export const domFrame = (): HTMLIFrameElement => {
  const frame = document.createElement('iframe', { is: 'ss-frame' })
  frame.setAttribute('sandbox', SANDBOX)
  return frame
}
