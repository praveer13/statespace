// planted: a router's hash goes into the DOM as markup
import { useLocation } from 'react-router'
export function Banner() {
  const { hash } = useLocation()
  const el = document.getElementById('banner')
  if (el) el.innerHTML = hash
  return null
}
