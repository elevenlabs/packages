import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { useState, useEffect, useMemo } from "preact/compat";
import { useSignal, useComputed, signal, type Signal } from "@preact/signals";

const LIGHT_THEME_STYLES = {
  base: "rgba(255, 255, 255, 1)",
  base_hover: "oklch(96.1% 0 none)",
  base_active: "oklch(96.1% 0 none)",
  base_border: "oklch(90.6% 0 none)",
  base_subtle: "#0000009b",
  base_primary: "#000000",
  accent: "rgba(64, 64, 64, 1)",
  accent_hover: "#333333",
  accent_active: "#333333",
  accent_primary: "#FFFFFF",
  button_radius: 8,
  input_radius: 8,
  sheet_radius: 12,
  compact_sheet_radius: 12,
};

const DARK_THEME_STYLES = {
  base: "#08090a",
  base_hover: "#2d2d2d",
  base_active: "#343434",
  base_border: "#3b3b3b",
  base_primary: "#ffffff",
  base_subtle: "#ffffff",
  accent: "#e0e0e0",
  accent_hover: "#d6d6d6",
  accent_active: "#d6d6d6",
  accent_primary: "#311921",
  button_radius: 8,
  input_radius: 8,
  sheet_radius: 12,
  compact_sheet_radius: 12,
};
import { Style } from "./styles/Style";
import { AttributesProvider } from "./contexts/attributes";
import { ServerLocationProvider } from "./contexts/server-location";
import { WidgetConfigProvider } from "./contexts/widget-config";
import "preact/debug";
import { TextContentsProvider } from "./contexts/text-contents";
import { LanguageConfigProvider } from "./contexts/language-config";
import { WidgetSizeProvider } from "./contexts/widget-size";
import { AudioConfigProvider } from "./contexts/audio-config";
import { ConversationModeProvider } from "./contexts/conversation-mode";
import { SessionConfigProvider } from "./contexts/session-config";
import { AvatarConfigProvider } from "./contexts/avatar-config";
import { TermsProvider } from "./contexts/terms";
import { SheetContentProvider } from "./contexts/sheet-content";
import {
  ConversationContext,
  type TranscriptEntry,
} from "./contexts/conversation";
import { Status, Mode, Role } from "@elevenlabs/client";
import { cn } from "./utils/cn";

import { FeedbackProvider } from "./contexts/feedback";

import { Wrapper } from "./widget/Wrapper";

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
      role: "ai" as Role,
      message: "Hello, how can I help you?",
      isText: true,
      conversationIndex: 0,
    },
    {
      type: "message",
      role: "user" as Role,
      message: "hi",
      isText: true,
      conversationIndex: 1,
    },
    {
      type: "message",
      role: "ai" as Role,
      message: displayTextSignal.value,
      isText: true,
      conversationIndex: 2,
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
      setVolume: () => {},
      setMicMuted: () => {},
      sendFeedback: () => {},
      sendUserMessage: () => {},
      sendUserActivity: () => {},
      addModeToggleEntry: () => {},
    }),
    [mockTranscript]
  );

  return (
    <ConversationContext.Provider value={mockValue}>
      {children}
    </ConversationContext.Provider>
  );
}

function WidgetSandbox({
  theme,
  displayTextSignal,
}: {
  theme: "light" | "dark";
  displayTextSignal: Signal<string>;
}) {
  return (
    <AttributesProvider
      value={{
        "agent-id": import.meta.env.VITE_AGENT_ID,
        "override-config": JSON.stringify({
          variant: "full",
          placement: "bottom-right",
          avatar: {
            type: "orb",
            color_1: "#2E2E2E",
            color_2: "#B8B8B8",
          },
          feedback_mode: "none",
          language: "en",
          supported_language_overrides: ["en"],
          mic_muting_enabled: false,
          transcript_enabled: true,
          text_input_enabled: true,
          default_expanded: true,
          always_expanded: false,
          text_contents: {},
          language_presets: {},
          disable_banner: true,
          text_only: true,
          supports_text_only: true,
          styles: theme === "light" ? LIGHT_THEME_STYLES : DARK_THEME_STYLES,
          syntax_highlight_theme: theme === "light" ? "light" : "dark",
        }),
      }}
    >
      <ServerLocationProvider>
        <WidgetConfigProvider>
          <WidgetSizeProvider>
            <TermsProvider>
              <LanguageConfigProvider>
                <SessionConfigProvider>
                  <MockConversationProvider
                    displayTextSignal={displayTextSignal}
                  >
                    <ConversationModeProvider>
                      <AudioConfigProvider>
                        <TextContentsProvider>
                          <AvatarConfigProvider>
                            <SheetContentProvider>
                              <FeedbackProvider>
                                <div className="dev-host">
                                  <Style />
                                  <Wrapper />
                                  {theme === "dark" && (
                                    <style>{`
                                .dev-host {
                                  scrollbar-color: #4b5563 transparent !important;
                                }
                              `}</style>
                                  )}
                                </div>
                              </FeedbackProvider>
                            </SheetContentProvider>
                          </AvatarConfigProvider>
                        </TextContentsProvider>
                      </AudioConfigProvider>
                    </ConversationModeProvider>
                  </MockConversationProvider>
                </SessionConfigProvider>
              </LanguageConfigProvider>
            </TermsProvider>
          </WidgetSizeProvider>
        </WidgetConfigProvider>
      </ServerLocationProvider>
    </AttributesProvider>
  );
}

function MarkdownPlayground() {
  const [text, setText] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? DEFAULT_TEXT;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const displayTextSignal = useSignal(text);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
    if (!isStreaming) {
      displayTextSignal.value = text;
    }
  }, [text, isStreaming]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

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

  const bgClass = theme === "light" ? "bg-gray-100" : "bg-gray-900";
  const textClass = theme === "light" ? "text-gray-900" : "text-gray-100";
  const borderClass = theme === "light" ? "border-gray-200" : "border-gray-700";
  const inputBgClass = theme === "light" ? "bg-white" : "bg-black";

  return (
    <>
      <div className={`w-screen h-screen flex ${bgClass} ${textClass}`}>
        <div
          className={`w-1/2 h-full flex flex-col p-4 border-r ${borderClass}`}
        >
          <h2 className="text-xl font-medium mb-4">Input</h2>
          <textarea
            className={`flex-1 p-4 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBgClass} ${borderClass}`}
            value={text}
            onChange={e => setText(e.currentTarget.value)}
            placeholder="Enter markdown text here..."
          />
        </div>

        <div className="w-1/2 h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Widget Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                title="Toggle theme"
              >
                {theme === "light" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button
                onClick={startStreaming}
                disabled={isStreaming}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isStreaming ? "Streaming..." : "Simulate Stream"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <WidgetSandbox theme={theme} displayTextSignal={displayTextSignal} />
    </>
  );
}

render(jsx(MarkdownPlayground, {}), document.body);
