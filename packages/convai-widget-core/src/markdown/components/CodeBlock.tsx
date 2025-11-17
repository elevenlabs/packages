import { useSignal } from "@preact/signals";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type HTMLAttributes,
} from "preact/compat";
import { cn } from "../../utils/cn";
import { StreamdownRuntimeContext } from "../index";
import { Code, languageParser } from "../utils/highlighter";
import { InfoCard } from "./InfoCard";

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  preClassName?: string;
};

const CodeBlockContext = createContext<string>("");

export const CodeBlock = ({
  code,
  language,
  className,
  preClassName,
  ...rest
}: CodeBlockProps) => {
  const mappedLanguage = languageParser[language];
  const { isCopied, copyToClipboard, disabled } = useCopyCode({ code });
  
  return (
    <CodeBlockContext.Provider value={code}>
      <InfoCard
        actions={[
          {
            icon: isCopied.value ? "check" : "copy",
            label: isCopied.value ? "Copied" : "Copy",
            onClick: copyToClipboard,
            disabled,
            "aria-label": isCopied.value ? "Copied" : "Copy code",
          },
        ]}
        className="overflow-x-auto"
        data-code-block-container
        data-language={language}
      >
        <div
          className={cn("pt-1.5 pb-2", className)}
          data-code-block
          data-language={language}
          {...rest}
        >
          <Code code={code} language={mappedLanguage} className={preClassName} />
        </div>
      </InfoCard>
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
        timeoutRef.current = window.setTimeout(() => {
          isCopied.value = false;
        }, timeout);
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
