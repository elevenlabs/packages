import { memo } from "preact/compat";
import { useSignalEffect } from "@preact/signals";
import { useShadowHost } from "../contexts/shadow-host";
import { useConversation } from "../contexts/conversation";
import { useAllowEvents } from "../contexts/widget-config";

const eventUserActivity = "elevenlabs-agent:user-activity";
const eventUserMessage = "elevenlabs-agent:user-message";
const eventContextualUpdate = "elevenlabs-agent:contextual-update";

export const EventBridge = memo(function EventBridge({ children }) {
  const { sendContextualUpdate, sendUserActivity, sendUserMessage } = useConversation();
  const shadowHost = useShadowHost();
  const allowEvents = useAllowEvents();
  
  useSignalEffect(() => {
    function handleUserActivity(event: Event): void {
      if (!isCustomEvent(event)) {
        return;
      }

      sendUserActivity();
    }

    function handleUserMessage(event: Event): void {
      if (!isCustomEventWithMessage(event)) {
        return;
      }

      sendUserMessage(event.detail.message);
    }

    function handleContextualUpdate(event: Event): void {
      if (!isCustomEventWithMessage(event)) {
        return;
      }

      sendContextualUpdate(event.detail.message);
    }

    const host = shadowHost.value;
    if (allowEvents.value) {
      host?.addEventListener(eventUserActivity, handleUserActivity);
      host?.addEventListener(eventUserMessage, handleUserMessage);
      host?.addEventListener(eventContextualUpdate, handleContextualUpdate);
    }

    return () => {
      host?.removeEventListener(eventUserActivity, handleUserActivity);
      host?.removeEventListener(eventUserMessage, handleUserMessage);
      host?.removeEventListener(eventContextualUpdate, handleContextualUpdate);
    };
  });

  return children;
});

function isCustomEvent(event: Event): event is CustomEvent {
  return "detail" in event && !!event.detail;
}

function isCustomEventWithMessage(event: Event): event is CustomEvent<{ message: string }> {
  return isCustomEvent(event) && typeof event.detail.message === "string" && !!event.detail.message;
}
