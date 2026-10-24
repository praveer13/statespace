import { Outlet } from 'react-router'

export function App() {
  return (
    <div className="shell">
      <header className="shell-head">
        <span className="mark">statespace</span>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}
