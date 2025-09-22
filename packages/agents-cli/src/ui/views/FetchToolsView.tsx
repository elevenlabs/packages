import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';
import { getElevenLabsClient, listToolsApi, getToolApi } from '../../elevenlabs-api.js';
import {
  readToolsConfig,
  writeToolsConfig,
  writeToolConfig,
  loadToolsLockFile,
  saveToolsLockFile,
  updateToolInLock,
  ToolsConfig,
  ToolDefinition,
  type Tool
} from '../../tools.js';
import { calculateConfigHash } from '../../utils.js';
import path from 'path';
import fs from 'fs-extra';

interface FetchTool {
  name: string;
  id: string;
  type?: string;
  status: 'pending' | 'fetching' | 'completed' | 'error' | 'skipped';
  message?: string;
  configPath?: string;
}

interface FetchToolsViewProps {
  tool?: string;
  outputDir: string;
  search?: string;
  dryRun?: boolean;
  onComplete?: () => void;
}

const TOOLS_CONFIG_FILE = "tools.json";

export const FetchToolsView: React.FC<FetchToolsViewProps> = ({
  tool,
  outputDir = 'tool_configs',
  search,
  dryRun = false,
  onComplete
}) => {
  const { exit } = useApp();
  const [tools, setTools] = useState<FetchTool[]>([]);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
    phase: 'loading' as 'loading' | 'fetching' | 'complete'
  });

  useEffect(() => {
    const initializeFetch = async () => {
      try {
        setState(prev => ({ ...prev, phase: 'loading' }));

        // Setup tools.json
        const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
        let toolsConfig: ToolsConfig;

        if (!(await fs.pathExists(toolsConfigPath))) {
          toolsConfig = { tools: [] };
          await writeToolsConfig(toolsConfigPath, toolsConfig);
        } else {
          toolsConfig = await readToolsConfig(toolsConfigPath);
        }

        const client = await getElevenLabsClient();
        const toolsList = await listToolsApi(client);

        if (toolsList.length === 0) {
          setState(prev => ({ ...prev, error: 'No tools found in your ElevenLabs workspace.', loading: false }));
          return;
        }

        // Filter tools by search criteria
        const searchTerm = tool || search;
        let filteredTools = toolsList;
        if (searchTerm) {
          filteredTools = toolsList.filter((toolItem: any) => {
            return toolItem.name?.toLowerCase().includes(searchTerm.toLowerCase());
          });
        }

        // Check existing tools
        const existingToolNames = new Set(toolsConfig.tools.map(t => t.name));
        const lockFilePath = path.resolve('tools-lock.json');
        const toolsLockData = await loadToolsLockFile(lockFilePath);
        const existingToolIds = new Set<string>();

        Object.values(toolsLockData.tools).forEach(toolData => {
          if (toolData.id) {
            existingToolIds.add(toolData.id);
          }
        });

        // Prepare tools list
        const toolsToFetch: FetchTool[] = filteredTools
          .map((toolItem: any) => {
            const toolId = toolItem.tool_id || toolItem.toolId || toolItem.id;
            let toolName = toolItem.name;

            if (!toolId) return null;

            // Check if already exists
            if (existingToolIds.has(toolId)) {
              return {
                name: toolName,
                id: toolId,
                type: toolItem.type,
                status: 'skipped' as const,
                message: 'Already exists'
              };
            }

            // Handle name conflicts
            if (existingToolNames.has(toolName)) {
              let counter = 1;
              const originalName = toolName;
              while (existingToolNames.has(toolName)) {
                toolName = `${originalName}_${counter}`;
                counter++;
              }
            }

            return {
              name: toolName,
              id: toolId,
              type: toolItem.type,
              status: 'pending' as const
            };
          })
          .filter(Boolean) as FetchTool[];

        setTools(toolsToFetch);
        setState(prev => ({ ...prev, loading: false, phase: 'fetching' }));

        if (toolsToFetch.length === 0) {
          setState(prev => ({ ...prev, error: 'No new tools to fetch.', phase: 'complete' }));
          return;
        }

      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to initialize tool fetching',
          loading: false
        }));
      }
    };

    initializeFetch();
  }, [tool, search]);

  useEffect(() => {
    if (state.phase !== 'fetching' || currentToolIndex >= tools.length) {
      if (currentToolIndex >= tools.length && tools.length > 0) {
        setState(prev => ({ ...prev, phase: 'complete' }));
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            exit();
          }
        }, 3000);
      }
      return;
    }

    const fetchNextTool = async () => {
      const toolToFetch = tools[currentToolIndex];

      if (toolToFetch.status === 'skipped') {
        setCurrentToolIndex(prev => prev + 1);
        return;
      }

      // Update status to fetching
      setTools(prev => prev.map((t, i) =>
        i === currentToolIndex ? { ...t, status: 'fetching', message: 'Downloading config...' } : t
      ));

      if (dryRun) {
        // Simulate dry run
        setTimeout(() => {
          setTools(prev => prev.map((t, i) =>
            i === currentToolIndex
              ? { ...t, status: 'completed', message: '[DRY RUN] Would fetch tool' }
              : t
          ));
          setCurrentToolIndex(prev => prev + 1);
        }, 1000);
        return;
      }

      try {
        const client = await getElevenLabsClient();
        const toolDetails = await getToolApi(client, toolToFetch.id);

        // Generate config file path
        const safeName = toolToFetch.name.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
        const configPath = `${outputDir}/${safeName}.json`;
        const configFilePath = path.resolve(configPath);

        // Create config file
        await fs.ensureDir(path.dirname(configFilePath));
        await writeToolConfig(configFilePath, toolDetails as Tool);

        // Update tools.json
        const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
        const toolsConfig = await readToolsConfig(toolsConfigPath);

        const toolDetailsTyped = toolDetails as { type?: string };
        const toolType = toolDetailsTyped.type || 'unknown';

        const newTool: ToolDefinition = {
          name: toolToFetch.name,
          type: toolType as 'webhook' | 'client',
          config: configPath
        };

        toolsConfig.tools.push(newTool);
        await writeToolsConfig(toolsConfigPath, toolsConfig);

        // Update lock file
        const lockFilePath = path.resolve('tools-lock.json');
        const toolsLockData = await loadToolsLockFile(lockFilePath);
        const configHash = calculateConfigHash(toolDetails);
        updateToolInLock(toolsLockData, toolToFetch.name, toolToFetch.id, configHash);
        await saveToolsLockFile(lockFilePath, toolsLockData);

        setTools(prev => prev.map((t, i) =>
          i === currentToolIndex
            ? {
                ...t,
                status: 'completed',
                message: `Saved to ${configPath}`,
                configPath,
                type: toolType
              }
            : t
        ));

        // Update the tools array with completed status

      } catch (err) {
        setTools(prev => prev.map((t, i) =>
          i === currentToolIndex
            ? {
                ...t,
                status: 'error',
                message: err instanceof Error ? err.message : 'Failed to fetch tool'
              }
            : t
        ));
      }

      setCurrentToolIndex(prev => prev + 1);
    };

    fetchNextTool();
  }, [currentToolIndex, state.phase, tools, dryRun, outputDir, exit, onComplete]);

  const getStatusSummary = () => {
    const completed = tools.filter(t => t.status === 'completed').length;
    const skipped = tools.filter(t => t.status === 'skipped').length;
    const errors = tools.filter(t => t.status === 'error').length;
    const progress = tools.length > 0 ? (currentToolIndex / tools.length) * 100 : 0;

    return {
      total: tools.length,
      completed,
      skipped,
      errors,
      pending: tools.length - completed - skipped - errors,
      progress
    };
  };

  return (
    <App
      title="ElevenLabs Agents CLI"
      subtitle="Fetch Tools from Workspace"
      showOverlay={false}
    >
      <Box flexDirection="column" gap={1}>
        {state.loading ? (
          <StatusCard
            title="Initializing"
            status="loading"
            message="Connecting to ElevenLabs and discovering tools..."
          />
        ) : state.error ? (
          <StatusCard
            title="Error"
            status="error"
            message={state.error}
          />
        ) : (
          <>
            {/* Summary Card */}
            <StatusCard
              title="Tool Fetch Summary"
              status={state.phase === 'complete' ? 'success' : 'loading'}
              message={
                state.phase === 'complete'
                  ? `Completed! ${getStatusSummary().completed} tool(s) fetched`
                  : `Fetching ${tools.length} tool(s)${dryRun ? ' (DRY RUN)' : ''}...`
              }
              details={
                tools.length > 0 ? [
                  `Total: ${getStatusSummary().total}`,
                  `Completed: ${getStatusSummary().completed}`,
                  `Skipped: ${getStatusSummary().skipped}`,
                  ...(getStatusSummary().errors > 0 ? [`Errors: ${getStatusSummary().errors}`] : []),
                  `Progress: ${Math.round(getStatusSummary().progress)}%`
                ] : undefined
              }
            />

            {/* Progress Bar */}
            {tools.length > 0 && (
              <ProgressFlow
                value={getStatusSummary().progress}
                label={`Tools Progress (${currentToolIndex}/${tools.length})`}
                showWave={true}
              />
            )}

            {/* Tools Status List */}
            {tools.length > 0 && (
              <Box flexDirection="column" marginTop={1}>
                <Text color={theme.colors.text.primary} bold>
                  Tools:
                </Text>
                {tools.map((tool, index) => {
                  // Map tool status to StatusCard status
                  const getStatusType = (status: string) => {
                    switch (status) {
                      case 'completed': return 'success';
                      case 'error': return 'error';
                      case 'fetching': return 'loading';
                      case 'skipped': return 'warning';
                      case 'pending':
                      default: return 'idle';
                    }
                  };

                  return (
                    <Box key={index} marginTop={0}>
                      <StatusCard
                        title={tool.name}
                        status={getStatusType(tool.status)}
                        message={tool.message || `Type: ${tool.type || 'unknown'}`}
                        borderStyle="single"
                      />
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Output directory info */}
            {!dryRun && getStatusSummary().completed > 0 && (
              <Box marginTop={1}>
                <Text color={theme.colors.text.secondary}>
                  Tool configs saved to: <Text color={theme.colors.text.primary}>{outputDir}/</Text>
                </Text>
              </Box>
            )}

            {/* Instructions */}
            {state.phase === 'complete' && getStatusSummary().completed > 0 && (
              <Box marginTop={1} flexDirection="column" gap={0}>
                <Text color={theme.colors.text.muted}>
                  Next steps:
                </Text>
                <Text color={theme.colors.text.muted}>
                  • Edit tool configs in '{outputDir}/' directory
                </Text>
                <Text color={theme.colors.text.muted}>
                  • Use tools in your agent configurations
                </Text>
                <Text color={theme.colors.text.muted}>
                  • Run 'agents sync' to deploy agents with tools
                </Text>
              </Box>
            )}
          </>
        )}

        <Box marginTop={1}>
          <Text color={theme.colors.text.muted} dimColor>
            {state.phase === 'complete' ? 'Auto-exit in 3s' : 'Press Ctrl+C to cancel'}
          </Text>
        </Box>
      </Box>
    </App>
  );
};

export default FetchToolsView;