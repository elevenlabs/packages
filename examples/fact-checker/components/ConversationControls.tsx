import {
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react-native";
import { Button, View, Text } from "react-native";

export function ConversationControls() {
  const { status } = useConversationStatus();
  const { startSession } = useConversationControls();
  return (
    <View
      style={{
        padding: 20,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: 10,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Conversation Status: {status}
      </Text>
      <Button title="Start Conversation" onPress={() => startSession()} />
    </View>
  );
}
