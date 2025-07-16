import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as LiveKit from '@livekit/react-native';
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';
import type { ConversationStatus } from '@elevenlabs/react-native';

const ConversationScreen: React.FC = () => {
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to conversation');
      Alert.alert('Connected', 'Conversation started successfully!');
    },
    onDisconnect: () => {
      console.log('👋 Disconnected from conversation');
      Alert.alert('Disconnected', 'Conversation ended');
    },
    onError: (error) => {
      console.error('❌ Conversation error:', error);
      Alert.alert('Error', `Conversation error: ${error}`);
    },
    onDebug: (debug) => {
      console.log('🐛 Debug:', debug);
    },
  });

  const [isStarting, setIsStarting] = useState(false);

  const startConversation = async () => {
    if (isStarting) return;

    setIsStarting(true);
    try {
      await conversation.startSession({
        agentId: 'J3Pbu5gP6NNKBscdCdwA', // Replace with your actual agent ID
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endConversation();
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  const getStatusColor = (status: ConversationStatus): string => {
    switch (status) {
      case 'connected': return '#10B981';
      case 'connecting': return '#F59E0B';
      case 'disconnected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: ConversationStatus): string => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  const canStart = conversation.status === 'disconnected' && !isStarting;
  const canEnd = conversation.status === 'connected';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ElevenLabs Conversation</Text>

      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(conversation.status) }]} />
        <Text style={styles.statusText}>{getStatusText(conversation.status)}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.startButton, !canStart && styles.disabledButton]}
          onPress={startConversation}
          disabled={!canStart}
        >
          <Text style={styles.buttonText}>
            {isStarting ? 'Starting...' : 'Start Conversation'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.endButton, !canEnd && styles.disabledButton]}
          onPress={endConversation}
          disabled={!canEnd}
        >
          <Text style={styles.buttonText}>End Conversation</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instructions}>
        Make sure to replace 'your-agent-id' with your actual ElevenLabs agent ID
      </Text>
    </View>
  );
};

export default function App() {
  return (
    <ElevenLabsProvider LiveKit={LiveKit}>
      <ConversationScreen />
    </ElevenLabsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#1F2937',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  endButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 40,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});