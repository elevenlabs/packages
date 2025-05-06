import { useState } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { TextArea } from "../components/TextArea";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { SizeTransition } from "../components/SizeTransition";
import { CallButton } from "./CallButton";
import { Signal } from "@preact/signals";

interface SheetActionsProps {
  showTranscript: boolean;
  scrollPinned: Signal<boolean>;
}

export function SheetActions({
  showTranscript,
  scrollPinned,
}: SheetActionsProps) {
  const [userMessage, setUserMessage] = useState("");
  const { isDisconnected, startSession, sendUserMessage, sendUserActivity } =
    useConversation();

  return (
    <div className="shrink-0 overflow-hidden flex p-3 items-end">
      <TextArea
        rows={1}
        value={userMessage}
        onInput={sendUserActivity}
        onChange={e => setUserMessage(e.currentTarget.value)}
        onKeyDown={async e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (userMessage.trim()) {
              scrollPinned.value = true;
              setUserMessage("");
              if (isDisconnected.value) {
                await startSession(e.currentTarget, userMessage);
              } else {
                sendUserMessage(userMessage);
              }
            }
          }
        }}
        className="m-1 grow z-1 max-h-[8lh]"
        placeholder="Or send a message"
      />
      <div className="flex h-11 items-center">
        <TriggerMuteButton visible={!isDisconnected.value} />
        <SizeTransition
          visible={!isDisconnected.value || showTranscript}
          className="p-1"
        >
          <CallButton
            iconOnly={!isDisconnected.value}
            isDisconnected={isDisconnected.value}
          >
            New call
          </CallButton>
        </SizeTransition>
      </div>
    </div>
  );
}
