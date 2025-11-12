import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from "preact/compat";
import { type SpecialLanguage } from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { StreamdownRuntimeContext } from "../index";
import { Button } from "../../components/Button";
import { cn } from "../../utils/cn";
import { FloatingCard } from "./floating-card";

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
  children,
  preClassName,
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
      <FloatingCard
        actions={children}
        data-code-block-container
        data-language={language}
      >
        <div
          className={cn("overflow-x-auto pt-1.5 pb-2", className)}
          dangerouslySetInnerHTML={{ __html: html }}
          data-code-block
          data-language={language}
          {...rest}
        />
      </FloatingCard>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<"button"> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  code: propCode,
  ...props
}: CodeBlockCopyButtonProps & { code?: string }) => {
  const [isCopied, setIsCopied] = useState(false);
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
      if (!isCopied) {
        await navigator.clipboard.writeText(code);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
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

  return (
    <Button
      aria-label={isCopied ? "Copied" : "Copy code"}
      className={cn(className)}
      disabled={isAnimating}
      icon={isCopied ? "check" : "copy"}
      onClick={copyToClipboard}
      variant="md-button"
      {...props}
    >
      {children ?? (isCopied ? "Copied" : "Copy")}
    </Button>
  );
};
