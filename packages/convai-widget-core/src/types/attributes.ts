export function parseBoolAttribute(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }

  const lowerCaseValue = value.toLowerCase();
  if (["true", "yes", "on", "1"].includes(lowerCaseValue)) {
    return true;
  }
  if (
    ["false", "no", "off", "0", "null", "undefined"].includes(lowerCaseValue)
  ) {
    return false;
  }

  return null;
}

export const CustomAttributeList = [
  "variant",
  "placement",
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
  "mic-muting",
  "transcript",
  "text-input",
  "text-contents",
] as const;

export type CustomAttributes = {
  [key in (typeof CustomAttributeList)[number]]?: string;
};
