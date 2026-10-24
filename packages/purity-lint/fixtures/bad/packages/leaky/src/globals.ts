// Planted violations: each marked line must be reported (test/purity.test.mjs).
export function leak(): void {
  document.title = 'x' // PURE-GLOBAL
  localStorage.setItem('k', 'v') // PURE-GLOBAL
  void indexedDB.open('db') // PURE-GLOBAL
  void fetch('/x') // PURE-GLOBAL
  void new XMLHttpRequest() // PURE-GLOBAL
  void navigator.userAgent // PURE-GLOBAL
  void process.env // PURE-GLOBAL
  void Buffer.from('x') // PURE-GLOBAL
  const w = new Worker('w.js') // PURE-GLOBAL
  void w
  window.alert('x') // PURE-GLOBALTHIS
}
