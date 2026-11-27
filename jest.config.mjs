import nextJest from "next/jest.js";

// next/jest compiles TypeScript with Next's own SWC setup, so tests see the code as the app does.
const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  testEnvironment: "node",
  // Logic tests (*.test.ts) run in Node; component tests (*.test.tsx) declare a jsdom environment.
  testMatch: ["<rootDir>/tests/**/*.test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/tests/support/setupDom.ts"],
  moduleNameMapper: {
    // `server-only` throws outside a React Server build; in tests it's just a marker.
    "^server-only$": "<rootDir>/tests/support/empty.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
});
