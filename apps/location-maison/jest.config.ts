import type { Config } from 'jest';

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next-auth$': '<rootDir>/__tests__/mocks/next-auth.ts',
  },
  testMatch: [
    "**/tests/**/*.(spec|test).[jt]s?(x)",
    "**/?(*.)+(spec|test).[tj]s?(x)"
  ],
};

export default config;