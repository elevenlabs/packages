import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ElevenLabsProvider, useConversation } from '@elevenlabs/react-native';
import type { ConversationStatus, Callbacks } from '@elevenlabs/react-native';

const ConversationScreen = () => {
  const conversation = useConversation({
    // Example client tools
    clientTools: {
      logMessage: (message: string) => {
        console.log('logMessage:', message);

        return 'Message logged successfully';
      }
    },
    onConnect: ({ conversationId }: Callbacks['onConnect']) => {
      console.log('✅ Connected to conversation', conversationId);
    },
    onDisconnect: (details: string) => {
      console.log('👋 Disconnected from conversation', details);
    },
    onError: ({ message, context }: Callbacks['onError']) => {
      console.error('❌ Conversation error:', message, context);
    },
    onMessage: ({ message, source }: Callbacks['onMessage']) => {
      console.log('💬 Message:', message, 'from:', source);
    },
    onModeChange: ({ mode }: Callbacks['onModeChange']) => {
      console.log('🔊 Mode:', mode);
    },
    onStatusChange: ({ status }: Callbacks['onStatusChange']) => {
      console.log('🔊 Status:', status);
    },
    onCanSendFeedbackChange: ({ canSendFeedback }: Callbacks['onCanSendFeedbackChange']) => {
      console.log('🔊 Can send feedback:', canSendFeedback);
    },
    onUnhandledClientToolCall: (params: Callbacks['onUnhandledClientToolCall']) => {
      console.log('🔊 Unhandled client tool call:', params);
    }
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
    return status[0].toUpperCase() + status.slice(1);
  };

  const canStart = conversation.status === 'disconnected' && !isStarting;
  const canEnd = conversation.status === 'connected';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ElevenLabs Conversation</Text>
      <Text style={styles.subtitle}>With Client Tools Support</Text>

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
    </View>
  );
};

export default function App() {
  return (
    <ElevenLabsProvider>
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
    marginBottom: 8,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  toolsContainer: {
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  toolItem: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginBottom: 4,
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
    marginTop: 24,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});