import { type TargetedEvent, useCallback } from "preact/compat";
import { FeedbackIcon } from "../components/Icon";
import { RatingResult } from "../components/Rating";
import { TextArea } from "../components/TextArea";
import { useFeedback } from "../contexts/feedback";
import { useTextContents } from "../contexts/text-contents";

export function FeedbackPage() {
  const text = useTextContents();
  const { rating, feedbackText } = useFeedback();

  const handleTextChange = useCallback(
    (e: TargetedEvent<HTMLTextAreaElement>) => {
      feedbackText.value = e.currentTarget.value;
    },
    []
  );

  return (
    <div className="grow flex flex-col overflow-y-auto overflow-x-hidden px-4">
      <div className="flex flex-col gap-8 min-h-full pt-4 pb-2">
        <div className="flex flex-col items-center justify-center gap-3">
         
          <FeedbackIcon 
            orbColor="var(--el-base-subtle)" 
            circleBackgroundColor="var(--el-base)"
            starColor="var(--el-base-primary)" 
            className="w-20 h-22"
          />
          {rating.value !== null && (
            <RatingResult rating={rating.value} min={1} max={5} />
          )}
          <div className="text-center">
            <p className="text-sm text-base-primary font-medium">
              {text.thanks_for_feedback}
            </p>
            <p className="text-sm text-base-subtle">
              {text.thanks_for_feedback_details}
            </p>
          </div>
        </div>
        <TextArea
          className="w-full min-h-[6lh]"
          placeholder={text.follow_up_feedback_placeholder}
          rows={6}
          value={feedbackText}
          onInput={handleTextChange}
        />
      </div>
    </div>
  );
}



