// No-argument AudioNode.disconnect() throws InvalidAccessError in some
// browsers when the node has no outgoing connection. A session can still
// finish closing in that case. Other failures propagate.
export function disconnectAudioNode(node: AudioNode): void {
  try {
    node.disconnect();
  } catch (error) {
    if (!isAlreadyDisconnected(error)) {
      throw error;
    }
  }
}

function isAlreadyDisconnected(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "InvalidAccessError"
  );
}
