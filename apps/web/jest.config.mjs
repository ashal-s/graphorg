import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Playwright specs live under tests/e2e and must not run in Jest.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/e2e/"],
};

export default createJestConfig(config);
