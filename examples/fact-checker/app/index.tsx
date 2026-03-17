import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ConversationProvider } from "@elevenlabs/react-native";

import { AsyncSkia } from "../components/async-skia";
import { ConversationControls } from "../components/ConversationControls";
import { AgentVisualization } from "../components/AgentVisualization";

export default function Page() {
  return (
    <ConversationProvider
      agentId="agent_9701kky8je5vf0g8c5xgq1vhvjx1"
      connectionType="webrtc"
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "flex-end",
          padding: 20,
        }}
      >
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <React.Suspense fallback={<ActivityIndicator />}>
            <AsyncSkia />
            <AgentVisualization />
          </React.Suspense>
        </View>
        <ConversationControls />
      </View>
    </ConversationProvider>
  );
}
