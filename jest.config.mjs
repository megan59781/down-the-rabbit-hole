import nextJest from "next/jest.js";

// next/jest compiles TypeScript with Next's own SWC setup, so tests see the code as the app does.
const createJestConfig = nextJest({ dir: "./" });

export default createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  moduleNameMapper: {
    // `server-only` throws outside a React Server build; in tests it's just a marker.
    "^server-only$": "<rootDir>/tests/support/empty.js",
    "^@/(.*)$": "<rootDir>/$1",
  },
});
