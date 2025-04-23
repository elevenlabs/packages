import { DefaultTextContents } from "./config";

type SnakeToKebab<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}-${SnakeToKebab<Tail>}`
  : S;

function snakeToKebab<S extends string>(str: S): SnakeToKebab<S> {
  return str.replace(/_/g, "-") as SnakeToKebab<S>;
}

const MainAttributeList = [
  "variant",
  "expandable",
  "override-config",
  "avatar-image-url",
  "avatar-orb-color-1",
  "avatar-orb-color-2",
  "agent-id",
  "signed-url",
  "terms-key",
  "server-location",
  "language",
  "dynamic-variables",
  "show-avatar-when-collapsed",
  "override-prompt",
  "override-first-message",
  "override-language",
  "override-voice-id",
] as const;

export const TextKeyList = Object.keys(
  DefaultTextContents
) as (keyof typeof DefaultTextContents)[];

export const TextAttributeList = TextKeyList.map(snakeToKebab) as SnakeToKebab<
  keyof typeof DefaultTextContents
>[];

export const CustomAttributeList = [...MainAttributeList, ...TextAttributeList];

export type CustomAttributes = {
  [key in (typeof CustomAttributeList)[number]]?: string;
};
