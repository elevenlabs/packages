import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';

export interface SyncTool {
  name: string;
  type: 'webhook' | 'client';
  status: 'pending' | 'checking' | 'syncing' | 'completed' | 'error' | 'skipped';
  message?: string;
  toolId?: string;
}

interface SyncToolsViewProps {
  tools: SyncTool[];
  dryRun?: boolean;
  onComplete?: () => void;
}

export const SyncToolsView: React.FC<SyncToolsViewProps> = ({
  tools,
  dryRun = false,
  onComplete
}) => {
  const { exit } = useApp();
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [syncedTools, setSyncedTools] = useState<SyncTool[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const syncNextTool = async () => {
      if (currentToolIndex >= tools.length) {
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

      const tool = tools[currentToolIndex];

      // Update tool status to checking
      setSyncedTools(prev => [...prev, { ...tool, status: 'checking' }]);

      // Simulate checking for changes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Randomly determine if tool needs sync
      const needsSync = Math.random() > 0.5;

      if (!needsSync) {
        // Update to skipped
        setSyncedTools(prev =>
          prev.map((t, i) => i === currentToolIndex
            ? { ...t, status: 'skipped', message: 'No changes detected' }
            : t
          )
        );
      } else if (dryRun) {
        // Update to completed (dry run)
        setSyncedTools(prev =>
          prev.map((t, i) => i === currentToolIndex
            ? { ...t, status: 'completed', message: '[DRY RUN] Would sync' }
            : t
          )
        );
      } else {
        // Update to syncing
        setSyncedTools(prev =>
          prev.map((t, i) => i === currentToolIndex
            ? { ...t, status: 'syncing' }
            : t
          )
        );

        // Simulate sync operation
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update to completed
        const toolId = `tool_${Date.now()}`;
        setSyncedTools(prev =>
          prev.map((t, i) => i === currentToolIndex
            ? {
                ...t,
                status: 'completed',
                message: 'Successfully synced',
                toolId
              }
            : t
          )
        );
      }

      // Update progress
      const newProgress = Math.round(((currentToolIndex + 1) / tools.length) * 100);
      setProgress(newProgress);

      // Move to next tool
      setCurrentToolIndex(currentToolIndex + 1);
    };

    syncNextTool();
  }, [currentToolIndex, tools, dryRun]);

  const totalTools = tools.length;
  const syncedCount = syncedTools.filter(t => t.status === 'completed').length;
  const skippedCount = syncedTools.filter(t => t.status === 'skipped').length;
  const errorCount = syncedTools.filter(t => t.status === 'error').length;

  return (
    <App
      title="ElevenLabs Agents"
      subtitle={dryRun ? 'Dry run mode - no changes will be made' : 'Synchronizing tools'}
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
                : `Processing ${currentToolIndex + 1} of ${totalTools} tools`
            }
          />
        </Box>

        {/* Progress Bar */}
        <ProgressFlow
          value={progress}
          label="Overall Progress"
          showWave={true}
        />

        {/* Tool Status List */}
        <Box flexDirection="column" marginTop={2}>
          <Box marginBottom={1}>
            <Text color={theme.colors.text.primary} bold>
              Tools:
            </Text>
          </Box>
          {syncedTools.map((tool, index) => {
            let status: 'loading' | 'success' | 'error' | 'idle' | 'warning';
            if (tool.status === 'checking' || tool.status === 'syncing') {
              status = 'loading';
            } else if (tool.status === 'completed') {
              status = 'success';
            } else if (tool.status === 'error') {
              status = 'error';
            } else if (tool.status === 'skipped') {
              status = 'idle';
            } else {
              status = 'idle';
            }

            const title = `${tool.name} (${tool.type})`;
            const message = tool.status === 'syncing'
              ? 'Syncing to ElevenLabs...'
              : tool.message;

            return (
              <StatusCard
                key={index}
                title={title}
                status={status}
                message={message}
                details={tool.toolId ? [`ID: ${tool.toolId}`] : []}
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
                {syncedCount} tool(s) synchronized
              </Text>
              {skippedCount > 0 && (
                <Text color={theme.colors.text.secondary}>
                  {skippedCount} tool(s) already up to date
                </Text>
              )}
              {errorCount > 0 && (
                <Text color={theme.colors.error}>
                  {errorCount} tool(s) failed to sync
                </Text>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default SyncToolsView;