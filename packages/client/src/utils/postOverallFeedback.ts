import type { ResponseLike } from "../platformTypes.js";

const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";

export interface RatingFeedback {
  rating: number;
  comment?: string;
}

type Feedback = RatingFeedback;

export function postOverallFeedback(
  conversationId: string,
  like: boolean,
  origin?: string
): Promise<ResponseLike>;
export function postOverallFeedback(
  conversationId: string,
  feedback: Feedback,
  origin?: string
): Promise<ResponseLike>;
export function postOverallFeedback(
  conversationId: string,
  likeOrFeedback: boolean | Feedback,
  origin: string = HTTPS_API_ORIGIN
): Promise<ResponseLike> {
  const body: {
    feedback?: "like" | "dislike";
    rating?: number;
    comment?: string;
  } = {};

  if (typeof likeOrFeedback === "boolean") {
    body.feedback = likeOrFeedback ? "like" : "dislike";
  } else {
    body.rating = likeOrFeedback.rating;
    body.comment = likeOrFeedback.comment;
  }

  return fetch(`${origin}/v1/convai/conversations/${conversationId}/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
