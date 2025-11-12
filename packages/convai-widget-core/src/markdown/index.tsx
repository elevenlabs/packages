import { createContext, memo, useEffect, useId, useMemo } from "preact/compat";
import ReactMarkdown, { type Options } from "react-markdown";
import type { BundledTheme } from "shiki";

import { components as defaultComponents } from "./lib/components";
import { parseMarkdownIntoBlocks } from "./lib/parse-blocks";
import { parseIncompleteMarkdown } from "./lib/parse-incomplete-markdown";
import { cn } from "./lib/utils";

export { defaultUrlTransform } from "react-markdown";

export type ControlsConfig =
  | boolean
  | {
      table?: boolean;
      code?: boolean;
      mermaid?: boolean;
    };

export type StreamdownProps = Options & {
  parseIncompleteMarkdown?: boolean;
  className?: string;
  shikiTheme?: [BundledTheme, BundledTheme];
  controls?: ControlsConfig;
  isAnimating?: boolean;
};

export const ShikiThemeContext = createContext<[BundledTheme, BundledTheme]>([
  "github-light" as BundledTheme,
  "github-dark" as BundledTheme,
]);

export const ControlsContext = createContext<ControlsConfig>(true);

export type StreamdownRuntimeContextType = {
  isAnimating: boolean;
};

export const StreamdownRuntimeContext =
  createContext<StreamdownRuntimeContextType>({
    isAnimating: false,
  });

type BlockProps = Options & {
  content: string;
  shouldParseIncompleteMarkdown: boolean;
};

const Block = memo(
  ({ content, shouldParseIncompleteMarkdown, ...props }: BlockProps) => {
    const parsedContent = useMemo(
      () =>
        typeof content === "string" && shouldParseIncompleteMarkdown
          ? parseIncompleteMarkdown(content.trim())
          : content,
      [content, shouldParseIncompleteMarkdown]
    );

    return <ReactMarkdown {...props}>{parsedContent}</ReactMarkdown>;
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

export const Streamdown = memo(
  ({
    children,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    components,
    className,
    shikiTheme = ["github-light", "github-dark"],
    controls = true,
    isAnimating = false,
    urlTransform = value => value,
    ...props
  }: StreamdownProps) => {
    // Parse the children to remove incomplete markdown tokens if enabled
    const generatedId = useId();
    const blocks = useMemo(
      () =>
        parseMarkdownIntoBlocks(typeof children === "string" ? children : ""),
      [children]
    );

    console.log("blocks", blocks);

    return (
      <ShikiThemeContext.Provider value={shikiTheme}>
        <ControlsContext.Provider value={controls}>
          <StreamdownRuntimeContext.Provider value={{ isAnimating }}>
            <div className={cn("space-y-4", className)}>
              {blocks.map((block, index) => (
                <Block
                  components={{
                    ...defaultComponents,
                    ...components,
                  }}
                  content={block}
                  key={`${generatedId}-block-${index}`}
                  shouldParseIncompleteMarkdown={shouldParseIncompleteMarkdown}
                  urlTransform={urlTransform}
                  {...props}
                />
              ))}
            </div>
          </StreamdownRuntimeContext.Provider>
        </ControlsContext.Provider>
      </ShikiThemeContext.Provider>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.shikiTheme === nextProps.shikiTheme &&
    prevProps.isAnimating === nextProps.isAnimating
);
