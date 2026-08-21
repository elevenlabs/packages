import "./playground.css";
import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { setSourceInfo } from "@elevenlabs/client/internal";
import { ConvAIWidget } from "./widget";
import { PACKAGE_VERSION } from "./version";
import { useRef } from "preact/compat";
import {
  usePlaygroundSettings,
  PlaygroundSettingsPanel,
} from "./PlaygroundSettings";

// The production entry (index.ts) sets this, but the playground mounts
// ConvAIWidget directly. Without it the server sees a generic sdk source, and
// anything gated on the widget channel — rich content, for one — never loads.
setSourceInfo({ name: "widget", version: PACKAGE_VERSION });

/**
 * A dev-only playground for testing the ConvAIWidget component without Shadow DOM.
 */
function Playground() {
  const ref = useRef<HTMLDivElement>(null);
  const state = usePlaygroundSettings();

  const handleToggleExpand = () => {
    const event = new CustomEvent("elevenlabs-agent:expand", {
      detail: { action: state.expanded ? "collapse" : "expand" },
      bubbles: true,
      composed: true,
    });
    ref.current?.dispatchEvent(event);
  };

  return (
    <div className="playground">
      <PlaygroundSettingsPanel
        state={state}
        onToggleExpand={handleToggleExpand}
      />
      <div ref={ref} className="dev-host">
        <ConvAIWidget
          agent-id={import.meta.env.VITE_AGENT_ID}
          variant={state.variant}
          placement={state.placement}
          transcript={JSON.stringify(state.transcript)}
          text-input={JSON.stringify(state.textInput)}
          mic-muting={JSON.stringify(state.micMuting)}
          override-text-only={JSON.stringify(state.textOnly)}
          always-expanded={JSON.stringify(state.alwaysExpanded)}
          allow-events={JSON.stringify(state.allowEvents)}
          dismissible={JSON.stringify(state.dismissible)}
          show-agent-status={JSON.stringify(state.showAgentStatus)}
          show-resize-button={JSON.stringify(state.showResizeButton)}
          show-language-selector-on-trigger={JSON.stringify(
            state.showLanguageSelectorOnTrigger
          )}
          dynamic-variables={JSON.stringify(state.dynamicVariables)}
          server-location={state.location}
          override-first-message={
            state.overrideFirstMessage ? state.firstMessage : undefined
          }
        />
      </div>
    </div>
  );
}

render(jsx(Playground, {}), document.body);
