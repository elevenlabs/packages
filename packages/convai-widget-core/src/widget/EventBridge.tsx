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
      if (!isCustomEvent(event) || event.detail._convaiEventHandled) {
        return;
      }

      event.detail._convaiEventHandled = true;
      sendUserActivity();
    }

    function handleUserMessage(event: Event): void {
      if (!isCustomEventWithMessage(event) || event.detail._convaiEventHandled) {
        return;
      }

      event.detail._convaiEventHandled = true;
      sendUserMessage(event.detail.message);
    }

    function handleContextualUpdate(event: Event): void {
      if (!isCustomEventWithMessage(event) || event.detail._convaiEventHandled) {
        return;
      }

      event.detail._convaiEventHandled = true;
      sendContextualUpdate(event.detail.message);
    }

    const host = shadowHost.value;
    if (allowEvents.value) {
      document.addEventListener(eventUserActivity, handleUserActivity);
      host?.addEventListener(eventUserActivity, handleUserActivity);
      document.addEventListener(eventUserMessage, handleUserMessage);
      host?.addEventListener(eventUserMessage, handleUserMessage);
      document.addEventListener(eventContextualUpdate, handleContextualUpdate);
      host?.addEventListener(eventContextualUpdate, handleContextualUpdate);
    }

    return () => {
      document.removeEventListener(eventUserActivity, handleUserActivity);
      host?.removeEventListener(eventUserActivity, handleUserActivity);
      document.removeEventListener(eventUserMessage, handleUserMessage);
      host?.removeEventListener(eventUserMessage, handleUserMessage);
      document.removeEventListener(eventContextualUpdate, handleContextualUpdate);
      host?.removeEventListener(eventContextualUpdate, handleContextualUpdate);
    };
  });

  return children;
});

function isCustomEvent(event: Event): event is CustomEvent {
  return "detail" in event && !!event.detail;
}

function isCustomEventWithMessage(event: Event): event is CustomEvent<{ _convaiEventHandled?: boolean, message: string }> {
  return isCustomEvent(event) && typeof event.detail.message === "string" && !!event.detail.message;
}
