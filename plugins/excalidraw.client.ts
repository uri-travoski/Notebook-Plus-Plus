// Tell Excalidraw to load its fonts from our own origin (no CDN). Must run before
// Excalidraw is imported — a client plugin runs at app init, before any page mounts.
export default defineNuxtPlugin(() => {
  // @ts-expect-error injected global read by @excalidraw/excalidraw
  window.EXCALIDRAW_ASSET_PATH = '/'
})
