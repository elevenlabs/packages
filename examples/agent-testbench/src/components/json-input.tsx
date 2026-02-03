import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FieldDescription } from "@/components/ui/field";

type JsonInputProps = {
  value: unknown;
  onChange: (value: unknown) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">;

export function JsonInput({ value, onChange, ...props }: JsonInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(JSON.stringify(value));
  return (
    <>
      <Input
        {...props}
        value={text}
        placeholder={error ?? props.placeholder}
        aria-invalid={error !== null}
        onChange={e => {
          const { value } = e.target;
          setText(value);
          try {
            onChange(value ? JSON.parse(value) : undefined);
            setError(null);
          } catch (error) {
            setError(error instanceof Error ? error.message : "Invalid JSON");
          }
        }}
      />
      {error && (
        <FieldDescription className="text-destructive text-xs">
          {error}
        </FieldDescription>
      )}
    </>
  );
}
