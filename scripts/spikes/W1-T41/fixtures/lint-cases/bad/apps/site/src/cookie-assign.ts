// planted: the main origin assigns document.cookie
export function remember(theme: string): void {
  document.cookie = `theme=${theme}; path=/`
}
