import { useEffect, useRef } from 'react'

// Sends keyboard focus to the current stage's element marked data-stage-focus, or else the page's first
// heading, unless focus is still on something that exists.
function focusStage(preventScroll = false): void {
  const active = document.activeElement
  if (active && active !== document.body && active.isConnected) return
  const el =
    document.querySelector<HTMLElement>('main [data-stage-focus]') ??
    document.querySelector<HTMLElement>('main h1, main h2')
  if (!el) return
  if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.tabIndex = -1
  el.focus({ preventScroll })
}

// For a button that removes itself (Dismiss, Got it, 5 more minutes, a prompt answer): once React has
// re-rendered, put focus somewhere sensible instead of leaving it on the page body.
// It does not scroll: a banner dismissed far down the page must not jump to the top.
export function refocusSoon(): void {
  setTimeout(() => focusStage(true), 0)
}

// When a page swaps one stage for another (Begin, Stop, Done, Start break...), the button that was pressed
// goes away and keyboard focus falls back to the page body. This moves it into the new stage. It does
// nothing on first render, where the layout already focuses the page heading.
export function useStageFocus(stage: string): void {
  const first = useRef(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the stage changes only
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    focusStage()
  }, [stage])
}
