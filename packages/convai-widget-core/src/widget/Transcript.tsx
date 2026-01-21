import { ReadonlySignal, Signal } from "@preact/signals";
import { useMemo } from "preact/compat";
import { TranscriptEntry } from "../contexts/conversation";
import { TranscriptMessage } from "./TranscriptMessage";
import { useStickToBottom } from "../utils/useStickToBottom";

interface TranscriptProps {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<TranscriptEntry[]>;
}

type ToolCallEntry = Extract<TranscriptEntry, { type: "tool_call" }>;

type GroupedEntry =
  | { type: "single"; entry: TranscriptEntry; index: number }
  | { type: "tool_calls"; entries: ToolCallEntry[]; startIndex: number };

function groupTranscriptEntries(entries: TranscriptEntry[]): GroupedEntry[] {
  const groups: GroupedEntry[] = [];
  let i = 0;

  while (i < entries.length) {
    const entry = entries[i];

    if (entry.type === "tool_call") {
      // Collect consecutive tool calls (parallel tools in the same turn)
      const toolCalls: ToolCallEntry[] = [];
      const startIndex = i;

      while (i < entries.length && entries[i].type === "tool_call") {
        toolCalls.push(entries[i] as ToolCallEntry);
        i++;
      }

      groups.push({ type: "tool_calls", entries: toolCalls, startIndex });
    } else {
      groups.push({ type: "single", entry, index: i });
      i++;
    }
  }

  return groups;
}

/**
 * Compute combined state for a group of tool calls:
 * - "loading" if any tool is still loading
 * - "error" if any tool failed (and none loading)
 * - "success" if all tools succeeded
 */
function getCombinedToolState(
  entries: ToolCallEntry[]
): "loading" | "success" | "error" {
  const hasLoading = entries.some(e => e.state === "loading");
  if (hasLoading) return "loading";

  const hasError = entries.some(e => e.state === "error");
  if (hasError) return "error";

  return "success";
}

export function Transcript({ scrollPinned, transcript }: TranscriptProps) {
  const {
    scrollContainer,
    contentRef,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    firstRender,
  } = useStickToBottom({ scrollPinned });

  const groupedEntries = useMemo(
    () => groupTranscriptEntries(transcript.value),
    [transcript.value]
  );

  return (
    <div
      ref={scrollContainer}
      className="px-4 pt-20 pb-4 grow overflow-y-auto z-2"
      onScroll={handleScroll}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div ref={contentRef} className="flex flex-col gap-6">
        {groupedEntries.map(group => {
          if (group.type === "tool_calls") {
            // Create a synthetic combined entry for the group
            const combinedState = getCombinedToolState(group.entries);
            const combinedEntry: ToolCallEntry = {
              ...group.entries[0],
              state: combinedState,
            };
            return (
              <TranscriptMessage
                key={`tools-${group.startIndex}`}
                entry={combinedEntry}
                animateIn={!firstRender.current}
              />
            );
          }
          return (
            <TranscriptMessage
              key={`${group.index}-${group.entry.conversationIndex}`}
              entry={group.entry}
              animateIn={!firstRender.current}
            />
          );
        })}
      </div>
    </div>
  );
}
