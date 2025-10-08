import React from 'react';
import { Box, Text } from 'ink';
import theme from '../themes/elevenlabs.js';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  showDivider?: boolean;
  marginBottom?: number;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'ElevenLabs Agents', 
  subtitle,
  showLogo = true,
  showDivider = true,
  marginBottom = 2
}) => {
  return (
    <Box flexDirection="column" marginBottom={marginBottom}>
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
          {showDivider && (
            <Box>
              <Text color={theme.colors.border} dimColor>
                {'━'.repeat(40)}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default Header;