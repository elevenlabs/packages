import { computed, ReadonlySignal, useSignalEffect } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import type { OrchestratorConfig } from "@elevenlabs/client";
import { useAttribute } from "./attributes";
import { useContextSafely } from "../utils/useContextSafely";
import { parseOrchestratorConfig } from "../utils/parseOrchestratorConfig";

interface OrchestratorContextValue {
  enabled: ReadonlySignal<boolean>;
  config: ReadonlySignal<OrchestratorConfig | null>;
}

const OrchestratorContext = createContext<OrchestratorContextValue | null>(
  null
);

interface OrchestratorProviderProps {
  children: ComponentChildren;
}

export function OrchestratorProvider({ children }: OrchestratorProviderProps) {
  const url = useAttribute("orchestrator-url");
  const agentConfig = useAttribute("orchestrator-agent-config");
  const agentId = useAttribute("agent-id");
  const signedUrl = useAttribute("signed-url");

  useSignalEffect(() => {
    if (url.value && (agentId.value || signedUrl.value)) {
      console.warn(
        "[ConversationalAI] orchestrator-url takes precedence; agent-id and signed-url are ignored"
      );
    }
  });

  const value = useMemo(
    () => ({
      enabled: computed(() => !!url.value),
      config: computed(() =>
        url.value ? parseOrchestratorConfig(url.value, agentConfig.value) : null
      ),
    }),
    []
  );

  return (
    <OrchestratorContext.Provider value={value}>
      {children}
    </OrchestratorContext.Provider>
  );
}

export function useOrchestrator() {
  return useContextSafely(OrchestratorContext);
}
