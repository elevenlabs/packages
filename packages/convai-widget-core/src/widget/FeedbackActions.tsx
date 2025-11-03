import { useCallback } from "preact/compat";
import { Button } from "../components/Button";
import { useTextContents } from "../contexts/text-contents";
import { useSheetContent } from "../contexts/sheet-content";
import { useFeedback } from "../contexts/feedback";

export function FeedbackActions() {
  const text = useTextContents();
  const { setCurrentContent } = useSheetContent();
  const { rating, feedbackText } = useFeedback();

  const handleSubmit = useCallback(() => {
    // TODO: Actually submit the feedback data to backend
    const feedbackData = {
      rating: rating.value,
      feedbackText: feedbackText.value,
    };
    console.log("Submitting feedback:", feedbackData);

    // Navigate back to transcript
    setCurrentContent("transcript");

    // Reset feedback state
    rating.value = null;
    feedbackText.value = "";
  }, [setCurrentContent, rating, feedbackText]);

  return (
    <div className="shrink-0 overflow-hidden flex p-3 items-end justify-end">
      <Button variant="primary" onClick={handleSubmit}>
        {text.submit}
      </Button>
    </div>
  );
}

