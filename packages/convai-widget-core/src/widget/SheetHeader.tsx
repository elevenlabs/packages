import { InOutTransition } from "../components/InOutTransition";
import { Icon } from "../components/Icon";
import { StatusLabel } from "./StatusLabel";
import { SheetLanguageSelect } from "./SheetLanguageSelect";
import { clsx } from "clsx";

interface SheetHeaderProps {
  showBackButton: boolean;
  onBackClick?: () => void;
  showStatusLabel: boolean;
  showShadow: boolean;
  showLanguageSelector: boolean;
}

export function SheetHeader({
  showBackButton,
  onBackClick,
  showStatusLabel,
  showShadow,
  showLanguageSelector,
}: SheetHeaderProps) {
  return (
    <div
      className={clsx(
        "bg-base shrink-0 relative",
        showShadow && "shadow-header"
      )}
    >
      <div className="flex gap-2 p-4 items-start">
        {showBackButton ? (
          <button
            onClick={onBackClick}
            aria-label="Go back"
            className="flex items-center justify-center w-8 h-8 text-base-primary hover:text-base-subtle transition-colors"
          >
            <Icon name="chevron-up" className="-rotate-90" size="sm" />
          </button>
        ) : (
          <div className="relative w-8 h-8" />
        )}
        <div className="flex flex-col gap-2 flex-1">
          <InOutTransition active={showStatusLabel}>
            <StatusLabel className="transition-opacity data-hidden:opacity-0" />
          </InOutTransition>
        </div>
      </div>
      <InOutTransition active={showLanguageSelector}>
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-center transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:-translate-y-4">
          <SheetLanguageSelect />
        </div>
      </InOutTransition>
    </div>
  );
}
