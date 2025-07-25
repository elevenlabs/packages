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
import { useState } from "preact/compat";

/**
 * A dev-only playground for testing the ConvAIWidget component.
 */
function Playground() {
  const [variant, setVariant] = useState<Variant>("compact");
  const [placement, setPlacement] = useState<Placement>("bottom-right");
  const [location, setLocation] = useState<Location>("us");
  const [micMuting, setMicMuting] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [textInput, setTextInput] = useState(false);
  const [textOnly, setTextOnly] = useState(false);
  const [alwaysExpanded, setAlwaysExpanded] = useState(false);

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
      </div>
      <div className="dev-host">
        <ConvAIWidget
          agent-id={import.meta.env.VITE_AGENT_ID}
          variant={variant}
          placement={placement}
          transcript={JSON.stringify(transcript)}
          text-input={JSON.stringify(textInput)}
          mic-muting={JSON.stringify(micMuting)}
          override-text-only={JSON.stringify(textOnly)}
          always-expanded={JSON.stringify(alwaysExpanded)}
          server-location={location}
        />
      </div>
    </div>
  );
}

render(jsx(Playground, {}), document.body);
