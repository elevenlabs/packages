import type { Role } from "@elevenlabs/client";
import type {
  TranscriptEntry,
  TranscriptFileInput,
} from "../contexts/conversation";
import type { ConversationMode } from "../contexts/conversation-mode";

export const ToolCallStatus = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type ToolCallStatusType =
  (typeof ToolCallStatus)[keyof typeof ToolCallStatus];

export type DisplayTranscriptEntry =
  | {
      type: "message";
      role: Role;
      message: string;
      isText: boolean;
      conversationIndex: number;
      eventId?: number;
      toolStatus?: ToolCallStatusType;
      fileInput?: TranscriptFileInput | null;
    }
  | {
      type: "disconnection";
      role: Role;
      message?: undefined;
      conversationIndex: number;
    }
  | {
      type: "error";
      message: string;
      conversationIndex: number;
    }
  | {
      type: "mode_toggle";
      mode: ConversationMode;
      conversationIndex: number;
    }
  | {
      type: "typing_indicator";
      conversationIndex: number;
    };

export interface DisplayTranscriptConfig {
  showAgentStatus: boolean;
  transcriptEnabled: boolean;
  /** If set, prepend as the first agent message (for text-only first message). */
  firstMessage?: string;
  /** The conversationIndex to use for the prepended first message. */
  firstMessageConversationIndex?: number;
  /** If true, append a typing indicator entry at the end. */
  showTypingIndicator?: boolean;
}

export function buildDisplayTranscript(
  entries: TranscriptEntry[],
  config: DisplayTranscriptConfig
): DisplayTranscriptEntry[] {
  const result: DisplayTranscriptEntry[] = [];

  // Prepend first message if configured
  if (config.firstMessage) {
    result.push({
      type: "message",
      role: "agent",
      message: config.firstMessage,
      isText: true,
      conversationIndex:
        entries[0]?.conversationIndex ??
        config.firstMessageConversationIndex ??
        0,
    });
  }

  // Collect tool statuses per eventId
  const toolStatuses = new Map<
    number,
    { loading: number; error: number; success: number }
  >();
  for (const entry of entries) {
    if (entry.type === "agent_tool_request") {
      const s = toolStatuses.get(entry.eventId) ?? {
        loading: 0,
        error: 0,
        success: 0,
      };
      s.loading++;
      toolStatuses.set(entry.eventId, s);
    } else if (entry.type === "agent_tool_response") {
      const s = toolStatuses.get(entry.eventId);
      if (s) {
        s.loading--;
        if (entry.isError) s.error++;
        else s.success++;
      }
    }
  }

  // Tracks whether a tool entry appeared since the last emitted message. Used to
  // protect a non-empty text segment that is followed by a tool call and then
  // more text (text → tool → text): those are distinct bubbles of the same turn
  // and must not be collapsed into one.
  let toolBetween = false;

  for (const entry of entries) {
    // Skip tool entries (consumed into status)
    if (
      entry.type === "agent_tool_request" ||
      entry.type === "agent_tool_response"
    ) {
      toolBetween = true;
      continue;
    }

    // Skip empty agent messages unless they have a tool status to display
    if (
      entry.type === "message" &&
      entry.role === "agent" &&
      !entry.message &&
      !(
        config.showAgentStatus &&
        entry.eventId != null &&
        toolStatuses.has(entry.eventId)
      )
    )
      continue;

    // Filter non-text messages when transcript is disabled
    if (!config.transcriptEnabled && entry.type === "message" && !entry.isText)
      continue;

    // Group consecutive messages with same eventId + role. This collapses a
    // streamed partial into its finalized message, and folds the empty
    // placeholders that bracket tool calls into the turn's real message.
    //
    // The one case we must NOT collapse: a non-empty text segment followed by a
    // tool call and then more text (text → tool → text). Overwriting the first
    // would lose it. So refuse to merge only when a tool separated the two AND
    // the previous message already has real content; empty placeholders (incl.
    // whitespace-only) still merge freely across tools.
    const prev = result[result.length - 1];
    if (
      entry.type === "message" &&
      entry.eventId != null &&
      prev?.type === "message" &&
      prev.eventId === entry.eventId &&
      prev.role === entry.role &&
      (!toolBetween || !prev.message.trim())
    ) {
      result[result.length - 1] = entry;
      continue;
    }

    result.push(entry);
    toolBetween = false;
  }

  // Attach tool status to agent messages. A turn (eventId) may now render as
  // several bubbles (text → tool → text), so attach the status to only the first
  // agent bubble of the turn — the one that triggered the tool. This keeps a
  // single status badge and keeps it stable: it appears under the triggering
  // message during loading instead of jumping to a later bubble when post-tool
  // text arrives.
  if (config.showAgentStatus) {
    const statusAttached = new Set<number>();
    for (let i = 0; i < result.length; i++) {
      const entry = result[i];
      if (
        entry.type !== "message" ||
        entry.role !== "agent" ||
        entry.eventId == null
      )
        continue;
      if (statusAttached.has(entry.eventId)) continue;
      const status = toolStatuses.get(entry.eventId);
      if (!status) continue;

      const toolStatus: ToolCallStatusType =
        status.loading > 0
          ? ToolCallStatus.LOADING
          : status.error > 0
            ? ToolCallStatus.ERROR
            : ToolCallStatus.SUCCESS;
      result[i] = { ...entry, toolStatus };
      statusAttached.add(entry.eventId);
    }
  }

  // Append typing indicator if configured
  if (config.showTypingIndicator) {
    result.push({
      type: "typing_indicator",
      conversationIndex:
        entries[entries.length - 1]?.conversationIndex ??
        config.firstMessageConversationIndex ??
        0,
    });
  }

  return result;
}
