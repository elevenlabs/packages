import { useTextContents } from "../contexts/text-contents";
import { Avatar } from "../components/Avatar";
import { TextArea } from "../components/TextArea";
import { RatingResult } from "../components/Rating";

const FeedbackResult = ({ rating }: { rating: number }) => {
  const text = useTextContents();
  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar size="sm" />
      <RatingResult rating={rating} min={1} max={5} />
      <div className="text-center">
        <p className="text-sm text-base-primary font-medium">
          {text.thanks_for_feedback}
        </p>
        <p className="text-sm text-base-subtle">
          {text.thanks_for_feedback_details}
        </p>
      </div>
    </div>
  );
};

export function FeedbackPage() {
  const text = useTextContents();

  return (
    <div className="grow flex flex-col items-center justify-center px-4 gap-8">
      <FeedbackResult rating={4} />
      <TextArea className="w-full min-h-[3lh]" placeholder={text.follow_up_feedback_placeholder} rows={3} />
    </div>
  );
}



