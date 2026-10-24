// Apps are not pure: the page, storage and the network are theirs.
export const title = (): string => document.title
export const load = (): Promise<Response> => fetch('/x')
