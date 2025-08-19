import React from 'react';
import { Box, Text } from 'ink';
import theme from '../themes/elevenlabs.js';

interface CommandOption {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CommandPanelProps {
  title?: string;
  options: CommandOption[];
  selectedIndex?: number;
  showKeys?: boolean;
}

export const CommandPanel: React.FC<CommandPanelProps> = ({
  title,
  options,
  selectedIndex = -1,
  showKeys = true,
}) => {
  return (
    <Box flexDirection="column" marginTop={1}>
      {title && (
        <Box marginBottom={1}>
          <Text color={theme.colors.text.primary} bold>
            {title}
          </Text>
        </Box>
      )}
      
      <Box flexDirection="column">
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;
          const color = option.disabled 
            ? theme.colors.text.disabled 
            : isSelected 
              ? theme.colors.accent.primary 
              : theme.colors.text.primary;
          
          return (
            <Box key={option.key} marginBottom={0.5}>
              <Box>
                {showKeys && (
                  <Text color={theme.colors.text.muted}>
                    [{option.key}] 
                  </Text>
                )}
                <Text color={color} bold={isSelected}>
                  {isSelected ? '▶ ' : '  '}{option.label}
                </Text>
                {option.description && (
                  <Text color={theme.colors.text.secondary}>
                    {' - '}{option.description}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default CommandPanel;