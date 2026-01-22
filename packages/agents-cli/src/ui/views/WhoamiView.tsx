import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { getApiKey, getResidency, listEnvironments } from '../../config.js';

interface WhoamiViewProps {
  onComplete?: () => void;
}

interface EnvironmentInfo {
  name: string;
  maskedKey: string;
}

export const WhoamiView: React.FC<WhoamiViewProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [environments, setEnvironments] = useState<EnvironmentInfo[]>([]);
  const [residency, setResidency] = useState<string | null>(null);
  const [usingEnvVar, setUsingEnvVar] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        // Check if using environment variable
        const hasEnvVar = !!process.env.ELEVENLABS_API_KEY;
        setUsingEnvVar(hasEnvVar);
        
        if (hasEnvVar) {
          // If using env var, show it for prod environment only
          const apiKey = process.env.ELEVENLABS_API_KEY!;
          const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
          setEnvironments([{ name: 'prod (from env)', maskedKey }]);
        } else {
          // Load all configured environments
          const envs = await listEnvironments();
          const envInfo: EnvironmentInfo[] = [];
          
          for (const env of envs) {
            const apiKey = await getApiKey(env);
            if (apiKey) {
              const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
              envInfo.push({ name: env, maskedKey });
            }
          }
          
          setEnvironments(envInfo);
        }
        
        const res = await getResidency();
        setResidency(res);
        
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    loadStatus();

    // Auto-exit after 5 seconds
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        exit();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [exit, onComplete]);

  return (
    <App 
      title="ElevenLabs Agents"
    >
      <Box flexDirection="column" gap={1}>
        {loading ? (
          <StatusCard
            title="Loading"
            status="loading"
            message="Checking authentication status..."
          />
        ) : environments.length > 0 ? (
          <>
            <StatusCard
              title="Authentication Status"
              status="success"
              message={`Logged in to ${environments.length} environment${environments.length > 1 ? 's' : ''}`}
              details={[
                `Total environments: ${environments.length}`,
                `Residency: ${residency || 'Global'}`
              ]}
            />
            
            <Box marginTop={1} flexDirection="column" gap={1}>
              <Box>
                <Text color={theme.colors.text.primary}>
                  Configured Environments:
                </Text>
              </Box>
              
              <Box marginLeft={2} flexDirection="column">
                {environments.map((env, index) => (
                  <Text key={index} color={theme.colors.text.secondary}>
                    • <Text color={theme.colors.accent.primary} bold>{env.name}</Text>
                    {': '}
                    <Text color={theme.colors.text.muted}>{env.maskedKey}</Text>
                  </Text>
                ))}
              </Box>
            </Box>

            <Box marginTop={1} flexDirection="column">
              <Text color={theme.colors.text.secondary}>
                • Region: <Text color={theme.colors.accent.primary}>{residency || 'Global'}</Text>
              </Text>
              {usingEnvVar && (
                <Text color={theme.colors.warning}>
                  • Source: <Text color={theme.colors.accent.primary}>Environment Variable</Text>
                </Text>
              )}
            </Box>

            <Box marginTop={1}>
              <Text color={theme.colors.text.muted}>
                Use 'agents logout --env &lt;name&gt;' to sign out from specific environment
              </Text>
            </Box>
          </>
        ) : (
          <>
            <StatusCard
              title="Authentication Status"
              status="warning"
              message="Not logged in"
              details={[
                "No API key found"
              ]}
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.warning}>
                ⚠ You are not logged in to ElevenLabs
              </Text>
            </Box>
            
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                Run 'agents login' to authenticate with your API key
              </Text>
            </Box>
          </>
        )}
        
        <Box marginTop={1}>
          <Text color={theme.colors.text.muted} dimColor>
            Press Ctrl+C to exit (auto-exit in 5s)
          </Text>
        </Box>
      </Box>
    </App>
  );
};

export default WhoamiView;