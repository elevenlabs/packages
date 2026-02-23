import "./playground.css";
import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { ConvAIWidget } from "./widget";
import { useRef } from "preact/compat";
import {
  usePlaygroundSettings,
  PlaygroundSettingsPanel,
} from "./PlaygroundSettings";

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
      <PlaygroundSettingsPanel state={state} onToggleExpand={handleToggleExpand} />
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
          dismissible={JSON.stringify(state.dismissible)}
          show-agent-status={JSON.stringify(state.showAgentStatus)}
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
