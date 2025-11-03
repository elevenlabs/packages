import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { ProgressBar } from '@inkjs/ui';
import theme from '../themes/elevenlabs.js';

interface ProgressFlowProps {
  value: number; // 0-100
  label?: string;
  showWave?: boolean;
  showPercentage?: boolean;
  color?: string;
}

export const ProgressFlow: React.FC<ProgressFlowProps> = ({
  value,
  label,
  showWave = true,
  showPercentage = true,
  color = theme.colors.accent.primary,
}) => {
  const [waveFrame, setWaveFrame] = useState(0);
  
  // Animate the wave pattern
  useEffect(() => {
    if (!showWave) return;
    
    const interval = setInterval(() => {
      setWaveFrame((prev) => (prev + 1) % 8);
    }, theme.animation.fast);
    
    return () => clearInterval(interval);
  }, [showWave]);
  
  // Generate wave pattern based on progress
  const generateWavePattern = () => {
    if (!showWave) return '';
    
    const waveChars = ['─', '═', '≡', '≈', '~', '≈', '≡', '═'];
    const baseChar = waveChars[waveFrame];
    const intensity = Math.floor((value / 100) * 10);
    
    return Array(intensity).fill(baseChar).join('');
  };
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      {label && (
        <Box marginBottom={1}>
          <Text color={theme.colors.text.primary}>
            {label}
          </Text>
        </Box>
      )}
      
      <Box flexDirection="row" alignItems="center">
        <Box width={50}>
          <ProgressBar value={value} />
        </Box>
        
        {showPercentage && (
          <Box marginLeft={2}>
            <Text color={color} bold>
              {value}%
            </Text>
          </Box>
        )}
      </Box>
      
      {showWave && (
        <Box marginTop={1}>
          <Text color={color}>
            {generateWavePattern()}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ProgressFlow;