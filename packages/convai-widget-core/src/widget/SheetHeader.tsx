import { ReadonlySignal, useComputed } from "@preact/signals";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { InOutTransition } from "../components/InOutTransition";
import { useTextContents } from "../contexts/text-contents";
import { SheetLanguageSelect } from "./SheetLanguageSelect";
import { StatusLabel } from "./StatusLabel";
import { useWidgetSize } from "../contexts/widget-size";
import { ConversationModeToggle } from "./ConversationModeToggle";

interface SheetHeaderProps {
  showBackButton: boolean;
  onBackClick?: () => void;
  showStatusLabel: ReadonlySignal<boolean>;
  showLanguageSelector: ReadonlySignal<boolean>;
  showConversationModeToggle: ReadonlySignal<boolean>;
  showExpandButton: ReadonlySignal<boolean>;
  onClose?: () => void;
}

export function SheetHeader({
  showBackButton,
  onBackClick,
  showStatusLabel,
  showLanguageSelector,
  showConversationModeToggle,
  showExpandButton,
  onClose,
}: SheetHeaderProps) {
  const text = useTextContents();
  const { toggleSize, variant, fullscreenOnly } = useWidgetSize();

  const expandButtonLabel = useComputed(() =>
    variant.value === "compact" ? "Expand widget" : "Collapse widget"
  );

  return (
    <div className="w-full relative shrink-0 z-10">
      <div className="h-16 absolute top-0 w-full bg-base" />
      <div className="h-4 absolute top-16 w-full bg-gradient-to-b from-base to-transparent backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black,transparent)] shadow-scroll-fade-bottom" />
      <div className="h-16 top-0 absolute flex flex-row items-center justify-between gap-2 px-3 w-full">
        <div className="flex gap-2 items-center min-w-0">
          {showBackButton ? (
            <Button
              variant="ghost"
              onClick={onBackClick}
              aria-label={text.go_back}
              className="h-8 w-8 shrink-0"
            >
              <Icon name="chevron-up" className="-rotate-90" size="xs" />
            </Button>
          ) : (
            <div className="relative w-8 h-8 shrink-0" />
          )}
          <InOutTransition active={showStatusLabel}>
            <StatusLabel
              compact
              className="min-w-0 transition-opacity data-hidden:opacity-0"
            />
          </InOutTransition>
        </div>
        <div className="flex flex-row items-center gap-2 shrink-0">
          <InOutTransition active={showLanguageSelector}>
            <div className="transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:-translate-y-4">
              <SheetLanguageSelect />
            </div>
          </InOutTransition>
          <InOutTransition active={showConversationModeToggle}>
            <ConversationModeToggle className="transition-opacity data-hidden:opacity-0" />
          </InOutTransition>
          {onClose && fullscreenOnly.value ? (
            <Button
              variant="ghost"
              onClick={onClose}
              aria-label={text.collapse}
              className="h-8 w-8"
            >
              <Icon name="x" size="sm" />
            </Button>
          ) : (
            <InOutTransition active={showExpandButton}>
              <Button
                variant="ghost"
                onClick={toggleSize}
                aria-label={expandButtonLabel}
                className="h-8 w-8 transition-opacity data-hidden:opacity-0"
              >
                <Icon
                  name={variant.value === "compact" ? "maximize" : "minimize"}
                  size="sm"
                />
              </Button>
            </InOutTransition>
          )}
        </div>
      </div>
    </div>
  );
}
