import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { useState, useEffect } from "preact/compat";
import { Markdown } from "./components/Markdown";

const STORAGE_KEY = "markdown-playground-text";
const DEFAULT_TEXT =
  "# Welcome to Markdown Playground\n\n" +
  "This is a **markdown** renderer.\n\n" +
  "## Features\n\n" +
  "- Support for *italic* and **bold** text\n" +
  "- Lists and bullet points\n" +
  "- Code blocks\n\n" +
  "```javascript\n" +
  "console.log('Hello, World!');\n" +
  "```\n\n" +
  "Try editing the text on the left!";

function MarkdownPlayground() {
  const [text, setText] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? DEFAULT_TEXT;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  return (
    <div className="w-screen h-screen flex bg-base-hover text-base-primary">
      <div className="w-1/2 h-full flex flex-col p-4 border-r border-base-border">
        <h2 className="text-xl font-bold mb-4">Input</h2>
        <textarea
          className="flex-1 p-4 bg-base border border-base-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder="Enter markdown text here..."
        />
      </div>
      <div className="w-1/2 h-full flex flex-col p-4 overflow-auto">
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <div className="flex-1">
          <Markdown text={text} />
        </div>
      </div>
    </div>
  );
}

render(jsx(MarkdownPlayground, {}), document.body);



