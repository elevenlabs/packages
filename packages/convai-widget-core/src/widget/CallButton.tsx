import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { BaseButtonProps, Button } from "../components/Button";

interface CallButtonProps extends BaseButtonProps {
  iconOnly?: boolean;
  isDisconnected?: boolean;
}

export function CallButton({
  iconOnly,
  isDisconnected,
  children,
  ...props
}: CallButtonProps) {
  const { endSession, startSession } = useConversation();
  const text = useTextContents();
  return (
    <Button
      variant={isDisconnected ? "primary" : "secondary"}
      icon={isDisconnected ? "phone" : "phone-off"}
      onClick={isDisconnected ? e => startSession(e.currentTarget) : endSession}
      aria-label={isDisconnected ? text.start_call : text.end_call}
      {...props}
    >
      {!iconOnly
        ? (children ??
          (isDisconnected ? text.start_call : text.end_call))
        : undefined}
    </Button>
  );
}
