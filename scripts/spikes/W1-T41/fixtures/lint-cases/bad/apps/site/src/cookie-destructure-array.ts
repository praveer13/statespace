// planted: an array destructuring assignment whose target is document.cookie
export function remember(theme: string): void {
  ;[document.cookie] = [`theme=${theme}; path=/`]
}
