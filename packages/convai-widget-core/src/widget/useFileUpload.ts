import { signal, ReadonlySignal, computed } from "@preact/signals";
import { useCallback, useEffect, useMemo, useRef } from "preact/compat";
import { useServerLocation } from "../contexts/server-location";

const ACCEPTED_MIME_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];

export const ACCEPTED_FILE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
] as const;

const MAX_IMAGE_SIZE_MB = 10;
const MAX_PDF_SIZE_MB = 20;

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isAcceptedMimeType(mimeType: string): boolean {
  return ACCEPTED_MIME_TYPES.includes(mimeType);
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

export type AddFileError = "unsupported_type" | "too_large" | "limit_reached";

interface UploadResponse {
  file_id: string;
}

function filesEndpoint(baseUrl: string, conversationId: string): string {
  return `${baseUrl}/v1/convai/conversations/${conversationId}/files`;
}

/** Fire-and-forget DELETE for a server-side file. Errors are swallowed
 * because the pending slot has already been released locally. */
function deleteUploadedFile(
  baseUrl: string,
  conversationId: string,
  fileId: string
): void {
  fetch(`${filesEndpoint(baseUrl, conversationId)}/${fileId}`, {
    method: "DELETE",
  }).catch(() => {});
}

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
  // Preview URLs for already-sent files — kept alive for the transcript
  // thumbnails, revoked on new conversation or unmount.
  const sentUrlsRef = useRef<string[]>([]);
  const uploadAbortRef = useRef<AbortController | null>(null);

  /** Release the pending slot: abort an in-flight upload, delete a ready
   * file server-side, revoke the preview URL. Clears the signal first so
   * any in-flight upload resolution falls into the orphan-DELETE branch. */
  const discardPending = (convId: string | null): void => {
    const pendingFileToDiscard = pendingFile.peek();
    if (!pendingFileToDiscard) return;
    pendingFile.value = null;
    if (pendingFileToDiscard.status === "uploading") {
      uploadAbortRef.current?.abort();
    } else if (pendingFileToDiscard.status === "ready" && convId) {
      deleteUploadedFile(serverUrl.peek(), convId, pendingFileToDiscard.fileId);
    }
    revokeUrl(previewUrlRef.current);
    previewUrlRef.current = null;
  };

  // Reset state on conversation change — the old fileId is no longer valid.
  if (conversationId !== lastConversationIdRef.current) {
    const prevConversationId = lastConversationIdRef.current;
    lastConversationIdRef.current = conversationId;
    sentFileCount.value = 0;
    // Only reclaim sent-file blob URLs when a new conversation starts — while
    // disconnected the previous transcript (and its <img> refs) is still shown.
    if (conversationId !== null) {
      sentUrlsRef.current.forEach(revokeUrl);
      sentUrlsRef.current = [];
    }
    discardPending(prevConversationId);
  }

  useEffect(() => {
    return () => {
      discardPending(lastConversationIdRef.current);
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

  /** Validate and start uploading the file. */
  const addFile = useCallback(
    (file: File): AddFileError | null => {
      // Defensive: the upload button is disabled while disconnected, so this
      // should be unreachable. Silently no-op if it isn't.
      if (!conversationId) return null;

      if (hasReachedLimit.peek()) return "limit_reached";
      if (!isAcceptedMimeType(file.type)) return "unsupported_type";
      if (file.size > getMaxSizeBytes(file.type)) return "too_large";

      revokeUrl(previewUrlRef.current);
      previewUrlRef.current = null;

      const previewUrl = isImageMimeType(file.type)
        ? URL.createObjectURL(file)
        : null;
      previewUrlRef.current = previewUrl;

      pendingFile.value = { file, status: "uploading", previewUrl };

      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      uploadAbortRef.current = controller;
      // Capture the conversation id at upload time so orphan cleanup targets
      // the right conversation even if the user has since switched.
      const uploadConversationId = conversationId;
      const baseUrl = serverUrl.peek();

      fetch(filesEndpoint(baseUrl, uploadConversationId), {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
        .then(async (res): Promise<UploadResponse> => {
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(
              body?.detail?.message ?? body?.detail ?? "Upload failed"
            );
          }
          return res.json();
        })
        .then(data => {
          const currentPendingFile = pendingFile.peek();
          if (currentPendingFile?.file === file) {
            pendingFile.value = {
              status: "ready",
              file: currentPendingFile.file,
              previewUrl: currentPendingFile.previewUrl,
              fileId: data.file_id,
            };
          } else {
            // Pending slot was released mid-flight but the server still
            // accepted the upload — clean up the orphan.
            deleteUploadedFile(baseUrl, uploadConversationId, data.file_id);
          }
        })
        .catch(err => {
          if (err?.name === "AbortError") return;
          console.warn("[convai] file upload failed:", err);
          const currentPendingFile = pendingFile.peek();
          if (currentPendingFile?.file === file) {
            pendingFile.value = {
              status: "error",
              file: currentPendingFile.file,
              previewUrl: currentPendingFile.previewUrl,
              error: err?.message ?? "Upload failed",
            };
          }
        })
        .finally(() => {
          if (uploadAbortRef.current === controller) {
            uploadAbortRef.current = null;
          }
        });

      return null;
    },
    [conversationId, pendingFile, serverUrl, hasReachedLimit]
  );

  const removeFile = useCallback(() => {
    discardPending(conversationId);
  }, [conversationId]);

  /** Promote the pending file to "sent": retain its preview URL for the
   * transcript image, free the pending slot, count it against the limit. */
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

function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}
