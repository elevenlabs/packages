import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';
import { getElevenLabsClient, createToolApi, updateToolApi } from '../../elevenlabs-api.js';
import { readConfig, writeConfig } from '../../utils.js';
import fs from 'fs-extra';
import path from 'path';

interface PushTool {
  name: string;
  type: 'webhook' | 'client';
  configPath: string;
  status: 'pending' | 'checking' | 'pushing' | 'completed' | 'error' | 'skipped';
  message?: string;
  toolId?: string;
  env: string;
}

interface PushToolsViewProps {
  tools: PushTool[];
  dryRun?: boolean;
  onComplete?: () => void;
  toolsConfigPath?: string;
}

export const PushToolsView: React.FC<PushToolsViewProps> = ({ 
  tools, 
  dryRun = false,
  onComplete,
  toolsConfigPath = 'tools.json'
}) => {
  const { exit } = useApp();
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [pushedTools, setPushedTools] = useState<PushTool[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const pushNextTool = async () => {
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
      setPushedTools(prev => [...prev, { ...tool, status: 'checking' }]);
      
      try {
        // Check if config file exists
        const configPath = path.resolve(tool.configPath);
        if (!(await fs.pathExists(configPath))) {
          setPushedTools(prev => 
            prev.map((t, i) => i === currentToolIndex 
              ? { ...t, status: 'error', message: 'Config file not found' }
              : t
            )
          );
          setCurrentToolIndex(currentToolIndex + 1);
          return;
        }

        // Load tool config
        const toolConfig = await readConfig<any>(configPath);
        // Get tool ID from props (which comes from tools.json)
        const toolId = tool.toolId;

        if (dryRun) {
          // Dry run mode
          setPushedTools(prev => 
            prev.map((t, i) => i === currentToolIndex 
              ? { 
                  ...t, 
                  status: 'completed', 
                  message: toolId ? '[DRY RUN] Would update' : '[DRY RUN] Would create'
                }
              : t
            )
          );
        } else {
          // Update to pushing
          setPushedTools(prev => 
            prev.map((t, i) => i === currentToolIndex 
              ? { ...t, status: 'pushing' }
              : t
            )
          );

          // Get ElevenLabs client for this tool's environment
          const client = await getElevenLabsClient(tool.env);

          if (!toolId) {
            // Create new tool
            const response = await createToolApi(client, toolConfig);
            const newToolId = (response as { toolId?: string }).toolId || `tool_${Date.now()}`;

            // Store tool ID in tools.json index file
            const toolsConfig = await readConfig<any>(path.resolve(toolsConfigPath));
            const toolDef = toolsConfig.tools.find((t: any) => t.name === tool.name);
            if (toolDef) {
              toolDef.id = newToolId;
              await writeConfig(path.resolve(toolsConfigPath), toolsConfig);
            }

            setPushedTools(prev => 
              prev.map((t, i) => i === currentToolIndex 
                ? { 
                    ...t, 
                    status: 'completed', 
                    message: 'Successfully pushed',
                    toolId: newToolId
                  }
                : t
              )
            );
          } else {
            // Update existing tool
            await updateToolApi(client, toolId, toolConfig);

            setPushedTools(prev => 
              prev.map((t, i) => i === currentToolIndex 
                ? { 
                    ...t, 
                    status: 'completed', 
                    message: 'Successfully pushed',
                    toolId
                  }
                : t
              )
            );
          }
        }
      } catch (error) {
        // Handle error
        setPushedTools(prev => 
          prev.map((t, i) => i === currentToolIndex 
            ? { 
                ...t, 
                status: 'error', 
                message: error instanceof Error ? error.message : 'Failed to push'
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

    pushNextTool();
  }, [currentToolIndex, tools, dryRun, onComplete, exit]);

  const totalTools = tools.length;
  const pushedCount = pushedTools.filter(t => t.status === 'completed').length;
  const skippedCount = pushedTools.filter(t => t.status === 'skipped').length;
  const errorCount = pushedTools.filter(t => t.status === 'error').length;

  return (
    <App 
      title="ElevenLabs Agents" 
    >
      <Box flexDirection="column">
        {/* Tool Status List - Compact Table */}
        <Box flexDirection="column">
          <Text color={theme.colors.text.primary} bold>
            Tools:
          </Text>
          
          {/* Table Header */}
          <Box marginTop={1}>
            <Box width={30}>
              <Text color={theme.colors.text.muted} bold>NAME</Text>
            </Box>
            <Box width={10}>
              <Text color={theme.colors.text.muted} bold>ENV</Text>
            </Box>
            <Box width={15}>
              <Text color={theme.colors.text.muted} bold>STATUS</Text>
            </Box>
            <Box>
              <Text color={theme.colors.text.muted} bold>MESSAGE</Text>
            </Box>
          </Box>
          
          {/* Separator */}
          <Box marginY={0}>
            <Text color={theme.colors.text.muted}>{'─'.repeat(80)}</Text>
          </Box>
          
          {/* Table Rows */}
          {pushedTools.map((tool, index) => {
            let statusColor: string;
            let statusText: string;
            
            if (tool.status === 'checking') {
              statusColor = theme.colors.text.muted;
              statusText = '⋯ Checking';
            } else if (tool.status === 'pushing') {
              statusColor = theme.colors.accent.primary;
              statusText = '↑ Pushing';
            } else if (tool.status === 'completed') {
              statusColor = theme.colors.success;
              statusText = '✓ Pushed';
            } else if (tool.status === 'error') {
              statusColor = theme.colors.error;
              statusText = '✗ Error';
            } else if (tool.status === 'skipped') {
              statusColor = theme.colors.text.muted;
              statusText = '○ Skipped';
            } else {
              statusColor = theme.colors.text.muted;
              statusText = '○ Pending';
            }

            const displayMessage = tool.message || '';
            const displayName = `${tool.name} (${tool.type})`;
            const messageWithId = tool.toolId 
              ? `${displayMessage}${displayMessage && tool.toolId ? ' · ' : ''}ID: ${tool.toolId}`
              : displayMessage;

            return (
              <Box key={index}>
                <Box width={30}>
                  <Text color={theme.colors.text.primary}>{displayName}</Text>
                </Box>
                <Box width={10}>
                  <Text color={theme.colors.accent.secondary}>{tool.env}</Text>
                </Box>
                <Box width={15}>
                  <Text color={statusColor}>{statusText}</Text>
                </Box>
                <Box>
                  <Text color={theme.colors.text.muted}>
                    {messageWithId}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Completion Summary */}
        {complete && (
          <Box marginTop={2} flexDirection="column">
            <Text color={theme.colors.text.secondary}>
              {pushedCount} tool(s) pushed
            </Text>
            {skippedCount > 0 && (
              <Text color={theme.colors.text.secondary}>
                {skippedCount} tool(s) already up to date
              </Text>
            )}
            {errorCount > 0 && (
              <Text color={theme.colors.error}>
                {errorCount} tool(s) failed to push
              </Text>
            )}
          </Box>
        )}
      </Box>
    </App>
  );
};

export default PushToolsView;