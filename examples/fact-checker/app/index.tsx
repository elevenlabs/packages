import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ConversationProvider } from "@elevenlabs/react-native";

import { AsyncSkia } from "../components/async-skia";
import { ConversationControls } from "../components/ConversationControls";

const AgentSphereScene = React.lazy(
  () => import("../components/AgentSphereScene")
);

export default function Page() {
  return (
    <ConversationProvider agentId="agent_4101kkxqz39men5sz120w40jsmee">
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
            <AgentSphereScene />
          </React.Suspense>
        </View>
        <ConversationControls />
      </View>
    </ConversationProvider>
  );
}
