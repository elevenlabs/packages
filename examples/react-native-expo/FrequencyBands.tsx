import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useConversationControls } from "@elevenlabs/react-native";

const BAND_COUNT = 32;
const POLL_INTERVAL_MS = 100;

function downsample(data: Uint8Array, bands: number): number[] {
  if (data.length === 0) return Array(bands).fill(0);
  const step = data.length / bands;
  const result: number[] = [];
  for (let i = 0; i < bands; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let sum = 0;
    for (let j = start; j < end; j++) sum += data[j];
    result.push(sum / (end - start) / 255);
  }
  return result;
}

type FrequencyBandsProps = {
  color: string;
  direction: "input" | "output";
};

export function FrequencyBands({ color, direction }: FrequencyBandsProps) {
  const { getInputByteFrequencyData, getOutputByteFrequencyData } =
    useConversationControls();
  const getFreq =
    direction === "input"
      ? getInputByteFrequencyData
      : getOutputByteFrequencyData;

  const [bands, setBands] = useState<number[]>(() =>
    Array(BAND_COUNT).fill(0)
  );

  const getFreqRef = useRef(getFreq);
  getFreqRef.current = getFreq;

  useEffect(() => {
    const id = setInterval(() => {
      setBands(downsample(getFreqRef.current(), BAND_COUNT));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      {bands.map((v, i) => (
        <View key={i} style={styles.barWrapper}>
          <View
            style={[
              styles.bar,
              {
                height: `${Math.max(v * 100, 2)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 48,
    gap: 2,
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 8,
  },
  barWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 2,
    minHeight: 1,
  },
});
