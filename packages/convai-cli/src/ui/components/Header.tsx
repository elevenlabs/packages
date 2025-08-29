import React from 'react';
import { Box, Text } from 'ink';
import theme from '../themes/elevenlabs.js';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'ElevenLabs Conversational AI', 
  subtitle,
  showLogo = true 
}) => {
  return (
    <Box flexDirection="column" marginBottom={2}>
      {showLogo && (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="column">
            {/* Clean, minimalist ElevenLabs header */}
            <Box>
              <Text color={theme.colors.text.primary} bold>
                ║║ {title}
              </Text>
            </Box>
            {subtitle && (
              <Box>
                <Text color={theme.colors.text.muted} dimColor>
                  {subtitle}
                </Text>
              </Box>
            )}
          </Box>
          <Box>
            <Text color={theme.colors.border} dimColor>
              {'━'.repeat(40)}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Header;