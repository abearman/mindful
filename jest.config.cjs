// CommonJS config works even with "type": "module" in package.json
module.exports = {
  // Run two test projects side-by-side: frontend (jsdom) and backend (node)
  projects: [
    // --- Frontend (your existing config) ---
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
      moduleNameMapper: {
        // mock styles FIRST so alias doesn't swallow CSS
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // resolve Vite-style alias "@/..." -> "<rootDir>/src/..."
        '^@/(.*)$': '<rootDir>/src/$1',
        '^~/(.*)$': '<rootDir>/$1', // Project root alias
      },
      transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
      },
      moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
      testMatch: ['<rootDir>/src/**/*.test.[jt]s?(x)'],
      clearMocks: true,
    },

    // --- Backend (handlers: node env + AWS mocks) ---
    {
      displayName: 'backend',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/src/__tests__/backend/jest.setup.cjs'],
      moduleNameMapper: {
        '^\\$amplify/env/.*$': '<rootDir>/src/__tests__/mocks/amplify-env.cjs',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^~/(.*)$': '<rootDir>/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
      },
      moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
      // Allow tests AND source under amplify/
      testMatch: [
        '<rootDir>/src/__tests__/backend/**/*.int.test.[jt]s?(x)',
        '<rootDir>/src/__tests__/backend/**/*.test.[jt]s?(x)',
      ],
      // 👇 Tell Jest to transform TypeScript in amplify/ too
      transformIgnorePatterns: ['/node_modules/(?!(aws-sdk-client-mock|sinon)/)'],
      clearMocks: true,
    } 
  ],
};
