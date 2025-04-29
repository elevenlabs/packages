import { memo } from "preact/compat";
import { useComputed, useSignal } from "@preact/signals";
import { useAttribute } from "../contexts/attributes";
import { useWidgetConfig } from "../contexts/widget-config";
import { clsx } from "clsx";
import { Root } from "../contexts/root-portal";
import { Sheet } from "./Sheet";
import { Trigger } from "./Trigger";
import { Placement } from "../types/config";

const HORIZONTAL = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
};

const VERTICAL = {
  top: "flex-col-reverse justify-end",
  bottom: "flex-col justify-end",
};

const PLACEMENT_CLASSES: Record<Placement, string> = {
  "top-left": `${VERTICAL.top} ${HORIZONTAL.left}`,
  top: `${VERTICAL.top} ${HORIZONTAL.center}`,
  "top-right": `${VERTICAL.top} ${HORIZONTAL.right}`,
  "bottom-left": `${VERTICAL.bottom} ${HORIZONTAL.left}`,
  bottom: `${VERTICAL.bottom} ${HORIZONTAL.center}`,
  "bottom-right": `${VERTICAL.bottom} ${HORIZONTAL.right}`,
};

export const Wrapper = memo(function Wrapper() {
  const expanded = useSignal(false);
  const expandable = useAttribute("_dev-expandable");
  const config = useWidgetConfig();
  const className = useComputed(() =>
    clsx(
      "convai-widget-root absolute inset-8 flex",
      PLACEMENT_CLASSES[config.value.placement]
    )
  );

  return (
    <Root className={className}>
      {expandable.value && <Sheet open={expanded} />}
      <Trigger expandable={!!expandable.value} expanded={expanded} />
    </Root>
  );
});
