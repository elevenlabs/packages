export function parseBoolAttribute(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
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
  "override-text-only",
  "mic-muting",
  "transcript",
  "text-input",
  "text-contents",
  "default-expanded",
  "always-expanded",
  "user-id",
] as const;

export type CustomAttributes = {
  [key in (typeof CustomAttributeList)[number]]?: string;
};
