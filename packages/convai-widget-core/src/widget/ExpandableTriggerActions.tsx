import {
  useIsConversationTextOnly,
  useTriggerEntryPoints,
  useWidgetConfig,
} from "../contexts/widget-config";
import {
  useCallButtonDisabled,
  useConversation,
} from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { useTerms } from "../contexts/terms";
import { useSheetContent } from "../contexts/sheet-content";
import { TargetedEvent, useCallback } from "preact/compat";
import { SizeTransition } from "../components/SizeTransition";
import { CallButton } from "./CallButton";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { TriggerLanguageSelect } from "./TriggerLanguageSelect";
import { Button } from "../components/Button";
import { clsx } from "clsx";
import { ExpandableProps } from "./Trigger";
import { Avatar } from "../components/Avatar";
import { DismissButton } from "../components/DismissButton";

interface ExpandableTriggerActionsProps extends ExpandableProps {
  onDismiss?: () => void;
}

export function ExpandableTriggerActions({
  expanded,
  onDismiss,
}: ExpandableTriggerActionsProps) {
  const conversationTextOnly = useIsConversationTextOnly();
  const { showCall, showMessage } = useTriggerEntryPoints();
  const variant = useWidgetConfig().value.variant;
  const isTiny = variant === "tiny";
  const { isDisconnected, startSession } = useConversation();
  const callDisabled = useCallButtonDisabled();
  const text = useTextContents();
  const terms = useTerms();
  const { pendingInputFocus } = useSheetContent();

  const toggleExpanded = useCallback(() => {
    expanded.value = !expanded.value;
  }, [expanded]);

  const openSheet = useCallback(
    ({ focusInput = false }: { focusInput?: boolean } = {}) => {
      pendingInputFocus.value = focusInput;
      expanded.value = true;
    },
    [expanded, pendingInputFocus]
  );

  // requestTerms rejects on decline, gating both opening and connecting.
  const handleStartCall = useCallback(
    async (e: TargetedEvent<HTMLElement>) => {
      e.stopPropagation();
      const target = e.currentTarget;
      await terms.requestTerms();
      openSheet();
      void startSession(target);
    },
    [terms, openSheet, startSession]
  );

  // The session starts on the first send (SheetActions), not here.
  const handleMessage = useCallback(
    async (e: TargetedEvent<HTMLElement>) => {
      e.stopPropagation();
      await terms.requestTerms();
      openSheet({ focusInput: true });
    },
    [terms, openSheet]
  );

  const collapsedDisconnected = !expanded.value && isDisconnected.value;
  const collapsedConnected = !expanded.value && !isDisconnected.value;

  return (
    <>
      {/* Active-call controls, collapsed mid-call. */}
      {variant === "full" && (
        <SizeTransition visible={collapsedConnected} className="p-1">
          <Avatar />
        </SizeTransition>
      )}
      <SizeTransition
        grow={!isTiny}
        visible={!conversationTextOnly.value && collapsedConnected}
        className="p-1"
      >
        <CallButton iconOnly isDisconnected={false} />
      </SizeTransition>
      <SizeTransition
        visible={!conversationTextOnly.value && collapsedConnected}
        className="p-1"
      >
        <TriggerMuteButton />
      </SizeTransition>

      {/* Disconnected launcher entry points. */}
      <SizeTransition
        grow={!isTiny}
        visible={collapsedDisconnected && showCall.value}
        className="p-1"
      >
        <Button
          className="w-full"
          variant="primary"
          icon="phone"
          disabled={callDisabled.value}
          aria-label={text.start_call}
          onClick={handleStartCall}
        >
          {!isTiny ? text.start_call : undefined}
        </Button>
      </SizeTransition>
      <SizeTransition
        grow={!isTiny && !showCall.value}
        visible={collapsedDisconnected && showMessage.value}
        className="p-1"
      >
        <Button
          className="w-full"
          variant={showCall.value ? "secondary" : "primary"}
          icon="chat"
          aria-label={text.start_message}
          onClick={handleMessage}
        >
          {!isTiny && !showCall.value ? text.start_message : undefined}
        </Button>
      </SizeTransition>
      <TriggerLanguageSelect visible={collapsedDisconnected} />

      {/* Collapse/expand affordance for the connected or expanded states. */}
      <SizeTransition
        grow={isDisconnected.value}
        visible={expanded.value || !isDisconnected.value}
        className="p-1"
      >
        <Button
          className="w-full"
          variant="primary"
          iconClassName={clsx(
            "transition-transform duration-200",
            expanded.value && "-rotate-180"
          )}
          icon="chevron-up"
          aria-label={expanded.value ? text.collapse : text.expand}
          onClick={
            !expanded.value && !isDisconnected.value
              ? toggleExpanded
              : undefined
          }
        />
      </SizeTransition>

      <SizeTransition visible={!!onDismiss} className="p-1">
        <DismissButton onDismiss={onDismiss} />
      </SizeTransition>
    </>
  );
}
