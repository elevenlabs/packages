import React from 'react';
import { Box, Text } from 'ink';
import { Spinner } from '@inkjs/ui';
import theme from '../themes/elevenlabs.js';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'idle';

interface StatusCardProps {
  title: string;
  status: StatusType;
  message?: string;
  details?: string[];
  borderStyle?: 'single' | 'double' | 'round' | 'bold' | 'classic';
}

const statusIcons: Record<StatusType, string> = {
  success: '✓',
  error: '✗',
  warning: '!',
  info: 'i',
  loading: '',
  idle: '○',
};

const statusColors: Record<StatusType, string> = {
  success: theme.colors.success,
  error: theme.colors.error,
  warning: theme.colors.warning,
  info: theme.colors.info,
  loading: theme.colors.accent.primary,
  idle: theme.colors.text.muted,
};

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  message,
  details = [],
  borderStyle = 'round',
}) => {
  const color = statusColors[status];
  const icon = statusIcons[status];

  return (
    <Box 
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={color}
      padding={1}
      marginBottom={1}
    >
      <Box>
        {status === 'loading' ? (
          <Box>
            <Spinner label={` ${title}`} type="dots" />
          </Box>
        ) : (
          <Box>
            <Text color={color} bold>
              {icon && `${icon} `}{title}
            </Text>
          </Box>
        )}
      </Box>
      
      {message && (
        <Box marginTop={1}>
          <Text color={theme.colors.text.primary}>
            {message}
          </Text>
        </Box>
      )}
      
      {details.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {details.map((detail, index) => (
            <Box key={index} marginLeft={2}>
              <Text color={theme.colors.text.secondary}>
                {theme.ascii.patterns.dot} {detail}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default StatusCard;