import type { ComponentChildren } from "preact";
import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { useState, useEffect, useMemo } from "preact/compat";
import {
  useSignal,
  useComputed,
  useSignalEffect,
  signal,
  type Signal,
} from "@preact/signals";

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
  sheet_radius: "calc(var(--el-button-radius) + 6px)",
  compact_sheet_radius: "calc(var(--el-button-radius) + 12px)",
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
  sheet_radius: "calc(var(--el-button-radius) + 6px)",
  compact_sheet_radius: "calc(var(--el-button-radius) + 12px)",
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
import { Status, Mode } from "@elevenlabs/client";

import { FeedbackProvider } from "./contexts/feedback";
import { ShadowHostProvider } from "./contexts/shadow-host";

import { Wrapper } from "./widget/Wrapper";
import { TranscriptMessage } from "./widget/TranscriptMessage";
import type { DisplayTranscriptEntry } from "./utils/display-transcript";
import type { WidgetConfig } from "./types/config";

const STORAGE_KEY = "markdown-playground-text";
const RENDER_MODE_STORAGE_KEY = "markdown-playground-render-mode";
const STRIP_AUDIO_TAGS_STORAGE_KEY = "markdown-playground-strip-audio-tags";

type TranscriptRenderMode = "text" | "voice";

const VOICE_SAMPLE_TEXT =
  "[happy] Hello! [excited] How can I help you today?\n\n" +
  "Voice transcripts are plain text — **markdown** and [links](https://elevenlabs.io) are not rendered.";

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

const INLINE_HOST_CLASS = "dev-host dev-host--inline";

function buildPlaygroundWidgetConfig({
  theme,
  allowedDomains,
  stripAudioTags,
  renderMode,
}: {
  theme: "light" | "dark";
  allowedDomains: string[];
  stripAudioTags: boolean;
  renderMode: TranscriptRenderMode;
}): WidgetConfig {
  return {
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
    dismissible: false,
    text_contents: {},
    language_presets: {},
    disable_banner: true,
    text_only: renderMode === "text",
    supports_text_only: true,
    strip_audio_tags: stripAudioTags,
    styles: theme === "light" ? LIGHT_THEME_STYLES : DARK_THEME_STYLES,
    syntax_highlight_theme: theme === "light" ? "light" : "dark",
    markdown_link_allowed_hosts: allowedDomains.map(hostname => ({ hostname })),
  };
}

function PlaygroundProviders({
  widgetConfig,
  children,
}: {
  widgetConfig: WidgetConfig;
  children: ComponentChildren;
}) {
  return (
    <ShadowHostProvider>
      <AttributesProvider
        value={{
          "agent-id": import.meta.env.VITE_AGENT_ID,
          "override-config": JSON.stringify(widgetConfig),
        }}
      >
        <ServerLocationProvider>
          <WidgetConfigProvider>{children}</WidgetConfigProvider>
        </ServerLocationProvider>
      </AttributesProvider>
    </ShadowHostProvider>
  );
}

function InlineAgentPreview({
  messageSignal,
  isText,
}: {
  messageSignal: Signal<string>;
  isText: boolean;
}) {
  const [message, setMessage] = useState(messageSignal.value);
  useSignalEffect(() => {
    setMessage(messageSignal.value);
  });

  const entry = useMemo<DisplayTranscriptEntry>(
    () => ({
      type: "message",
      role: "agent",
      message,
      isText,
      conversationIndex: 0,
    }),
    [message, isText]
  );

  if (!message) {
    return (
      <p className="text-sm opacity-60">Enter text on the left to preview.</p>
    );
  }

  return <TranscriptMessage entry={entry} animateIn={false} />;
}

