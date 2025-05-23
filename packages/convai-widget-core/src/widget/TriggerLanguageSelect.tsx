import * as Select from "@radix-ui/react-select";
import { Icon } from "../components/Icon";
import { useLanguageConfig } from "../contexts/language-config";
import { Flag } from "../components/Flag";
import { SelectTriggerProps } from "@radix-ui/react-select";
import { clsx } from "clsx";
import { LanguageSelect } from "./LanguageSelect";
import { SizeTransition } from "../components/SizeTransition";
import { useTextContents } from "../contexts/text-contents";

interface Props extends SelectTriggerProps {
  visible: boolean;
}

export function TriggerLanguageSelect({ visible, className, ...rest }: Props) {
  const text = useTextContents();
  const { language, showPicker } = useLanguageConfig();
  if (!showPicker.value) {
    return null;
  }

  return (
    <SizeTransition visible={visible} className="p-1">
      <LanguageSelect>
        <Select.Trigger
          className={clsx(
            "h-9 min-w-max border border-base-border rounded-button focus-ring px-1.5 flex gap-1 items-center transition-colors duration-200 hover:bg-base-hover active:bg-base-active",
            className
          )}
          aria-label={text.change_language}
          {...rest}
        >
          <Flag flagCode={language.value.flagCode} />
          <Select.Icon className="px-1 text-base-subtle" asChild>
            <Icon size="sm" name="chevron-down" />
          </Select.Icon>
        </Select.Trigger>
      </LanguageSelect>
    </SizeTransition>
  );
}
