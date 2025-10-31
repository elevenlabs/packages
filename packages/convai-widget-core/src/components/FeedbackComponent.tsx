import { Rating } from "./Rating";
import { IconName } from "./Icon";
import { Signalish } from "../utils/signalish";

export const FeedbackComponent = ({
  onSubmit,
  message,
  icon = "star",
}: {
  onSubmit: (rating: number) => void;
  message: Signalish<string>;
  icon?: IconName;
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-base-primary font-medium">{message}</div>
      <div className="py-4">
        <Rating rating={null} onRate={onSubmit} ariaLabel={message} icon={icon} />
      </div>
    </div>
  );
};
