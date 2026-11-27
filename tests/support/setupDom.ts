// Runs before every test. Component tests opt into a browser-like environment with
// `@jest-environment jsdom`; plain logic tests run in Node and skip the browser bits below.
import "@testing-library/jest-dom";

if (typeof window !== "undefined") {
  // Animations finish instantly in tests, so nothing waits on a spring or a fade.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MotionGlobalConfig } = require("framer-motion") as typeof import("framer-motion");
  MotionGlobalConfig.skipAnimations = true;

  // jsdom doesn't implement these; components only need them to exist.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  window.scrollTo ??= (() => {}) as typeof window.scrollTo;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
