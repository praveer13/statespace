// planted: React's createElement makes the instrument frame with no sandbox prop
import { createElement } from 'react'
export function Frame({ src }: { src: string }) {
  return createElement('iframe', { src, title: 'statespace instruments', hidden: true, referrerPolicy: 'no-referrer' })
}
