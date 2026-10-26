// planted for GATE-bundle's cookie lint: the main origin assigns document.cookie
export function rememberTheme(theme: 'light' | 'night'): void {
  document.cookie = `theme=${theme}; path=/; max-age=31536000`
}
