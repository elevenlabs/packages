import type { Language } from "@11labs/client";

export interface LanguageInfo {
  name: string;
  flagCode: string;
  languageCode: Language;
}

export const Languages = {
  en: { name: "English", flagCode: "us", languageCode: "en" },
  zh: { name: "Chinese", flagCode: "cn", languageCode: "zh" },
  es: { name: "Spanish", flagCode: "es", languageCode: "es" },
  hi: { name: "Hindi", flagCode: "in", languageCode: "hi" },
  pt: { name: "Portuguese (Portugal)", flagCode: "pt", languageCode: "pt" },
  "pt-br": {
    name: "Portuguese (Brazil)",
    flagCode: "br",
    languageCode: "pt-br",
  },
  fr: { name: "French", flagCode: "fr", languageCode: "fr" },
  de: { name: "German", flagCode: "de", languageCode: "de" },
  ja: { name: "Japanese", flagCode: "jp", languageCode: "ja" },
  ar: { name: "Arabic", flagCode: "ae", languageCode: "ar" },
  ru: { name: "Russian", flagCode: "ru", languageCode: "ru" },
  ko: { name: "Korean", flagCode: "kr", languageCode: "ko" },
  id: { name: "Indonesian", flagCode: "id", languageCode: "id" },
  it: { name: "Italian", flagCode: "it", languageCode: "it" },
  nl: { name: "Dutch", flagCode: "nl", languageCode: "nl" },
  tr: { name: "Turkish", flagCode: "tr", languageCode: "tr" },
  pl: { name: "Polish", flagCode: "pl", languageCode: "pl" },
  sv: { name: "Swedish", flagCode: "se", languageCode: "sv" },
  fil: { name: "Filipino", flagCode: "ph", languageCode: "fi" },
  ms: { name: "Malay", flagCode: "my", languageCode: "ms" },
  ro: { name: "Romanian", flagCode: "ro", languageCode: "ro" },
  uk: { name: "Ukrainian", flagCode: "ua", languageCode: "uk" },
  el: { name: "Greek", flagCode: "gr", languageCode: "el" },
  cs: { name: "Czech", flagCode: "cz", languageCode: "cs" },
  da: { name: "Danish", flagCode: "dk", languageCode: "da" },
  fi: { name: "Finnish", flagCode: "fi", languageCode: "fi" },
  bg: { name: "Bulgarian", flagCode: "bg", languageCode: "bg" },
  hr: { name: "Croatian", flagCode: "hr", languageCode: "hr" },
  sk: { name: "Slovak", flagCode: "sk", languageCode: "sk" },
  ta: { name: "Tamil", flagCode: "in", languageCode: "ta" },
  hu: { name: "Hungarian", flagCode: "hu", languageCode: "hu" },
  no: { name: "Norwegian", flagCode: "no", languageCode: "no" },
  vi: { name: "Vietnamese", flagCode: "vn", languageCode: "vi" },
} as const satisfies {
  [key: string]: {
    name: string;
    flagCode: string;
    languageCode: Language;
  };
};

export function isValidLanguage(value?: string): value is Language {
  return Object.keys(Languages).includes(value ?? "");
}
