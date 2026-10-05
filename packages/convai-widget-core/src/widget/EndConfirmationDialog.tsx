import { HTMLAttributes, useEffect, useId, useRef } from "preact/compat";
import { useTextContents } from "../contexts/text-contents";
import { useEndConfirmation } from "../contexts/end-confirmation";
import { useIsConversationTextOnly } from "../contexts/widget-config";
import { Button } from "../components/Button";

interface EndConfirmationDialogProps extends HTMLAttributes<HTMLDivElement> {
  overlay?: boolean;
}

export function EndConfirmationDialog({
  overlay,
  ...transitionProps
}: EndConfirmationDialogProps) {
  const text = useTextContents();
  const textOnly = useIsConversationTextOnly();
  const { confirmationShown, confirmEnd, cancelEnd } = useEndConfirmation();
  const dismissed = !confirmationShown.value;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelEnd();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelEnd]);

  const card = (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      inert={dismissed}
      onClick={e => e.stopPropagation()}
      className="max-w-[400px] flex flex-col gap-2 bg-base shadow-md pointer-events-auto rounded-sheet p-3 text-sm"
    >
      <div className="p-2 pt-1">
        <h2 id={titleId} className="text-md font-medium pb-1">
          {textOnly.value
            ? text.end_chat_confirmation_title
            : text.end_call_confirmation_title}
        </h2>
        <p id={descriptionId} className="text-base-subtle">
          {textOnly.value
            ? text.end_chat_confirmation_description
            : text.end_call_confirmation_description}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button ref={cancelRef} onClick={cancelEnd}>
          {text.cancel_end_confirmation}
        </Button>
        <Button onClick={confirmEnd} variant="primary">
          {textOnly.value ? text.end_chat : text.end_call_confirm}
        </Button>
      </div>
    </div>
  );

  if (!overlay) {
    return card;
  }

  return (
    <div
      {...transitionProps}
      inert={dismissed}
      className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-base-primary/30 transition-opacity duration-200 data-hidden:opacity-0"
      onClick={cancelEnd}
    >
      {card}
    </div>
  );
}
