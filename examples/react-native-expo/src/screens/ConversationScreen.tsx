import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import Slider from 'react-native-slider';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useConversation } from '../context/ConversationContext';
import { Status, Mode } from '@elevenlabs/react-native';

export default function ConversationScreen() {
  const {
    state,
    startConversation,
    endConversation,
    clearMessages,
    setVolume,
    toggleMicrophone,
    toggleSpeaker,
  } = useConversation();

  const handleStartConversation = async () => {
    if (state.config.agentId === 'your-agent-id') {
      Alert.alert(
        'Configuration Required',
        'Please configure your agent ID in the Settings tab before starting a conversation.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await startConversation();
  };

  const handleEndConversation = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await endConversation();
  };

  const handleVolumeChange = async (volume: number) => {
    await setVolume(volume);
  };

  const handleToggleMicrophone = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleMicrophone();
  };

  const handleToggleSpeaker = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleSpeaker();
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FF9800';
      case 'disconnected':
      case 'disconnecting':
        return '#f44336';
      default:
        return '#9E9E9E';
    }
  };

  const getModeIcon = (mode: Mode) => {
    return mode === 'speaking' ? 'volume-up' : 'hearing';
  };

  const isConnected = state.status === 'connected';

  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Status</Text>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(state.status) }]}>
              <Text style={styles.statusText}>{state.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Mode</Text>
            <View style={styles.modeIndicator}>
              <Icon
                name={getModeIcon(state.mode)}
                size={20}
                color={state.mode === 'speaking' ? '#2196F3' : '#666'}
              />
              <Text style={[styles.modeText, { color: state.mode === 'speaking' ? '#2196F3' : '#666' }]}>
                {state.mode.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Connection Quality */}
        {isConnected && (
          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>Connection: </Text>
            <Text style={[styles.qualityValue, {
              color: state.connectionQuality.signal === 'excellent' ? '#4CAF50' :
                     state.connectionQuality.signal === 'good' ? '#FF9800' :
                     state.connectionQuality.signal === 'poor' ? '#f44336' : '#666'
            }]}>
              {state.connectionQuality.signal?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        )}
      </View>

      {/* Error Display */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Icon name="error" size={20} color="#d32f2f" />
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      {/* Main Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            styles.startButton,
            (isConnected || state.isConnecting) && styles.disabledButton,
          ]}
          onPress={handleStartConversation}
          disabled={isConnected || state.isConnecting}
        >
          <Icon
            name={state.isConnecting ? "hourglass-empty" : "play-arrow"}
            size={24}
            color="#fff"
          />
          <Text style={styles.mainButtonText}>
            {state.isConnecting ? 'Connecting...' : 'Start Conversation'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainButton,
            styles.endButton,
            !isConnected && styles.disabledButton,
          ]}
          onPress={handleEndConversation}
          disabled={!isConnected}
        >
          <Icon name="stop" size={24} color="#fff" />
          <Text style={styles.mainButtonText}>End Conversation</Text>
        </TouchableOpacity>
      </View>

      {/* Audio Controls */}
      <View style={styles.audioControls}>
        <Text style={styles.audioControlsTitle}>Audio Controls</Text>

        {/* Volume Control */}
        <View style={styles.volumeContainer}>
          <Text style={styles.volumeLabel}>Volume: {Math.round(state.currentVolume * 100)}%</Text>
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={state.currentVolume}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#ccc"
            thumbStyle={styles.sliderThumb}
            trackStyle={styles.sliderTrack}
            disabled={!isConnected}
          />
        </View>

        {/* Audio Toggles */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              state.microphoneEnabled ? styles.toggleActive : styles.toggleInactive,
              !isConnected && styles.toggleDisabled,
            ]}
            onPress={handleToggleMicrophone}
            disabled={!isConnected}
          >
            <Icon
              name={state.microphoneEnabled ? "mic" : "mic-off"}
              size={20}
              color={state.microphoneEnabled ? "#fff" : "#666"}
            />
            <Text style={[
              styles.toggleText,
              { color: state.microphoneEnabled ? "#fff" : "#666" }
            ]}>
              Microphone
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              state.speakerEnabled ? styles.toggleActive : styles.toggleInactive,
              !isConnected && styles.toggleDisabled,
            ]}
            onPress={handleToggleSpeaker}
            disabled={!isConnected}
          >
            <Icon
              name={state.speakerEnabled ? "volume-up" : "volume-down"}
              size={20}
              color={state.speakerEnabled ? "#fff" : "#666"}
            />
            <Text style={[
              styles.toggleText,
              { color: state.speakerEnabled ? "#fff" : "#666" }
            ]}>
              Speaker
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <View style={styles.messagesContainer}>
        <View style={styles.messagesHeader}>
          <Text style={styles.messagesTitle}>Messages ({state.messages.length})</Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearMessages}
            disabled={state.messages.length === 0}
          >
            <Icon name="clear-all" size={18} color="#666" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
        >
          {state.messages.map((message, index) => (
            <View key={`message-${index}-${message.timestamp || Date.now()}`} style={[
              styles.messageItem,
              message.source === 'user' ? styles.userMessage : styles.agentMessage
            ]}>
              <View style={styles.messageHeader}>
                <Icon
                  name={message.source === 'user' ? "person" : "smart-toy"}
                  size={16}
                  color={message.source === 'user' ? "#007AFF" : "#4CAF50"}
                />
                <Text style={[
                  styles.messageSource,
                  { color: message.source === 'user' ? "#007AFF" : "#4CAF50" }
                ]}>
                  {message.source === 'user' ? 'You' : 'Agent'}
                </Text>
                {message.timestamp && (
                  <Text style={styles.messageTime}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </View>
              <Text style={styles.messageContent}>{message.message}</Text>
            </View>
          ))}
          {state.messages.length === 0 && (
            <View style={styles.emptyMessages}>
              <Icon name="chat-bubble-outline" size={48} color="#ccc" />
              <Text style={styles.emptyMessagesText}>No messages yet</Text>
              <Text style={styles.emptyMessagesSubtext}>
                Start a conversation to see messages here
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  statusHeader: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  modeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityLabel: {
    fontSize: 12,
    color: '#666',
  },
  qualityValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mainButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  endButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  audioControls: {
    backgroundColor: '#f8f9fa',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  audioControlsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  volumeContainer: {
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  volumeSlider: {
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
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleInactive: {
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  messagesContent: {
    padding: 12,
  },
  messageItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  userMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  agentMessage: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageSource: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyMessagesSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});