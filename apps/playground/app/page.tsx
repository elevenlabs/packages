"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";

interface DebugMessage {
  type: "debug";
  message: any;
  timestamp: Date;
}

interface MCPToolCall {
  type: "mcp";
  toolCall: any;
  timestamp: Date;
}

interface Message {
  type: "message";
  message: any;
  timestamp: Date;
}

type LogMessage = DebugMessage | MCPToolCall | Message;

export default function Home() {
  const conversation = useConversation({
    onMCPToolCall: toolCall => {
      console.log("MCP Tool Call:", toolCall);
      setLogs(prev => [
        ...prev,
        { type: "mcp", toolCall, timestamp: new Date() },
      ]);
    },
  });
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const startConversation = useCallback(async () => {
    try {
      await conversation.startSession({
        agentId: "agent_8701k6czdk8qemksdtm47kb386qg",
        connectionType: "webrtc",
        onMessage: message => {
          console.log("Message:", message);
          setLogs(prev => [
            ...prev,
            { type: "message", message, timestamp: new Date() },
          ]);
        },
        onDebug: debugMessage => {
          console.log("Debug:", debugMessage);
          setLogs(prev => [
            ...prev,
            { type: "debug", message: debugMessage, timestamp: new Date() },
          ]);
        },
      });
    } catch (error) {
      console.error(error);
    }
  }, [conversation]);

  const sendMessage = useCallback(() => {
    if (message.trim()) {
      conversation.sendUserMessage(message);
      setMessage("");
    }
  }, [conversation, message]);

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            onClick={startConversation}
          >
            Start Conversation
          </button>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Enter message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
          />
          <button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-500 text-white gap-2 hover:bg-blue-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            onClick={sendMessage}
          >
            Send Message
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="rounded-lg border border-solid border-gray-300 transition-colors flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm px-3 py-2"
            onClick={() => conversation.sendUserMessage("Hello!")}
          >
            Send "Hello!"
          </button>
          <button
            className="rounded-lg border border-solid border-gray-300 transition-colors flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm px-3 py-2"
            onClick={() =>
              conversation.sendUserMessage("What's the weather like?")
            }
          >
            Send "What's the weather like?"
          </button>
          <button
            className="rounded-lg border border-solid border-gray-300 transition-colors flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-medium text-sm px-3 py-2"
            onClick={() => conversation.sendUserMessage("Tell me a joke")}
          >
            Send "Tell me a joke"
          </button>
        </div>

        {logs.length > 0 && (
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">
                Debug, MCP & Message Logs
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
              >
                Clear Logs
              </button>
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    log.type === "mcp"
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                      : log.type === "debug"
                        ? "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700"
                        : "bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">
                      {log.type === "mcp"
                        ? "🔧 MCP Tool Call"
                        : log.type === "debug"
                          ? "🐛 Debug Message"
                          : "💬 Message"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(
                      log.type === "mcp" ? log.toolCall : log.message,
                      null,
                      2
                    )}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
