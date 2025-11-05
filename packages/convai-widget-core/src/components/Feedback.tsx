import { useCallback } from "preact/hooks";
import { useFeedback } from "../contexts/feedback";
import { useSheetContent } from "../contexts/sheet-content";
import { useTextContents } from "../contexts/text-contents";
import { Button } from "./Button";
import type { IconName } from "./Icon";
import { Rating, RatingResult } from "./Rating";

interface FeedbackProps {
  icon?: IconName;
}

function FeedbackRating({
  icon,
  onRate,
}: {
  icon: IconName;
  onRate: (rating: number) => void;
}) {
  const text = useTextContents();

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-base-primary font-medium">
        {text.initiate_feedback}
      </div>
      <div className="py-4">
        <Rating
          onRate={onRate}
          ariaLabel={text.initiate_feedback}
          icon={icon}
        />
      </div>
    </div>
  );
}

function FeedbackResult({
  icon,
  rating,
  showFollowUpButton,
  onFollowUpClick,
}: {
  icon: IconName;
  rating: number;
  showFollowUpButton: boolean;
  onFollowUpClick: () => void;
}) {
  const text = useTextContents();

  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <div className="text-sm text-base-primary font-medium">
        {text.thanks_for_feedback}
      </div>
      <RatingResult rating={rating} min={1} max={5} icon={icon} />
      {showFollowUpButton && (
        <Button variant="secondary" onClick={onFollowUpClick}>
          {text.request_follow_up_feedback}
        </Button>
      )}
    </div>
  );
}

export function Feedback({ icon = "star" }: FeedbackProps) {
  const { currentContent } = useSheetContent();
  const { rating, feedbackProgress, submitRating } = useFeedback();
  const hasSubmittedRating =
    feedbackProgress.value !== "initial" && rating.value !== null;
  const handleFeedbackSubmit = useCallback(
    (ratingValue: number) => {
      submitRating(ratingValue);
      currentContent.value = "feedback";
    },
    [submitRating]
  );

  const handleFollowUpClick = useCallback(() => {
    currentContent.value = "feedback";
  }, []);

  if (hasSubmittedRating) {
    return (
      <FeedbackResult
        icon={icon}
        rating={rating.value ?? 0}
        showFollowUpButton={feedbackProgress.value !== "submitted-follow-up"}
        onFollowUpClick={handleFollowUpClick}
      />
    );
  }

  return <FeedbackRating icon={icon} onRate={handleFeedbackSubmit} />;
}
