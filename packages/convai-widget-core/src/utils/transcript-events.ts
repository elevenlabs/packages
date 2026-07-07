import type { Role } from "@elevenlabs/client";
import type { ConversationMode } from "../contexts/conversation-mode";

/** File metadata stored alongside a user message in the local transcript. */
export type TranscriptFileInput = {
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
};

export type TranscriptEntry =
  | {
      type: "message";
      role: Role;
      message: string;
      isText: boolean;
      conversationIndex: number;
      eventId?: number;
      fileInput?: TranscriptFileInput | null;
    }
  | {
      type: "agent_tool_request";
      toolName: string;
      toolCallId: string;
      eventId: number;
      conversationIndex: number;
    }
  | {
      type: "agent_tool_response";
      toolCallId: string;
      eventId: number;
      isError: boolean;
      conversationIndex: number;
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

export interface TranscriptIngestState {
  entries: TranscriptEntry[];
  /** Index of the entry being built up by streaming parts, null outside a stream. */
  streamingEntryIndex: number | null;
  /** True from a stream "start" part until the final full message finalizes it. */
  isReceivingStream: boolean;
  /** True once the first agent message of the session has arrived. */
  receivedFirstAgentMessage: boolean;
}

export function createIngestState(): TranscriptIngestState {
  return {
    entries: [],
    streamingEntryIndex: null,
    isReceivingStream: false,
    receivedFirstAgentMessage: false,
  };
}

export interface TranscriptIngestContext {
  /** True when the current conversation is text-only. */
  isTextConversation: boolean;
  conversationIndex: number;
  /**
   * Text mode is always started by the user sending a text message. When a
   * configured first message exists in a text-only conversation, the first
   * agent message must be ignored as it is immediately interrupted by the
   * user input.
   */
  suppressFirstAgentMessage: boolean;
}

export type TranscriptIngestEvent =
  | { type: "message"; role: Role; message: string; eventId?: number }
  | {
      type: "response_part";
      part: "start" | "delta" | "stop";
      text: string;
      eventId?: number;
    }
  | {
      type: "tool_request";
      toolName: string;
      toolCallId: string;
      eventId: number;
    }
  | {
      type: "tool_response";
      toolCallId: string;
      isError: boolean;
      eventId: number;
    }
  | { type: "user_message"; message: string; fileInput?: TranscriptFileInput }
  | { type: "mode_toggle"; mode: ConversationMode }
  | { type: "disconnection"; role: Role }
  | { type: "error"; message: string };

export interface TranscriptIngestResult {
  state: TranscriptIngestState;
  /** False when the event was ignored by first-agent-message suppression. */
  accepted: boolean;
}

export function applyTranscriptEvent(
  state: TranscriptIngestState,
  event: TranscriptIngestEvent,
  context: TranscriptIngestContext
): TranscriptIngestResult {
  switch (event.type) {
    case "message":
      return applyMessage(state, event, context);
    case "response_part":
      return applyResponsePart(state, event, context);
    case "tool_request":
      return accept(
        append(state, {
          type: "agent_tool_request",
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          eventId: event.eventId,
          conversationIndex: context.conversationIndex,
        })
      );
    case "tool_response":
      return accept(
        append(state, {
          type: "agent_tool_response",
          toolCallId: event.toolCallId,
          eventId: event.eventId,
          isError: event.isError,
          conversationIndex: context.conversationIndex,
        })
      );
    case "user_message": {
      const entry: Extract<TranscriptEntry, { type: "message" }> = {
        type: "message",
        role: "user",
        message: event.message,
        isText: true,
        conversationIndex: context.conversationIndex,
      };
      if (event.fileInput) {
        entry.fileInput = event.fileInput;
      }
      return accept(append(state, entry));
    }
    case "mode_toggle":
      return accept(
        append(state, {
          type: "mode_toggle",
          mode: event.mode,
          conversationIndex: context.conversationIndex,
        })
      );
    case "disconnection":
      return accept(
        resetIngestBookkeeping(
          append(state, {
            type: "disconnection",
            role: event.role,
            conversationIndex: context.conversationIndex,
          })
        )
      );
    case "error":
      return accept(
        resetIngestBookkeeping(
          append(state, {
            type: "error",
            message: event.message,
            conversationIndex: context.conversationIndex,
          })
        )
      );
  }
}

function applyMessage(
  state: TranscriptIngestState,
  event: Extract<TranscriptIngestEvent, { type: "message" }>,
  context: TranscriptIngestContext
): TranscriptIngestResult {
  const { role, message, eventId } = event;

  if (
    role === "agent" &&
    context.suppressFirstAgentMessage &&
    !state.receivedFirstAgentMessage
  ) {
    return {
      state: { ...state, receivedFirstAgentMessage: true },
      accepted: false,
    };
  }

  const entry: Extract<TranscriptEntry, { type: "message" }> = {
    type: "message",
    role,
    message,
    isText: context.isTextConversation,
    conversationIndex: context.conversationIndex,
    eventId,
  };
  const receivedFirstAgentMessage =
    role === "agent" || state.receivedFirstAgentMessage;

  if (role === "agent" && state.isReceivingStream) {
    // The full message finalizes the entry built up by streaming parts. If the
    // stream already stopped (streamingEntryIndex is null), the streamed entry
    // holds the full text and the event is dropped to avoid a duplicate.
    const entries =
      state.streamingEntryIndex !== null
        ? replaceEntryAt(state.entries, state.streamingEntryIndex, entry)
        : state.entries;
    return accept({
      ...state,
      entries,
      isReceivingStream: false,
      receivedFirstAgentMessage,
    });
  }

  return accept({
    ...append(state, entry),
    receivedFirstAgentMessage,
  });
}

function applyResponsePart(
  state: TranscriptIngestState,
  event: Extract<TranscriptIngestEvent, { type: "response_part" }>,
  context: TranscriptIngestContext
): TranscriptIngestResult {
  if (context.suppressFirstAgentMessage && !state.receivedFirstAgentMessage) {
    return { state, accepted: false };
  }

  if (event.part === "start") {
    return accept({
      ...append(state, {
        type: "message",
        role: "agent",
        message: "",
        isText: context.isTextConversation,
        conversationIndex: context.conversationIndex,
        eventId: event.eventId,
      }),
      streamingEntryIndex: state.entries.length,
      isReceivingStream: true,
    });
  }

  if (event.part === "delta") {
    const index = state.streamingEntryIndex;
    if (index === null || !event.text) {
      return accept(state);
    }
    const entry = state.entries[index];
    if (entry?.type !== "message") {
      return accept(state);
    }
    return accept({
      ...state,
      entries: replaceEntryAt(state.entries, index, {
        ...entry,
        message: entry.message + event.text,
      }),
    });
  }

  // "stop" only ends delta accumulation; isReceivingStream stays set so the
  // final full message is not appended as a duplicate of the streamed entry.
  return accept({ ...state, streamingEntryIndex: null });
}

function append(
  state: TranscriptIngestState,
  entry: TranscriptEntry
): TranscriptIngestState {
  return { ...state, entries: [...state.entries, entry] };
}

function replaceEntryAt(
  entries: TranscriptEntry[],
  index: number,
  entry: TranscriptEntry
): TranscriptEntry[] {
  const updated = [...entries];
  updated[index] = entry;
  return updated;
}

function resetIngestBookkeeping(
  state: TranscriptIngestState
): TranscriptIngestState {
  return {
    ...state,
    streamingEntryIndex: null,
    isReceivingStream: false,
    receivedFirstAgentMessage: false,
  };
}

function accept(state: TranscriptIngestState): TranscriptIngestResult {
  return { state, accepted: true };
}
