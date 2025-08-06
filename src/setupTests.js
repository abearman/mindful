import '@testing-library/jest-dom';

let consoleErrorSpy;

beforeAll(() => {
  // Create a spy on console.error
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Restore the original console.error function
  consoleErrorSpy.mockRestore();
});
