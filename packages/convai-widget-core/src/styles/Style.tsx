import styleSource from "./index.css?inline";
import { memo } from "preact/compat";

export const Style = memo(function Style() {
  return <style>{styleSource}</style>;
});
