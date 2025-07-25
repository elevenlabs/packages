import { PACKAGE_VERSION } from "../version";

export const extractRoomIdFromToken = (token: string): string => {
  try {
    const tokenPayload = JSON.parse(atob(token.split(".")[1]));
    return tokenPayload.video?.room || "";
  } catch (error) {
    console.warn("Could not extract room ID from token");
    return "";
  }
};

export const getConversationToken = async (
  agentId: string
): Promise<string> => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}&source=react_native_sdk&version=${PACKAGE_VERSION}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to get conversation token: ${data.detail.message}`);
  }

  if (!data.token) {
    throw new Error("No conversation token received from API");
  }

  return data.token;
};
