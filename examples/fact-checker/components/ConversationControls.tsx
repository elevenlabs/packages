import {
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react-native";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export function ConversationControls() {
  const { status } = useConversationStatus();
  const { startSession, endSession } = useConversationControls();
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 10,
        flexDirection: "row",
      }}
    >
      {status === "connected" ? (
        <TouchableOpacity style={styles.button} onPress={() => endSession()}>
          <Text style={styles.buttonText}>End Conversation</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={() => startSession()}>
          <Text style={styles.buttonText}>Start Conversation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "black",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
