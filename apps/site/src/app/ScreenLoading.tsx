import { Loading } from '../components/page/states.tsx'

/** What the main column shows while a screen's own code loads on a first visit by deep link. */
export function ScreenLoading() {
  return <Loading what="this page" />
}
