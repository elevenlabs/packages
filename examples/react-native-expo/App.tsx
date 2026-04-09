import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  TextInput,
} from "react-native";
import { VolumeBar } from "./VolumeBar";
import { FrequencyBands } from "./FrequencyBands";
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationInput,
  useConversationMode,
  useConversationFeedback,
  type ConversationStatus,
} from "@elevenlabs/react-native";

const ConversationScreen = () => {
  const [textInput, setTextInput] = useState("");
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [connectionType, setConnectionType] = useState<"webrtc" | "websocket">(
    "webrtc"
  );

  const { status, message: statusMessage } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const { isMuted, setMuted } = useConversationInput();
  const { canSendFeedback, sendFeedback } = useConversationFeedback();
  const {
    startSession,
    endSession,
    sendUserMessage,
    sendContextualUpdate,
    sendUserActivity,
    getId,
  } = useConversationControls();
  const isStarting = status === "connecting";

  const handleSubmitText = () => {
    if (textInput.trim()) {
      sendUserMessage(textInput.trim());
      setTextInput("");
      Keyboard.dismiss();
    }
  };

  const startConversation = () => {
    if (isStarting) return;

    startSession({
      agentId: process.env.EXPO_PUBLIC_AGENT_ID,
      connectionType,
      userId: "demo-user",
      textOnly: isTextOnly || undefined,
    });
  };

  const endConversation = () => {
    try {
      endSession();
    } catch (error) {
      console.error("Failed to end conversation:", error);
    }
  };

  const getStatusColor = (s: ConversationStatus): string => {
    switch (s) {
      case "connected":
        return "#10B981";
      case "connecting":
        return "#F59E0B";
      case "disconnected":
        return "#6B7280";
      case "error":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (s: ConversationStatus): string => {
    return s[0].toUpperCase() + s.slice(1);
  };

  const canStart =
    (status === "disconnected" || status === "error") && !isStarting;
  const canEnd = status === "connected";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>ElevenLabs React Native Example</Text>
      <Text style={styles.subtitle}>
        Remember to set the agentId in the code
      </Text>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(status) },
          ]}
        />
        <Text style={styles.statusText}>{getStatusText(status)}</Text>
      </View>

      {/* Error Message */}
      {status === "error" && statusMessage && (
        <Text style={styles.errorText}>{statusMessage}</Text>
      )}

      {/* Conversation ID Display */}
      {status === "connected" && (
        <View style={styles.conversationIdContainer}>
          <Text style={styles.conversationIdLabel}>Conversation ID:</Text>
          <Text style={styles.conversationIdText}>{getId() || "N/A"}</Text>
        </View>
      )}

      {/* Speaking Indicator */}
      {status === "connected" && (
        <View style={styles.speakingContainer}>
          <View
            style={[
              styles.speakingDot,
              {
                backgroundColor: isSpeaking ? "#8B5CF6" : "#D1D5DB",
              },
            ]}
          />
          <Text
            style={[
              styles.speakingText,
              { color: isSpeaking ? "#8B5CF6" : "#9CA3AF" },
            ]}
          >
            {isSpeaking ? "AI Speaking" : "AI Listening"}
          </Text>
        </View>
      )}

      {/* Volume & Frequency Indicators */}
      {status === "connected" && (
        <View style={styles.volumeContainer}>
          <VolumeBar label="Input" color="#3B82F6" direction="input" />
          <FrequencyBands color="#3B82F6" direction="input" />
          <VolumeBar label="Output" color="#8B5CF6" direction="output" />
          <FrequencyBands color="#8B5CF6" direction="output" />
        </View>
      )}

      {/* Connection Type & Text Only Toggles */}
      {status === "disconnected" && (
        <View style={styles.toggleControlContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.toggleButton,
              connectionType === "websocket"
                ? styles.toggleButtonActive
                : styles.toggleButtonPassive,
            ]}
            onPress={() =>
              setConnectionType(v => (v === "webrtc" ? "websocket" : "webrtc"))
            }
          >
            <Text style={styles.buttonText}>
              {connectionType === "webrtc" ? "WebRTC" : "WebSocket"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.toggleButton,
              isTextOnly
                ? styles.toggleButtonActive
                : styles.toggleButtonPassive,
            ]}
            onPress={() => setIsTextOnly(v => !v)}
          >
            <Text style={styles.buttonText}>
              {isTextOnly ? "Text only" : "Enable text only"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.startButton,
            !canStart && styles.disabledButton,
          ]}
          onPress={startConversation}
          disabled={!canStart}
        >
          <Text style={styles.buttonText}>
            {isStarting ? "Starting..." : "Start Conversation"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.endButton,
            !canEnd && styles.disabledButton,
          ]}
          onPress={endConversation}
          disabled={!canEnd}
        >
          <Text style={styles.buttonText}>End Conversation</Text>
        </TouchableOpacity>
      </View>

      {/* Microphone Controls */}
      {status === "connected" && (
        <View style={styles.toggleControlContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.toggleButton,
              isMuted ? styles.toggleButtonActive : styles.toggleButtonPassive,
            ]}
            onPress={() => setMuted(!isMuted)}
          >
            <Text style={styles.buttonText}>{isMuted ? "Unmute" : "Mute"}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback Buttons */}
      {status === "connected" && canSendFeedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>How was that response?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.button, styles.likeButton]}
              onPress={() => sendFeedback(true)}
            >
              <Text style={styles.buttonText}>Like</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dislikeButton]}
              onPress={() => sendFeedback(false)}
            >
              <Text style={styles.buttonText}>Dislike</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Text Input and Messaging */}
      {status === "connected" && (
        <View style={styles.messagingContainer}>
          <Text style={styles.messagingLabel}>Send Text Message</Text>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={text => {
              setTextInput(text);
              // Prevent agent from interrupting while user is typing
              if (text.length > 0) {
                sendUserActivity();
              }
            }}
            placeholder="Type your message or context... (Press Enter to send)"
            multiline
            onSubmitEditing={handleSubmitText}
            returnKeyType="send"
            blurOnSubmit={true}
          />
          <View style={styles.messageButtons}>
            <TouchableOpacity
              style={[styles.button, styles.messageButton]}
              onPress={handleSubmitText}
              disabled={!textInput.trim()}
            >
              <Text style={styles.buttonText}>Send Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.contextButton]}
              onPress={() => {
                if (textInput.trim()) {
                  sendContextualUpdate(textInput.trim());
                  setTextInput("");
                  Keyboard.dismiss();
                }
              }}
              disabled={!textInput.trim()}
            >
              <Text style={styles.buttonText}>Send Context</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default function App() {
  return (
    <ConversationProvider
      onConnect={({ conversationId }) => {
        console.log("Connected to conversation", conversationId);
      }}
      onDisconnect={details => {
        console.log("Disconnected from conversation", details);
      }}
      onError={(message, context) => {
        console.error("Conversation error:", message, context);
      }}
      onMessage={({ message, role }) => {
        console.log(`Message from ${role}:`, message);
      }}
      onModeChange={({ mode }) => {
        console.log(`Mode: ${mode}`);
      }}
      onStatusChange={({ status }) => {
        console.log(`Status: ${status}`);
      }}
      onCanSendFeedbackChange={({ canSendFeedback }) => {
        console.log(`Can send feedback: ${canSendFeedback}`);
      }}
      onVadScore={({ vadScore }) => {
        // Commented out as it's quite noisy
        // console.log(`VAD Score: ${vadScore}`);
      }}
      onInterruption={event => {
        console.log("Interruption detected:", event);
      }}
      onMCPToolCall={event => {
        console.log("MCP Tool Call:", event);
      }}
      onMCPConnectionStatus={event => {
        console.log("MCP Connection Status:", event);
      }}
      onAgentToolRequest={event => {
        console.log("Agent Tool Request:", event);
      }}
      onAgentToolResponse={event => {
        console.log("Agent Tool Response:", event);
      }}
      onAgentChatResponsePart={part => {
        console.log("Agent Response Part:", part);
      }}
      onAudioAlignment={alignment => {
        console.log("Audio Alignment:", {
          chars: alignment.chars.join(""),
          charCount: alignment.chars.length,
          totalDuration: alignment.char_durations_ms.reduce((a, b) => a + b, 0),
        });
      }}
      onDebug={data => {
        console.log("Debug:", data);
      }}
    >
      <ConversationScreen />
    </ConversationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 20,
    paddingVertical: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  conversationIdContainer: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
  },
  conversationIdLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  conversationIdText: {
    fontSize: 14,
    fontFamily: "monospace",
    color: "#374151",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  speakingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  speakingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  speakingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#10B981",
  },
  endButton: {
    backgroundColor: "#EF4444",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  feedbackContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: 16,
  },
  likeButton: {
    backgroundColor: "#10B981",
  },
  dislikeButton: {
    backgroundColor: "#EF4444",
  },
  messagingContainer: {
    marginTop: 24,
    width: "100%",
  },
  messagingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 16,
  },
  messageButtons: {
    flexDirection: "row",
    gap: 16,
  },
  messageButton: {
    backgroundColor: "#3B82F6",
    flex: 1,
  },
  contextButton: {
    backgroundColor: "#4F46E5",
    flex: 1,
  },
  volumeContainer: {
    width: "100%",
    marginBottom: 16,
    gap: 4,
  },
  toggleControlContainer: {
    flexDirection: "row",
    gap: 12,
    margin: 12,
    alignItems: "center",
  },
  toggleButton: {
    paddingHorizontal: 24,
    backgroundColor: "#808080",
    borderColor: "#000000",
    borderWidth: 2,
  },
  toggleButtonActive: {
    borderColor: "#000000",
  },
  toggleButtonPassive: {
    borderColor: "transparent",
  },
});
