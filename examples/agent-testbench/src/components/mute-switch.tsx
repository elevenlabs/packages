import { Switch } from "@/components/ui/switch";
import { FieldLabel } from "@/components/ui/field";

import { MicOffIcon, MicIcon } from "lucide-react";

import { useConversationInput } from "@elevenlabs/react";

export function MuteSwitch({ disabled }: { disabled: boolean }) {
  const { isMuted, setMuted } = useConversationInput();
  return (
    <div className="flex items-center justify-end space-x-2">
      <FieldLabel htmlFor="mute-microphone">
        {isMuted ? <MicOffIcon /> : <MicIcon />}
      </FieldLabel>
      <Switch
        id="mute-microphone"
        disabled={disabled}
        checked={isMuted}
        onCheckedChange={setMuted}
      />
    </div>
  );
}
