import { ComponentChildren } from "preact";
import { useTextContents } from "../contexts/text-contents";
import { ButtonGroupProps, ButtonGroup } from "./ButtonGroup";
import { Carousel, CarouselProps } from "./Carousel";
import { parseButtonGroupProps, parseCarouselProps } from "./validate";

interface RichContentRendererProps {
  component: string;
  props: unknown;
  richContentId?: string;
  isAnswered?: boolean;
}

interface RichContentComponentEntry {
  parseProps: (raw: unknown) => unknown | null;
  render: (
    props: unknown,
    richContentId?: string,
    isAnswered?: boolean
  ) => ComponentChildren;
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
  carousel: {
    parseProps: parseCarouselProps,
    render: (props, richContentId, isAnswered) => (
      <Carousel
        {...(props as CarouselProps)}
        richContentId={richContentId}
        isAnswered={isAnswered}
      />
    ),
  },
};

export function RichContentRenderer({
  component,
  props,
  richContentId,
  isAnswered,
}: RichContentRendererProps) {
  const entry = RICH_CONTENT_COMPONENTS[component];
  const parsed = entry?.parseProps(props);
  if (entry && parsed) {
    return entry.render(parsed, richContentId, isAnswered);
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
