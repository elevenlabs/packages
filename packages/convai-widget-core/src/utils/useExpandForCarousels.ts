import { type ReadonlySignal, useSignalEffect } from "@preact/signals";
import { useRef } from "preact/hooks";
import { useWidgetSize } from "../contexts/widget-size";
import type { DisplayTranscriptEntry } from "./display-transcript";

export function useExpandForCarousels(
  transcript: ReadonlySignal<DisplayTranscriptEntry[]>
) {
  const { autoExpand } = useWidgetSize();
  // Null until the first run, so carousels already shown don't count as new
  const shownCarousels = useRef<Set<string> | null>(null);

  // Runs while the sheet is closed too, so it reopens at the expanded size
  useSignalEffect(() => {
    const ids = transcript.value.flatMap(entry =>
      entry.type === "rich_content" && entry.component === "carousel"
        ? [`${entry.conversationIndex}:${entry.richContentId}`]
        : []
    );
    const shown = shownCarousels.current;
    shownCarousels.current = new Set([...(shown ?? []), ...ids]);
    if (shown && ids.some(id => !shown.has(id))) {
      autoExpand();
    }
  });
}
