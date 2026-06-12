import { assertJsonObject } from "./assert.js";
import { extractApiErrorMessage } from "./errors.js";

const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";

export type UploadFileArgs = {
  conversationId: string;
  origin?: string;
  file: Blob;
  filename?: string;
};

export type UploadFileResult = {
  fileId: string;
};

export async function uploadFile({
  conversationId,
  origin: rawOrigin,
  file,
  filename: filenameOverride,
}: UploadFileArgs): Promise<UploadFileResult> {
  const origin = (rawOrigin ?? HTTPS_API_ORIGIN)
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://");

  const filename =
    filenameOverride ??
    ("name" in file && typeof file.name === "string"
      ? file.name
      : `upload.${(file.type || "image/png").split("/").pop()?.split("+")[0]}`);

  const body = new FormData();
  body.append("file", file, filename);

  const response = await fetch(
    `${origin}/v1/convai/conversations/${conversationId}/files`,
    { method: "POST", body }
  );

  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(`Upload failed: ${response.status} ${message}`);
  }

  const result: unknown = await response.json();
  assertJsonObject(result, "Upload response is not a JSON object");
  const { file_id } = result;
  if (typeof file_id !== "string" || !file_id) {
    throw new Error("Upload response is missing a valid file_id");
  }
  return { fileId: file_id };
}
