import { signal, ReadonlySignal, computed } from "@preact/signals";
import { useCallback, useEffect, useRef } from "preact/compat";
import { useMemo } from "preact/compat";
import { useServerLocation } from "../contexts/server-location";

const ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export const ACCEPTED_FILE_EXTENSIONS =
  ".png,.jpg,.jpeg,.gif,.webp,.pdf" as const;

const MAX_IMAGE_SIZE_MB = 10;
const MAX_PDF_SIZE_MB = 20;

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isAcceptedMimeType(mimeType: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

function getMaxSizeBytes(mimeType: string): number {
  const mb = isImageMimeType(mimeType) ? MAX_IMAGE_SIZE_MB : MAX_PDF_SIZE_MB;
  return mb * 1024 * 1024;
}

export type PendingFile =
  | { status: "uploading"; file: File; previewUrl: string | null }
  | {
      status: "ready";
      file: File;
      fileId: string;
      previewUrl: string | null;
    }
  | {
      status: "error";
      file: File;
      error: string;
      previewUrl: string | null;
    };

interface UseFileUploadOptions {
  conversationId: string | null;
  maxFiles: number | null;
}

export function useFileUpload({
  conversationId,
  maxFiles,
}: UseFileUploadOptions) {
  const { serverUrl } = useServerLocation();
  const pendingFile = useMemo(() => signal<PendingFile | null>(null), []);
  const sentFileCount = useMemo(() => signal(0), []);
  const lastConversationIdRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  // Preview URLs for sent files — kept alive so TranscriptMessage can still
  // render the image thumbnail; revoked on unmount.
  const sentUrlsRef = useRef<string[]>([]);

  // Reset the per-conversation file counter when the conversation changes.
  if (conversationId !== lastConversationIdRef.current) {
    lastConversationIdRef.current = conversationId;
    sentFileCount.value = 0;
  }

  useEffect(() => {
    return () => {
      revokeUrl(previewUrlRef.current);
      sentUrlsRef.current.forEach(revokeUrl);
    };
  }, []);

  const hasReachedLimit = useMemo(
    () =>
      computed(() => {
        if (maxFiles == null) return false;
        const pendingCount = pendingFile.value ? 1 : 0;
        return sentFileCount.value + pendingCount >= maxFiles;
      }),
    [maxFiles, pendingFile, sentFileCount]
  );

  const isUploading = useMemo(
    () => computed(() => pendingFile.value?.status === "uploading"),
    [pendingFile]
  );

  /** Validate and start uploading. Returns an error code on failure, null on success. */
  const addFile = useCallback(
    (file: File): string | null => {
      if (!conversationId) {
        return "Cannot upload files before the conversation is connected.";
      }

      if (hasReachedLimit.peek()) {
        return "limit_reached";
      }

      if (!isAcceptedMimeType(file.type)) {
        return "unsupported_type";
      }

      if (file.size > getMaxSizeBytes(file.type)) {
        return "too_large";
      }

      revokeUrl(previewUrlRef.current);
      previewUrlRef.current = null;

      const previewUrl = isImageMimeType(file.type)
        ? URL.createObjectURL(file)
        : null;
      previewUrlRef.current = previewUrl;

      pendingFile.value = { file, status: "uploading", previewUrl };

      const formData = new FormData();
      formData.append("file", file);

      fetch(
        `${serverUrl.peek()}/v1/convai/conversations/${conversationId}/files`,
        { method: "POST", body: formData }
      )
        .then(async res => {
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(
              body?.detail?.message ?? body?.detail ?? "Upload failed"
            );
          }
          return res.json();
        })
        .then(data => {
          if (pendingFile.peek()?.file === file) {
            pendingFile.value = {
              ...pendingFile.peek()!,
              status: "ready",
              fileId: data.file_id,
            } as PendingFile;
          }
        })
        .catch(err => {
          if (pendingFile.peek()?.file === file) {
            pendingFile.value = {
              ...pendingFile.peek()!,
              status: "error",
              error: err?.message ?? "Upload failed",
            } as PendingFile;
          }
        });

      return null;
    },
    [conversationId, pendingFile, serverUrl, hasReachedLimit]
  );

  /** Cancel/discard the pending file (deletes it server-side if already uploaded). */
  const removeFile = useCallback(() => {
    const current = pendingFile.peek();
    if (!current) return;

    if (current.status === "ready" && conversationId) {
      fetch(
        `${serverUrl.peek()}/v1/convai/conversations/${conversationId}/files/${current.fileId}`,
        { method: "DELETE" }
      ).catch(() => {});
    }

    revokeUrl(previewUrlRef.current);
    previewUrlRef.current = null;
    pendingFile.value = null;
  }, [pendingFile, conversationId, serverUrl]);

  /** Mark the pending file as sent — increments the per-conversation counter. */
  const markFileAsSent = useCallback(() => {
    if (previewUrlRef.current) {
      sentUrlsRef.current.push(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    pendingFile.value = null;
    sentFileCount.value++;
  }, [pendingFile, sentFileCount]);

  return {
    pendingFile: pendingFile as ReadonlySignal<PendingFile | null>,
    isUploading,
    hasReachedLimit,
    addFile,
    removeFile,
    markFileAsSent,
  };
}

/** Release a blob URL's underlying memory. No-op if null. */
function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}
