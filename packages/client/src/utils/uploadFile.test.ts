import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "./uploadFile.js";

describe("uploadFile", () => {
  let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mockFetchSuccess() {
    fetchSpy = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ file_id: "test-file-id" }),
    } as Response);
    vi.stubGlobal("fetch", fetchSpy);
  }

  function getUploadedFilename(): string {
    const formData = fetchSpy.mock.calls[0]![1]!.body as FormData;
    return (formData.get("file") as File).name;
  }

  it("uploads to the conversation files endpoint", async () => {
    mockFetchSuccess();

    await expect(
      uploadFile({
        conversationId: "conversation-123",
        origin: "https://api.example.com",
        file: new Blob(["test"]),
      })
    ).resolves.toEqual({ fileId: "test-file-id" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/v1/convai/conversations/conversation-123/files",
      {
        method: "POST",
        body: expect.any(FormData),
      }
    );
  });

  it("uses the provided filename override", async () => {
    mockFetchSuccess();

    await uploadFile({
      conversationId: "conversation-123",
      file: new Blob(["test"], { type: "application/pdf" }),
      filename: "attachment.pdf",
    });

    expect(getUploadedFilename()).toBe("attachment.pdf");
  });
});
