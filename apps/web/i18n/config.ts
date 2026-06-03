export const locales = [
  'en',
  'de',
  'pl',
  'es',
  'fr',
  'it',
  'pt',
  'nl',
  'ru',
  'ja',
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';
