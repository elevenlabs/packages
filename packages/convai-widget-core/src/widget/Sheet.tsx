import { Signal } from "@preact/signals";
import { useWidgetConfig } from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import { InOutTransition } from "../components/InOutTransition";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { StatusLabel } from "./StatusLabel";
import { Placement } from "../types/config";

interface SheetProps {
  open: Signal<boolean>;
}

const ORIGIN_CLASSES: Record<Placement, string> = {
  "top-left": "origin-top-left",
  top: "origin-top",
  "top-right": "origin-top-right",
  "bottom-left": "origin-bottom-left",
  "bottom-right": "origin-bottom-right",
  bottom: "origin-bottom",
};

export function Sheet({ open }: SheetProps) {
  const placement = useWidgetConfig().value.placement;
  const { isDisconnected, startSession } = useConversation();

  return (
    <InOutTransition active={open}>
      <div
        className={clsx(
          "absolute bg-background shadow-md pointer-events-auto p-4 rounded-3xl min-w-[400px] min-h-[550px]",
          "transition-[transform,opacity] duration-200 data-hidden:scale-90 data-hidden:opacity-0",
          ORIGIN_CLASSES[placement],
          placement.startsWith("top") ? "top-20" : "bottom-20"
        )}
      >
        <InOutTransition active={!isDisconnected.value}>
          <div className="flex gap-2 items-start transition-opacity duration-200 data-hidden:opacity-0">
            <div className="w-16 h-16" />
            <StatusLabel className="rounded-bl-md" />
          </div>
        </InOutTransition>
        <div
          className={clsx(
            "absolute origin-top-left transition-[transform,left,top] duration-200",
            isDisconnected.value
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100"
              : "top-0 left-0 translate-x-4 translate-y-4 scale-[0.33333]"
          )}
        >
          <Avatar size="lg" />
          <InOutTransition active={isDisconnected.value}>
            <Button
              aria-label="Start call"
              variant="primary"
              icon="phone"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 data-hidden:opacity-0"
              onClick={e => startSession(e.currentTarget)}
            />
          </InOutTransition>
        </div>
      </div>
    </InOutTransition>
  );
}
