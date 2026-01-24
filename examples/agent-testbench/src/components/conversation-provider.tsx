import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, type PartialOptions } from "@elevenlabs/client";

const ConversationControlContext = createContext<{
    start(options: PartialOptions): void;
    end(): void;
} | null>(null);

export type ConversationStatus = {
    status: "disconnected" | "connecting" | "connected" | "error";
    message?: string;
};

const ConversationStatusContext = createContext<ConversationStatus | null>(null);

const ConversationMicrophoneContext = createContext<{
    isMicMuted: boolean;
    setMicMuted: (isMicMuted: boolean) => void;
} | null>(null);

const STATUS = {
    disconnected: {
        status: "disconnected",
    },
    connecting: {
        status: "connecting",
    },
    connected: {
        status: "connected",
    },
} as const satisfies Record<string, ConversationStatus>;

export function ConversationProvider({ children }: React.PropsWithChildren) {
    const conversationRef = useRef<Conversation | null>(null);
    const conversationStartingRef = useRef<boolean>(false);

    const [status, setStatus] = useState<ConversationStatus>(STATUS.disconnected);
    const [isMicMuted, setMicMuted] = useState(false);

    const start = useCallback((options: PartialOptions) => {
        if (conversationStartingRef.current) {
            throw new Error("Conversation already starting");
        }
        conversationStartingRef.current = true;
        Conversation.startSession(options).then(conversation => {
            conversationRef.current = conversation;
            setStatus(STATUS.connected);
        }, err => {
            setStatus({ status: "error", message: err instanceof Error ? err.message : String(err) });
        }).finally(() => {
            conversationStartingRef.current = false;
        });
        setStatus(STATUS.connecting);
    }, [conversationRef, setStatus]);

    const end = useCallback(() => {
        const { current: conversation } = conversationRef;
        if (conversation) {
            conversation.endSession().then(() => {
                // TODO: Determine if this is actually needed or we can rely on status change events instead
                setStatus(STATUS.disconnected);
            }, err => {
                setStatus({ status: "error", message: `Failed to end session: ${err instanceof Error ? err.message : String(err)}` });
            })
        }
    }, [conversationRef, setStatus]);

    const controlContextValue = useMemo(() => ({
        start,
        end,
    }), [start, end]);

    useEffect(() => {
        return () => {
            const { current: conversation } = conversationRef;
            if (conversation) {
                conversation.endSession().catch(err => {
                    console.error("Failed to end session after unmount", err);
                })
            }
        };
    }, []);

    const handleMicMutedChange = useCallback((isMicMuted: boolean) => {
        setMicMuted(isMicMuted);
        const { current: conversation } = conversationRef;
        if (conversation) {
            conversation.setMicMuted(isMicMuted);
        }
    }, [conversationRef, setMicMuted]);

    const microphoneContextValue = useMemo(() => ({
        isMicMuted,
        setMicMuted: handleMicMutedChange,
    }), [isMicMuted, handleMicMutedChange]);

    return (
        <ConversationControlContext.Provider value={controlContextValue}>
            <ConversationStatusContext.Provider value={status}>
                <ConversationMicrophoneContext.Provider value={microphoneContextValue}>
                    {children}
                </ConversationMicrophoneContext.Provider>
            </ConversationStatusContext.Provider>
        </ConversationControlContext.Provider>
    )
}

export function useConversationControls() {
    const conversation = useContext(ConversationControlContext);
    if (!conversation) {
        throw new Error("Expected a ConversationProvider");
    }
    return conversation;
}

export function useConversationStatus() {
    const status = useContext(ConversationStatusContext);
    if (!status) {
        throw new Error("Expected a ConversationProvider");
    }
    return status;
}
