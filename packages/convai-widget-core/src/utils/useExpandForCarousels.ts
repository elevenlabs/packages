import { type ReadonlySignal, useSignalEffect } from "@preact/signals";
import { useRef } from "preact/hooks";
import { useWidgetSize } from "../contexts/widget-size";
import type { DisplayTranscriptEntry } from "./display-transcript";

/** Expands the sheet when a carousel first shows, since its cards don't fit the compact size. */
export function useExpandForCarousels(
  transcript: ReadonlySignal<DisplayTranscriptEntry[]>,
  open: { peek(): boolean }
) {
  const { autoExpand } = useWidgetSize();
  // Null until the first run, so carousels already shown don't count as new
  const shownCarousels = useRef<Set<string> | null>(null);

  useSignalEffect(() => {
    const ids = transcript.value.flatMap(entry =>
      entry.type === "rich_content" && entry.component === "carousel"
        ? [`${entry.conversationIndex}:${entry.richContentId}`]
        : []
    );
    const shown = shownCarousels.current;
    shownCarousels.current = new Set([...(shown ?? []), ...ids]);
    if (shown && open.peek() && ids.some(id => !shown.has(id))) {
      autoExpand();
    }
  });
}
