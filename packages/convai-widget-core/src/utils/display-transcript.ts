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
    };

export interface DisplayTranscriptConfig {
  showAgentStatus: boolean;
  transcriptEnabled: boolean;
  /** If set, prepend as the first agent message (for text-only first message). */
  firstMessage?: string;
  /** The conversationIndex to use for the prepended first message. */
  firstMessageConversationIndex?: number;
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

  for (const entry of entries) {
    // Skip tool entries (consumed into status)
    if (
      entry.type === "agent_tool_request" ||
      entry.type === "agent_tool_response"
    )
      continue;

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

    // Group consecutive messages with same eventId + role
    const prev = result[result.length - 1];
    if (
      entry.type === "message" &&
      entry.eventId != null &&
      prev?.type === "message" &&
      prev.eventId === entry.eventId &&
      prev.role === entry.role
    ) {
      result[result.length - 1] = entry;
      continue;
    }

    result.push(entry);
  }

  // Sort message entries by eventId to fix ordering when server sends
  // agent_response before user_transcript in voice mode.
  // Only reorder entries that have an eventId; leave others in place.
  const sortableIndices: number[] = [];
  const sortableEntries: DisplayTranscriptEntry[] = [];
  for (let i = 0; i < result.length; i++) {
    const entry = result[i];
    if (entry.type === "message" && entry.eventId != null) {
      sortableIndices.push(i);
      sortableEntries.push(entry);
    }
  }
  sortableEntries.sort((a, b) => {
    const aId = (a as Extract<DisplayTranscriptEntry, { type: "message" }>)
      .eventId!;
    const bId = (b as Extract<DisplayTranscriptEntry, { type: "message" }>)
      .eventId!;
    return aId - bId;
  });
  const sorted = [...result];
  for (let i = 0; i < sortableIndices.length; i++) {
    sorted[sortableIndices[i]] = sortableEntries[i];
  }

  // Attach tool status to agent messages
  if (config.showAgentStatus) {
    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      if (
        entry.type !== "message" ||
        entry.role !== "agent" ||
        entry.eventId == null
      )
        continue;
      const status = toolStatuses.get(entry.eventId);
      if (!status) continue;

      const toolStatus: ToolCallStatusType =
        status.loading > 0
          ? ToolCallStatus.LOADING
          : status.error > 0
            ? ToolCallStatus.ERROR
            : ToolCallStatus.SUCCESS;
      sorted[i] = { ...entry, toolStatus };
    }
  }

  return sorted;
}