// Mock conversation provider for the markdown playground
function MockConversationProvider({
  displayTextSignal,
  agentIsTextSignal,
  children,
}: {
  displayTextSignal: Signal<string>;
  agentIsTextSignal: Signal<boolean>;
  children: any;
}) {
  const mockTranscript = useComputed<TranscriptEntry[]>(() => [
    {
      type: "message",
      role: "agent",
      message: "Hello, how can I help you?",
      isText: true,
      conversationIndex: 0,
    },
    {
      type: "message",
      role: "user",
      message: "hi",
      isText: true,
      conversationIndex: 1,
    },
    {
      type: "message",
      role: "agent",
      message: displayTextSignal.value,
      isText: agentIsTextSignal.value,
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
      sendMultimodalMessage: () => {},
      sendUserActivity: () => {},
      sendContextualUpdate: () => {},
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
  widgetConfig,
  displayTextSignal,
  agentIsTextSignal,
  theme,
}: {
  widgetConfig: WidgetConfig;
  displayTextSignal: Signal<string>;
  agentIsTextSignal: Signal<boolean>;
  theme: "light" | "dark";
}) {
  return (
    <PlaygroundProviders widgetConfig={widgetConfig}>
      <WidgetSizeProvider>
        <LanguageConfigProvider>
          <TermsProvider>
            <SessionConfigProvider>
              <MockConversationProvider
                displayTextSignal={displayTextSignal}
                agentIsTextSignal={agentIsTextSignal}
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
          </TermsProvider>
        </LanguageConfigProvider>
      </WidgetSizeProvider>
    </PlaygroundProviders>
  );
}

const ALLOWED_DOMAINS_STORAGE_KEY = "markdown-playground-allowed-domains";

function parseRenderMode(stored: string | null): TranscriptRenderMode {
  return stored === "voice" ? "voice" : "text";
}

function MarkdownPlayground() {
  const [text, setText] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? DEFAULT_TEXT;
  });
  const [allowedDomainsInput, setAllowedDomainsInput] = useState(() => {
    const stored = localStorage.getItem(ALLOWED_DOMAINS_STORAGE_KEY);
    return stored ?? "*";
  });
  const [renderMode, setRenderMode] = useState<TranscriptRenderMode>(() =>
    parseRenderMode(localStorage.getItem(RENDER_MODE_STORAGE_KEY))
  );
  const [stripAudioTags, setStripAudioTags] = useState(
    () => localStorage.getItem(STRIP_AUDIO_TAGS_STORAGE_KEY) === "true"
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const displayTextSignal = useSignal(text);
  const agentIsTextSignal = useSignal(renderMode === "text");

  useEffect(() => {
    agentIsTextSignal.value = renderMode === "text";
  }, [renderMode]);

  const allowedDomains = useMemo(() => {
    const trimmed = allowedDomainsInput.trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map(d => d.trim())
      .filter(Boolean);
  }, [allowedDomainsInput]);

  const widgetConfig = useMemo(
    () =>
      buildPlaygroundWidgetConfig({
        theme,
        allowedDomains,
        stripAudioTags,
        renderMode,
      }),
    [theme, allowedDomains, stripAudioTags, renderMode]
  );

  const agentIsText = renderMode === "text";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
    if (!isStreaming) {
      displayTextSignal.value = text;
    }
  }, [text, isStreaming]);

  useEffect(() => {
    localStorage.setItem(ALLOWED_DOMAINS_STORAGE_KEY, allowedDomainsInput);
  }, [allowedDomainsInput]);

  useEffect(() => {
    localStorage.setItem(RENDER_MODE_STORAGE_KEY, renderMode);
  }, [renderMode]);

  useEffect(() => {
    localStorage.setItem(STRIP_AUDIO_TAGS_STORAGE_KEY, String(stripAudioTags));
  }, [stripAudioTags]);

  const loadSampleForMode = (mode: TranscriptRenderMode) => {
    setText(mode === "voice" ? VOICE_SAMPLE_TEXT : DEFAULT_TEXT);
  };

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
      <style>{`
        .dev-host--inline {
          position: relative !important;
          inset: auto !important;
          pointer-events: auto !important;
          width: 100%;
          height: auto;
          min-height: 8rem;
          z-index: auto !important;
        }
      `}</style>
      <div className={`w-screen h-screen flex ${bgClass} ${textClass}`}>
        <div
          className={`w-1/2 h-full flex flex-col p-4 border-r ${borderClass}`}
        >
          <h2 className="text-xl font-medium mb-4">Input</h2>
          <div className="mb-4 space-y-3 shrink-0">
            <div>
              <label className="block text-sm font-medium mb-1">
                Agent message render mode
              </label>
              <select
                className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBgClass} ${borderClass}`}
                value={renderMode}
                onChange={e =>
                  setRenderMode(parseRenderMode(e.currentTarget.value))
                }
              >
                <option value="text">Text — markdown</option>
                <option value="voice">Voice — plain text + audio tags</option>
              </select>
            </div>
            {renderMode === "voice" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={stripAudioTags}
                  onChange={e => setStripAudioTags(e.currentTarget.checked)}
                />
                Strip audio tags (widget strip_audio_tags)
              </label>
            )}
            <button
              type="button"
              onClick={() => loadSampleForMode(renderMode)}
              className="text-sm underline opacity-80 hover:opacity-100"
            >
              Load sample for {renderMode} mode
            </button>
          </div>
          <textarea
            className={`flex-1 p-4 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBgClass} ${borderClass}`}
            value={text}
            onChange={e => setText(e.currentTarget.value)}
            placeholder={
              renderMode === "voice"
                ? "Enter voice transcript text (e.g. [happy] Hello!)"
                : "Enter markdown text here..."
            }
          />
          {renderMode === "text" && (
            <div className="mt-4 shrink-0">
              <label className="block text-sm font-medium mb-1">
                Allowed Link Domains (comma-separated, * for all)
              </label>
              <input
                type="text"
                className={`w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBgClass} ${borderClass}`}
                value={allowedDomainsInput}
                onChange={e => setAllowedDomainsInput(e.currentTarget.value)}
                placeholder="e.g. elevenlabs.io, example.com or * for all"
              />
            </div>
          )}
        </div>

        <div className="w-1/2 h-full flex flex-col min-h-0 p-4">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-xl font-medium">Agent message preview</h2>
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
          <p className="text-xs opacity-70 mb-3 shrink-0">
            Uses production TranscriptMessage. Full widget sheet is overlaid
            bottom-right.
          </p>
          <div
            className={`flex-1 min-h-0 overflow-y-auto rounded border p-4 ${borderClass} ${inputBgClass}`}
          >
            <PlaygroundProviders widgetConfig={widgetConfig}>
              <div className={INLINE_HOST_CLASS}>
                <Style />
                <InlineAgentPreview
                  messageSignal={displayTextSignal}
                  isText={agentIsText}
                />
              </div>
            </PlaygroundProviders>
          </div>
        </div>
      </div>
      <WidgetSandbox
        widgetConfig={widgetConfig}
        theme={theme}
        displayTextSignal={displayTextSignal}
        agentIsTextSignal={agentIsTextSignal}
      />
    </>
  );
}

render(jsx(MarkdownPlayground, {}), document.body);
