import { memo } from "preact/compat";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { useWidgetConfig } from "../contexts/widget-config";
import { clsx } from "clsx";
import { Root } from "../contexts/root-portal";
import { Sheet } from "./Sheet";
import { Trigger } from "./Trigger";
import { Placement } from "../types/config";
import { useConversation } from "../contexts/conversation";
import { InOutTransition } from "../components/InOutTransition";
import { useTerms } from "../contexts/terms";
import { TermsModal } from "./TermsModal";
import { ErrorModal } from "./ErrorModal";
import { PoweredBy } from "./PoweredBy";
import { useWidgetSize } from "../contexts/widget-size";
import { cn } from "../utils/cn";

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

// Keep the contents hidden initially to avoid FOUC in Safari
// Once styles are loaded they will override this
const HIDDEN_STYLE = {
  display: "none",
};

export const Wrapper = memo(function Wrapper() {
  const config = useWidgetConfig();
  const expanded = useSignal(config.peek().default_expanded);
  const sawError = useSignal(false);
  const { error } = useConversation();
  const terms = useTerms();
  const { variant } = useWidgetSize();
  const expandable = useComputed(
    () => config.value.transcript_enabled || config.value.text_input_enabled
  );
  const className = useComputed(() =>
    cn(
      "overlay !flex transition-[opacity] duration-200 data-hidden:opacity-0",
      PLACEMENT_CLASSES[config.value.placement]
    )
  );
  // Powered by should always at bottom of the viewport in fullscreen mode
  const poweredByClassName = useComputed(() => (
    variant.value === "fullscreen" ? cn(className.value, PLACEMENT_CLASSES["bottom"]) : className.value
  ));

  useSignalEffect(() => {
    if (error.value) {
      if (expandable.value) {
        sawError.value = true;
        expanded.value = true;
      } else {
        sawError.value = false;
      }
    }
  });

  // Listen for custom expansion events
  useSignalEffect(() => {
    const handleExpandEvent = (event: CustomEvent) => {
      if (event.detail?.action === "expand") {
        expanded.value = true;
      } else if (event.detail?.action === "collapse") {
        expanded.value = false;
      } else if (event.detail?.action === "toggle") {
        expanded.value = !expanded.value;
      }
    };

    // Listen for custom events on the document
    document.addEventListener(
      "elevenlabs-agent:expand",
      handleExpandEvent as EventListener
    );

    return () => {
      document.removeEventListener(
        "elevenlabs-agent:expand",
        handleExpandEvent as EventListener
      );
    };
  });

  const state = useComputed(() => {
    if (!expandable.value && !!error.value && !sawError.value) {
      return "error";
    }
    if (!terms.termsAccepted.value && terms.termsShown.value) {
      return "terms";
    }
    return "conversation";
  });

  const isError = useComputed(() => state.value === "error");
  const isTerms = useComputed(() => state.value === "terms");
  const isConversation = useComputed(() => state.value === "conversation");

  return (
    <>
      <InOutTransition initial={false} active={isConversation}>
        <Root className={className} style={HIDDEN_STYLE}>
          {config.value.always_expanded ? (
            <Sheet open />
          ) : (
            <>
              {expandable.value && <Sheet open={expanded} />}
              <Trigger expandable={expandable.value} expanded={expanded} />
            </>
          )}
        </Root>
      </InOutTransition>
      <InOutTransition initial={false} active={isTerms}>
        <Root className={className} style={HIDDEN_STYLE}>
          <TermsModal />
        </Root>
      </InOutTransition>
      <InOutTransition initial={false} active={isError}>
        <Root className={className} style={HIDDEN_STYLE}>
          <ErrorModal sawError={sawError} />
        </Root>
      </InOutTransition>
      <Root className={poweredByClassName} style={HIDDEN_STYLE}>
        <PoweredBy />
      </Root>
    </>
  );
});
