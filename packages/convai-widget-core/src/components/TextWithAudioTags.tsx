import { Fragment } from "preact";
import { useMemo } from "preact/hooks";

import { cn } from "../utils/cn";
import {
  AUDIO_TAG_CLASSNAME,
  parseTextWithAudioTags,
} from "../utils/audioTags";

export function TextWithAudioTags({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = useMemo(() => parseTextWithAudioTags(text), [text]);

  return (
    <>
      {parts.map((part, index) =>
        part.type === "audioTag" ? (
          <span
            key={index}
            data-audio-tag
            className={cn(AUDIO_TAG_CLASSNAME, className)}
          >
            {part.content}
          </span>
        ) : (
          <Fragment key={index}>{part.content}</Fragment>
        )
      )}
    </>
  );
}
