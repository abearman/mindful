import '@testing-library/jest-dom';

let consoleErrorSpy;

beforeAll(() => {
  // Create a spy on console.error
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  // Minimal ResizeObserver polyfill for JSDOM
  class ResizeObserver {
    constructor(callback) { this._cb = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = global.ResizeObserver || ResizeObserver;

  // (Optional) no-op raf in case your CI lacks it
  global.requestAnimationFrame =
    global.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
});

afterAll(() => {
  // Restore the original console.error function
  consoleErrorSpy.mockRestore();
});
