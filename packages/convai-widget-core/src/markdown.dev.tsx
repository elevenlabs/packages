import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { useState, useEffect, useRef } from "preact/compat";
import { useSignal } from "@preact/signals";
import { Style } from "./styles/Style";
import { AttributesProvider } from "./contexts/attributes";
import { ServerLocationProvider } from "./contexts/server-location";
import { WidgetConfigProvider } from "./contexts/widget-config";
import { WidgetStreamdown } from "./markdown";
import "preact/debug";
import { TextContentsProvider } from "./contexts/text-contents";
import { LanguageConfigProvider } from "./contexts/language-config";
import { SheetActionsV2 } from "./widget/SheetActionsV2";
import { ScrollArea } from "./components/TranscriptScrollArea";
import { SheetHeader } from "./widget/SheetHeader";
import { clsx } from "clsx";
import { WidgetSizeProvider, useWidgetSize } from "./contexts/widget-size";
import { Avatar } from "./components/Avatar";
import { MicConfigProvider } from "./contexts/mic-config";
import { SessionConfigProvider } from "./contexts/session-config";
import { ConversationProvider } from "./contexts/conversation";
import { AvatarConfigProvider } from "./contexts/avatar-config";
import { TermsProvider } from "./contexts/terms";

const STORAGE_KEY = "markdown-playground-text";
const DEFAULT_TEXT =
  "Hey, how can I help you?\n\n" +
  "---\n\n" +
  "Sure thing here it is: [ElevenLabs website](https://elevenlabs.io)\n\n" +
  "1. Bullet 1\n" +
  "2. Bullet 2\n" +
  "3. Bullet 3\n\n" +
  "```python\n" +
  "pip install elevenlabs\n" +
  "pip install python-dotenv\n" +
  "```\n\n" +
  "---\n\n" +
  "Deserunt nisi voluptate sunt dolore tempor mollit labore commodo. Fugiat do exercitation enim occaecat cupidatat excepteur laborum exercitation tempor anim esse tempor Lorem.\n\n" +
  "---\n\n" +
  "## Additional Information\n\n" +
  "This is a demo of the **markdown renderer** with support for:\n\n" +
  "- *Italic* and **bold** text\n" +
  "- [Hyperlinks](https://example.com)\n" +
  "- Code blocks with syntax highlighting\n" +
  "- Ordered and unordered lists\n" +
  "- Images and more\n\n" +
  "```javascript\n" +
  "// JavaScript example\n" +
  "const greeting = 'Hello, World!';\n" +
  "console.log(greeting);\n" +
  "```\n\n" +
  "Try editing the text on the left to see live updates!";

function WidgetPreview({
  displayText,
  isStreaming,
  scrollAreaRef,
}: {
  displayText: string;
  isStreaming: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}) {
  const { variant } = useWidgetSize();
  const scrollPinned = useSignal(true);

  return (
    <div
      data-variant={variant.value}
      className="sheet fixed bottom-8 right-8 transition-all duration-300 ease-out"
    >
      <div className="flex flex-col overflow-hidden bg-base shadow-lg h-full transition-[border-radius] duration-300 ease-out relative">
        <div className="absolute top-4 left-4 scale-[0.1667] origin-top-left z-10">
          <Avatar size="lg" />
        </div>
        <SheetHeader
          showBackButton={false}
          showStatusLabel={useSignal(false)}
          showLanguageSelector={useSignal(true)}
          showExpandButton={useSignal(true)}
        />
        <div className="grow flex flex-col min-h-0 overflow-hidden">
          <ScrollArea orientation="vertical" className="flex-1 px-4 pt-4 pb-4">
            <div ref={scrollAreaRef}>
              <WidgetStreamdown isAnimating={isStreaming}>
                {displayText}
              </WidgetStreamdown>
            </div>
          </ScrollArea>
        </div>
        <SheetActionsV2 showTranscript={true} scrollPinned={scrollPinned} />
      </div>
    </div>
  );
}

function MarkdownPlayground() {
  const [text, setText] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? DEFAULT_TEXT;
  });
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  useEffect(() => {
    if (isStreaming && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-scroll-viewport]"
      ) as HTMLDivElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [streamingText, isStreaming]);

  const startStreaming = () => {
    setIsStreaming(true);
    setStreamingText("");

    const maxChunkSize = 50;
    let currentPos = 0;

    const streamNextChunk = () => {
      if (currentPos < text.length) {
        const chunkSize = Math.floor(Math.random() * maxChunkSize) + 1;
        const nextPos = Math.min(currentPos + chunkSize, text.length);

        setStreamingText(text.slice(0, nextPos));
        currentPos = nextPos;

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
            <TermsProvider>
              <LanguageConfigProvider>
                <MicConfigProvider>
                  <SessionConfigProvider>
                    <ConversationProvider>
                      <TextContentsProvider>
                        <AvatarConfigProvider>
                          <WidgetSizeProvider>
                            <Style />
                            <div className="w-screen h-screen flex bg-base-hover text-base-primary">
                              <div className="w-1/2 h-full flex flex-col p-4 border-r border-base-border">
                                <h2 className="text-xl font-medium mb-4">
                                  Input
                                </h2>
                                <textarea
                                  className="flex-1 p-4 bg-base border border-base-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={text}
                                  onChange={e => setText(e.currentTarget.value)}
                                  placeholder="Enter markdown text here..."
                                />
                              </div>

                              <div className="w-1/2 h-full flex flex-col p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h2 className="text-xl font-medium">
                                    Widget Preview
                                  </h2>
                                  <button
                                    onClick={startStreaming}
                                    disabled={isStreaming}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isStreaming
                                      ? "Streaming..."
                                      : "Simulate Stream"}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <WidgetPreview
                              displayText={displayText}
                              isStreaming={isStreaming}
                              scrollAreaRef={scrollAreaRef}
                            />
                          </WidgetSizeProvider>
                        </AvatarConfigProvider>
                      </TextContentsProvider>
                    </ConversationProvider>
                  </SessionConfigProvider>
                </MicConfigProvider>
              </LanguageConfigProvider>
            </TermsProvider>
          </WidgetConfigProvider>
        </ServerLocationProvider>
      </AttributesProvider>
    </>
  );
}

render(jsx(MarkdownPlayground, {}), document.body);
