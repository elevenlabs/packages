import {
  ReadonlySignal,
  Signal,
  useComputed,
  useSignal,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { AvatarConfig } from "../types/config";
import { useAttribute } from "./attributes";
import { useWidgetConfig } from "./widget-config";
import { useContextSafely } from "../utils/useContextSafely";

const AvatarConfigContext = createContext<{
  config: ReadonlySignal<AvatarConfig>;
  previewUrl: ReadonlySignal<string>;
  canvasUrl: Signal<string>;
} | null>(null);

interface AvatarConfigProviderProps {
  children: ComponentChildren;
}

export function AvatarConfigProvider({ children }: AvatarConfigProviderProps) {
  const widgetConfig = useWidgetConfig();
  const imageUrl = useAttribute("avatar-image-url");
  const orbColor1 = useAttribute("avatar-orb-color-1");
  const orbColor2 = useAttribute("avatar-orb-color-2");

  const canvasUrl = useSignal("");

  const config = useComputed<AvatarConfig>(() => {
    if (imageUrl.value) {
      return {
        type: "image",
        url: imageUrl.value,
      };
    }
    if (orbColor1.value && orbColor2.value) {
      return {
        type: "orb",
        color_1: orbColor1.value,
        color_2: orbColor2.value,
      };
    }

    return widgetConfig.value.avatar;
  });

  const previewUrl = useComputed(() => {
    switch (config.value.type) {
      case "url":
        return config.value.custom_url;
      case "orb":
        return canvasUrl.value;
      case "image":
        return config.value.url;
    }
  });

  const value = useMemo(() => ({ config, previewUrl, canvasUrl }), []);

  return (
    <AvatarConfigContext.Provider value={value}>
      {children}
    </AvatarConfigContext.Provider>
  );
}

export function useAvatarConfig() {
  return useContextSafely(AvatarConfigContext);
}
