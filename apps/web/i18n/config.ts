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

// Maps each app locale to a valid BCP-47 / OpenGraph `language_TERRITORY`
// code. Avoids naive `${locale}_${locale.toUpperCase()}` which produces
// invalid codes like `ja_JA` or `en_EN`.
export const ogLocales: Record<Locale, string> = {
  en: 'en_US',
  de: 'de_DE',
  pl: 'pl_PL',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  pt: 'pt_PT',
  nl: 'nl_NL',
  ru: 'ru_RU',
  ja: 'ja_JP',
};
