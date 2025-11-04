import { useCallback } from "preact/compat";
import { useTextContents } from "../contexts/text-contents";
import { Avatar } from "../components/Avatar";
import { TextArea } from "../components/TextArea";
import { RatingResult } from "../components/Rating";
import { useFeedback } from "../contexts/feedback";
import { FeedbackIcon, Icon } from "../components/Icon";

export function FeedbackPage() {
  const text = useTextContents();
  const { rating, feedbackText } = useFeedback();

  const handleTextChange = useCallback(
    (e: Event) => {
      const target = e.currentTarget as HTMLTextAreaElement;
      feedbackText.value = target.value;
    },
    [feedbackText]
  );

  return (
    <div className="grow flex flex-col overflow-y-auto overflow-x-hidden px-4">
      <div className="flex flex-col gap-8 min-h-full pt-4">
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



