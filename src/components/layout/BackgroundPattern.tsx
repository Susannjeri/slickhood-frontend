// Shared decorative backdrop — a fine dot-grid, faded toward the edges via a
// radial mask so it reads as depth rather than a flat repeating texture.
// Used behind every full-page surface (dashboard shell + the centered-card
// auth pages) so the app shares one consistent "quiet grid" background
// language instead of each surface inventing its own.
//
// Render this as a child of a `relative` element whose box grows with its
// content (not one clipped by its own `overflow-y-auto`) — otherwise
// `inset-0` sizes to the scroll viewport instead of the full scrollable
// height, and the pattern stops partway down a tall page.
//
// Hidden for now (renders nothing) — pending diagnosis of why the pattern
// wasn't visible in the browser. Layout call sites are left in place so
// re-enabling later is a one-line change here, not a re-thread everywhere.
export function BackgroundPattern() {
  return null;
}
