import { render } from "preact";
import { jsx } from "preact/jsx-runtime";
import { ConvAIWidget } from "./widget";
import {
  parsePlacement,
  parseVariant,
  Placement,
  Placements,
  Variant,
  Variants,
  Location,
  parseLocation,
} from "./types/config";
import { useMemo, useRef, useState } from "preact/compat";

/**
 * A dev-only playground for testing the ConvAIWidget component.
 */
function Playground() {
  const ref = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<Variant>("compact");
  const [placement, setPlacement] = useState<Placement>("bottom-right");
  const [location, setLocation] = useState<Location>("us");
  const [micMuting, setMicMuting] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [textInput, setTextInput] = useState(false);
  const [textOnly, setTextOnly] = useState(false);
  const [alwaysExpanded, setAlwaysExpanded] = useState(false);
  const [dismissible, setDismissible] = useState(false);
  const [showAgentStatus, setShowAgentStatus] = useState(false);
  const [dynamicVariablesStr, setDynamicVariablesStr] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [overrideFirstMessage, setOverrideFirstMessage] = useState(false);
  const [firstMessage, setFirstMessage] = useState(
    "Hi, how can I help you today?"
  );

  const dynamicVariables = useMemo(
    () =>
      dynamicVariablesStr
        .split("\n")
        .reduce<Record<string, string>>((acc, expr) => {
          const [name, value] = expr.split("=");
          return { ...acc, [name]: value };
        }, {}),
    [dynamicVariablesStr]
  );

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-base-hover text-base-primary">
      <div className="flex flex-col gap-2 w-64">
        <label className="flex flex-col">
          Variant
          <select
            value={variant}
            onChange={e => setVariant(parseVariant(e.currentTarget.value))}
            className="p-1 bg-base border border-base-border"
          >
            {Variants.map(variant => (
              <option value={variant}>{variant}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Placement
          <select
            value={placement}
            onChange={e => setPlacement(parsePlacement(e.currentTarget.value))}
            className="p-1 bg-base border border-base-border"
          >
            {Placements.map(placement => (
              <option value={placement}>{placement}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={micMuting}
            onChange={e => setMicMuting(e.currentTarget.checked)}
          />{" "}
          Mic muting
        </label>
        <label>
          <input
            type="checkbox"
            checked={transcript}
            onChange={e => setTranscript(e.currentTarget.checked)}
          />{" "}
          Transcript
        </label>
        <label>
          <input
            type="checkbox"
            checked={textInput}
            onChange={e => setTextInput(e.currentTarget.checked)}
          />{" "}
          Text input
        </label>
        <label>
          <input
            type="checkbox"
            checked={textOnly}
            onChange={e => setTextOnly(e.currentTarget.checked)}
          />{" "}
          Text only
        </label>
        <label>
          <input
            type="checkbox"
            checked={alwaysExpanded}
            onChange={e => setAlwaysExpanded(e.currentTarget.checked)}
          />{" "}
          Always expanded
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={dismissible}
            onChange={e => setDismissible(e.currentTarget.checked)}
          />{" "}
          Dismissible
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showAgentStatus}
            onChange={e => setShowAgentStatus(e.currentTarget.checked)}
          />{" "}
          Show agent status
        </label>
        <label className="flex flex-col">
          Dynamic variables (i.e., new-line separated name=value)
          <textarea
            className="p-1 bg-base border border-base-border"
            onChange={e => setDynamicVariablesStr(e.currentTarget.value)}
            value={dynamicVariablesStr}
            rows={5}
          />
        </label>
        <label className="flex flex-row gap-1">
          <div>
            <input
              type="checkbox"
              checked={overrideFirstMessage}
              onChange={e => setOverrideFirstMessage(e.currentTarget.checked)}
            />
          </div>
          <div>
            First message:
            {overrideFirstMessage && (
              <input
                type="text"
                className="p-1 bg-base border border-base-border"
                value={firstMessage}
                disabled={!overrideFirstMessage}
                onChange={e => setFirstMessage(e.currentTarget.value)}
              />
            )}
          </div>
        </label>
        <label className="flex flex-col">
          Server Location
          <select
            value={location}
            onChange={e => setLocation(parseLocation(e.currentTarget.value))}
            className="p-1 bg-base border border-base-border"
          >
            {["us", "global", "eu-residency", "in-residency"].map(location => (
              <option value={location}>{location}</option>
            ))}
          </select>
        </label>
        {(textOnly || textInput || transcript) && (
          <button
            type="button"
            onClick={() => {
              const event = new CustomEvent("elevenlabs-agent:expand", {
                detail: { action: expanded ? "collapse" : "expand" },
                bubbles: true,
                composed: true,
              });
              ref.current?.dispatchEvent(event);
              setExpanded(!expanded);
            }}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Toggle expand
          </button>
        )}
      </div>
      <div ref={ref} className="dev-host">
        <ConvAIWidget
          agent-id={import.meta.env.VITE_AGENT_ID}
          variant={variant}
          placement={placement}
          transcript={JSON.stringify(transcript)}
          text-input={JSON.stringify(textInput)}
          mic-muting={JSON.stringify(micMuting)}
          override-text-only={JSON.stringify(textOnly)}
          always-expanded={JSON.stringify(alwaysExpanded)}
          dismissible={JSON.stringify(dismissible)}
          show-agent-status={JSON.stringify(showAgentStatus)}
          dynamic-variables={JSON.stringify(dynamicVariables)}
          server-location={location}
          override-first-message={
            overrideFirstMessage ? firstMessage : undefined
          }
        />
      </div>
    </div>
  );
}

render(jsx(Playground, {}), document.body);
