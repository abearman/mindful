process.env.VITE_POSTHOG_KEY = process.env.VITE_POSTHOG_KEY || 'phc_test_key';
process.env.VITE_POSTHOG_HOST = process.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

// Optional: if your tests reference chrome.* APIs, you can add light stubs here too:
// global.chrome = { runtime: { getURL: (p) => `chrome-extension://ext/${p}` }, tabs: { create: jest.fn(), reload: jest.fn(), query: jest.fn() }, storage: { local: { set: jest.fn() } } };