/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  // Set timeout longer for integration tests which involve network requests
  testTimeout: 30000,
  // Add setup file for environment variables, etc. if needed
  // setupFiles: ['<rootDir>/src/__tests__/setup.js'],
}; 