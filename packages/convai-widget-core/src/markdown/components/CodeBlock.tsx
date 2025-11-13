import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from "preact/compat";
import { useSignal } from "@preact/signals";
import { type SpecialLanguage } from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { StreamdownRuntimeContext } from "../index";
import { cn } from "../../utils/cn";
import { InfoCard, type ActionConfig } from "./InfoCard";

const PRE_TAG_REGEX = /<pre(\s|>)/;

const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "markdown",
] as const;

type BundledLanguageSubset = (typeof SUPPORTED_LANGUAGES)[number];

export type SupportedLanguage = BundledLanguageSubset | SpecialLanguage;

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: SupportedLanguage;
  preClassName?: string;
  actions?: ActionConfig[];
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

const LIGHT_THEME = "github-light" as const;

const createHighlighter = async () => {
  const highlighter = await createHighlighterCore({
    themes: [import("@shikijs/themes/github-light")],
    langs: [
      import("@shikijs/langs/javascript"),
      import("@shikijs/langs/typescript"),
      import("@shikijs/langs/python"),
      import("@shikijs/langs/markdown"),
    ],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighter;
};

class Highlighter {
  private highlighter: Awaited<
    ReturnType<typeof createHighlighterCore>
  > | null = null;
  private initializationPromise: Promise<void> | null = null;

  private isLanguageSupported(
    language: string
  ): language is BundledLanguageSubset {
    return SUPPORTED_LANGUAGES.includes(language as BundledLanguageSubset);
  }

  private getFallbackLanguage(): SpecialLanguage {
    return "text";
  }

  private async ensureHighlighterInitialized(): Promise<void> {
    if (!this.highlighter) {
      this.highlighter = await createHighlighter();
    }
  }

  async highlightCode(
    code: string,
    language: SupportedLanguage,
    preClassName?: string
  ): Promise<string> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    this.initializationPromise = this.ensureHighlighterInitialized();
    await this.initializationPromise;
    this.initializationPromise = null;

    const lang = this.isLanguageSupported(language)
      ? language
      : this.getFallbackLanguage();

      const light = this.highlighter?.codeToHtml(code, {
        lang,
        themes: {
          light: LIGHT_THEME,
        },
        colorReplacements: {
          'github-light': {
            '#fff': 'var(--el-base-active)'
          }
        }
      });

    const addPreClass = (html: string) => {
      if (!preClassName) {
        return html;
      }
      return html.replace(PRE_TAG_REGEX, `<pre class="${preClassName}"$1`);
    };

    return addPreClass(light ?? "");
  }
}

const highlighter = new Highlighter();

export const CodeBlock = ({
  code,
  language,
  className,
  preClassName,
  actions,
  ...rest
}: CodeBlockProps) => {
  const [html, setHtml] = useState<string>("");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    highlighter.highlightCode(code, language, preClassName).then(light => {
      if (mounted.current) {
        setHtml(light);
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, preClassName]);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <InfoCard
        actions={actions}
        className="overflow-x-auto"
        data-code-block-container
        data-language={language}
      >
        <div
          className={cn("pt-1.5 pb-2", className)}
          dangerouslySetInnerHTML={{ __html: html }}
          data-code-block
          data-language={language}
          {...rest}
        />
      </InfoCard>
    </CodeBlockContext.Provider>
  );
};

export function useCopyCode({
  code: propCode,
  onCopy,
  onError,
  timeout = 2000,
}: {
  code?: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
} = {}) {
  const isCopied = useSignal(false);
  const timeoutRef = useRef(0);
  const { code: contextCode } = useContext(CodeBlockContext);
  const { isAnimating } = useContext(StreamdownRuntimeContext);
  const code = propCode ?? contextCode;

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied.value) {
        await navigator.clipboard.writeText(code);
        isCopied.value = true;
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => (isCopied.value = false),
          timeout
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    isCopied,
    copyToClipboard,
    disabled: isAnimating,
  };
}
