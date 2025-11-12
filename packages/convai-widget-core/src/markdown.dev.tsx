import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { useState, useEffect } from "preact/compat";
import { Markdown } from "./components/Markdown";
import { Style } from "./styles/Style";
import { AttributesProvider } from "./contexts/attributes";
import { AvatarConfigProvider } from "./contexts/avatar-config";
import { ConversationProvider } from "./contexts/conversation";
import { FeedbackProvider } from "./contexts/feedback";
import { LanguageConfigProvider } from "./contexts/language-config";
import { MicConfigProvider } from "./contexts/mic-config";
import { ServerLocationProvider } from "./contexts/server-location";
import { SessionConfigProvider } from "./contexts/session-config";
import { SheetContentProvider } from "./contexts/sheet-content";
import { TermsProvider } from "./contexts/terms";
import { TextContentsProvider } from "./contexts/text-contents";
import { WidgetConfigProvider } from "./contexts/widget-config";

const STORAGE_KEY = "markdown-playground-text";
const DEFAULT_TEXT =
  "# Welcome to Markdown Playground\n\n" +
  "This is a **markdown** renderer.\n\n" +
  "## Features\n\n" +
  "- Support for *italic* and **bold** text\n" +
  "- Lists and bullet points\n" +
  "- Code blocks\n\n" +
  "```javascript\n" +
  "console.log('Hello, World!');\n" +
  "```\n\n" +
  "Try editing the text on the left!";

function MarkdownPlayground() {
  const [text, setText] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? DEFAULT_TEXT;
  });
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  const startStreaming = () => {
    setIsStreaming(true);
    setStreamingText("");

    const maxChunkSize = 100; // Max characters per push
    let currentPos = 0;

    const streamNextChunk = () => {
      if (currentPos < text.length) {
        // Random chunk size between 1 and maxChunkSize
        const chunkSize = Math.floor(Math.random() * maxChunkSize) + 1;
        const nextPos = Math.min(currentPos + chunkSize, text.length);

        setStreamingText(text.slice(0, nextPos));
        currentPos = nextPos;

        // Add jitter: 20-80ms random delay
        const jitter = Math.random() * 60 + 20;
        setTimeout(streamNextChunk, jitter);
      } else {
        setIsStreaming(false);
      }
    };

    streamNextChunk();
  };

  const displayText = isStreaming ? streamingText : text;

  return (
    <>
      <AttributesProvider
        value={{
          "agent-id": import.meta.env.VITE_AGENT_ID,
        }}
      >
        <ServerLocationProvider>
          <WidgetConfigProvider>
            <Style />
            <div className="w-screen h-screen flex bg-base-hover text-base-primary">
              <div className="w-1/2 h-full flex flex-col p-4 border-r border-base-border">
                <h2 className="text-xl font-bold mb-4">Input</h2>
                <textarea
                  className="flex-1 p-4 bg-base border border-base-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={text}
                  onChange={e => setText(e.currentTarget.value)}
                  placeholder="Enter markdown text here..."
                />
              </div>
              <div className="w-1/2 h-full flex flex-col p-4 overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Preview</h2>
                  <button
                    onClick={startStreaming}
                    disabled={isStreaming}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isStreaming ? "Streaming..." : "Simulate Stream"}
                  </button>
                </div>
                <div className="flex-1">
                  <Markdown text={displayText} />
                </div>
              </div>
            </div>
          </WidgetConfigProvider>
        </ServerLocationProvider>
      </AttributesProvider>
    </>
  );
}

render(jsx(MarkdownPlayground, {}), document.body);
