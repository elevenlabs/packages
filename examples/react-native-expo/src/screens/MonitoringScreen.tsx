import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useConversation } from '../context/ConversationContext';

interface ConnectionStats {
  latency?: number;
  packetLoss?: number;
  jitter?: number;
  bandwidth?: number;
  [key: string]: unknown;
}

export default function MonitoringScreen() {
  const { state } = useConversation();
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({});

  useEffect(() => {
    // Update connection stats when conversation changes
    if (state.conversation) {
      const stats = state.conversation.getConnectionStats() as ConnectionStats;
      setConnectionStats(stats);
    } else {
      setConnectionStats({});
    }
  }, [state.conversation, state.connectionQuality]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (state.conversation) {
      const stats = state.conversation.getConnectionStats() as ConnectionStats;
      setConnectionStats(stats);
    }
    setTimeout(() => setRefreshing(false), 1000);
  }, [state.conversation]);

  const getSignalIcon = (signal?: string) => {
    switch (signal) {
      case 'excellent':
        return 'signal-cellular-4-bar';
      case 'good':
        return 'signal-cellular-3-bar';
      case 'poor':
        return 'signal-cellular-1-bar';
      default:
        return 'signal-cellular-off';
    }
  };

  const getSignalColor = (signal?: string) => {
    switch (signal) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#FF9800';
      case 'poor':
        return '#f44336';
      default:
        return '#9E9E9E';
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatMs = (ms?: number) => {
    return ms !== undefined ? `${Math.round(ms)}ms` : 'N/A';
  };

  const formatPercent = (value?: number) => {
    return value !== undefined ? `${Math.round(value * 100)}%` : 'N/A';
  };

  const isConnected = state.status === 'connected';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>

          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Icon name="power" size={24} color={isConnected ? '#4CAF50' : '#f44336'} />
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#f44336' }]}>
                {state.status.toUpperCase()}
              </Text>
            </View>

            <View style={styles.statusCard}>
              <Icon
                name={state.mode === 'speaking' ? 'volume-up' : 'hearing'}
                size={24}
                color={state.mode === 'speaking' ? '#2196F3' : '#666'}
              />
              <Text style={styles.statusLabel}>Mode</Text>
              <Text style={[styles.statusValue, { color: state.mode === 'speaking' ? '#2196F3' : '#666' }]}>
                {state.mode.toUpperCase()}
              </Text>
            </View>

            <View style={styles.statusCard}>
              <Icon
                name={getSignalIcon(state.connectionQuality.signal)}
                size={24}
                color={getSignalColor(state.connectionQuality.signal)}
              />
              <Text style={styles.statusLabel}>Signal</Text>
              <Text style={[styles.statusValue, { color: getSignalColor(state.connectionQuality.signal) }]}>
                {state.connectionQuality.signal?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>

            <View style={styles.statusCard}>
              <Icon
                name={state.microphoneEnabled ? 'mic' : 'mic-off'}
                size={24}
                color={state.microphoneEnabled ? '#4CAF50' : '#f44336'}
              />
              <Text style={styles.statusLabel}>Microphone</Text>
              <Text style={[styles.statusValue, { color: state.microphoneEnabled ? '#4CAF50' : '#f44336' }]}>
                {state.microphoneEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
        </View>

        {/* Audio Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Metrics</Text>

          {isConnected ? (
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Icon name="mic" size={20} color="#007AFF" />
                <Text style={styles.metricLabel}>Input Level</Text>
                <Text style={styles.metricValue}>
                  {state.audioMetrics.inputLevel !== undefined
                    ? `${Math.round(state.audioMetrics.inputLevel * 100)}%`
                    : 'N/A'
                  }
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Icon name="volume-up" size={20} color="#007AFF" />
                <Text style={styles.metricLabel}>Output Level</Text>
                <Text style={styles.metricValue}>
                  {state.audioMetrics.outputLevel !== undefined
                    ? `${Math.round(state.audioMetrics.outputLevel * 100)}%`
                    : 'N/A'
                  }
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Icon name="graphic-eq" size={20} color="#007AFF" />
                <Text style={styles.metricLabel}>Sample Rate</Text>
                <Text style={styles.metricValue}>
                  {state.audioMetrics.sampleRate
                    ? `${(state.audioMetrics.sampleRate / 1000).toFixed(1)}kHz`
                    : 'N/A'
                  }
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Icon name="data-usage" size={20} color="#007AFF" />
                <Text style={styles.metricLabel}>Bitrate</Text>
                <Text style={styles.metricValue}>
                  {state.audioMetrics.bitrate ? `${state.audioMetrics.bitrate}kbps` : 'N/A'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Icon name="code" size={20} color="#007AFF" />
                <Text style={styles.metricLabel}>Codec</Text>
                <Text style={styles.metricValue}>
                  {state.audioMetrics.codec?.toUpperCase() || 'N/A'}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Icon name="tune" size={20} color="#007AFF" />
                <Text style={styles.metricLabel}>Processing</Text>
                <Text style={styles.metricValue}>
                  {state.audioMetrics.processing ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="hearing-disabled" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No audio metrics available</Text>
              <Text style={styles.emptyStateSubtext}>Start a conversation to see audio data</Text>
            </View>
          )}
        </View>

        {/* Connection Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Statistics</Text>

          {isConnected && Object.keys(connectionStats).length > 0 ? (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Latency</Text>
                <Text style={styles.statValue}>{formatMs(connectionStats.latency)}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Packet Loss</Text>
                <Text style={styles.statValue}>{formatPercent(connectionStats.packetLoss)}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Jitter</Text>
                <Text style={styles.statValue}>{formatMs(connectionStats.jitter)}</Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Bandwidth</Text>
                <Text style={styles.statValue}>{formatBytes(connectionStats.bandwidth)}</Text>
              </View>

              {/* Additional stats */}
              {Object.entries(connectionStats).map(([key, value]) => {
                if (['latency', 'packetLoss', 'jitter', 'bandwidth'].includes(key)) return null;
                return (
                  <View key={key} style={styles.statRow}>
                    <Text style={styles.statLabel}>{key}</Text>
                    <Text style={styles.statValue}>{String(value)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="signal-cellular-off" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No connection statistics</Text>
              <Text style={styles.emptyStateSubtext}>Connect to see detailed statistics</Text>
            </View>
          )}
        </View>

        {/* Configuration Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Configuration</Text>

          <View style={styles.configContainer}>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Agent ID</Text>
              <Text style={styles.configValue} numberOfLines={1}>
                {state.config.agentId}
              </Text>
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Sample Rate</Text>
              <Text style={styles.configValue}>
                {(state.config.audioQuality.sampleRate / 1000).toFixed(1)}kHz
              </Text>
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Encoding</Text>
              <Text style={styles.configValue}>
                {state.config.audioQuality.encoding?.toUpperCase()}
              </Text>
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Bitrate</Text>
              <Text style={styles.configValue}>
                {state.config.audioQuality.bitrate}kbps
              </Text>
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Output Route</Text>
              <Text style={styles.configValue}>
                {state.config.audioRouting.outputRoute}
              </Text>
            </View>

            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Platform</Text>
              <Text style={styles.configValue}>{Platform.OS.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Debug Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Information</Text>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Messages Count:</Text>
            <Text style={styles.debugValue}>{state.messages.length}</Text>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Settings Loaded:</Text>
            <Text style={styles.debugValue}>{state.settingsLoaded ? 'Yes' : 'No'}</Text>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Can Send Feedback:</Text>
            <Text style={styles.debugValue}>{state.canSendFeedback ? 'Yes' : 'No'}</Text>
          </View>

          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>Current Volume:</Text>
            <Text style={styles.debugValue}>{Math.round(state.currentVolume * 100)}%</Text>
          </View>

          {state.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.debugLabel}>Last Error:</Text>
              <Text style={styles.errorValue}>{state.error}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  configContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  configValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
    textAlign: 'right',
  },
  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  debugLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  debugValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorValue: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
  },
});