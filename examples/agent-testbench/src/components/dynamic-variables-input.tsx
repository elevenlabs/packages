import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { TypedInput } from "@/components/typed-input";
import { Button } from "./ui/button";
import { useState } from "react";
import { XIcon } from "lucide-react";

type DynamicVariablesInputProps = {
  values: Record<string, string | number | boolean>;
  onChange: (value: Record<string, string | number | boolean>) => void;
};

export function DynamicVariablesInput({
  values,
  onChange,
}: DynamicVariablesInputProps) {
  const [newKey, setNewKey] = useState("");

  return (
    <>
      {Object.entries(values).map(([key, entryValue], index) => (
        <FieldGroup key={index}>
          <div className="flex flex-row gap-1">
            <Input
              placeholder="Variable Name"
              value={key}
              onChange={e => {
                const newValues = { ...values };
                delete newValues[key];
                newValues[e.target.value] = entryValue;
                onChange(newValues);
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newValues = { ...values };
                delete newValues[key];
                onChange(newValues);
              }}
            >
              <XIcon />
            </Button>
          </div>
          <TypedInput
            placeholder={`Value for "${key}"`}
            value={entryValue ?? ""}
            onChange={newValue => onChange({ ...values, [key]: newValue })}
          />
        </FieldGroup>
      ))}
      <Field>
        <Input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder="New Variable Name"
        />
        <Button
          variant="outline"
          onClick={() => {
            onChange({ ...values, [newKey]: "" });
            setNewKey("");
          }}
        >
          Add
        </Button>
      </Field>
    </>
  );
}
