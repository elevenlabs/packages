import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useConversationControls } from "@elevenlabs/react-native";

const POLL_INTERVAL_MS = 100;

type VolumeBarProps = {
  label: string;
  color: string;
  direction: "input" | "output";
};

export function VolumeBar({ label, color, direction }: VolumeBarProps) {
  const { getInputVolume, getOutputVolume } = useConversationControls();
  const getVolume = direction === "input" ? getInputVolume : getOutputVolume;

  const [volume, setVolume] = useState(0);

  const getVolumeRef = useRef(getVolume);
  getVolumeRef.current = getVolume;

  useEffect(() => {
    const id = setInterval(() => {
      setVolume(getVolumeRef.current());
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Text style={styles.label}>
        {label}: {(volume * 100).toFixed(0)}%
      </Text>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${volume * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  barBackground: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
});
