import { useCallback } from "preact/compat";
import { Button } from "../components/Button";
import { useTextContents } from "../contexts/text-contents";
import { useSheetContent } from "../contexts/sheet-content";
import { useFeedback } from "../contexts/feedback";

export function FeedbackActions() {
  const text = useTextContents();
  const { currentContent } = useSheetContent();
  const { submitFeedback } = useFeedback();

  const handleSubmit = useCallback(() => {
    submitFeedback();
    currentContent.value = "transcript";
  }, [submitFeedback]);

  return (
    <div className="shrink-0 overflow-hidden flex p-3 items-end justify-end">
      <Button variant="primary" onClick={handleSubmit}>
        {text.submit}
      </Button>
    </div>
  );
}
