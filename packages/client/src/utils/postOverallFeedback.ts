const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";

export interface RatingFeedback {
  rating: number;
  comment?: string;
}

type Feedback = RatingFeedback;

export function postOverallFeedback(
  conversationId: string,
  like?: boolean,
  origin: string = HTTPS_API_ORIGIN,
  feedback?: Feedback
) {
  const hasThumbsFeedback = like !== undefined;
  const hasRatingFeedback = feedback !== undefined;

  if (!hasThumbsFeedback && !hasRatingFeedback) {
    throw new Error("Either 'like' or 'feedback' must be provided");
  }
  if (hasThumbsFeedback && hasRatingFeedback) {
    throw new Error("Cannot provide both 'like' and 'feedback'");
  }

  const body: {
    feedback?: "like" | "dislike";
    rating?: number;
    comment?: string;
  } = {};

  if (hasThumbsFeedback) {
    body.feedback = like ? "like" : "dislike";
  }

  if (hasRatingFeedback) {
    body.rating = feedback.rating;
    if (feedback.comment) {
      body.comment = feedback.comment;
    }
  }

  return fetch(`${origin}/v1/convai/conversations/${conversationId}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
