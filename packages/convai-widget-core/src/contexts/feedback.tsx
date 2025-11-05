import { postOverallFeedback } from "@elevenlabs/client";
import { type Signal, signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";
import { useAttribute } from "./attributes";
import { useConversation } from "./conversation";
import { useServerLocation } from "./server-location";

interface FeedbackProgress {
  hasSubmittedRating: boolean;
  hasSubmittedFollowUp: boolean;
}

interface FeedbackStore {
  rating: Signal<number | null>;
  feedbackText: Signal<string>;
  feedbackProgress: Signal<FeedbackProgress>;
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
  const rating = signal<number | null>(null);
  const feedbackText = signal<string>("");
  const feedbackProgress = signal<FeedbackProgress>({
    hasSubmittedRating: false,
    hasSubmittedFollowUp: false,
  });

  const { lastId } = useConversation();
  const agentId = useAttribute("agent-id");
  const { serverUrl } = useServerLocation();

  const submitRating = async (ratingValue: number) => {
    const conversationId = lastId.value;
    const currentAgentId = agentId.value;

    if (!conversationId || !currentAgentId) {
      console.warn("Cannot submit rating: missing agent_id or conversation_id");
      return;
    }

    try {
      rating.value = ratingValue;
      feedbackProgress.value = {
        ...feedbackProgress.value,
        hasSubmittedRating: true,
      };
      await postOverallFeedback(conversationId, undefined, serverUrl.value, {
        rating: ratingValue,
      });
    } catch (error) {
      console.error("Failed to submit rating:", error);
    }
  };

  const submitFeedback = async () => {
    const conversationId = lastId.value;
    const currentAgentId = agentId.value;

    if (!conversationId || !currentAgentId) {
      console.warn(
        "Cannot submit feedback: missing agent_id or conversation_id"
      );
      return;
    }

    if (rating.value === null) {
      console.warn("Cannot submit feedback: rating not set");
      return;
    }

    try {
      feedbackProgress.value = {
        ...feedbackProgress.value,
        hasSubmittedFollowUp: true,
      };
      await postOverallFeedback(conversationId, undefined, serverUrl.value, {
        rating: rating.value,
        comment: feedbackText.value || undefined,
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  const reset = () => {
    rating.value = null;
    feedbackText.value = "";
    feedbackProgress.value = {
      hasSubmittedRating: false,
      hasSubmittedFollowUp: false,
    };
  };

  return (
    <FeedbackContext.Provider
      value={{
        rating,
        feedbackText,
        feedbackProgress,
        submitRating,
        submitFeedback,
        reset,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContextSafely(FeedbackContext);
}
