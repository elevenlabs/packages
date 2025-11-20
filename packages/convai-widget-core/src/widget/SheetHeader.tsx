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
  showStatusLabel: boolean;
  showLanguageSelector: boolean;
  showExpandButton?: boolean;
}

export function SheetHeader({
  showBackButton,
  onBackClick,
  showStatusLabel,
  showLanguageSelector,
  showExpandButton = true,
}: SheetHeaderProps) {
  const text = useTextContents();
  const { toggleSize, variant } = useWidgetSize();

  return (
    <div className="w-full relative shrink-0 z-10">
      <div className="h-20 top-0 absolute w-full bg-gradient-to-b from-base via-base via-80% to-transparent" />
      <div className="h-16 top-0 absolute flex flex-row items-center justify-center w-full">
        <div className="absolute start-3 flex gap-2 items-center">
          {showBackButton ? (
            <Button
              variant="ghost"
              onClick={onBackClick}
              aria-label={text.go_back}
              className="!h-8 !w-8"
            >
              <Icon name="chevron-up" className="-rotate-90" size="sm" />
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
          {showExpandButton && (
            <Button
              variant="ghost"
              onClick={toggleSize}
              aria-label={
                variant.value === "compact" ? "Expand widget" : "Collapse widget"
              }
              className="!h-8 !w-8"
            >
              <Icon
                name={variant.value === "compact" ? "maximize" : "minimize"}
                size="sm"
                className="!text-[14px]"
              />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
