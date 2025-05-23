import * as Select from "@radix-ui/react-select";
import { Icon } from "../components/Icon";
import { useLanguageConfig } from "../contexts/language-config";
import { Flag } from "../components/Flag";
import { SelectTriggerProps } from "@radix-ui/react-select";
import { clsx } from "clsx";
import { LanguageSelect } from "./LanguageSelect";
import { useTextContents } from "../contexts/text-contents";

export function SheetLanguageSelect({
  className,
  ...rest
}: SelectTriggerProps) {
  const text = useTextContents();
  const { language, showPicker } = useLanguageConfig();
  if (!showPicker.value) {
    return null;
  }

  return (
    <LanguageSelect align="center">
      <Select.Trigger
        className={clsx(
          "h-9 min-w-max rounded-button focus-ring px-2 flex gap-2 items-center text-base-primary bg-base hover:bg-base-hover active:bg-base-active font-medium",
          className
        )}
        aria-label={text.change_language}
        {...rest}
      >
        <Flag size="sm" flagCode={language.value.flagCode} />
        {language.value.name}
        <Select.Icon className="text-base-subtle" asChild>
          <Icon size="sm" name="chevron-down" />
        </Select.Icon>
      </Select.Trigger>
    </LanguageSelect>
  );
}
