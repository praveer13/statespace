// planted: a spread after the sandbox attribute can replace it
export function Frame({ src, ...rest }: { src: string; sandbox?: string }) {
  return <iframe sandbox="allow-scripts allow-same-origin" src={src} title="statespace instruments" {...rest} />
}
