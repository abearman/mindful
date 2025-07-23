module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'], // Optional: for @testing-library/jest-dom
  moduleNameMapper: {
    // Handle CSS imports (and other file types)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};