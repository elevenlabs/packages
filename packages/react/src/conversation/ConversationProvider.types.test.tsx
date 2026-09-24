import { describe, it } from "vitest";
import { ConversationProvider } from "./ConversationProvider.js";
import { useConversation } from "./useConversation.js";
import type { ConversationControlsValue } from "./ConversationControls.js";
import type { HookOptions } from "./types.js";

declare const AbortController: {
  new (): {
    readonly signal: NonNullable<HookOptions["signal"]>;
    abort(reason?: unknown): void;
  };
};

describe("ConversationProvider types", () => {
  it("accepts per-session signal and rejects provider signal", () => {
    const signal = new AbortController().signal;
    const startSession: ConversationControlsValue["startSession"] = () => {};
    startSession({ signal });

    void (
      <ConversationProvider
        // @ts-expect-error signal is not a ConversationProvider prop
        signal={signal}
      >
        {null}
      </ConversationProvider>
    );
  });

  it("rejects a hook-level useConversation signal", () => {
    const signal = new AbortController().signal;

    // Never called: hooks need a provider, and this only has to type-check.
    void (() =>
      useConversation({
        // @ts-expect-error signal is passed to startSession(), not the hook
        signal,
      }));
  });
});
