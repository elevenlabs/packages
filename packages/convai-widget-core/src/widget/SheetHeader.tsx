import { clsx } from "clsx";
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
  showShadow: boolean;
  showLanguageSelector: boolean;
  showExpandButton?: boolean;
}

export function SheetHeader({
  showBackButton,
  onBackClick,
  showStatusLabel,
  showShadow,
  showLanguageSelector,
  showExpandButton = true,
}: SheetHeaderProps) {
  const text = useTextContents();
  const { toggleSize, variant } = useWidgetSize();

  return (
    <div
      className={clsx(
        "bg-base shrink-0 relative",
        showShadow && "shadow-header"
      )}
    >
      <div className="flex gap-2 p-4 items-start justify-between">
        <div className="flex gap-2 items-start">
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
            />
          </Button>
        )}
      </div>
      <InOutTransition active={showLanguageSelector}>
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-center transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:-translate-y-4">
          <SheetLanguageSelect />
        </div>
      </InOutTransition>
    </div>
  );
}
