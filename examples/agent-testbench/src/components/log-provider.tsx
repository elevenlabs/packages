import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type LogEntry = {
    part: string;
    method: string;
    args: unknown[];
    when: number;
}

const LogEntriesContext = createContext<LogEntry[]>([]);
const LogControlsContext = createContext<{ appendLogEntry: (entry: LogEntry) => void, clearLog: () => void } | null>(null);

export function LogProvider({ children }: React.PropsWithChildren) {
    const [entries, setEntries] = useState<LogEntry[]>([]);

    const appendLogEntry = useCallback((entry: LogEntry) => {
        setEntries(prev => [...prev, entry]);
    }, [setEntries]);

    const clearLog = useCallback(() => {
        setEntries([]);
    }, [setEntries]);

    const controlsContextValue = useMemo(() => ({
        appendLogEntry,
        clearLog,
    }), [appendLogEntry, clearLog]);

    return (
        <LogControlsContext.Provider value={controlsContextValue}>
            <LogEntriesContext.Provider value={entries}>
                {children}
            </LogEntriesContext.Provider>
        </LogControlsContext.Provider>
    )
}

export function useLogControls() {
    const context = useContext(LogControlsContext);
    if (!context) {
        throw new Error("Expected a LogProvider");
    }
    return context;
}

export function useLogEntries() {
    return useContext(LogEntriesContext);
}
