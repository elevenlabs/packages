import { Signal } from "@preact/signals";
import { useWidgetConfig } from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import { HTMLAttributes, useCallback } from "preact/compat";
import { FullExpandableTrigger } from "./FullExpandableTrigger";
import { CompactExpandableTrigger } from "./CompactExpandableTrigger";
import { clsx } from "clsx";
import { FullTrigger } from "./FullTrigger";
import { CompactTrigger } from "./CompactTrigger";
import { useTerms } from "../contexts/terms";
import { DismissButton } from "../components/DismissButton";

export interface ExpandableProps extends HTMLAttributes<HTMLDivElement> {
  expanded: Signal<boolean>;
}

interface TriggerProps {
  expandable?: boolean;
  expanded: Signal<boolean>;
  onDismiss?: () => void;
}

export function Trigger({ expandable, expanded, onDismiss }: TriggerProps) {
  const variant = useWidgetConfig().value.variant;
  const terms = useTerms();
  const { isDisconnected } = useConversation();
  const toggleExpanded = useCallback(async () => {
    await terms.requestTerms();
    expanded.value = !expanded.peek();
  }, [expanded]);

  const isFull = variant === "full";
  if (expandable) {
    const Layout = isFull ? FullExpandableTrigger : CompactExpandableTrigger;
    return (
      <div className="relative">
        {onDismiss && (
          <DismissButton
            onDismiss={onDismiss}
            className="absolute -top-1 -right-1 z-10"
          />
        )}
        <Layout
          expanded={expanded}
          className={clsx(
            "bg-base shadow-md pointer-events-auto overflow-hidden",
            (isDisconnected.value || expanded.value) && "cursor-pointer"
          )}
          onClick={
            isDisconnected.value || expanded.value ? toggleExpanded : undefined
          }
        />
      </div>
    );
  }

  const Layout = isFull ? FullTrigger : CompactTrigger;
  return (
    <div className="relative">
      {onDismiss && (
        <DismissButton
          onDismiss={onDismiss}
          className="absolute -top-1 -right-1 z-10"
        />
      )}
      <Layout className="bg-base shadow-md pointer-events-auto overflow-hidden" />
    </div>
  );
}
