import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';

interface SyncAgent {
  name: string;
  environment: string;
  configPath: string;
  status: 'pending' | 'checking' | 'syncing' | 'completed' | 'error' | 'skipped';
  message?: string;
  agentId?: string;
}

interface SyncViewProps {
  agents: SyncAgent[];
  dryRun?: boolean;
  onComplete?: () => void;
}

export const SyncView: React.FC<SyncViewProps> = ({ 
  agents, 
  dryRun = false,
  onComplete 
}) => {
  const { exit } = useApp();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [syncedAgents, setSyncedAgents] = useState<SyncAgent[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const syncNextAgent = async () => {
      if (currentAgentIndex >= agents.length) {
        setComplete(true);
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            exit();
          }
        }, 2000);
        return;
      }

      const agent = agents[currentAgentIndex];
      
      // Update agent status to checking
      setSyncedAgents(prev => [...prev, { ...agent, status: 'checking' }]);
      
      // Simulate checking for changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Randomly determine if agent needs sync
      const needsSync = Math.random() > 0.5;
      
      if (!needsSync) {
        // Update to skipped
        setSyncedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { ...a, status: 'skipped', message: 'No changes detected' }
            : a
          )
        );
      } else if (dryRun) {
        // Update to completed (dry run)
        setSyncedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { ...a, status: 'completed', message: '[DRY RUN] Would sync' }
            : a
          )
        );
      } else {
        // Update to syncing
        setSyncedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { ...a, status: 'syncing' }
            : a
          )
        );
        
        // Simulate sync operation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update to completed
        const agentId = `agent_${Date.now()}`;
        setSyncedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { 
                ...a, 
                status: 'completed', 
                message: 'Successfully synced',
                agentId 
              }
            : a
          )
        );
      }
      
      // Update progress
      const newProgress = Math.round(((currentAgentIndex + 1) / agents.length) * 100);
      setProgress(newProgress);
      
      // Move to next agent
      setCurrentAgentIndex(currentAgentIndex + 1);
    };

    syncNextAgent();
  }, [currentAgentIndex, agents, dryRun]);

  const totalAgents = agents.length;
  const syncedCount = syncedAgents.filter(a => a.status === 'completed').length;
  const skippedCount = syncedAgents.filter(a => a.status === 'skipped').length;
  const errorCount = syncedAgents.filter(a => a.status === 'error').length;

  return (
    <App 
      title="ConvAI Sync" 
      subtitle={dryRun ? 'Dry run mode - no changes will be made' : 'Synchronizing agents'}
      showOverlay={!complete}
    >
      <Box flexDirection="column">
        {/* Summary */}
        <Box marginBottom={2}>
          <StatusCard
            title="Sync Progress"
            status={complete ? 'success' : 'loading'}
            message={
              complete 
                ? `Completed: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`
                : `Processing ${currentAgentIndex + 1} of ${totalAgents} agents`
            }
          />
        </Box>

        {/* Progress Bar */}
        <ProgressFlow 
          value={progress} 
          label="Overall Progress"
          showWave={true}
        />

        {/* Agent Status List */}
        <Box flexDirection="column" marginTop={2}>
          <Box marginBottom={1}>
            <Text color={theme.colors.text.primary} bold>
              Agents:
            </Text>
          </Box>
          {syncedAgents.map((agent, index) => {
            let status: 'loading' | 'success' | 'error' | 'idle' | 'warning';
            if (agent.status === 'checking' || agent.status === 'syncing') {
              status = 'loading';
            } else if (agent.status === 'completed') {
              status = 'success';
            } else if (agent.status === 'error') {
              status = 'error';
            } else if (agent.status === 'skipped') {
              status = 'idle';
            } else {
              status = 'idle';
            }

            const title = `${agent.name} (${agent.environment})`;
            const message = agent.status === 'syncing' 
              ? 'Syncing to ElevenLabs...'
              : agent.message;

            return (
              <StatusCard
                key={index}
                title={title}
                status={status}
                message={message}
                details={agent.agentId ? [`ID: ${agent.agentId}`] : []}
                borderStyle="single"
              />
            );
          })}
        </Box>

        {/* Completion Message */}
        {complete && (
          <Box marginTop={2} flexDirection="column">
            <Text color={theme.colors.success} bold>
              ✓ Sync completed successfully!
            </Text>
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                {syncedCount} agent(s) synchronized
              </Text>
              {skippedCount > 0 && (
                <Text color={theme.colors.text.secondary}>
                  {skippedCount} agent(s) already up to date
                </Text>
              )}
              {errorCount > 0 && (
                <Text color={theme.colors.error}>
                  {errorCount} agent(s) failed to sync
                </Text>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default SyncView;