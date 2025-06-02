import styleSource from "./index.css?inline";
import { memo } from "preact/compat";
import { useComputed } from "@preact/signals";
import { useWidgetConfig } from "../contexts/widget-config";
import { DefaultStyles, StyleKeys } from "../types/config";

export const Style = memo(function Style() {
  const config = useWidgetConfig();
  const prelude = useComputed(() => {
    const styles = config.value.styles;
    return `:host, :root {\n${StyleKeys.map(
      key =>
        `${keyToCssVar(key)}: ${parseCssValue(styles?.[key] ?? DefaultStyles[key])};`
    ).join("\n")}\n}`;
  });

  return (
    <style>
      {prelude}
      {styleSource}
    </style>
  );
});

function keyToCssVar(key: string): string {
  return `--el-${key.replace(/_/g, "-")}`;
}

function parseCssValue(value: string | number): string {
  if (typeof value === "number") {
    return `${value}px`;
  }
  return value;
}
