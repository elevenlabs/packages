/**
 * Heavily stripped down version of Streamdown for use in the widget. 
 */
import { createContext, memo, useId, useMemo } from "preact/compat";
import ReactMarkdown, { type Options } from "react-markdown";

import { harden } from "rehype-harden";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import type { Pluggable } from "unified";
import { components as defaultComponents } from "./components/components";
import { parseMarkdownIntoBlocks } from "./utils/parse-blocks";
import { parseIncompleteMarkdown } from "./utils/parse-incomplete-markdown";
import { cn } from "../utils/cn";
import { Signalish } from "../utils/signalish";
import { signal } from "@preact/signals";
export { defaultUrlTransform } from "react-markdown";

const defaultRehypePlugins: Record<string, Pluggable> = {
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

const defaultRemarkPlugins: Record<string, Pluggable> = {
  gfm: [remarkGfm, {}],
} as const;

export type StreamdownProps = Options & {
  parseIncompleteMarkdown?: boolean;
  className?: string;
  isAnimating?: Signalish<boolean>;
};

export type StreamdownRuntimeContextType = {
  isAnimating: Signalish<boolean>;
};

export const StreamdownRuntimeContext =
  createContext<StreamdownRuntimeContextType>({
    isAnimating: signal(false),
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
    className,
    isAnimating = signal(false),
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
      <StreamdownRuntimeContext.Provider value={{ isAnimating }}>
        <div className={cn("px-2", className)}>
          {blocks.map((block, index) => (
            <Block
              components={{
                ...defaultComponents,
                ...components,
              }}
              content={block}
              key={`${generatedId}-block-${index}`}
              rehypePlugins={Object.values(defaultRehypePlugins)}
              remarkPlugins={Object.values(defaultRemarkPlugins)}
              shouldParseIncompleteMarkdown={shouldParseIncompleteMarkdown}
              urlTransform={urlTransform}
              {...props}
            />
          ))}
        </div>
      </StreamdownRuntimeContext.Provider>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isAnimating === nextProps.isAnimating
);
