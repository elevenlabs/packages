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
  const hidden = useSignal(false);
  const sawError = useSignal(false);
  const { error, isDisconnected } = useConversation();
  const terms = useTerms();
  const expandable = useComputed(
    () => config.value.transcript_enabled || config.value.text_input_enabled
  );
  const className = useComputed(() =>
    clsx(
      "overlay !flex transition-opacity duration-200 data-hidden:opacity-0",
      PLACEMENT_CLASSES[config.value.placement]
    )
  );

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

  const handleDismiss = () => {
    hidden.value = true;
  };

  const showConversation = useComputed(() => isConversation.value && !hidden.value);
  const showTerms = useComputed(() => isTerms.value && !hidden.value);
  const showError = useComputed(() => isError.value && !hidden.value);
  const showPoweredBy = useComputed(() => !hidden.value);
  
  // Only show dismiss button if dismissible is enabled AND call is not active
  const showDismiss = useComputed(() => config.value.dismissible && isDisconnected.value);

  return (
    <>
      <InOutTransition initial={false} active={showConversation}>
        <Root className={className} style={HIDDEN_STYLE}>
          {config.value.always_expanded ? (
            <Sheet open />
          ) : (
            <>
              {expandable.value && <Sheet open={expanded} />}
              <Trigger
                expandable={expandable.value}
                expanded={expanded}
                onDismiss={showDismiss.value ? handleDismiss : undefined}
              />
            </>
          )}
        </Root>
      </InOutTransition>
      <InOutTransition initial={false} active={showTerms}>
        <Root className={className} style={HIDDEN_STYLE}>
          <TermsModal />
        </Root>
      </InOutTransition>
      <InOutTransition initial={false} active={showError}>
        <Root className={className} style={HIDDEN_STYLE}>
          <ErrorModal sawError={sawError} />
        </Root>
      </InOutTransition>
      <InOutTransition initial={false} active={showPoweredBy}>
        <Root className={className} style={HIDDEN_STYLE}>
          <PoweredBy />
        </Root>
      </InOutTransition>
    </>
  );
});
