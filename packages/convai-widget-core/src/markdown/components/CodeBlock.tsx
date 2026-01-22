import { useSignal } from "@preact/signals";
import {
  createContext,
  type HTMLAttributes,
} from "preact/compat";
import { useCallback, useContext, useEffect, useRef } from "preact/hooks";
import { Button } from "../../components/Button";
import { useTextContents } from "../../contexts/text-contents";
import { useSyntaxTheme } from "../../contexts/widget-config";
import { cn } from "../../utils/cn";
import { StreamdownRuntimeContext } from "../index";
import { Code, languageParser } from "../utils/highlighter";
import { ContentBlock } from "./ContentBlock";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
};

const CodeBlockContext = createContext<string>("");

export const CodeBlock = ({
  code,
  language,
  className,
  ...rest
}: CodeBlockProps) => {
  const mappedLanguage = languageParser[language];
  const { isCopied, copyToClipboard, disabled } = useCopyCode({ code });
  const textContents = useTextContents();
  const isWrapped = useSignal(false);
  const syntaxTheme = useSyntaxTheme();

  return (
    <CodeBlockContext.Provider value={code}>
      <ContentBlock data-code-block-container data-language={language}>
        <ContentBlock.Actions>
          <Button
            aria-label={textContents.wrap.value}
            disabled={disabled}
            icon="wrap"
            onClick={() => isWrapped.value = !isWrapped.value}
            variant="md-button"
          >
            {textContents.wrap.value}
          </Button>
          <Button
            aria-label={isCopied.value ? textContents.copied.value : textContents.copy.value}
            disabled={disabled}
            icon={isCopied.value ? "check" : "copy"}
            onClick={copyToClipboard}
            variant="md-button"
          >
            {isCopied.value ? textContents.copied.value : textContents.copy.value}
          </Button>
        </ContentBlock.Actions>
        <ContentBlock.Content className={cn(isWrapped.value ? "overflow-x-hidden" : "overflow-x-auto")}>
          <div
            className={cn("pt-1.5 pb-2", className)}
            data-code-block
            data-language={language}
            data-syntax-theme={syntaxTheme.value}
            {...rest}
          >
            <pre className={cn(
              "m-0 font-mono text-[13px] px-4 py-1.5",
              isWrapped.value ? "whitespace-pre-wrap overflow-x-hidden" : "whitespace-pre overflow-x-auto"
            )}>
              <code className={cn(
                "block",
                isWrapped.value ? "whitespace-pre-wrap break-all" : "whitespace-pre"
              )}>
                <Code code={code} language={mappedLanguage} />
              </code>
            </pre>
          </div>
        </ContentBlock.Content>
      </ContentBlock>
    </CodeBlockContext.Provider>
  );
};

function useCopyCode({
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
  const contextCode = useContext(CodeBlockContext);
  const { isAnimating } = useContext(StreamdownRuntimeContext);
  const code = propCode ?? contextCode;

  const copyToClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied.value) {
        await navigator.clipboard.writeText(code);
        isCopied.value = true;
        onCopy?.();
        timeoutRef.current = window.setTimeout(() => {
          isCopied.value = false;
        }, timeout);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [code, isCopied, onCopy, onError, timeout]);

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
