import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "./ui/switch";

type TypedInputProps = {
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
  placeholder: string;
};

export function TypedInput({ value, onChange, placeholder }: TypedInputProps) {
  const [type, setType] = useState<"string" | "number" | "boolean">(
    typeof value === "number"
      ? "number"
      : typeof value === "boolean"
        ? "boolean"
        : "string"
  );

  const handleChange = useCallback(
    (newValue: string | number | boolean) => {
      onChange(
        type === "number"
          ? Number(newValue)
          : type === "boolean"
            ? newValue
            : newValue.toString()
      );
    },
    [type, onChange]
  );

  return (
    <div className="flex flex-row gap-1">
      {type === "string" && (
        <Input
          placeholder={placeholder}
          value={value.toString()}
          onValueChange={handleChange}
        />
      )}
      {type === "number" && (
        <Input
          placeholder={placeholder}
          value={value.toString()}
          type="number"
          onValueChange={v => handleChange(Number(v))}
        />
      )}
      {type === "boolean" && (
        <div className="grow flex items-center justify-center">
          <Switch
            checked={value === true}
            onCheckedChange={checked => handleChange(checked)}
          />
        </div>
      )}
      <Button
        variant={type === "string" ? "default" : "outline"}
        onClick={() => {
          setType("string");
          handleChange("");
        }}
        title="String"
        size={"icon"}
      >
        S
      </Button>
      <Button
        variant={type === "number" ? "default" : "outline"}
        onClick={() => {
          setType("number");
          handleChange(0);
        }}
        title="Number"
        size={"icon"}
      >
        N
      </Button>
      <Button
        variant="outline"
        onClick={() => {
          setType("boolean");
          handleChange(false);
        }}
        title="Boolean"
        size={"icon"}
      >
        B
      </Button>
    </div>
  );
}
