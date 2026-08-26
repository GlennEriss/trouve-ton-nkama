import '@testing-library/jest-dom'

// jsdom n'implémente ni ResizeObserver ni Element.hasPointerCapture/scrollIntoView, utilisés
// par les primitives Radix UI (Checkbox, Select...) dès qu'un composant réel (non mocké) est
// monté dans un test. Sans ce polyfill, tout rendu réel d'un Checkbox/Select Radix jette une
// ReferenceError au montage — indépendant de la logique testée.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {}
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}
