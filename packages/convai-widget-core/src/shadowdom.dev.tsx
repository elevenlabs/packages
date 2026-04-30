import "./playground.css";
import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { registerWidget } from "./index";
import { useEffect, useRef } from "preact/compat";
import {
  usePlaygroundSettings,
  PlaygroundSettingsPanel,
} from "./PlaygroundSettings";

/**
 * A dev-only playground for testing the ConvAIWidget component inside Shadow DOM.
 */
function Playground() {
  const ref = useRef<HTMLDivElement>(null);
  const state = usePlaygroundSettings();

  // Imperatively manage the custom element for Shadow DOM mode
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    if (!customElements.get("elevenlabs-convai")) {
      registerWidget();
    }

    const el = document.createElement("elevenlabs-convai");
    const attrs: Record<string, string | undefined> = {
      "agent-id": import.meta.env.VITE_AGENT_ID,
      variant: state.variant,
      placement: state.placement,
      transcript: JSON.stringify(state.transcript),
      "text-input": JSON.stringify(state.textInput),
      "mic-muting": JSON.stringify(state.micMuting),
      "override-text-only": JSON.stringify(state.textOnly),
      "always-expanded": JSON.stringify(state.alwaysExpanded),
      "allow-events": JSON.stringify(state.allowEvents),
      dismissible: JSON.stringify(state.dismissible),
      "show-agent-status": JSON.stringify(state.showAgentStatus),
      "dynamic-variables": JSON.stringify(state.dynamicVariables),
      "server-location": state.location,
      "override-first-message": state.overrideFirstMessage
        ? state.firstMessage
        : undefined,
    };
    
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) el.setAttribute(key, value);
    }
    
    container.appendChild(el);

    return () => {
      el.remove();
    };
  }, [
    state.variant,
    state.placement,
    state.transcript,
    state.textInput,
    state.micMuting,
    state.textOnly,
    state.alwaysExpanded,
    state.allowEvents,
    state.dismissible,
    state.showAgentStatus,
    state.dynamicVariables,
    state.location,
    state.overrideFirstMessage,
    state.firstMessage,
  ]);

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
      <div ref={ref} />
    </div>
  );
}

render(jsx(Playground, {}), document.body);
