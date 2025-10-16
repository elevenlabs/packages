import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { setApiKey } from '../../config.js';

interface LoginViewProps {
  onComplete?: () => void;
  environment?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({ onComplete, environment = 'prod' }) => {
  const { exit } = useApp();
  const [apiKey, setApiKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle keyboard input (including paste)
  useInput((input, key) => {
    // Ignore input while submitting or after success
    if (success || isSubmitting) return;

    // Submit on Enter
    if (key.return) {
      if (apiKey.trim()) {
        handleSubmit();
      }
      return;
    }

    // Exit on Escape
    if (key.escape) {
      exit();
      return;
    }

    // Delete character on Backspace/Delete
    if (key.backspace || key.delete) {
      setApiKeyInput(prev => prev.slice(0, -1));
      return;
    }

    // Append character (handles both typing and paste)
    // Paste events come as rapid individual character inputs
    if (input) {
      setApiKeyInput(prev => prev + input);
    }
  });

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError('API key cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await setApiKey(apiKey, environment);
      setSuccess(true);
      
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
      setIsSubmitting(false);
    }
  };

  return (
    <App
      title="ElevenLabs Agents"
    >
      <Box flexDirection="column" gap={1}>
        {!success ? (
          <>
            <Box marginBottom={1}>
              <Text color={theme.colors.text.primary}>
                Enter your ElevenLabs API key for environment: <Text color={theme.colors.accent.primary}>{environment}</Text>
              </Text>
            </Box>

            <Box marginBottom={1}>
              <Text color={theme.colors.text.secondary}>
                Get your API key at: <Text color={theme.colors.accent.primary}>https://elevenlabs.io/app/developers/api-keys</Text>
              </Text>
            </Box>

            <Box marginBottom={1}>
              <Text>
                {/* Masked input display */}
                <Text color={theme.colors.text.primary}>
                  {apiKey ? '*'.repeat(apiKey.length) : ''}
                </Text>

                {/* Placeholder when empty */}
                {!apiKey && (
                  <Text color={theme.colors.text.secondary}> sk_...</Text>
                )}
              </Text>
            </Box>

            {error && (
              <Box marginBottom={1}>
                <Text color={theme.colors.error}>
                  ✗ {error}
                </Text>
              </Box>
            )}

            <Box marginTop={1} flexDirection="column">
              <Text color={theme.colors.text.secondary}>
                Press <Text bold>Enter</Text> to submit • <Text bold>Escape</Text> to cancel
              </Text>
            </Box>

            {isSubmitting && (
              <Box marginTop={1}>
                <StatusCard
                  title="Saving API Key"
                  status="loading"
                  message="Securely storing your credentials..."
                />
              </Box>
            )}
          </>
        ) : (
          <Box flexDirection="column" gap={1}>
            <StatusCard
              title="Login Successful"
              status="success"
              message={`Your API key has been securely stored for environment '${environment}'`}
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.success}>
                ✓ You are now logged in to ElevenLabs ({environment})
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default LoginView;