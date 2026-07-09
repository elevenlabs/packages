import { signal } from "@preact/signals";
import type { Language } from "@elevenlabs/client";
import type { TextContents } from "../types/config";

type TranslationModule = { default: Partial<TextContents> };

/**
 * Per-language loaders for localized default text contents.
 *
 * Each entry is a dynamic import so the bundler emits a separate chunk per
 * language; only the language actually in use is fetched at runtime, keeping
 * the main widget bundle small. English lives in `DefaultTextContents` and is
 * always available synchronously as the ultimate fallback.
 */
const loaders: Partial<Record<Language, () => Promise<TranslationModule>>> = {
  zh: () => import("./zh"),
  es: () => import("./es"),
  hi: () => import("./hi"),
  pt: () => import("./pt"),
  "pt-br": () => import("./pt-br"),
  fr: () => import("./fr"),
  de: () => import("./de"),
  ja: () => import("./ja"),
  ar: () => import("./ar"),
  ru: () => import("./ru"),
  ko: () => import("./ko"),
  id: () => import("./id"),
  it: () => import("./it"),
  nl: () => import("./nl"),
  tr: () => import("./tr"),
  pl: () => import("./pl"),
  sv: () => import("./sv"),
  ms: () => import("./ms"),
  ro: () => import("./ro"),
  uk: () => import("./uk"),
  el: () => import("./el"),
  cs: () => import("./cs"),
  da: () => import("./da"),
  fi: () => import("./fi"),
  bg: () => import("./bg"),
  hr: () => import("./hr"),
  sk: () => import("./sk"),
  ta: () => import("./ta"),
  hu: () => import("./hu"),
  no: () => import("./no"),
  vi: () => import("./vi"),
  tl: () => import("./tl"),
  af: () => import("./af"),
  hy: () => import("./hy"),
  as: () => import("./as"),
  az: () => import("./az"),
  be: () => import("./be"),
  bn: () => import("./bn"),
  bs: () => import("./bs"),
  ca: () => import("./ca"),
  et: () => import("./et"),
  gl: () => import("./gl"),
  ka: () => import("./ka"),
  gu: () => import("./gu"),
  ha: () => import("./ha"),
  he: () => import("./he"),
  is: () => import("./is"),
  ga: () => import("./ga"),
  jv: () => import("./jv"),
  kn: () => import("./kn"),
  kk: () => import("./kk"),
  ky: () => import("./ky"),
  lv: () => import("./lv"),
  lt: () => import("./lt"),
  lb: () => import("./lb"),
  mk: () => import("./mk"),
  ml: () => import("./ml"),
  mr: () => import("./mr"),
  ne: () => import("./ne"),
  ps: () => import("./ps"),
  fa: () => import("./fa"),
  pa: () => import("./pa"),
  sr: () => import("./sr"),
  sd: () => import("./sd"),
  sl: () => import("./sl"),
  so: () => import("./so"),
  sw: () => import("./sw"),
  te: () => import("./te"),
  th: () => import("./th"),
  ur: () => import("./ur"),
  cy: () => import("./cy"),
};

export const loadedTranslations = signal<
  Partial<Record<Language, Partial<TextContents>>>
>({});

const inFlight = new Set<Language>();

export function ensureTranslationLoaded(language: Language): void {
  console.log("in translations index", loadedTranslations);

  if (loadedTranslations.peek()[language] || inFlight.has(language)) {
    return;
  }
  const load = loaders[language];
  if (!load) {
    return;
  }
  inFlight.add(language);
  load()
    .then(mod => {
      loadedTranslations.value = {
        ...loadedTranslations.value,
        [language]: mod.default,
      };
    })
    .catch(e => {
      console.error(
        `[ConversationalAI] Failed to load translations for "${language}":`,
        e
      );
    })
    .finally(() => {
      inFlight.delete(language);
    });
}
