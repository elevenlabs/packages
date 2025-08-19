import React, { useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { setResidency, getResidency, LOCATIONS } from '../../config.js';

interface ResidencyViewProps {
  initialResidency?: string;
  onComplete?: () => void;
}

export const ResidencyView: React.FC<ResidencyViewProps> = ({ 
  initialResidency,
  onComplete 
}) => {
  const { exit } = useApp();
  const [currentResidency, setCurrentResidency] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadCurrentResidency = async () => {
      try {
        const residency = await getResidency();
        setCurrentResidency(residency);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load current residency');
        setIsLoading(false);
      }
    };

    if (!initialResidency) {
      loadCurrentResidency();
    } else {
      setIsLoading(false);
      handleResidencySelect({ value: initialResidency });
    }
  }, [initialResidency]);

  const handleResidencySelect = async (item: { value: string }) => {
    setIsSaving(true);
    setError(null);

    try {
      await setResidency(item.value as any);
      setCurrentResidency(item.value);
      setSuccess(true);
      
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set residency');
      setIsSaving(false);
    }
  };

  const locationItems = LOCATIONS.map(location => ({
    label: location.charAt(0).toUpperCase() + location.slice(1),
    value: location
  }));

  return (
    <App 
      title="ElevenLabs Conversational AI"
      subtitle="API Residency Configuration"
      showOverlay={!success}
    >
      <Box flexDirection="column" gap={1}>
        {isLoading ? (
          <StatusCard
            title="Loading"
            status="loading"
            message="Fetching current residency..."
          />
        ) : success ? (
          <>
            <StatusCard
              title="Residency Updated"
              status="success"
              message={`API residency set to: ${currentResidency}`}
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                Your API calls will now be routed through the {currentResidency} region
              </Text>
            </Box>
          </>
        ) : isSaving ? (
          <StatusCard
            title="Updating Residency"
            status="loading"
            message="Saving your selection..."
          />
        ) : (
          <>
            {currentResidency && (
              <Box marginBottom={1}>
                <StatusCard
                  title="Current Residency"
                  status="idle"
                  message={currentResidency || 'Not set (using default)'}
                />
              </Box>
            )}

            <Box flexDirection="column" gap={1}>
              <Text color={theme.colors.text.primary} bold>
                Select API Residency Location:
              </Text>
              
              <Box marginTop={1}>
                <SelectInput
                  items={locationItems}
                  onSelect={handleResidencySelect}
                />
              </Box>

              <Box marginTop={1}>
                <Text color={theme.colors.text.muted}>
                  Choose the region closest to you for optimal performance
                </Text>
              </Box>
            </Box>

            {error && (
              <Box marginTop={1}>
                <Text color={theme.colors.error}>
                  ✗ {error}
                </Text>
              </Box>
            )}
          </>
        )}
      </Box>
    </App>
  );
};

export default ResidencyView;