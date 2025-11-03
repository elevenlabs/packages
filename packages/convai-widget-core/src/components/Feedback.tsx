import { Rating, RatingResult } from "./Rating";
import { Button } from "./Button";
import { IconName } from "./Icon";
import { useTextContents } from "../contexts/text-contents";
import { useSheetContent } from "../contexts/sheet-content";
import { useFeedback } from "../contexts/feedback";

interface FeedbackProps {
  icon?: IconName;
}

export const Feedback = ({ icon = "star" }: FeedbackProps) => {
  const text = useTextContents();
  const { setCurrentContent } = useSheetContent();
  const { rating, feedbackProgress, submitRating } = useFeedback();

  const handleFeedbackSubmit = (ratingValue: number) => {
    submitRating(ratingValue);
    setCurrentContent("feedback");
  };

  const handleTellUsMore = () => {
    setCurrentContent("feedback");
  };

  // State 1: No rating submitted yet - show rating selector
  if (!feedbackProgress.value.hasSubmittedRating) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-sm text-base-primary font-medium">
          {text.initiate_feedback}
        </div>
        <div className="py-4">
          <Rating
            rating={null}
            onRate={handleFeedbackSubmit}
            ariaLabel={text.initiate_feedback}
            icon={icon}
          />
        </div>
      </div>
    );
  }

  // State 2 & 3: Rating submitted - show thank you + rating result
  return (
    <div className="flex flex-col items-center gap-3 mb-4">
      <div className="text-sm text-base-primary font-medium">
        {text.thanks_for_feedback}
      </div>
      {rating.value !== null && (
        <RatingResult rating={rating.value} min={1} max={5} icon={icon} />
      )}
      {!feedbackProgress.value.hasSubmittedFollowUp && (
        <Button variant="secondary" onClick={handleTellUsMore}>
          {text.request_follow_up_feedback}
        </Button>
      )}
    </div>
  );
};

