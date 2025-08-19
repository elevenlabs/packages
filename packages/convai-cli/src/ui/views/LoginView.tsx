import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { setApiKey } from '../../config.js';

interface LoginViewProps {
  onComplete?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const [apiKey, setApiKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useInput((_, key) => {
    if (key.return && apiKey && !isSubmitting) {
      handleSubmit();
    }
    if (key.escape) {
      exit();
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
      await setApiKey(apiKey);
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
      title="ElevenLabs Conversational AI"
      subtitle="Login with your ElevenLabs API key"
      showOverlay={!success}
    >
      <Box flexDirection="column" gap={1}>
        {!success ? (
          <>
            <Box marginBottom={1}>
              <Text color={theme.colors.text.primary}>
                Enter your ElevenLabs API key:
              </Text>
            </Box>

            <Box marginBottom={1}>
              <TextInput
                value={apiKey}
                onChange={setApiKeyInput}
                placeholder="sk_..."
                mask="*"
              />
            </Box>

            {error && (
              <Box marginBottom={1}>
                <Text color={theme.colors.error}>
                  ✗ {error}
                </Text>
              </Box>
            )}

            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                Press Enter to submit, Escape to cancel
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
              message="Your API key has been securely stored"
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.success}>
                ✓ You are now logged in to ElevenLabs
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default LoginView;