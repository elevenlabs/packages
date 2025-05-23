import { Signal } from "@preact/signals";
import { useTextContents } from "../contexts/text-contents";
import { useConversation } from "../contexts/conversation";
import { useCallback } from "preact/compat";
import { CopyButton } from "../components/CopyButton";
import { Button } from "../components/Button";

interface ErrorModalProps {
  sawError: Signal<boolean>;
}

export function ErrorModal({ sawError }: ErrorModalProps) {
  const text = useTextContents();
  const { error, lastId } = useConversation();

  const handleClose = useCallback(() => {
    sawError.value = true;
  }, []);

  return (
    <div className="max-w-[400px] flex flex-col gap-2 bg-base shadow-md pointer-events-auto rounded-sheet p-3 text-sm">
      <div className="p-2 pt-1">
        <h1 className="text-md font-medium pb-1">{text.error_occurred}</h1>
        {error.value}
        {lastId.value && (
          <>
            <br />
            <span className="text-base-subtle">
              {text.conversation_id}: {lastId.value}
            </span>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <CopyButton copyText={lastId}>{text.copy_id}</CopyButton>
        <Button variant="primary" onClick={handleClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
