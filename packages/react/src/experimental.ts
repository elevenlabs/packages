// TODO(AVE-792): replace with the public avatar video API.
import { useEffect, useState } from "react";
import { onAvatarVideoTrack } from "@elevenlabs/client/experimental";
import { useRawConversation } from "./conversation/ConversationContext.js";

export { enableAvatarVideo } from "@elevenlabs/client/experimental";

export function useAvatarVideoTrack(): MediaStreamTrack | null {
  const conversation = useRawConversation();
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = onAvatarVideoTrack(conversation, setTrack);
    return () => {
      unsubscribe();
      setTrack(null);
    };
  }, [conversation]);

  return track;
}
