import React from 'react';
import { Box, Text } from 'ink';
import theme from '../themes/elevenlabs.js';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  marginBottom?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'ElevenLabs Agents', 
  showLogo = true,
  marginBottom = 2
}) => {
  return (
    <Box flexDirection="column" marginBottom={marginBottom}>
      {showLogo && (
        <Box flexDirection="column">
          {/* Clean, minimalist ElevenLabs header */}
          <Box>
            <Text color={theme.colors.text.primary} bold>
              ║║ {title}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Header;