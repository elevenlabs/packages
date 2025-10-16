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
  ToolsConfig,
  ToolDefinition,
  type Tool
} from '../../tools.js';
import path from 'path';
import fs from 'fs-extra';
import { generateUniqueFilename } from '../../utils.js';

interface PullTool {
  name: string;
  id: string;
  env: string;
  type?: string;
  status: 'pending' | 'pulling' | 'completed' | 'error' | 'skipped';
  action?: 'create' | 'update' | 'skip';
  message?: string;
  configPath?: string;
}

interface PullToolsViewProps {
  tool?: string; // Tool ID to pull specifically
  outputDir: string;
  dryRun?: boolean;
  update?: boolean;
  all?: boolean;
  environments: string[];
  onComplete?: () => void;
}

const TOOLS_CONFIG_FILE = "tools.json";

export const PullToolsView: React.FC<PullToolsViewProps> = ({
  tool,
  outputDir = 'tool_configs',
  dryRun = false,
  update,
  all,
  environments,
  onComplete
}) => {
  const { exit } = useApp();
  const [tools, setTools] = useState<PullTool[]>([]);
  const [currentToolIndex, setCurrentToolIndex] = useState(0);
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
    phase: 'loading' as 'loading' | 'pulling' | 'complete'
  });

  useEffect(() => {
    const initializePull = async () => {
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

        // Collect all tools from all environments
        const allToolsToPull: PullTool[] = [];

        // Loop through each environment
        for (const environment of environments) {
          const client = await getElevenLabsClient(environment);

          // Build ID-based map for existing tools in this environment
          const existingToolIds = new Map(
            toolsConfig.tools
              .filter((t: ToolDefinition) => (t.env || 'prod') === environment)
              .map((tool: ToolDefinition) => [tool.id, tool])
          );

          // Fetch tools - either specific tool by ID or all tools
          let filteredTools: unknown[];
          if (tool) {
            // Pull specific tool by ID
            const toolDetails = await getToolApi(client, tool);
            const toolDetailsTyped = toolDetails as { tool_id?: string; toolId?: string; id?: string; tool_config?: { name?: string } };
            const toolId = toolDetailsTyped.tool_id || toolDetailsTyped.toolId || toolDetailsTyped.id || tool;
            const toolName = toolDetailsTyped.tool_config?.name;
            
            if (!toolName) continue;
            
            filteredTools = [{
              tool_id: toolId,
              toolId: toolId,
              id: toolId,
              tool_config: toolDetailsTyped.tool_config
            }];
          } else {
            const toolsList = await listToolsApi(client);
            if (toolsList.length === 0) continue;
            filteredTools = toolsList;
          }

          // Prepare tools list with action determination
          for (const toolItem of filteredTools) {
            const toolId = (toolItem as any).tool_id || (toolItem as any).toolId || (toolItem as any).id;
            let toolName = (toolItem as any).tool_config?.name;

            if (!toolId || !toolName) continue;

            const existingEntry = existingToolIds.get(toolId);
            let action: 'create' | 'update' | 'skip';
            let status: 'pending' | 'skipped' = 'pending';

            if (existingEntry) {
              // Tool with this ID already exists locally
              if (update || all) {
                action = 'update';
                status = 'pending';
              } else {
                action = 'skip';
                status = 'skipped';
              }
            } else {
              // New tool (not present locally)
              if (update) {
                action = 'skip';
                status = 'skipped';
              } else {
                action = 'create';
                status = 'pending';
              }
            }

            allToolsToPull.push({
              name: toolName,
              id: toolId,
              env: environment,
              type: (toolItem as any).tool_config?.type || (toolItem as any).type,
              action,
              status,
              message: status === 'skipped' ? 'Skipped' : undefined
            });
          }
        }

        if (allToolsToPull.length === 0) {
          setState(prev => ({ ...prev, error: 'No tools found in any environment.', loading: false }));
          return;
        }

        setTools(allToolsToPull);
        setState(prev => ({ ...prev, loading: false, phase: 'pulling' }));

        if (allToolsToPull.filter(t => t.status === 'pending').length === 0) {
          setState(prev => ({ ...prev, error: 'No tools to pull with current options.', phase: 'complete' }));
          return;
        }

      } catch (err) {
        setState(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to initialize tool pulling',
          loading: false
        }));
      }
    };

    initializePull();
  }, [tool]);

  useEffect(() => {
    if (state.phase !== 'pulling' || currentToolIndex >= tools.length) {
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

    const pullNextTool = async () => {
      const toolToPull = tools[currentToolIndex];

      if (toolToPull.status === 'skipped') {
        setCurrentToolIndex(prev => prev + 1);
        return;
      }

      // Update status to pulling
      setTools(prev => prev.map((t, i) =>
        i === currentToolIndex ? { ...t, status: 'pulling', message: 'Downloading config...' } : t
      ));

      if (dryRun) {
        // Simulate dry run
        setTimeout(() => {
          setTools(prev => prev.map((t, i) =>
            i === currentToolIndex
              ? { ...t, status: 'completed', message: '[DRY RUN] Would pull tool' }
              : t
          ));
          setCurrentToolIndex(prev => prev + 1);
        }, 1000);
        return;
      }

      try {
        const client = await getElevenLabsClient(toolToPull.env);
        const toolDetails = await getToolApi(client, toolToPull.id);

        // Extract the tool_config from the response
        const toolDetailsTyped = toolDetails as { tool_config?: Tool & { type?: string } };
        const toolConfig = toolDetailsTyped.tool_config;
        
        if (!toolConfig) {
          throw new Error('No tool_config found in response');
        }

        const toolType = toolConfig.type || 'unknown';
        let configPath: string;

        // Read current tools.json
        const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
        const toolsConfig = await readToolsConfig(toolsConfigPath);
        
        // Find existing entry by ID
        const existingToolIndex = toolsConfig.tools.findIndex(t => t.id === toolToPull.id);

        if (toolToPull.action === 'update' && existingToolIndex !== -1) {
          // Update existing tool: use existing config path
          const existingTool = toolsConfig.tools[existingToolIndex];
          if (!existingTool.config) {
            throw new Error(`Existing tool with ID ${existingTool.id} has no config path`);
          }
          configPath = existingTool.config;
          
          const configFilePath = path.resolve(configPath);
          await fs.ensureDir(path.dirname(configFilePath));
          await writeToolConfig(configFilePath, toolConfig as Tool);

          setTools(prev => prev.map((t, i) =>
            i === currentToolIndex
              ? {
                  ...t,
                  status: 'completed',
                  message: `Updated at ${configPath}`,
                  configPath,
                  type: toolType
                }
              : t
          ));
        } else {
          // Create new tool
          configPath = await generateUniqueFilename(outputDir, toolToPull.name);
          const configFilePath = path.resolve(configPath);

          // Create config file
          await fs.ensureDir(path.dirname(configFilePath));
          await writeToolConfig(configFilePath, toolConfig as Tool);

          const newTool: ToolDefinition = {
            type: toolType as 'webhook' | 'client',
            config: configPath,
            id: toolToPull.id,
            env: toolToPull.env
          };

          toolsConfig.tools.push(newTool);
          await writeToolsConfig(toolsConfigPath, toolsConfig);

          setTools(prev => prev.map((t, i) =>
            i === currentToolIndex
              ? {
                  ...t,
                  status: 'completed',
                  message: `Created at ${configPath}`,
                  configPath,
                  type: toolType
                }
              : t
          ));
        }

      } catch (err) {
        setTools(prev => prev.map((t, i) =>
          i === currentToolIndex
            ? {
                ...t,
                status: 'error',
                message: err instanceof Error ? err.message : 'Failed to pull tool'
              }
            : t
        ));
      }

      setCurrentToolIndex(prev => prev + 1);
    };

    pullNextTool();
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
    >
      <Box flexDirection="column" gap={1}>
        {!state.loading && !state.error && (
          <Box marginBottom={1}>
            <Text color={theme.colors.text.primary} bold>
              Pulling from {environments.length} environment{environments.length > 1 ? 's' : ''}: 
            </Text>
            <Text color={theme.colors.accent.secondary}> {environments.join(', ')}</Text>
          </Box>
        )}
        
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
              title="Tool Pull Summary"
              status={state.phase === 'complete' ? 'success' : 'loading'}
              message={
                state.phase === 'complete'
                  ? `Completed! ${getStatusSummary().completed} tool(s) pulled`
                  : `Pulling ${tools.length} tool(s)${dryRun ? ' (DRY RUN)' : ''}...`
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
                      case 'pulling': return 'loading';
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
                        message={tool.message || `Type: ${tool.type || 'unknown'} | Env: ${tool.env}`}
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
                  • Run 'agents push' to deploy agents with tools
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

export default PullToolsView;