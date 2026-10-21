import type { MessageAttachment, Role } from "@elevenlabs/client";
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
      attachments?: MessageAttachment[];
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
    }
  | {
      type: "queue_timeout";
      conversationIndex: number;
    }
  | {
      type: "rich_content";
      component: string;
      props: unknown;
      conversationIndex: number;
      eventId: number;
      richContentId: string;
    };

export interface DisplayTranscriptConfig {
  showAgentStatus: boolean;
  transcriptEnabled: boolean;
  showRichContent: boolean;
  /** If set, prepend as the first agent message (for text-only first message). */
  firstMessage?: string;
  /** The conversationIndex to use for the prepended first message. */
  firstMessageConversationIndex?: number;
  /** If true, append a typing indicator entry at the end. */
  showTypingIndicator?: boolean;
  /** If true, show a typing indicator under a message the agent has not answered. */
  showPendingReply?: boolean;
  /** Move the first message rich content below the first agent message. */
  deferFirstMessageRichContent?: boolean;
}

const PERSISTING_COMPONENTS = new Set(["carousel"]);

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

  let lastUserEntryIndex = -1;
  entries.forEach((entry, index) => {
    if (entry.type === "message" && entry.role === "user") {
      lastUserEntryIndex = index;
    }
  });

  const speakingEventIds = new Set<number>();

  for (const [entryIndex, rawEntry] of entries.entries()) {
    const entry =
      rawEntry.type === "message" && rawEntry.visibleLength !== undefined
        ? {
            ...rawEntry,
            message: rawEntry.message.slice(0, rawEntry.visibleLength),
          }
        : rawEntry;
    if (
      rawEntry.type === "message" &&
      rawEntry.visibleLength !== undefined &&
      rawEntry.visibleLength < rawEntry.message.length &&
      rawEntry.eventId != null &&
      !rawEntry.speechInterrupted
    ) {
      speakingEventIds.add(rawEntry.eventId);
    }

    // Skip tool entries (consumed into status)
    if (
      entry.type === "agent_tool_request" ||
      entry.type === "agent_tool_response"
    ) {
      continue;
    }

    if (entry.type === "rich_content") {
      if (!config.showRichContent) continue;
      // Wait until the text before it has been said
      if (speakingEventIds.has(entry.eventId)) continue;
      // Drop replies the user has moved past
      if (
        entryIndex < lastUserEntryIndex &&
        !PERSISTING_COMPONENTS.has(entry.component)
      )
        continue;
      result.push(entry);
      continue;
    }

    // Skip empty agent messages unless they carry attachments or a tool status
    // to display.
    if (
      entry.type === "message" &&
      entry.role === "agent" &&
      !entry.message &&
      !entry.attachments?.length &&
      !(
        config.showAgentStatus &&
        entry.eventId != null &&
        toolStatuses.has(entry.eventId)
      )
    )
      continue;

    // Hide later messages of the turn until they are said
    if (
      entry.type === "message" &&
      entry.visibleLength !== undefined &&
      !entry.message &&
      result.some(
        shown =>
          shown.type === "message" &&
          shown.role === "agent" &&
          shown.eventId === entry.eventId
      )
    )
      continue;

    // Filter non-text messages when transcript is disabled
    if (!config.transcriptEnabled && entry.type === "message" && !entry.isText)
      continue;

    // Fold an empty agent placeholder into the following same-turn message.
    // Two entries sharing an eventId are otherwise distinct messages (e.g.
    // pre-tool and post-tool replies), so they stay separate bubbles. A
    // streaming placeholder never carries files, so an entry with attachments
    // is a real message even when it has no text.
    const prev = result[result.length - 1];
    if (
      entry.type === "message" &&
      entry.eventId != null &&
      prev?.type === "message" &&
      prev.eventId === entry.eventId &&
      prev.role === entry.role &&
      !prev.message.trim() &&
      !prev.attachments?.length
    ) {
      result[result.length - 1] = entry;
      continue;
    }

    result.push(entry);
  }

  if (config.deferFirstMessageRichContent) {
    const richContentIndex = result.findIndex(
      entry =>
        entry.type === "rich_content" && entry.richContentId === "first_message"
    );
    if (richContentIndex !== -1) {
      const [richContent] = result.splice(richContentIndex, 1);
      const firstMessageIndex = result.findIndex(
        entry => entry.type === "message" && entry.role === "agent"
      );
      // Wait until the greeting has been said
      const greetingSaid =
        richContent.type === "rich_content" &&
        !speakingEventIds.has(richContent.eventId);
      if (firstMessageIndex !== -1 && greetingSaid) {
        result.splice(firstMessageIndex + 1, 0, richContent);
      }
    }
  }

  // Attach tool status to the first agent bubble of each turn only — a turn can
  // render as several bubbles, but the badge should appear once.
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

  const lastShown = result[result.length - 1];
  const lastUserEntry = entries[lastUserEntryIndex];
  const awaitingReply =
    config.showPendingReply &&
    lastShown?.type === "message" &&
    lastShown.role === "user" &&
    !(lastUserEntry?.type === "message" && lastUserEntry.sentToExternalAgent);

  // Append typing indicator if configured or the agent owes a reply
  if (config.showTypingIndicator || awaitingReply) {
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
