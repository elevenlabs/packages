import { useWidgetConfig } from "../contexts/widget-config";
import { clsx } from "clsx";

export function PoweredBy() {
  const config = useWidgetConfig();

  if (config.value.disable_banner) {
    return null;
  }

  return (
    <p
      className={clsx(
        "whitespace-nowrap [line-height:var(--el-overlay-padding)] text-[10px] px-3",
        config.value.placement.startsWith("top")
          ? "-translate-y-[calc(var(--el-overlay-padding))]"
          : "translate-y-[calc(var(--el-overlay-padding))]"
      )}
    >
      <span className="opacity-30">Powered by ElevenLabs</span>{" "}
      <a
        href={
          config.value.override_link ||
          "https://elevenlabs.io/conversational-ai"
        }
        className="underline cursor-pointer pointer-events-auto focus-visible:outline-none opacity-30 hover:opacity-50 focus-visible:opacity-100 focus-visible:underline-offset-2"
        target="_blank"
      >
        Agents
      </a>
    </p>
  );
}
