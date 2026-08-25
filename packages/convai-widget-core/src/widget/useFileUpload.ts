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
  const pendingFiles = useMemo(() => signal<PendingFile[]>([]), []);
  const sentFileCount = useMemo(() => signal(0), []);
  const lastConversationIdRef = useRef<string | null>(null);
  const sentUrlsRef = useRef<string[]>([]);
  const uploadAbortsRef = useRef(new Map<File, AbortController>());

  const discardFile = (pending: PendingFile, convId: string | null): void => {
    if (pending.status === "uploading") {
      uploadAbortsRef.current.get(pending.file)?.abort();
      uploadAbortsRef.current.delete(pending.file);
    } else if (pending.status === "ready" && convId) {
      deleteUploadedFile(serverUrl.peek(), convId, pending.fileId);
    }
    revokeUrl(pending.previewUrl);
  };

  const discardAll = (convId: string | null): void => {
    const current = pendingFiles.peek();
    pendingFiles.value = [];
    current.forEach(pending => discardFile(pending, convId));
  };

  if (conversationId !== lastConversationIdRef.current) {
    const prevConversationId = lastConversationIdRef.current;
    lastConversationIdRef.current = conversationId;
    sentFileCount.value = 0;
    if (conversationId !== null) {
      sentUrlsRef.current.forEach(revokeUrl);
      sentUrlsRef.current = [];
    }
    discardAll(prevConversationId);
  }

  useEffect(() => {
    return () => {
      discardAll(lastConversationIdRef.current);
      sentUrlsRef.current.forEach(revokeUrl);
    };
  }, []);

  const hasReachedLimit = useMemo(
    () =>
      computed(() => {
        if (maxFiles == null) return false;
        return sentFileCount.value + pendingFiles.value.length >= maxFiles;
      }),
    [maxFiles, pendingFiles, sentFileCount]
  );

  const isUploading = useMemo(
    () =>
      computed(() => pendingFiles.value.some(file => file.status === "uploading")),
    [pendingFiles]
  );

  const addFile = useCallback(
    (file: File): AddFileError | null => {
      if (!conversationId) return null;

      if (hasReachedLimit.peek()) return "limit_reached";
      if (!isAcceptedMimeType(file.type)) return "unsupported_type";
      if (file.size > getMaxSizeBytes(file.type)) return "too_large";

      const previewUrl = isImageMimeType(file.type)
        ? URL.createObjectURL(file)
        : null;

      pendingFiles.value = [
        ...pendingFiles.peek(),
        { file, status: "uploading", previewUrl },
      ];

      const controller = new AbortController();
      uploadAbortsRef.current.set(file, controller);
      const uploadConversationId = conversationId;
      const baseUrl = serverUrl.peek();

      fetch(filesEndpoint(baseUrl, uploadConversationId), {
        method: "POST",
        body: (() => {
          const formData = new FormData();
          formData.append("file", file);
          return formData;
        })(),
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
          const current = pendingFiles.peek();
          const index = current.findIndex(pending => pending.file === file);
          if (index >= 0) {
            const next = [...current];
            next[index] = {
              status: "ready",
              file,
              previewUrl: current[index].previewUrl,
              fileId: data.file_id,
            };
            pendingFiles.value = next;
          } else {
            deleteUploadedFile(baseUrl, uploadConversationId, data.file_id);
          }
        })
        .catch(err => {
          if (err?.name === "AbortError") return;
          console.warn("[convai] file upload failed:", err);
          const current = pendingFiles.peek();
          const index = current.findIndex(pending => pending.file === file);
          if (index >= 0) {
            const next = [...current];
            next[index] = {
              status: "error",
              file,
              previewUrl: current[index].previewUrl,
              error: err?.message ?? "Upload failed",
            };
            pendingFiles.value = next;
          }
        })
        .finally(() => {
          if (uploadAbortsRef.current.get(file) === controller) {
            uploadAbortsRef.current.delete(file);
          }
        });

      return null;
    },
    [conversationId, pendingFiles, serverUrl, hasReachedLimit]
  );

  const removeFile = useCallback(
    (file: File) => {
      const current = pendingFiles.peek();
      const pending = current.find(item => item.file === file);
      if (!pending) return;
      pendingFiles.value = current.filter(item => item.file !== file);
      discardFile(pending, conversationId);
    },
    [conversationId, pendingFiles]
  );

  const markFilesAsSent = useCallback(() => {
    const current = pendingFiles.peek();
    current.forEach(pending => {
      if (pending.previewUrl) {
        sentUrlsRef.current.push(pending.previewUrl);
      }
    });
    pendingFiles.value = [];
    sentFileCount.value += current.filter(pending => pending.status === "ready")
      .length;
  }, [pendingFiles, sentFileCount]);

  return {
    pendingFiles: pendingFiles as ReadonlySignal<PendingFile[]>,
    isUploading,
    hasReachedLimit,
    addFile,
    removeFile,
    markFilesAsSent,
  };
}

function revokeUrl(url: string | null) {
  if (url) URL.revokeObjectURL(url);
}
