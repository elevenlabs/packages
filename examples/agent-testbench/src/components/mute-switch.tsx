import { Switch } from "@/components/ui/switch";
import { FieldLabel } from "@/components/ui/field";

import { MicOffIcon, MicIcon } from "lucide-react";

import { useConversationMicrophone } from "./conversation-provider";

export function MuteSwitch({ disabled }: { disabled: boolean }) {
  const { isMicMuted, setMicMuted } = useConversationMicrophone();
  return (
    <div className="flex items-center justify-end space-x-2">
      <FieldLabel htmlFor="mute-microphone">
        {isMicMuted ? <MicOffIcon /> : <MicIcon />}
      </FieldLabel>
      <Switch
        id="mute-microphone"
        disabled={disabled}
        checked={isMicMuted}
        onCheckedChange={setMicMuted}
      />
    </div>
  );
}
