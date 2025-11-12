"use client";

import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type BundledLanguage,
  type SpecialLanguage,
} from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { StreamdownRuntimeContext } from "../index";
import { cn, save } from "./utils";

export { type BundledLanguage } from "shiki";

const PRE_TAG_REGEX = /<pre(\s|>)/;

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  preClassName?: string;
};

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});



const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'python',
  'markdown',
] as const);

const LIGHT_THEME = 'github-light' as const;
const DARK_THEME = 'github-dark' as const;

const createHighlighter = async () => {
  const highlighter = await createHighlighterCore({
    themes: [
      import('@shikijs/themes/github-light'),
      import('@shikijs/themes/github-dark'),
    ],
    langs: [
      import('@shikijs/langs/javascript'),
      import('@shikijs/langs/typescript'),
      import('@shikijs/langs/python'),
      import('@shikijs/langs/markdown'),
    ],
    engine: createJavaScriptRegexEngine({ forgiving: true })
  });
  return highlighter;
};

class Highlighter {
  private highlighter: Awaited<ReturnType<typeof createHighlighterCore>> | null = null;
  private initializationPromise: Promise<void> | null = null;

  private isLanguageSupported(language: string): language is BundledLanguage {
    return SUPPORTED_LANGUAGES.has(language as any);
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
    language: BundledLanguage,
    preClassName?: string
  ): Promise<[string, string]> {
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
      theme: LIGHT_THEME,
    });

    const dark = this.highlighter?.codeToHtml(code, {
      lang,
      theme: DARK_THEME,
    });

    const addPreClass = (html: string) => {
      if (!preClassName) {
        return html;
      }
      return html.replace(PRE_TAG_REGEX, `<pre class="${preClassName}"$1`);
    };

    return [addPreClass(light ?? ""), addPreClass(dark ?? "")];
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
  const [darkHtml, setDarkHtml] = useState<string>("");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    highlighter
      .highlightCode(code, language, preClassName)
      .then(([light, dark]) => {
        if (mounted.current) {
          setHtml(light);
          setDarkHtml(dark);
        }
      });

    return () => {
      mounted.current = false;
    };
  }, [code, language, preClassName]);

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className="my-4 w-full overflow-hidden rounded-xl border"
        data-code-block-container
        data-language={language}
      >
        <div
          className="flex items-center justify-between bg-muted/80 p-3 text-muted-foreground text-xs"
          data-code-block-header
          data-language={language}
        >
          <span className="ml-1 font-mono lowercase">{language}</span>
          <div className="flex items-center gap-2">{children}</div>
        </div>
        <div className="w-full">
          <div className="min-w-full">
            <div
              className={cn("overflow-x-auto dark:hidden", className)}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
              dangerouslySetInnerHTML={{ __html: html }}
              data-code-block
              data-language={language}
              {...rest}
            />
            <div
              className={cn("hidden overflow-x-auto dark:block", className)}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
              dangerouslySetInnerHTML={{ __html: darkHtml }}
              data-code-block
              data-language={language}
              {...rest}
            />
          </div>
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<"button"> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export type CodeBlockDownloadButtonProps = ComponentProps<"button"> & {
  onDownload?: () => void;
  onError?: (error: Error) => void;
};

const languageExtensionMap: Partial<Record<BundledLanguage, string>> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  markdown: 'md',
};

export const CodeBlockDownloadButton = ({
  onDownload,
  onError,
  language,
  children,
  className,
  code: propCode,
  ...props
}: CodeBlockDownloadButtonProps & {
  code?: string;
  language?: BundledLanguage;
}) => {
  const { code: contextCode } = useContext(CodeBlockContext);
  const { isAnimating } = useContext(StreamdownRuntimeContext);
  const code = propCode ?? contextCode;
  const extension =
    language && language in languageExtensionMap
      ? languageExtensionMap[language]
      : "txt";
  const filename = `file.${extension}`;
  const mimeType = "text/plain";

  const downloadCode = () => {
    try {
      save(filename, code, mimeType);
      onDownload?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <button
      className={cn(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={isAnimating}
      onClick={downloadCode}
      title="Download file"
      type="button"
      {...props}
    >
      {children ?? <DownloadIcon size={14} />}
    </button>
  );
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

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <button
      className={cn(
        "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={isAnimating}
      onClick={copyToClipboard}
      type="button"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </button>
  );
};
