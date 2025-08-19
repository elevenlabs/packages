import React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient, { GradientName } from 'ink-gradient';
import theme from '../themes/elevenlabs.js';

// Type assertions for React 19 compatibility
const GradientCompat = Gradient as any;
const BigTextCompat = BigText as any;

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'ConvAI', 
  subtitle,
  showLogo = true 
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {showLogo && (
        <Box>
          <GradientCompat name={theme.gradients.elevenlabs as GradientName}>
            <BigTextCompat text={title} font={theme.typography.fonts.header} />
          </GradientCompat>
        </Box>
      )}
      {subtitle && (
        <Box marginLeft={2}>
          <Text color={theme.colors.text.secondary}>
            {subtitle}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.colors.border}>
          {'─'.repeat(60)}
        </Text>
      </Box>
    </Box>
  );
};

export default Header;