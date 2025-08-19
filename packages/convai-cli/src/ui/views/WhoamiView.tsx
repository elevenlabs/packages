import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { isLoggedIn, getApiKey, getResidency } from '../../config.js';

interface WhoamiViewProps {
  onComplete?: () => void;
}

export const WhoamiView: React.FC<WhoamiViewProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [residency, setResidency] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const isLogged = await isLoggedIn();
        setLoggedIn(isLogged);
        
        if (isLogged) {
          const apiKey = await getApiKey();
          if (apiKey) {
            // Mask the API key for security
            setMaskedKey(apiKey.slice(0, 8) + '...' + apiKey.slice(-4));
          }
          
          const res = await getResidency();
          setResidency(res);
        }
        
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
      title="ElevenLabs Conversational AI"
      subtitle="Account Status"
      showOverlay={false}
    >
      <Box flexDirection="column" gap={1}>
        {loading ? (
          <StatusCard
            title="Loading"
            status="loading"
            message="Checking authentication status..."
          />
        ) : loggedIn ? (
          <>
            <StatusCard
              title="Authentication Status"
              status="success"
              message="Logged in to ElevenLabs"
              details={[
                `API Key: ${maskedKey}`,
                `Residency: ${residency || 'Not set'}`
              ]}
            />
            
            <Box marginTop={1} flexDirection="column" gap={1}>
              <Box>
                <Text color={theme.colors.text.primary}>
                  Account Details:
                </Text>
              </Box>
              
              <Box marginLeft={2} flexDirection="column">
                <Text color={theme.colors.text.secondary}>
                  • API Key: <Text color={theme.colors.accent.primary}>{maskedKey}</Text>
                </Text>
                <Text color={theme.colors.text.secondary}>
                  • Region: <Text color={theme.colors.accent.primary}>{residency || 'Global'}</Text>
                </Text>
                <Text color={theme.colors.text.secondary}>
                  • Status: <Text color={theme.colors.success}>Active</Text>
                </Text>
              </Box>
            </Box>

            <Box marginTop={1}>
              <Text color={theme.colors.text.muted}>
                Use 'convai logout' to sign out
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
                Run 'convai login' to authenticate with your API key
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