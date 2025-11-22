import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { useState, useEffect, useMemo } from "preact/compat";
import { useSignal, useComputed, signal, type Signal } from "@preact/signals";
import { Style } from "./styles/Style";
import { AttributesProvider } from "./contexts/attributes";
import { ServerLocationProvider } from "./contexts/server-location";
import { WidgetConfigProvider } from "./contexts/widget-config";
import "preact/debug";
import { TextContentsProvider } from "./contexts/text-contents";
import { LanguageConfigProvider } from "./contexts/language-config";
import { WidgetSizeProvider } from "./contexts/widget-size";
import { MicConfigProvider } from "./contexts/mic-config";
import { SessionConfigProvider } from "./contexts/session-config";
import { AvatarConfigProvider } from "./contexts/avatar-config";
import { TermsProvider } from "./contexts/terms";
import { SheetContentProvider } from "./contexts/sheet-content";
import { Sheet } from "./widget/Sheet";
import {
  ConversationContext,
  type TranscriptEntry,
} from "./contexts/conversation";
import { Status, Mode } from "@elevenlabs/client";

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

// Mock conversation provider for the markdown playground
function MockConversationProvider({
  displayTextSignal,
  children,
}: {
  displayTextSignal: Signal<string>;
  children: any;
}) {
  const mockTranscript = useComputed<TranscriptEntry[]>(() => [
    {
      type: "message",
      role: "ai",
      message: displayTextSignal.value,
      isText: true,
      conversationIndex: 0,
    },
  ]);

  const mockValue = useMemo(
    () => ({
      status: signal<Status>("connected"),
      isSpeaking: signal(false),
      mode: signal<Mode>("listening"),
      isDisconnected: signal(false),
      lastId: signal<string | null>(null),
      error: signal<string | null>(null),
      canSendFeedback: signal(false),
      conversationIndex: signal(0),
      conversationTextOnly: signal<boolean | null>(null),
      transcript: mockTranscript,
      startSession: async () => "",
      endSession: async () => {},
      getInputVolume: () => 0,
      getOutputVolume: () => 0,
      sendFeedback: () => {},
      sendUserMessage: () => {},
      sendUserActivity: () => {},
    }),
    [mockTranscript]
  );

  return (
    <ConversationContext.Provider value={mockValue}>
      {children}
    </ConversationContext.Provider>
  );
}

function MarkdownPlayground() {
  const [text, setText] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? DEFAULT_TEXT;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const sheetOpen = useSignal(true);
  const displayTextSignal = useSignal(text);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
    if (!isStreaming) {
      displayTextSignal.value = text;
    }
  }, [text, isStreaming]);

  const startStreaming = () => {
    setIsStreaming(true);
    displayTextSignal.value = "";

    const maxChunkSize = 50;
    let currentPos = 0;

    const streamNextChunk = () => {
      if (currentPos < text.length) {
        const chunkSize = Math.floor(Math.random() * maxChunkSize) + 1;
        const nextPos = Math.min(currentPos + chunkSize, text.length);

        displayTextSignal.value = text.slice(0, nextPos);
        currentPos = nextPos;

        const jitter = Math.random() * 60 + 20;
        setTimeout(streamNextChunk, jitter);
      } else {
        setIsStreaming(false);
        displayTextSignal.value = text;
      }
    };

    streamNextChunk();
  };

  return (
    <>
      <AttributesProvider
        value={{
          "agent-id": import.meta.env.VITE_AGENT_ID,
          "override-config": JSON.stringify({
            variant: "compact",
            placement: "bottom-right",
            avatar: {
              type: "orb",
              color_1: "#3b82f6",
              color_2: "#8b5cf6",
            },
            feedback_mode: "none",
            language: "en",
            supported_language_overrides: ["en"],
            mic_muting_enabled: false,
            transcript_enabled: true,
            text_input_enabled: true,
            default_expanded: true,
            always_expanded: true,
            text_contents: {},
            language_presets: {},
            disable_banner: true,
            text_only: true,
            supports_text_only: true,
          }),
        }}
      >
        <ServerLocationProvider>
          <WidgetConfigProvider>
            <TermsProvider>
              <LanguageConfigProvider>
                <MicConfigProvider>
                  <SessionConfigProvider>
                    <MockConversationProvider displayTextSignal={displayTextSignal}>
                      <TextContentsProvider>
                        <AvatarConfigProvider>
                          <WidgetSizeProvider>
                            <SheetContentProvider>
                              <Style />
                              <div className="w-screen h-screen flex bg-base-hover text-base-primary">
                                <div className="w-1/2 h-full flex flex-col p-4 border-r border-base-border">
                                  <h2 className="text-xl font-medium mb-4">
                                    Input
                                  </h2>
                                  <textarea
                                    className="flex-1 p-4 bg-base border border-base-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={text}
                                    onChange={e =>
                                      setText(e.currentTarget.value)
                                    }
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
                              <Sheet open={sheetOpen} />
                            </SheetContentProvider>
                          </WidgetSizeProvider>
                        </AvatarConfigProvider>
                      </TextContentsProvider>
                    </MockConversationProvider>
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
