import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import Slider from 'react-native-slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useConversation } from '../context/ConversationContext';
import type { AppConfig } from '../context/ConversationContext';

const SAMPLE_RATES = [8000, 16000, 44100, 48000];
const ENCODING_OPTIONS = ['opus', 'pcm'] as const;
const OUTPUT_ROUTES = ['auto', 'speaker', 'earpiece', 'bluetooth'] as const;
const AUDIO_FOCUS_TYPES = ['gainTransient', 'gain', 'gainTransientMayDuck'] as const;
const CONTENT_TYPES = ['speech', 'music', 'movie', 'sonification'] as const;
const USAGE_TYPES = ['voiceCommunication', 'media', 'voiceRecognition', 'assistance'] as const;

export default function SettingsScreen() {
  const { state, dispatch, saveSettings, resetSettings } = useConversation();
  const [isAdvancedModalVisible, setAdvancedModalVisible] = useState(false);
  const [tempConfig, setTempConfig] = useState<AppConfig>(state.config);

  const updateConfig = (updates: Partial<AppConfig>) => {
    const newConfig = { ...tempConfig, ...updates };
    setTempConfig(newConfig);
    dispatch({ type: 'UPDATE_CONFIG', payload: updates });
  };

  const updateAudioQuality = (updates: Partial<AppConfig['audioQuality']>) => {
    const newAudioQuality = { ...tempConfig.audioQuality, ...updates };
    updateConfig({ audioQuality: newAudioQuality });
  };

  const updateAudioRouting = (updates: Partial<AppConfig['audioRouting']>) => {
    const newAudioRouting = { ...tempConfig.audioRouting, ...updates };
    updateConfig({ audioRouting: newAudioRouting });
  };

  const updateIOSSettings = (updates: Partial<AppConfig['iosSettings']>) => {
    const newIOSSettings = { ...tempConfig.iosSettings, ...updates };
    updateConfig({ iosSettings: newIOSSettings });
  };

  const updateAndroidSettings = (updates: Partial<AppConfig['androidSettings']>) => {
    const newAndroidSettings = { ...tempConfig.androidSettings, ...updates };
    updateConfig({ androidSettings: newAndroidSettings });
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetSettings();
              setTempConfig(state.config);
              if (Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const copyConfigToClipboard = async () => {
    try {
      const configJson = JSON.stringify(state.config, null, 2);
      await Clipboard.setStringAsync(configJson);
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Alert.alert('Copied', 'Configuration copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy configuration');
    }
  };

  const isConnected = state.status === 'connected';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Connection Status Warning */}
        {isConnected && (
          <View style={styles.warningContainer}>
            <Icon name="warning" size={20} color="#FF9800" />
            <Text style={styles.warningText}>
              Some settings cannot be changed while connected
            </Text>
          </View>
        )}

        {/* Basic Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Configuration</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Agent ID *</Text>
            <TextInput
              style={[styles.textInput, isConnected && styles.disabledInput]}
              value={tempConfig.agentId}
              onChangeText={(text) => updateConfig({ agentId: text })}
              placeholder="Enter your ElevenLabs agent ID"
              placeholderTextColor="#999"
              editable={!isConnected}
            />
            {tempConfig.agentId === 'your-agent-id' && (
              <Text style={styles.helperText}>
                ⚠️ Please set your actual agent ID before starting a conversation
              </Text>
            )}
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Auto Request Permissions</Text>
            <Switch
              value={tempConfig.autoRequestPermissions}
              onValueChange={(value) => updateConfig({ autoRequestPermissions: value })}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
              thumbColor="#fff"
              disabled={isConnected}
            />
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Pause on Background</Text>
            <Switch
              value={tempConfig.pauseOnBackground}
              onValueChange={(value) => updateConfig({ pauseOnBackground: value })}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
              thumbColor="#fff"
              disabled={isConnected}
            />
          </View>
        </View>

        {/* Audio Quality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Quality</Text>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Sample Rate</Text>
            <View style={styles.pickerRow}>
              {SAMPLE_RATES.map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.pickerOption,
                    tempConfig.audioQuality.sampleRate === rate && styles.pickerOptionSelected,
                    isConnected && styles.disabledOption,
                  ]}
                  onPress={() => !isConnected && updateAudioQuality({ sampleRate: rate })}
                  disabled={isConnected}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    tempConfig.audioQuality.sampleRate === rate && styles.pickerOptionTextSelected,
                  ]}>
                    {rate / 1000}kHz
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Encoding</Text>
            <View style={styles.pickerRow}>
              {ENCODING_OPTIONS.map((encoding) => (
                <TouchableOpacity
                  key={encoding}
                  style={[
                    styles.pickerOption,
                    tempConfig.audioQuality.encoding === encoding && styles.pickerOptionSelected,
                    isConnected && styles.disabledOption,
                  ]}
                  onPress={() => !isConnected && updateAudioQuality({ encoding })}
                  disabled={isConnected}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    tempConfig.audioQuality.encoding === encoding && styles.pickerOptionTextSelected,
                  ]}>
                    {encoding.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              Bitrate: {tempConfig.audioQuality.bitrate}kbps
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={16}
              maximumValue={320}
              step={16}
              value={tempConfig.audioQuality.bitrate || 64}
              onValueChange={(value) => updateAudioQuality({ bitrate: value })}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#ccc"
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
              disabled={isConnected}
            />
          </View>

          <View style={styles.audioProcessingContainer}>
            <Text style={styles.audioProcessingTitle}>Audio Processing</Text>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Echo Cancellation</Text>
              <Switch
                value={tempConfig.audioQuality.echoCancellation}
                onValueChange={(value) => updateAudioQuality({ echoCancellation: value })}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
                thumbColor="#fff"
                disabled={isConnected}
              />
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Noise Suppression</Text>
              <Switch
                value={tempConfig.audioQuality.noiseSuppression}
                onValueChange={(value) => updateAudioQuality({ noiseSuppression: value })}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
                thumbColor="#fff"
                disabled={isConnected}
              />
            </View>

            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Auto Gain Control</Text>
              <Switch
                value={tempConfig.audioQuality.autoGainControl}
                onValueChange={(value) => updateAudioQuality({ autoGainControl: value })}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
                thumbColor="#fff"
                disabled={isConnected}
              />
            </View>
          </View>
        </View>

        {/* Audio Routing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Routing</Text>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Output Route</Text>
            <View style={styles.pickerRow}>
              {OUTPUT_ROUTES.map((route) => (
                <TouchableOpacity
                  key={route}
                  style={[
                    styles.pickerOption,
                    tempConfig.audioRouting.outputRoute === route && styles.pickerOptionSelected,
                  ]}
                  onPress={() => updateAudioRouting({ outputRoute: route })}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    tempConfig.audioRouting.outputRoute === route && styles.pickerOptionTextSelected,
                  ]}>
                    {route.charAt(0).toUpperCase() + route.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Use Proximity Sensor</Text>
            <Switch
              value={tempConfig.audioRouting.useProximitySensor}
              onValueChange={(value) => updateAudioRouting({ useProximitySensor: value })}
              trackColor={{ false: '#ccc', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Platform Specific Settings */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.advancedButton}
            onPress={() => setAdvancedModalVisible(true)}
          >
            <Icon name="settings" size={20} color="#007AFF" />
            <Text style={styles.advancedButtonText}>Platform-Specific Settings</Text>
            <Icon name="chevron-right" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSaveSettings}>
            <Icon name="save" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Save Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={copyConfigToClipboard}
          >
            <Icon name="copy" size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              Copy Config
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleResetSettings}
          >
            <Icon name="restore" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Advanced Settings Modal */}
      <Modal
        isVisible={isAdvancedModalVisible}
        onBackdropPress={() => setAdvancedModalVisible(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Platform-Specific Settings</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAdvancedModalVisible(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            {/* iOS Settings */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>iOS Audio Session</Text>

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Default to Speaker</Text>
                <Switch
                  value={tempConfig.iosSettings.defaultToSpeaker}
                  onValueChange={(value) => updateIOSSettings({ defaultToSpeaker: value })}
                  trackColor={{ false: '#ccc', true: '#007AFF' }}
                  thumbColor="#fff"
                  disabled={isConnected}
                />
              </View>

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Allow Bluetooth</Text>
                <Switch
                  value={tempConfig.iosSettings.allowBluetooth}
                  onValueChange={(value) => updateIOSSettings({ allowBluetooth: value })}
                  trackColor={{ false: '#ccc', true: '#007AFF' }}
                  thumbColor="#fff"
                  disabled={isConnected}
                />
              </View>
            </View>

            {/* Android Settings */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Android Audio Focus</Text>

              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Request Audio Focus</Text>
                <Switch
                  value={tempConfig.androidSettings.requestAudioFocus}
                  onValueChange={(value) => updateAndroidSettings({ requestAudioFocus: value })}
                  trackColor={{ false: '#ccc', true: '#007AFF' }}
                  thumbColor="#fff"
                  disabled={isConnected}
                />
              </View>

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Focus Type</Text>
                <View style={styles.pickerColumn}>
                  {AUDIO_FOCUS_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pickerOptionFull,
                        tempConfig.androidSettings.audioFocusType === type && styles.pickerOptionSelected,
                        isConnected && styles.disabledOption,
                      ]}
                      onPress={() => !isConnected && updateAndroidSettings({ audioFocusType: type })}
                      disabled={isConnected}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        tempConfig.androidSettings.audioFocusType === type && styles.pickerOptionTextSelected,
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#FF9800',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  section: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerColumn: {
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pickerOptionFull: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pickerOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledOption: {
    opacity: 0.5,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
    width: 20,
    height: 20,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  audioProcessingContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  audioProcessingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  advancedButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
});