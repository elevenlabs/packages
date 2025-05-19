import { BaseButtonProps, Button } from "./Button";
import { getSignalish, Signalish } from "../utils/signalish";
import { useTextContents } from "../contexts/text-contents";
import { useCallback, useEffect, useState } from "preact/compat";

interface CopyButtonProps extends BaseButtonProps {
  copyText: Signalish<string | null>;
}

export function CopyButton({ copyText, children }: CopyButtonProps) {
  const text = useTextContents();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (copied) {
      const id = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => {
        clearTimeout(id);
      };
    }
  }, [copied]);

  const handleClick = useCallback(() => {
    const text = getSignalish(copyText);
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
    }
  }, []);

  return (
    <Button onClick={handleClick}>{copied ? text.copied : children}</Button>
  );
}
