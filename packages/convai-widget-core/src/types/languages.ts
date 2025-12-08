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
  af: { name: "Afrikaans", flagCode: "za", languageCode: "af" },
  hy: { name: "Հայերեն", flagCode: "am", languageCode: "hy" },
  as: { name: "অসমীয়া", flagCode: "in", languageCode: "as" },
  az: { name: "Azərbaycan", flagCode: "az", languageCode: "az" },
  be: { name: "Беларуская", flagCode: "by", languageCode: "be" },
  bn: { name: "বাংলা", flagCode: "in", languageCode: "bn" },
  bs: { name: "Bosanski", flagCode: "ba", languageCode: "bs" },
  ca: { name: "Català", flagCode: "es-ct", languageCode: "ca" },
  et: { name: "Eesti", flagCode: "ee", languageCode: "et" },
  gl: { name: "Galego", flagCode: "es-ga", languageCode: "gl" },
  ka: { name: "ქართული", flagCode: "ge", languageCode: "ka" },
  gu: { name: "ગુજરાતી", flagCode: "in", languageCode: "gu" },
  ha: { name: "Hausa", flagCode: "ng", languageCode: "ha" },
  he: { name: "עברית", flagCode: "il", languageCode: "he" },
  is: { name: "Íslenska", flagCode: "is", languageCode: "is" },
  ga: { name: "Gaeilge", flagCode: "ie", languageCode: "ga" },
  jv: { name: "Basa Jawa", flagCode: "id", languageCode: "jv" },
  kn: { name: "ಕನ್ನಡ", flagCode: "in", languageCode: "kn" },
  kk: { name: "Қазақша", flagCode: "kz", languageCode: "kk" },
  ky: { name: "Кыргызча", flagCode: "kg", languageCode: "ky" },
  lv: { name: "Latviešu", flagCode: "lv", languageCode: "lv" },
  lt: { name: "Lietuvių", flagCode: "lt", languageCode: "lt" },
  lb: { name: "Lëtzebuergesch", flagCode: "lu", languageCode: "lb" },
  mk: { name: "Македонски", flagCode: "mk", languageCode: "mk" },
  ml: { name: "മലയാളം", flagCode: "in", languageCode: "ml" },
  mr: { name: "मराठी", flagCode: "in", languageCode: "mr" },
  ne: { name: "नेपाली", flagCode: "np", languageCode: "ne" },
  ps: { name: "پښتو", flagCode: "af", languageCode: "ps" },
  fa: { name: "فارسی", flagCode: "ir", languageCode: "fa" },
  pa: { name: "ਪੰਜਾਬੀ", flagCode: "in", languageCode: "pa" },
  sr: { name: "Српски", flagCode: "rs", languageCode: "sr" },
  sd: { name: "سنڌي", flagCode: "in", languageCode: "sd" },
  sl: { name: "Slovenščina", flagCode: "si", languageCode: "sl" },
  so: { name: "Soomaali", flagCode: "so", languageCode: "so" },
  sw: { name: "Kiswahili", flagCode: "ke", languageCode: "sw" },
  te: { name: "తెలుగు", flagCode: "in", languageCode: "te" },
  th: { name: "ไทย", flagCode: "th", languageCode: "th" },
  ur: { name: "اردو", flagCode: "pk", languageCode: "ur" },
  cy: { name: "Cymraeg", flagCode: "gb-wls", languageCode: "cy" },
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
