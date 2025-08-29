import React from 'react';
import { Box } from 'ink';
import Header from './components/Header.js';
import ChladniOverlay from './components/ChladniOverlay.js';

interface AppProps {
  title?: string;
  subtitle?: string;
  showOverlay?: boolean;
  children?: React.ReactNode;
}

export const App: React.FC<AppProps> = ({ 
  title = 'ElevenLabs Conversational AI',
  subtitle,
  showOverlay = false,
  children 
}) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Header title={title} subtitle={subtitle} />
      
      {showOverlay && (
        <Box marginBottom={2}>
          <ChladniOverlay 
            active={true} 
            intensity={3} 
            width={60} 
            height={5}
          />
        </Box>
      )}
      
      <Box flexDirection="column">
        {children}
      </Box>
    </Box>
  );
};

export default App;