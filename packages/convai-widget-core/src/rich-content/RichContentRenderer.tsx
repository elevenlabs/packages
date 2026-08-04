import { useTextContents } from "../contexts/text-contents";
import { ItemCard } from "./ItemCard";
import { parseItemCardProps } from "./validate";

interface RichContentRendererProps {
  component: string;
  props: unknown;
}

export function RichContentRenderer({
  component,
  props,
}: RichContentRendererProps) {
  if (component === "item_card") {
    const parsed = parseItemCardProps(props);
    if (parsed) {
      return <ItemCard {...parsed} />;
    }
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
