// CommonJS config works even with "type": "module" in package.json
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // keep if the setup file lives in src/
  moduleNameMapper: {
    // mock styles FIRST so alias doesn't swallow CSS
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // resolve Vite-style alias "@/..." -> "<rootDir>/src/..."
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
};
