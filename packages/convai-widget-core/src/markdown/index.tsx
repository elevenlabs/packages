/**
 * Heavily stripped down version of Streamdown for use in the widget.
 */
import { createContext, memo, useId, useMemo } from "preact/compat";

import { harden } from "rehype-harden";
import rehypeRaw from "rehype-raw";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";
import { components as defaultComponents } from "./components/components";
import { Markdown, type Options } from "./utils/markdown";
import { parseMarkdownIntoBlocks } from "./utils/parse-blocks";
import { parseIncompleteMarkdown } from "./utils/parse-incomplete-markdown";
import { cn } from "../utils/cn";
import { ParsersContext, parserConfig } from "./utils/highlighter";

const defaultRehypePlugins: PluggableList = [
  [
    harden,
    {
      allowedImagePrefixes: ["*"],
      allowedLinkPrefixes: ["*"],
      defaultOrigin: undefined,
      allowDataImages: true,
    },
  ],
  rehypeRaw,
];

const defaultRemarkPlugins: PluggableList = [
  [remarkGfm, {}],
  [remarkCjkFriendly, {}],
  [remarkCjkFriendlyGfmStrikethrough, {}],
];


const markdownOptions: Readonly<Options> = {
  components: defaultComponents,
  rehypePlugins: defaultRehypePlugins,
  remarkPlugins: defaultRemarkPlugins,
};

export type StreamdownProps = {
  children?: string;
  parseIncompleteMarkdown?: boolean;
  className?: string;
  isAnimating?: boolean;
};

export type StreamdownRuntimeContextType = {
  isAnimating: boolean;
};

export const StreamdownRuntimeContext =
  createContext<StreamdownRuntimeContextType>({
    isAnimating: false,
  });

type BlockProps = {
  content: string;
  shouldParseIncompleteMarkdown: boolean;
};

const Block = memo(
  ({ content, shouldParseIncompleteMarkdown }: BlockProps) => {
    const parsedContent = useMemo(
      () =>
        typeof content === "string" && shouldParseIncompleteMarkdown
          ? parseIncompleteMarkdown(content.trim())
          : content,
      [content, shouldParseIncompleteMarkdown]
    );

    return (
      <Markdown {...markdownOptions}>{parsedContent}</Markdown>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

export const WidgetStreamdown = memo(
  ({
    children,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    className,
    isAnimating = false,
  }: StreamdownProps) => {
    const generatedId = useId();
    const blocks = useMemo(
      () =>
        parseMarkdownIntoBlocks(typeof children === "string" ? children : ""),
      [children]
    );

    return (
      <ParsersContext.Provider value={parserConfig}>
        <StreamdownRuntimeContext.Provider value={{ isAnimating }}>
          <div className={cn("markdown", className)}>
            {blocks.map((block, index) => (
              <Block
                content={block}
                key={`${generatedId}-block-${index}`}
                shouldParseIncompleteMarkdown={shouldParseIncompleteMarkdown}
              />
            ))}
          </div>
        </StreamdownRuntimeContext.Provider>
      </ParsersContext.Provider>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isAnimating === nextProps.isAnimating
);
