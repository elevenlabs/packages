import { cn } from "../utils/cn";
import { Icon } from "../components/Icon";
import { useTextContents } from "../contexts/text-contents";
import type { PendingFile } from "./useFileUpload";

interface PendingFilePreviewProps {
  pendingFile: PendingFile;
  onRemove: () => void;
}

export function PendingFilePreview({
  pendingFile,
  onRemove,
}: PendingFilePreviewProps) {
  const text = useTextContents();
  const isImage = pendingFile.file.type.startsWith("image/");
  const isUploading = pendingFile.status === "uploading";
  const hasError = pendingFile.status === "error";

  return (
    <div
      className={cn(
        "relative inline-flex items-center gap-2 rounded-input border py-1.5 pl-1.5 pr-7 overflow-hidden",
        hasError
          ? "border-base-error/30 bg-base-error/5"
          : "border-base-border/60 bg-base-active/40"
      )}
    >
      {isImage && pendingFile.previewUrl ? (
        <img
          src={pendingFile.previewUrl}
          alt={pendingFile.file.name}
          className="h-11 w-11 rounded-input object-cover shrink-0 bg-base-active"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-input bg-base-active shrink-0">
          <FileTextIcon />
        </div>
      )}

      <span className="text-sm text-base-primary truncate max-w-[160px]">
        {pendingFile.file.name}
      </span>

      {hasError && (
        <span
          className="text-xs text-base-error truncate max-w-[120px]"
          title={pendingFile.error}
        >
          {pendingFile.error}
        </span>
      )}

      {isUploading && (
        <Icon
          name="loader"
          size="sm"
          className="animate-spin text-base-subtle shrink-0"
        />
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={text.remove_file.value}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 !mt-0 text-base-subtle hover:text-base-primary transition-colors"
      >
        <Icon name="x" size="sm" />
      </button>
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="text-base-subtle"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}
