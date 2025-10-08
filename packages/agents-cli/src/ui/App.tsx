import React from 'react';
import { Box } from 'ink';
import Header from './components/Header.js';

interface AppProps {
  title?: string;
  headerMarginBottom?: number;
  children?: React.ReactNode;
}

export const App: React.FC<AppProps> = ({ 
  title = 'ElevenLabs Agents',
  headerMarginBottom,
  children 
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Header title={title} marginBottom={headerMarginBottom} />
      
      <Box flexDirection="column">
        {children}
      </Box>
    </Box>
  );
};

export default App;