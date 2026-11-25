// next.config.ts aliases browser.ts here when NEXT_PUBLIC_API_MOCKS is off, so builds never resolve msw
export const startMocks = () => Promise.reject(new Error('API mocks are off: start the app with npm run dev:mocks'));
