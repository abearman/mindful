// This file is only imported by the app bundle (Vite).
// Vite replaces import.meta.env at build/dev time.
export const PH_KEY: string = import.meta.env.VITE_POSTHOG_KEY as string;
export const PH_HOST: string = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://app.posthog.com';