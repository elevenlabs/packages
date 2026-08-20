import { ComponentChildren } from "preact";
import { useTextContents } from "../contexts/text-contents";
import { ButtonGroupProps, ButtonGroup } from "./ButtonGroup";
import { parseButtonGroupProps } from "./validate";

interface RichContentRendererProps {
  component: string;
  props: unknown;
  richContentId?: string;
}

interface RichContentComponentEntry {
  parseProps: (raw: unknown) => unknown | null;
  render: (props: unknown, richContentId?: string) => ComponentChildren;
}

const RICH_CONTENT_COMPONENTS: Record<string, RichContentComponentEntry> = {
  buttons: {
    parseProps: parseButtonGroupProps,
    render: (props, richContentId) => (
      <ButtonGroup
        {...(props as ButtonGroupProps)}
        richContentId={richContentId}
      />
    ),
  },
};

export function RichContentRenderer({
  component,
  props,
  richContentId,
}: RichContentRendererProps) {
  const entry = RICH_CONTENT_COMPONENTS[component];
  const parsed = entry?.parseProps(props);
  if (entry && parsed) {
    return entry.render(parsed, richContentId);
  }

  return <RichContentUnavailable />;
}

function RichContentUnavailable() {
  const text = useTextContents();

  return (
    <div className="rounded-bubble border border-base-border bg-base px-3 py-2.5 text-xs text-base-subtle">
      {text.rich_content_unavailable}
    </div>
  );
}
