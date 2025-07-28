import type { Language } from "@elevenlabs/client";

export interface LanguageInfo {
  name: string;
  flagCode: string;
  languageCode: Language;
}

export const Languages = {
  en: { name: "English", flagCode: "us", languageCode: "en" },
  zh: { name: "中文", flagCode: "cn", languageCode: "zh" },
  es: { name: "Español", flagCode: "es", languageCode: "es" },
  hi: { name: "हिन्दी", flagCode: "in", languageCode: "hi" },
  pt: { name: "Português (Portugal)", flagCode: "pt", languageCode: "pt" },
  "pt-br": {
    name: "Português (Brasil)",
    flagCode: "br",
    languageCode: "pt-br",
  },
  fr: { name: "Français", flagCode: "fr", languageCode: "fr" },
  de: { name: "Deutsch", flagCode: "de", languageCode: "de" },
  ja: { name: "日本語", flagCode: "jp", languageCode: "ja" },
  ar: { name: "العربية", flagCode: "ae", languageCode: "ar" },
  ru: { name: "Русский", flagCode: "ru", languageCode: "ru" },
  ko: { name: "한국어", flagCode: "kr", languageCode: "ko" },
  id: { name: "Bahasa Indonesia", flagCode: "id", languageCode: "id" },
  it: { name: "Italiano", flagCode: "it", languageCode: "it" },
  nl: { name: "Nederlands", flagCode: "nl", languageCode: "nl" },
  tr: { name: "Türkçe", flagCode: "tr", languageCode: "tr" },
  pl: { name: "Polski", flagCode: "pl", languageCode: "pl" },
  sv: { name: "Svenska", flagCode: "se", languageCode: "sv" },
  ms: { name: "Bahasa Melayu", flagCode: "my", languageCode: "ms" },
  ro: { name: "Română", flagCode: "ro", languageCode: "ro" },
  uk: { name: "Українська", flagCode: "ua", languageCode: "uk" },
  el: { name: "Ελληνικά", flagCode: "gr", languageCode: "el" },
  cs: { name: "Čeština", flagCode: "cz", languageCode: "cs" },
  da: { name: "Dansk", flagCode: "dk", languageCode: "da" },
  fi: { name: "Suomi", flagCode: "fi", languageCode: "fi" },
  bg: { name: "Български", flagCode: "bg", languageCode: "bg" },
  hr: { name: "Hrvatski", flagCode: "hr", languageCode: "hr" },
  sk: { name: "Slovenčina", flagCode: "sk", languageCode: "sk" },
  ta: { name: "தமிழ்", flagCode: "in", languageCode: "ta" },
  hu: { name: "Magyar", flagCode: "hu", languageCode: "hu" },
  no: { name: "Norsk", flagCode: "no", languageCode: "no" },
  vi: { name: "Tiếng Việt", flagCode: "vn", languageCode: "vi" },
  tl: { name: "Filipino", flagCode: "ph", languageCode: "tl" },
} as const satisfies {
  [K in Language]: {
    name: string;
    flagCode: string;
    languageCode: Language;
  };
};

export function isValidLanguage(value?: string): value is Language {
  return Object.keys(Languages).includes(value ?? "");
}
