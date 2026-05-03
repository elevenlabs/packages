import { useRef, useCallback } from "preact/compat";
import { useTextContents } from "../contexts/text-contents";
import { BaseButtonProps, Button } from "../components/Button";
import { ACCEPTED_FILE_EXTENSIONS } from "./useFileUpload";

interface UploadFileButtonProps extends BaseButtonProps {
  iconOnly?: boolean;
  disabled?: boolean;
  onFileSelect: (file: File) => void;
}

export function UploadFileButton({
  iconOnly,
  disabled,
  onFileSelect,
  children,
  ...props
}: UploadFileButtonProps) {
  const text = useTextContents();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback((e: Event) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: Event) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      input.value = "";
    },
    [onFileSelect]
  );

  return (
    <>
      <Button
        variant="secondary"
        icon="paperclip"
        onClick={handleClick}
        disabled={disabled}
        aria-label={text.attach_file}
        {...props}
      >
        {!iconOnly ? (children ?? text.attach_file) : undefined}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
