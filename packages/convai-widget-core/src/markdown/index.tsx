/**
 * Heavily stripped down version of Streamdown for use in the widget. 
 */
import { createContext, memo, useId, useMemo } from "preact/compat";
import ReactMarkdown, { type Options } from "react-markdown";
import type { BundledTheme } from "shiki";

import { harden } from "rehype-harden";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";
import { components as defaultComponents } from "./lib/components";
import { parseMarkdownIntoBlocks } from "./lib/parse-blocks";
import { parseIncompleteMarkdown } from "./lib/parse-incomplete-markdown";
import { cn } from "../utils/cn";
export { defaultUrlTransform } from "react-markdown";

export type ControlsConfig =
  | boolean
  | {
      table?: boolean;
      code?: boolean;
    };

export const defaultRehypePlugins: Record<string, Pluggable> = {
  harden: [
    harden,
    {
      allowedImagePrefixes: ["*"],
      allowedLinkPrefixes: ["*"],
      defaultOrigin: undefined,
      allowDataImages: true,
    },
  ],
  raw: rehypeRaw,
} as const;

export const defaultRemarkPlugins: Record<string, Pluggable> = {
  gfm: [remarkGfm, {}],
} as const;

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

export const WidgetStreamdown = memo(
  ({
    children,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    components,
    rehypePlugins = Object.values(defaultRehypePlugins),
    remarkPlugins = Object.values(defaultRemarkPlugins),
    className,
    shikiTheme = ["github-light", "github-dark"],
    controls = true,
    isAnimating = false,
    urlTransform = value => value,
    ...props
  }: StreamdownProps) => {
    const generatedId = useId();
    const blocks = useMemo(
      () =>
        parseMarkdownIntoBlocks(typeof children === "string" ? children : ""),
      [children]
    );
    return (
      <ShikiThemeContext.Provider value={shikiTheme}>
        <ControlsContext.Provider value={controls}>
          <StreamdownRuntimeContext.Provider value={{ isAnimating }}>
            <div className={cn("space-y-4 px-2", className)}>
              {blocks.map((block, index) => (
                <Block
                  components={{
                    ...defaultComponents,
                    ...components,
                  }}
                  content={block}
                  key={`${generatedId}-block-${index}`}
                  rehypePlugins={rehypePlugins}
                  remarkPlugins={remarkPlugins}
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
