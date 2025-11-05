// @ts-nocheck - pnpm hoisting causes duplicate React type definitions
import React from 'react';
import { LiveKitRoom } from '@livekit/react-native';
import type { LocalParticipant } from 'livekit-client';
import type { Callbacks, ClientToolsConfig } from '../types';
import { MessageHandler } from './MessageHandler';

interface LiveKitRoomWrapperProps {
  children?: React.ReactNode;
  serverUrl: string;
  token: string;
  connect: boolean;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
  roomConnected: boolean;
  callbacks: Callbacks;
  onParticipantReady: (participant: LocalParticipant) => void;
  sendMessage: (message: unknown) => void;
  clientTools: ClientToolsConfig['clientTools'];
  onEndSession: (reason?: "user" | "agent") => void;
  updateCurrentEventId?: (eventId: number) => void;
  key?: string;
}

export const LiveKitRoomWrapper = ({
  children,
  serverUrl,
  token,
  connect,
  onConnected,
  onDisconnected,
  onError,
  roomConnected,
  callbacks,
  onParticipantReady,
  sendMessage,
  clientTools,
  updateCurrentEventId,
  onEndSession,
}: LiveKitRoomWrapperProps) => {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={connect}
      audio={true}
      video={false}
      options={{
        adaptiveStream: { pixelDensity: 'screen' },
      }}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
    >
      <MessageHandler
        onReady={onParticipantReady}
        isConnected={roomConnected}
        callbacks={callbacks}
        sendMessage={sendMessage}
        clientTools={clientTools}
        updateCurrentEventId={updateCurrentEventId}
        onEndSession={onEndSession}
      />
      {children as any}
    </LiveKitRoom>
  );
};