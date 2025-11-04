const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";

interface ThumbsFeedback {
  type: "thumbs";
  feedback: "like" | "dislike";
}

interface RatingFeedback {
  type: "rating";
  rating: number;
  comment?: string;
}

type Feedback = ThumbsFeedback | RatingFeedback;

export function postOverallFeedback(
  conversationId: string,
  like?: boolean,
  origin: string = HTTPS_API_ORIGIN,
  feedback?: Feedback
) {
  let body: Feedback;

  if (feedback) {
    body = feedback;
  } else if (like !== undefined) {
    // for backward compatibility
    body = { type: "thumbs", feedback: like ? "like" : "dislike" };
  } else {
    throw new Error("Either 'like' or 'feedback' must be provided");
  }

  return fetch(`${origin}/v1/convai/conversations/${conversationId}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
