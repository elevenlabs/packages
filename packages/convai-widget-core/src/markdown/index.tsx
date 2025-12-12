/**
 * Heavily stripped down version of Streamdown for use in the widget.
 */
import { createContext, memo, useId, useMemo } from "preact/compat";

import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";
import { harden as rehypeHarden } from "rehype-harden";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";
import { components as defaultComponents } from "./components/components";
import { Markdown, type Options } from "./utils/markdown";
import { allowedDomainsToLinkPrefixes } from "./utils/allowedDomainsToLinkPrefixes";
import { parseMarkdownIntoBlocks } from "./utils/parse-blocks";
import { parseIncompleteMarkdown } from "./utils/parse-incomplete-markdown";
import { cn } from "../utils/cn";
import { ParsersContext, parserConfig } from "./utils/highlighter";

function getDefaultOrigin(): string {
  const isInIframe = window.location !== window.parent.location;

  if (isInIframe) {
    // Prefer ancestorOrigins (more reliable), fall back to referrer
    // Firefox do not support https://caniuse.com/#search=ancestorOrigins
    const { ancestorOrigins } = document.location;
    if (ancestorOrigins && ancestorOrigins.length) {
      return ancestorOrigins[0];
    }
    if (document.referrer) {
      try {
        return new URL(document.referrer).origin;
      } catch {
        // Fall through to current origin
      }
    }
  }

  return document.location.origin;
}

function createRehypePlugins(
  allowedLinkDomains?: string[] | null
): PluggableList {
  const defaultOrigin = getDefaultOrigin();
  const allowedLinkPrefixes = [
    defaultOrigin,
    ...allowedDomainsToLinkPrefixes(allowedLinkDomains),
  ];

  return [
    rehypeRaw,
    [rehypeSanitize, {}],
    [
      rehypeHarden,
      {
        allowedImagePrefixes: ["*"],
        allowedLinkPrefixes,
        allowedProtocols: ["*"],
        defaultOrigin,
        allowDataImages: true,
      },
    ]
  ];
}

const defaultRemarkPlugins: PluggableList = [
  [remarkGfm, {}],
  [remarkCjkFriendly, {}],
  [remarkCjkFriendlyGfmStrikethrough, {}],
];

export type StreamdownProps = {
  children?: string;
  parseIncompleteMarkdown?: boolean;
  className?: string;
  isAnimating?: boolean;
  allowedLinkDomains?: string[] | null;
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
  markdownOptions: Readonly<Options>;
};

const Block = memo(
  ({ content, shouldParseIncompleteMarkdown, markdownOptions }: BlockProps) => {
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
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.shouldParseIncompleteMarkdown ===
    nextProps.shouldParseIncompleteMarkdown &&
    prevProps.markdownOptions === nextProps.markdownOptions
);

export const WidgetStreamdown = memo(
  ({
    children,
    parseIncompleteMarkdown: shouldParseIncompleteMarkdown = true,
    className,
    isAnimating = false,
    allowedLinkDomains,
  }: StreamdownProps) => {
    const generatedId = useId();
    const blocks = useMemo(
      () =>
        parseMarkdownIntoBlocks(typeof children === "string" ? children : ""),
      [children]
    );
    const markdownOptions = useMemo<Readonly<Options>>(
      () => ({
        components: defaultComponents,
        rehypePlugins: createRehypePlugins(allowedLinkDomains),
        remarkPlugins: defaultRemarkPlugins,
      }),
      [allowedLinkDomains]
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
                markdownOptions={markdownOptions}
              />
            ))}
          </div>
        </StreamdownRuntimeContext.Provider>
      </ParsersContext.Provider>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.isAnimating === nextProps.isAnimating &&
    prevProps.className === nextProps.className &&
    prevProps.parseIncompleteMarkdown === nextProps.parseIncompleteMarkdown &&
    prevProps.allowedLinkDomains === nextProps.allowedLinkDomains
);
