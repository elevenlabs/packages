import { ReadonlySignal, useComputed } from "@preact/signals";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { InOutTransition } from "../components/InOutTransition";
import { useTextContents } from "../contexts/text-contents";
import { SheetLanguageSelect } from "./SheetLanguageSelect";
import { StatusLabel } from "./StatusLabel";
import { useWidgetSize } from "../contexts/widget-size";

interface SheetHeaderProps {
  showBackButton: boolean;
  onBackClick?: () => void;
  showStatusLabel: ReadonlySignal<boolean>;
  showLanguageSelector: ReadonlySignal<boolean>;
  showExpandButton: ReadonlySignal<boolean>;
}

export function SheetHeader({
  showBackButton,
  onBackClick,
  showStatusLabel,
  showLanguageSelector,
  showExpandButton,
}: SheetHeaderProps) {
  const text = useTextContents();
  const { toggleSize, variant } = useWidgetSize();

  const expandButtonLabel = useComputed(() =>
    variant.value === "compact" ? "Expand widget" : "Collapse widget"
  );

  return (
    <div className="w-full relative shrink-0 z-10">
      <div className="h-16 absolute top-0 w-full bg-base" />
      <div className="h-4 absolute top-16 w-full bg-gradient-to-b from-base to-transparent backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="h-16 top-0 absolute flex flex-row items-center justify-center w-full">
        <div className="absolute start-3 flex gap-2 items-center">
          {showBackButton ? (
            <Button
              variant="ghost"
              onClick={onBackClick}
              aria-label={text.go_back}
              className="h-8 w-8"
            >
              <Icon name="chevron-up" className="-rotate-90" size="xs" />
            </Button>
          ) : (
            <div className="relative w-8 h-8" />
          )}
          <InOutTransition active={showStatusLabel}>
            <StatusLabel className="transition-opacity data-hidden:opacity-0" />
          </InOutTransition>
        </div>
        <div className="absolute flex flex-row items-center gap-2 ms-auto end-3">
          <InOutTransition active={showLanguageSelector}>
            <div className="transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:-translate-y-4">
              <SheetLanguageSelect />
            </div>
          </InOutTransition>
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
        </div>
      </div>
    </div>
  );
}
