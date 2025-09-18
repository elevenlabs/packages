import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import theme from '../themes/elevenlabs.js';

interface ChladniOverlayProps {
  active?: boolean;
  intensity?: number; // 0-10
  color?: string;
  width?: number;
  height?: number;
}

export const ChladniOverlay: React.FC<ChladniOverlayProps> = ({
  active = true,
  intensity = 5,
  color = theme.colors.accent.primary,
  width = 60,
  height = 10,
}) => {
  const [frame, setFrame] = useState(0);
  const [pattern, setPattern] = useState<string[]>([]);
  
  // Animate the pattern
  useEffect(() => {
    if (!active) return;
    
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 60);
    }, theme.animation.normal);
    
    return () => clearInterval(interval);
  }, [active]);
  
  // Generate Chladni-inspired pattern
  useEffect(() => {
    const generatePattern = () => {
      const lines: string[] = [];
      const time = frame / 10;
      
      for (let y = 0; y < height; y++) {
        let line = '';
        for (let x = 0; x < width; x++) {
          // Generate Chladni-like pattern using trigonometric functions
          const fx = x / width * Math.PI * 2;
          const fy = y / height * Math.PI * 2;
          
          // Combine multiple wave functions for complex patterns
          const wave1 = Math.sin(fx * 2 + time) * Math.cos(fy * 2 - time);
          const wave2 = Math.sin(fx * 3 - time * 0.5) * Math.sin(fy * 3 + time * 0.5);
          const wave3 = Math.cos(fx * 4 + time * 0.3) * Math.cos(fy * 4 - time * 0.3);
          
          const combined = (wave1 + wave2 * 0.5 + wave3 * 0.3) / 1.8;
          const threshold = (10 - intensity) / 10;
          
          // Select character based on wave intensity
          let char = ' ';
          const absValue = Math.abs(combined);
          
          if (absValue > threshold * 0.9) {
            char = theme.ascii.patterns.filledCircle;
          } else if (absValue > threshold * 0.7) {
            char = theme.ascii.patterns.circle;
          } else if (absValue > threshold * 0.5) {
            char = theme.ascii.patterns.diamond;
          } else if (absValue > threshold * 0.3) {
            char = theme.ascii.patterns.dot;
          } else if (absValue > threshold * 0.1) {
            char = theme.ascii.patterns.plus;
          }
          
          line += char;
        }
        lines.push(line);
      }
      
      setPattern(lines);
    };
    
    generatePattern();
  }, [frame, intensity, width, height]);
  
  if (!active) {
    return null;
  }
  
  return (
    <Box flexDirection="column">
      {pattern.map((line, index) => (
        <Text key={index} color={color} dimColor={index % 2 === 0}>
          {line}
        </Text>
      ))}
    </Box>
  );
};

export default ChladniOverlay;