import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useConversationControls } from "@elevenlabs/react-native";

type ImageUploadProps = {
  textInput: string;
  onSent: () => void;
};

export function ImageUpload({ textInput, onSent }: ImageUploadProps) {
  const { uploadFile, sendMultimodalMessage } = useConversationControls();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handlePickAndUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setSelectedImage(asset.uri);
    setIsUploading(true);

    try {
      const blob = await fetch(asset.uri).then(r => r.blob());
      const { fileId } = await uploadFile(blob);
      sendMultimodalMessage({ fileId, text: textInput.trim() || undefined });
      onSent();
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setIsUploading(false);
      setSelectedImage(null);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          styles.uploadButton,
          isUploading && styles.disabledButton,
        ]}
        onPress={handlePickAndUploadImage}
        disabled={isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color="white" size="small" />
            <Text style={styles.buttonText}>Uploading...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Upload Image</Text>
        )}
      </TouchableOpacity>

      {selectedImage && (
        <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButton: {
    backgroundColor: "#8B5CF6",
    marginTop: 12,
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
});
