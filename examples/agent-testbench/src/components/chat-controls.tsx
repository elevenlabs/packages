import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useState } from "react";
import {
  useConversationControls,
  useConversationStatus,
} from "./conversation-provider";
import { SendIcon } from "lucide-react";

export function ChatControls() {
  const { status } = useConversationStatus();
  const { sendUserMessage, sendContextualUpdate } = useConversationControls();
  const [message, setMessage] = useState("");

  const handleSend = useCallback(
    (type: "user-message" | "contextual-update") => {
      if (type === "user-message") {
        sendUserMessage(message);
      } else if (type === "contextual-update") {
        sendContextualUpdate(message);
      } else {
        throw new Error("Invalid message type");
      }
      setMessage("");
    },
    [sendUserMessage, sendContextualUpdate, message]
  );

  return (
    <>
      <Input
        type="text"
        placeholder="Message"
        value={message}
        onValueChange={setMessage}
        onKeyDown={e => e.key === "Enter" && handleSend("user-message")}
        disabled={status !== "connected"}
      />
      <Button
        disabled={status !== "connected"}
        onClick={() => handleSend("user-message")}
      >
        User <SendIcon />
      </Button>
      <Button
        disabled={status !== "connected"}
        onClick={() => handleSend("contextual-update")}
      >
        Context <SendIcon />
      </Button>
    </>
  );
}
