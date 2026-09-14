import '@testing-library/jest-dom/vitest'

/**
 * jsdom does not implement the modal parts of <dialog>.
 *
 * `showModal`, `close` and the `open` property are missing, so any component
 * built on the native element throws the moment it is opened in a test. That
 * is a gap in the test environment, not in the app: real browsers implement
 * all of it, and the Playwright pass exercises the genuine element including
 * focus trapping and Escape.
 *
 * The shim below is deliberately minimal -- it makes `open` reflect reality
 * and fires the `close` event the component listens for, and nothing else. It
 * does NOT simulate focus trapping or inertness, so tests must not be written
 * as if it does.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }

  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true
  }

  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    this.open = false
    if (returnValue !== undefined) this.returnValue = returnValue
    this.dispatchEvent(new Event('close'))
  }
}
