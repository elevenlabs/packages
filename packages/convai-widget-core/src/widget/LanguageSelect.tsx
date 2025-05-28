import * as Select from "@radix-ui/react-select";
import { Language } from "@elevenlabs/client";
import { useState } from "preact/compat";
import { Icon } from "../components/Icon";
import { useLanguageConfig } from "../contexts/language-config";
import { Flag } from "../components/Flag";
import { useRootPortal } from "../contexts/root-portal";
import { ComponentChildren } from "preact";
import { SelectContentProps } from "@radix-ui/react-select";

interface LanguageSelectProps extends SelectContentProps {
  children: ComponentChildren;
}

export function LanguageSelect({ children, ...rest }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, options } = useLanguageConfig();
  const portal = useRootPortal();

  return (
    <Select.Root
      open={open}
      value={language.value.languageCode}
      onValueChange={value => {
        setLanguage(value as Language);
        setOpen(false);
      }}
      onOpenChange={open => {
        if (open) setOpen(true);
      }}
    >
      {children}
      <Select.Portal container={portal}>
        <Select.Content
          className="overflow-hidden bg-base border border-base-border rounded-dropdown-sheet max-h-[min(384px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] z-10"
          position="popper"
          sideOffset={8}
          align="end"
          side="top"
          onPointerDownOutside={() => setOpen(false)}
          onCloseAutoFocus={() => setOpen(false)}
          onEscapeKeyDown={() => setOpen(false)}
          {...rest}
        >
          <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-base text-base-subtle cursor-default">
            <Icon size="sm" name="chevron-up" />
          </Select.ScrollUpButton>
          <Select.Viewport className="p-1.5">
            {options.value.map(language => (
              <Select.Item
                key={language.languageCode}
                value={language.languageCode}
                className="flex select-none items-center p-1.5 pr-3 gap-2 cursor-pointer rounded-input relative focus-visible:outline-none data-[highlighted]:bg-base-active text-sm"
              >
                <Flag flagCode={language.flagCode} />
                <Select.ItemText>{language.name}</Select.ItemText>
                <Select.ItemIndicator className="text-base-primary p-1.5 -mr-1.5 ml-auto">
                  <Icon size="sm" name="check" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-base text-base-subtle cursor-default">
            <Icon size="sm" name="chevron-down" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
