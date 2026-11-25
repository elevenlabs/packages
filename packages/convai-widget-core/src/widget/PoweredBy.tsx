import { useWidgetConfig } from "../contexts/widget-config";
import { clsx } from "clsx";

export function PoweredBy({ inline }: { inline?: boolean }) {
  const config = useWidgetConfig();

  if (config.value.disable_banner) {
    return null;
  }

  return (
    <p
      className={clsx(
        "whitespace-nowrap text-[10px] px-3 z-10",
        // Inside a page or panel it sits in a fixed gap, not the overlay padding
        inline
          ? "leading-[32px]"
          : clsx(
              "[line-height:var(--el-overlay-padding)]",
              config.value.placement.startsWith("top")
                ? "-translate-y-[calc(var(--el-overlay-padding))]"
                : "translate-y-[calc(var(--el-overlay-padding))]"
            )
      )}
    >
      <span className="opacity-30">Powered by</span>{" "}
      <a
        href={config.value.override_link || "https://elevenlabs.io/agents"}
        className="underline cursor-pointer pointer-events-auto focus-visible:outline-hidden opacity-30 hover:opacity-50 focus-visible:opacity-100 focus-visible:underline-offset-2"
        target="_blank"
      >
        ElevenAgents
      </a>
    </p>
  );
}
