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
  // render the image thumbnail. Revoked only when a new conversation starts
  // (the previous transcript is cleared) or on unmount.
  const sentUrlsRef = useRef<string[]>([]);
  const uploadAbortRef = useRef<AbortController | null>(null);

  // Reset state when the conversation changes — the old fileId is no longer valid.
  if (conversationId !== lastConversationIdRef.current) {
    const prev = pendingFile.value;
    const prevConversationId = lastConversationIdRef.current;
    lastConversationIdRef.current = conversationId;
    sentFileCount.value = 0;
    // Keep sent URLs alive while the previous transcript is still visible
    // (i.e. we just disconnected). Only reclaim them when a new conversation
    // starts and the transcript is about to be cleared.
    if (conversationId !== null) {
      sentUrlsRef.current.forEach(revokeUrl);
      sentUrlsRef.current = [];
    }
    if (prev) {
      if (prev.status === "uploading") {
        // Abort best-effort. The .then handler will still fire a DELETE if
        // the server accepted the upload before we aborted.
        uploadAbortRef.current?.abort();
      } else if (prev.status === "ready" && prevConversationId) {
        fetch(
          `${serverUrl.peek()}/v1/convai/conversations/${prevConversationId}/files/${prev.fileId}`,
          { method: "DELETE" }
        ).catch(() => {});
      }
      revokeUrl(previewUrlRef.current);
      previewUrlRef.current = null;
      pendingFile.value = null;
    }
  }

  useEffect(() => {
    return () => {
      const current = pendingFile.peek();
      // Null out the pending file *before* aborting so the upload's .then
      // handler sees the file is no longer ours and falls into the orphan
      // DELETE branch if the server accepted the upload after the abort.
      pendingFile.value = null;
      uploadAbortRef.current?.abort();
      // Clean up a ready-but-unsent file server-side.
      if (current?.status === "ready" && lastConversationIdRef.current) {
        fetch(
          `${serverUrl.peek()}/v1/convai/conversations/${lastConversationIdRef.current}/files/${current.fileId}`,
          { method: "DELETE" }
        ).catch(() => {});
      }
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

      const controller = new AbortController();
      uploadAbortRef.current = controller;
      // Capture the conversation id at upload time so orphan cleanup targets
      // the right conversation even if the user has since switched.
      const uploadConversationId = conversationId;
      const baseUrl = serverUrl.peek();

      fetch(
        `${baseUrl}/v1/convai/conversations/${uploadConversationId}/files`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
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
          } else {
            // The upload was discarded (cancelled or conversation changed)
            // while the request was in flight but the server still accepted
            // it — clean up the orphan.
            fetch(
              `${baseUrl}/v1/convai/conversations/${uploadConversationId}/files/${data.file_id}`,
              { method: "DELETE" }
            ).catch(() => {});
          }
        })
        .catch(err => {
          if (err?.name === "AbortError") return;
          console.warn("[convai] file upload failed:", err);
          if (pendingFile.peek()?.file === file) {
            pendingFile.value = {
              ...pendingFile.peek()!,
              status: "error",
              error: err?.message ?? "Upload failed",
            } as PendingFile;
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

  /** Cancel/discard the pending file (aborts in-flight uploads and deletes
   * the file server-side if it was already accepted). */
  const removeFile = useCallback(() => {
    const current = pendingFile.peek();
    if (!current) return;

    if (current.status === "uploading") {
      // Abort best-effort; if the server still accepts the upload the .then
      // handler in addFile will fire a DELETE for the orphan.
      uploadAbortRef.current?.abort();
    } else if (current.status === "ready" && conversationId) {
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
