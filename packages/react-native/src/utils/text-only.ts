import { ConversationConfig } from "../types";

// Note: This function is copied from the client package (see BaseConversation.ts)
export function isTextOnly(options: ConversationConfig): boolean | undefined {
  const { textOnly: textOnlyOverride } = options.overrides?.conversation ?? {};
  const { textOnly } = options;
  if (typeof textOnly === "boolean") {
    if (
      typeof textOnlyOverride === "boolean" &&
      textOnly !== textOnlyOverride
    ) {
      console.warn(
        `Conflicting textOnly options provided: ${textOnly} via options.textOnly (will be used) and ${textOnlyOverride} via options.overrides.conversation.textOnly (will be ignored)`
      );
    }
    return textOnly;
  } else if (typeof textOnlyOverride === "boolean") {
    return textOnlyOverride;
  } else {
    return undefined;
  }
}
