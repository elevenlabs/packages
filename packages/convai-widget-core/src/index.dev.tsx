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
} from "./types/config";
import { useState } from "preact/compat";

/**
 * A dev-only playground for testing the ConvAIWidget component.
 */
function Playground() {
  const [variant, setVariant] = useState<Variant>("compact");
  const [placement, setPlacement] = useState<Placement>("bottom-right");
  const [expandable, setExpandable] = useState(false);

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <div className="flex flex-col gap-2 w-64">
        <label className="flex flex-col">
          Variant
          <select
            value={variant}
            onChange={e => setVariant(parseVariant(e.currentTarget.value))}
            className="p-1 border rounded-lg"
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
            className="p-1 border rounded-lg"
          >
            {Placements.map(placement => (
              <option value={placement}>{placement}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={expandable}
            onChange={e => setExpandable(e.currentTarget.checked)}
          />{" "}
          Expandable
        </label>
      </div>
      <div className="dev-host">
        <ConvAIWidget
          agent-id={import.meta.env.VITE_AGENT_ID}
          variant={variant}
          placement={placement}
          _dev-expandable={expandable ? "true" : undefined}
        />
      </div>
    </div>
  );
}

render(jsx(Playground, {}), document.body);
