import { postOverallFeedback } from "@elevenlabs/client";
import { type Signal, useSignal, useSignalEffect } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext, useCallback, useMemo } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";
import { useAttribute } from "./attributes";
import { useConversation } from "./conversation";
import { useServerLocation } from "./server-location";

type FeedbackStep = "initial" | "submitted-rating" | "submitted-follow-up";

interface FeedbackStore {
  rating: Signal<number | null>;
  feedbackText: Signal<string>;
  feedbackProgress: Signal<FeedbackStep>;
  submitRating: (rating: number) => Promise<void>;
  submitFeedback: () => Promise<void>;
  reset: () => void;
}

const FeedbackContext = createContext<FeedbackStore | null>(null);

export function FeedbackProvider({
  children,
}: {
  children: ComponentChildren;
}) {
  const rating = useSignal<number | null>(null);
  const feedbackText = useSignal<string>("");
  const feedbackProgress = useSignal<FeedbackStep>("initial");

  const { lastId } = useConversation();
  const agentId = useAttribute("agent-id");
  const { serverUrl } = useServerLocation();

  const submitRating = useCallback(async (ratingValue: number) => {
    const conversationId = lastId.value;
    const currentAgentId = agentId.value;

    if (!conversationId || !currentAgentId) {
      console.warn(
        "[ConversationalAI] Cannot submit rating: missing agent_id or conversation_id"
      );
      return;
    }

    try {
      rating.value = ratingValue;
      feedbackProgress.value = "submitted-rating";
      await postOverallFeedback(
        conversationId,
        {
          rating: ratingValue,
        },
        serverUrl.value
      );
    } catch (error) {
      console.error("[ConversationalAI] Failed to submit rating:", error);
    }
  }, []);

  const submitFeedback = useCallback(async () => {
    const conversationId = lastId.value;
    const currentAgentId = agentId.value;

    if (!conversationId || !currentAgentId) {
      console.warn(
        "[ConversationalAI] Cannot submit feedback: missing agent_id or conversation_id"
      );
      return;
    }

    if (rating.value === null) {
      console.warn("[ConversationalAI] Cannot submit feedback: rating not set");
      return;
    }

    if (!feedbackText.value) {
      // Do nothing if the user has not provided any feedback
      return;
    }

    try {
      feedbackProgress.value = "submitted-follow-up";
      await postOverallFeedback(
        conversationId,
        {
          rating: rating.value,
          comment: feedbackText.value || undefined,
        },
        serverUrl.value
      );
    } catch (error) {
      console.error("[ConversationalAI] Failed to submit feedback:", error);
    }
  }, []);

  const reset = useCallback(() => {
    rating.value = null;
    feedbackText.value = "";
    feedbackProgress.value = "initial";
  }, []);

  useSignalEffect(() => {
    const currentLastId = lastId.value;
    if (currentLastId !== null) {
      reset();
    }
  });

  const store = useMemo<FeedbackStore>(
    () => ({
      rating,
      feedbackText,
      feedbackProgress,
      submitRating,
      submitFeedback,
      reset,
    }),
    [submitRating, submitFeedback, reset]
  );

  return (
    <FeedbackContext.Provider value={store}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContextSafely(FeedbackContext);
}
