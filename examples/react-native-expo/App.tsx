import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { TextInput } from "react-native";
import { AmberNexusProvider, useConversation } from "@ambernexus/react-native";
import type { ConversationStatus } from "@ambernexus/react-native";

const ConversationScreen = () => {
  const [isStarting, setIsStarting] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const conversation = useConversation({
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log("✅ Connected to conversation", conversationId);
      setCurrentConversationId(conversationId);
    },
    onDisconnect: (details) => {
      console.log("❌ Disconnected from conversation", details);
      setCurrentConversationId(null);
    },
    onError: (message: string, context?: Record<string, unknown>) => {
      console.error("❌ Conversation error:", message, context);
    },
    onMessage: ({ message, role }) => {
      console.log(`💬 Message from ${role}:`, message);
    },
    onModeChange: ({ mode }: { mode: "speaking" | "listening" }) => {
      console.log(`🔊 Mode: ${mode}`);
    },
    onStatusChange: ({ status }: { status: ConversationStatus }) => {
      console.log(`📡 Status: ${status}`);
    },
    onCanSendFeedbackChange: ({
      canSendFeedback,
    }: {
      canSendFeedback: boolean;
    }) => {
      console.log(`🔊 Can send feedback: ${canSendFeedback}`);
    },
    onVadScore: ({ vadScore }: { vadScore: number }) => {
      // commented out as it's quite noisy
      // console.log(`🎙️ VAD Score: ${vadScore}`);
    },
    onInterruption: (event) => {
      console.log("⚡ Interruption detected:", event);
    },
    onAudio: (base64Audio: string) => {
      console.log(`🔊 Audio chunk received: ${base64Audio} bytes`);
    },
    onMCPToolCall: (event) => {
      console.log("🔧 MCP Tool Call:", event);
    },
    onMCPConnectionStatus: (event) => {
      console.log("🔌 MCP Connection Status:", event);
    },
    onAgentToolRequest: (event) => {
      console.log("🛠️ Agent Tool Request:", event);
    },
    onAgentToolResponse: (event) => {
      console.log("🛠️ Agent Tool Response:", event);
    },
    onConversationMetadata: (metadata) => {
      console.log("📋 Conversation Metadata:", metadata);
    },
    onAsrInitiationMetadata: (metadata) => {
      console.log("🎤 ASR Metadata:", metadata);
    },
    onAgentChatResponsePart: (part) => {
      console.log("📝 Agent Response Part:", part);
    },
    onAudioAlignment: (alignment) => {
      console.log("🎯 Audio Alignment:", {
        chars: alignment.chars.join(""),
        charCount: alignment.chars.length,
        totalDuration: alignment.char_durations_ms.reduce((a, b) => a + b, 0),
      });
    },
    onUnhandledClientToolCall: (toolCall) => {
      console.warn("⚠️ Unhandled Client Tool Call:", toolCall);
    },
    onDebug: (data) => {
      console.log("🐛 Debug:", data);
    },
  });

  const handleSubmitText = () => {
    if (textInput.trim()) {
      conversation.sendUserMessage(textInput.trim());
      setTextInput("");
      Keyboard.dismiss();
    }
  };

  const startConversation = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      await conversation.startSession({
        agentId: process.env.EXPO_PUBLIC_AGENT_ID,
        userId: "demo-user",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Failed to end conversation:", error);
    }
  };

  const toggleMicMute = () => {
    const newMutedState = !isMicMuted;
    setIsMicMuted(newMutedState);
    conversation.setMicMuted(newMutedState);
  };

  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case "connected":
        return "#10B981";
      case "connecting":
        return "#F59E0B";
      case "disconnected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: ConversationStatus): string => {
    return status[0].toUpperCase() + status.slice(1);
  };

  const canStart = conversation.status === "disconnected" && !isStarting;
  const canEnd = conversation.status === "connected";

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <Text style={styles.title}>AmberNexus React Native Example</Text>
        <Text style={styles.subtitle}>
          Remember to set the agentId in the code
        </Text>

        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(conversation.status) },
            ]}
          />
          <Text style={styles.statusText}>
            {getStatusText(conversation.status)}
          </Text>
        </View>

        {/* Conversation ID Display */}
        {conversation.status === "connected" && (
          <View style={styles.conversationIdContainer}>
            <Text style={styles.conversationIdLabel}>Conversation ID:</Text>
            <Text style={styles.conversationIdText}>
              {conversation.getId() || currentConversationId || "N/A"}
            </Text>
          </View>
        )}

        {/* Speaking Indicator */}
        {conversation.status === "connected" && (
          <View style={styles.speakingContainer}>
            <View
              style={[
                styles.speakingDot,
                {
                  backgroundColor: conversation.isSpeaking
                    ? "#8B5CF6"
                    : "#D1D5DB",
                },
              ]}
            />
            <Text
              style={[
                styles.speakingText,
                { color: conversation.isSpeaking ? "#8B5CF6" : "#9CA3AF" },
              ]}
            >
              {conversation.isSpeaking ? "🎤 AI Speaking" : "👂 AI Listening"}
            </Text>
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
        {conversation.status === "connected" && (
          <View style={styles.micControlContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.micButton,
                isMicMuted ? styles.mutedButton : styles.unmutedButton,
              ]}
              onPress={toggleMicMute}
            >
              <Text style={styles.buttonText}>
                {isMicMuted ? "🔇 Unmute" : "🎤 Mute"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feedback Buttons */}
        {conversation.status === "connected" &&
          conversation.canSendFeedback && (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackLabel}>How was that response?</Text>
              <View style={styles.feedbackButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.likeButton]}
                  onPress={() => conversation.sendFeedback(true)}
                >
                  <Text style={styles.buttonText}>👍 Like</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.dislikeButton]}
                  onPress={() => conversation.sendFeedback(false)}
                >
                  <Text style={styles.buttonText}>👎 Dislike</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Text Input and Messaging */}
        {conversation.status === "connected" && (
          <View style={styles.messagingContainer}>
            <Text style={styles.messagingLabel}>Send Text Message</Text>
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={text => {
                setTextInput(text);
                // Prevent agent from interrupting while user is typing
                if (text.length > 0) {
                  conversation.sendUserActivity();
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
                <Text style={styles.buttonText}>💬 Send Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.contextButton]}
                onPress={() => {
                  if (textInput.trim()) {
                    conversation.sendContextualUpdate(textInput.trim());
                    setTextInput("");
                    Keyboard.dismiss();
                  }
                }}
                disabled={!textInput.trim()}
              >
                <Text style={styles.buttonText}>📝 Send Context</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default function App() {
  return (
    <AmberNexusProvider>
      <ConversationScreen />
    </AmberNexusProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 20,
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
  toolsContainer: {
    backgroundColor: "#E5E7EB",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  toolItem: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "monospace",
    marginBottom: 4,
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
  instructions: {
    marginTop: 24,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
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
  activityContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  activityLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  activityButton: {
    backgroundColor: "#F59E0B",
  },
  micControlContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  micButton: {
    paddingHorizontal: 24,
  },
  mutedButton: {
    backgroundColor: "#EF4444",
  },
  unmutedButton: {
    backgroundColor: "#059669",
  },
});
