import { PACKAGE_VERSION } from "../version";

export const extractConversationIdFromToken = (token: string): string => {
  try {
    const tokenPayload = JSON.parse(atob(token.split(".")[1]));
    const roomId = tokenPayload.video?.room || "";

    return roomId.match(/(conv_[a-zA-Z0-9]+)/)?.[0] || "";
  } catch (error) {
    console.warn("Could not extract conversation ID from token");
    return "";
  }
};

export const getConversationToken = async (
  agentId: string,
  tokenFetchUrl?: string
): Promise<string> => {
  try {
    const baseUrl =
      tokenFetchUrl || "https://api.elevenlabs.io/v1/convai/conversation/token";
    const response = await fetch(
      `${baseUrl}?agent_id=${agentId}&source=react_native_sdk&version=${PACKAGE_VERSION}`
    );

    const data = await response.json();

    if (!response.ok) {
      if (
        typeof data.detail === "object" &&
        data.detail !== null &&
        typeof data.detail.message === "string"
      ) {
        throw new Error(data.detail.message);
      }
      throw new Error("Missing error details or message");
    }

    if (!data.token) {
      throw new Error("No conversation token received from API");
    }

    return data.token;
  } catch (error) {
    throw new Error(
      `Failed to get conversation token: ${error instanceof Error ? error.message : "No message"}`
    );
  }
};
