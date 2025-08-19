import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { isLoggedIn, removeApiKey } from '../../config.js';

interface LogoutViewProps {
  onComplete?: () => void;
}

export const LogoutView: React.FC<LogoutViewProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const [confirming, setConfirming] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useInput((input) => {
    if (confirming) {
      if (input.toLowerCase() === 'y') {
        handleLogout();
      } else if (input.toLowerCase() === 'n') {
        exit();
      }
    }
  });

  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        setNotLoggedIn(true);
        setConfirming(false);
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            exit();
          }
        }, 2000);
      }
    };

    checkLoginStatus();
  }, [exit, onComplete]);

  const handleLogout = async () => {
    setConfirming(false);
    setProcessing(true);

    try {
      await removeApiKey();
      setProcessing(false);
      setSuccess(true);

      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout');
      setProcessing(false);
    }
  };

  return (
    <App 
      title="ElevenLabs Conversational AI"
      subtitle="Logout"
      showOverlay={!success && !notLoggedIn}
    >
      <Box flexDirection="column" gap={1}>
        {notLoggedIn ? (
          <>
            <StatusCard
              title="Not Logged In"
              status="warning"
              message="You are not currently logged in"
            />
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                No active session to logout from
              </Text>
            </Box>
          </>
        ) : confirming ? (
          <>
            <StatusCard
              title="Confirm Logout"
              status="warning"
              message="Are you sure you want to logout?"
              details={[
                "This will remove your stored API key",
                "You'll need to login again to use the CLI"
              ]}
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.text.primary}>
                Do you want to logout? (y/n): 
              </Text>
            </Box>
          </>
        ) : processing ? (
          <StatusCard
            title="Logging Out"
            status="loading"
            message="Removing stored credentials..."
          />
        ) : success ? (
          <>
            <StatusCard
              title="Logout Successful"
              status="success"
              message="You have been logged out"
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.success}>
                ✓ API key removed successfully
              </Text>
            </Box>
            
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                Run 'convai login' to authenticate again
              </Text>
            </Box>
          </>
        ) : error ? (
          <>
            <StatusCard
              title="Logout Failed"
              status="error"
              message={error}
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.error}>
                ✗ Failed to remove credentials
              </Text>
            </Box>
          </>
        ) : null}
      </Box>
    </App>
  );
};

export default LogoutView;