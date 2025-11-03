import { signal, Signal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";
import { useContextSafely } from "../utils/useContextSafely";
import { useConversation } from "./conversation";
import { useAttribute } from "./attributes";

interface FeedbackProgress {
  hasSubmittedRating: boolean;
  hasSubmittedFollowUp: boolean;
}

interface FeedbackData {
  rating: Signal<number | null>;
  feedbackText: Signal<string>;
  feedbackProgress: Signal<FeedbackProgress>;
  submitRating: (rating: number) => void;
  submitFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackData | null>(null);

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

  const submitRating = (ratingValue: number) => {
    const conversationId = lastId.value;
    const currentAgentId = agentId.value;

    if (!conversationId || !currentAgentId) {
      console.warn("Cannot submit rating: missing agent_id or conversation_id");
      return;
    }

    // TODO: Actually submit the rating to backend
    const ratingData = {
      rating: ratingValue,
      agent_id: currentAgentId,
      conversation_id: conversationId,
    };
    console.log("Submitting rating:", ratingData);

    // Set rating and mark as submitted
    rating.value = ratingValue;
    feedbackProgress.value = {
      ...feedbackProgress.value,
      hasSubmittedRating: true,
    };
  };

  const submitFeedback = () => {
    const conversationId = lastId.value;
    const currentAgentId = agentId.value;

    if (!conversationId || !currentAgentId) {
      console.warn("Cannot submit feedback: missing agent_id or conversation_id");
      return;
    }

    // TODO: Actually submit the feedback data to backend
    const feedbackData = {
      rating: rating.value,
      feedbackText: feedbackText.value,
      agent_id: currentAgentId,
      conversation_id: conversationId,
    };
    console.log("Submitting feedback:", feedbackData);

    // Mark follow-up as submitted
    feedbackProgress.value = {
      ...feedbackProgress.value,
      hasSubmittedFollowUp: true,
    };
  };

  return (
    <FeedbackContext.Provider
      value={{ rating, feedbackText, feedbackProgress, submitRating, submitFeedback }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContextSafely(FeedbackContext);
}
