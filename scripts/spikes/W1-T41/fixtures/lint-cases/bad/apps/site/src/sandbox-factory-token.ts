// planted: React.createElement with one of the two tokens
import React from 'react'
export const frame = (src: string) => React.createElement('iframe', { src, title: 'statespace instruments', sandbox: 'allow-scripts' })
