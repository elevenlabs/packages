import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  useConversationStatus,
  useConversationClientTool,
} from "@elevenlabs/react-native";
import { useAudioPlayer } from "expo-audio";

const LazySphere = React.lazy(() => import("./Sphere"));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const wrongSound = require("../public/wrong.mp3");

type ScoredStatement = {
  statement: string;
  truth_score: number;
  alternative?: string;
};

function truthScoreToHue(score: number): number {
  // score 1 = red (hue 0), score 10 = green (hue 0.33)
  return ((Math.min(Math.max(score, 1), 10) - 1) / 9) * 0.33;
}

export function AgentVisualization() {
  const { status } = useConversationStatus();
  const [hue, setHue] = useState(0.33);
  const [saturation, setSaturation] = useState(0);
  const [alternative, setAlternative] = useState<string | null>(null);
  const queueRef = useRef<ScoredStatement[]>([]);
  const processingRef = useRef(false);
  const wrongPlayer = useAudioPlayer(wrongSound);

  const processQueue = useCallback(() => {
    if (processingRef.current) return;
    if (queueRef.current.length === 0) return;
    processingRef.current = true;

    const processNext = () => {
      const next = queueRef.current.shift();
      if (!next) {
        processingRef.current = false;
        setSaturation(0);
        setAlternative(null);
        return;
      }
      setHue(truthScoreToHue(next.truth_score));
      setSaturation(1);
      setAlternative(next.alternative ?? null);
      if (next.truth_score < 5) {
        wrongPlayer.seekTo(0);
        wrongPlayer.play();
      }
      setTimeout(processNext, 2000);
    };

    processNext();
  }, []);

  useConversationClientTool(
    "new_statements_scored",
    ({ statements }: { statements: ScoredStatement[] }) => {
      console.log(statements);
      queueRef.current.push(...statements);
      processQueue();
    }
  );

  const isConnected = status === "connected";

  return (
    <View style={styles.container}>
      <LazySphere
        paused={!isConnected}
        hue={hue}
        saturation={isConnected ? saturation : 0}
      />
      {alternative && (
        <View style={styles.overlay}>
          <Text style={styles.alternativeText}>{alternative}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  alternativeText: {
    color: "white",
    fontSize: 28,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
