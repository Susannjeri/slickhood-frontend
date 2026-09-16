import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeToViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mediaQuery.addEventListener("change", onStoreChange)
  return () => mediaQuery.removeEventListener("change", onStoreChange)
}

function getViewportSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerViewportSnapshot() {
  return false
}

export function useIsMobile() {
  // useSyncExternalStore preserves the server snapshot for the browser's first
  // render, then publishes the real viewport after hydration. This is important
  // when a responsive consumer lives beside a deferred Suspense boundary.
  return React.useSyncExternalStore(
    subscribeToViewport,
    getViewportSnapshot,
    getServerViewportSnapshot
  )
}
