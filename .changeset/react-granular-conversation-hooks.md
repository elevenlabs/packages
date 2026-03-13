---
"@elevenlabs/react": minor
---

Add granular conversation hooks for better render performance. Each hook subscribes to an independent slice of conversation state, so a status change won't re-render a component that only uses mode, and vice versa.

**New hooks:**

- `useConversationControls()` — stable action methods: `startSession`, `endSession`, `sendUserMessage`, `setVolume`, `changeInputDevice`, `changeOutputDevice`, `sendContextualUpdate`, `sendFeedback`, `sendUserActivity`, `sendMCPToolApprovalResult`, `getId`, `getInputByteFrequencyData`, `getOutputByteFrequencyData`, `getInputVolume`, `getOutputVolume`. References are stable across renders and never cause re-renders.
- `useConversationStatus()` — reactive `status` (`"disconnected" | "connecting" | "connected" | "error"`) and optional `message`.
- `useConversationInput()` — reactive `isMuted` state and `setMuted` action.
- `useConversationMode()` — reactive `mode` (`"speaking" | "listening"`) with `isSpeaking` / `isListening` convenience booleans.
- `useConversationFeedback()` — `canSendFeedback` state and `sendFeedback(like: boolean)` action.
- `useRawConversation()` — escape hatch returning the raw `Conversation` instance or `null`.

**New types:** `ConversationControlsValue`, `ConversationStatusValue`, `ConversationInputValue`, `ConversationModeValue`, `ConversationFeedbackValue`.

All hooks must be used within a `ConversationProvider`.

## Migrating from `useConversation` to granular hooks

With `useConversation`, every state change re-renders the consuming component. The granular hooks let you split your UI so each component subscribes only to what it needs:

| `useConversation` return value | Granular hook |
|---|---|
| `status`, `message` | `useConversationStatus()` |
| `isSpeaking`, `isListening`, `mode` | `useConversationMode()` |
| `canSendFeedback`, `sendFeedback` | `useConversationFeedback()` |
| `isMuted`, `setMuted` | `useConversationInput()` |
| `startSession`, `endSession`, `setVolume`, … | `useConversationControls()` |

```tsx
import {
  ConversationProvider,
  useConversationStatus,
  useConversationMode,
  useConversationControls,
  useConversationInput,
  useConversationFeedback,
} from "@elevenlabs/react";

function App() {
  return (
    <ConversationProvider agentId="your-agent-id">
      <StatusBadge />
      <Controls />
      <MuteButton />
      <FeedbackButtons />
      <ModeIndicator />
    </ConversationProvider>
  );
}

/** Only re-renders when status changes. */
function StatusBadge() {
  const { status } = useConversationStatus();
  return <span className={`badge badge-${status}`}>{status}</span>;
}

/** Never re-renders — controls are stable references. */
function Controls() {
  const { startSession, endSession } = useConversationControls();
  return (
    <div>
      <button onClick={() => startSession()}>Start</button>
      <button onClick={() => endSession()}>Stop</button>
    </div>
  );
}

/** Only re-renders when mute state changes. */
function MuteButton() {
  const { isMuted, setMuted } = useConversationInput();
  return (
    <button onClick={() => setMuted(!isMuted)}>
      {isMuted ? "Unmute" : "Mute"}
    </button>
  );
}

/** Only re-renders when feedback availability changes. */
function FeedbackButtons() {
  const { canSendFeedback, sendFeedback } = useConversationFeedback();
  if (!canSendFeedback) return null;
  return (
    <div>
      <button onClick={() => sendFeedback(true)}>👍</button>
      <button onClick={() => sendFeedback(false)}>👎</button>
    </div>
  );
}

/** Only re-renders when mode changes. */
function ModeIndicator() {
  const { isSpeaking, isListening } = useConversationMode();
  return (
    <p>{isSpeaking ? "Agent is speaking..." : isListening ? "Listening..." : ""}</p>
  );
}
```
