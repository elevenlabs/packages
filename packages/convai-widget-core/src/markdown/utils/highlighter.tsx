import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { Fragment, jsx, jsxs } from "preact/jsx-runtime";

import { fromLezer } from "hast-util-from-lezer";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { cn } from "../../utils/cn";

import { parser as htmlParser } from "@lezer/html";
import { parser as javascriptParser } from "@lezer/javascript";
import { parser as jsonParser } from "@lezer/json";
import { parser as markdownParser } from "@lezer/markdown";
import { parser as pythonParser } from "@lezer/python";
import { parser as xmlParser } from "@lezer/xml";
import { parser as yamlParser } from "@lezer/yaml";

import type { LRParser } from "@lezer/lr";
import type { MarkdownParser } from "@lezer/markdown";

export type Parser = LRParser | MarkdownParser;
export const ParsersContext = createContext<Record<string, Parser>>({});

// language to parser
export const parserConfig: Record<string, Parser> = {
  html: htmlParser,
  js: javascriptParser.configure({ dialect: "js" }),
  jsx: javascriptParser.configure({ dialect: "jsx" }),
  ts: javascriptParser.configure({ dialect: "ts" }),
  tsx: javascriptParser.configure({ dialect: "tsx" }),
  json: jsonParser,
  md: markdownParser,
  py: pythonParser,
  xml: xmlParser,
  yaml: yamlParser,
};

// common language tags to underlying languages
export const languageParser: Record<string, string> = {
  html: "html",
  htm: "html",
  javascript: "js",
  js: "js",
  jsx: "jsx",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  json: "json",
  markdown: "md",
  md: "md",
  python: "py",
  py: "py",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

export interface CodeProps {
  code: string;
  language?: string;
}

export const Code = (props: CodeProps) => {
  const parsers = useContext(ParsersContext);

  if (props.language === undefined || parsers[props.language] === undefined) {
    return <>{props.code}</>;
  }

  const parser = parsers[props.language];
  const tree = parser.parse(props.code);
  const root = fromLezer(props.code, tree);
  const content = toJsxRuntime(root, { Fragment, jsx, jsxs });
  return <>{content}</>;
};

