import { useMemo, useState } from "preact/compat";
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

export function usePlaygroundSettings() {
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
          if (!expr) return acc;
          const [name, ...rest] = expr.split("=");
          if (name) {
            return { ...acc, [name]: rest.join("=") };
          }
          return acc;
        }, {}),
    [dynamicVariablesStr]
  );

  return {
    variant,
    setVariant,
    placement,
    setPlacement,
    location,
    setLocation,
    micMuting,
    setMicMuting,
    transcript,
    setTranscript,
    textInput,
    setTextInput,
    textOnly,
    setTextOnly,
    alwaysExpanded,
    setAlwaysExpanded,
    dismissible,
    setDismissible,
    showAgentStatus,
    setShowAgentStatus,
    dynamicVariablesStr,
    setDynamicVariablesStr,
    dynamicVariables,
    expanded,
    setExpanded,
    overrideFirstMessage,
    setOverrideFirstMessage,
    firstMessage,
    setFirstMessage,
  };
}

export type PlaygroundSettingsState = ReturnType<typeof usePlaygroundSettings>;

export function PlaygroundSettingsPanel({
  state,
  onToggleExpand,
}: {
  state: PlaygroundSettingsState;
  onToggleExpand: () => void;
}) {
  return (
    <aside>
      <label>
        Variant
        <select
          value={state.variant}
          onChange={e => state.setVariant(parseVariant(e.currentTarget.value))}
        >
          {Variants.map(variant => (
            <option key={variant} value={variant}>
              {variant}
            </option>
          ))}
        </select>
      </label>
      <label>
        Placement
        <select
          value={state.placement}
          onChange={e =>
            state.setPlacement(parsePlacement(e.currentTarget.value))
          }
        >
          {Placements.map(placement => (
            <option key={placement} value={placement}>
              {placement}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.micMuting}
          onChange={e => state.setMicMuting(e.currentTarget.checked)}
        />{" "}
        Mic muting
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.transcript}
          onChange={e => state.setTranscript(e.currentTarget.checked)}
        />{" "}
        Transcript
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.textInput}
          onChange={e => state.setTextInput(e.currentTarget.checked)}
        />{" "}
        Text input
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.textOnly}
          onChange={e => state.setTextOnly(e.currentTarget.checked)}
        />{" "}
        Text only
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.alwaysExpanded}
          onChange={e => state.setAlwaysExpanded(e.currentTarget.checked)}
        />{" "}
        Always expanded
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.dismissible}
          onChange={e => state.setDismissible(e.currentTarget.checked)}
        />{" "}
        Dismissible
      </label>
      <label>
        <input
          type="checkbox"
          checked={state.showAgentStatus}
          onChange={e => state.setShowAgentStatus(e.currentTarget.checked)}
        />{" "}
        Show agent status
      </label>
      <label>
        Dynamic variables (i.e., new-line separated name=value)
        <textarea
          onChange={e => state.setDynamicVariablesStr(e.currentTarget.value)}
          value={state.dynamicVariablesStr}
          rows={5}
        />
      </label>
      <label>
        <div>
          <span>
            <input
              type="checkbox"
              checked={state.overrideFirstMessage}
              onChange={e =>
                state.setOverrideFirstMessage(e.currentTarget.checked)
              }
            />{" "}
            Override first message
          </span>
        </div>
        <div>
          {state.overrideFirstMessage && (
            <input
              type="text"
              value={state.firstMessage}
              disabled={!state.overrideFirstMessage}
              onChange={e => state.setFirstMessage(e.currentTarget.value)}
            />
          )}
        </div>
      </label>
      <label>
        Server Location
        <select
          value={state.location}
          onChange={e =>
            state.setLocation(parseLocation(e.currentTarget.value))
          }
        >
          {["us", "global", "eu-residency", "in-residency"].map(location => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </label>
      {(state.textOnly || state.textInput || state.transcript) && (
        <button
          type="button"
          onClick={() => {
            onToggleExpand();
            state.setExpanded(!state.expanded);
          }}
        >
          Toggle expand
        </button>
      )}
      <hr />
      <nav>
        <a href="/">Normal DOM</a>
        <a href="/shadowdom.html">Shadow DOM</a>
        <a href="/markdown.html">Markdown</a>
      </nav>
    </aside>
  );
}
