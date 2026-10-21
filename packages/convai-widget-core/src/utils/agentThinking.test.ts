import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentThinking,
  SHOW_DELAY_MS,
  THINKING_TIMEOUT_MS,
} from "./agentThinking";

describe("AgentThinking", () => {
  let thinking: AgentThinking;

  beforeEach(() => {
    vi.useFakeTimers();
    thinking = new AgentThinking();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows after a short delay once the user's turn ends", () => {
    thinking.onUserTurnEnded();
    expect(thinking.isThinking.value).toBe(false);
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    expect(thinking.isThinking.value).toBe(true);
  });

  it("never shows when the agent speaks within the delay", () => {
    thinking.onUserTurnEnded();
    thinking.onModeChange("speaking");
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    expect(thinking.isThinking.value).toBe(false);
  });

  it("stops when the agent speaks", () => {
    thinking.onUserTurnEnded();
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    thinking.onModeChange("speaking");
    expect(thinking.isThinking.value).toBe(false);
  });

  it("stops when the user interrupts", () => {
    thinking.onUserTurnEnded();
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    thinking.onInterruption();
    expect(thinking.isThinking.value).toBe(false);
  });

  it("times out when the agent never speaks", () => {
    thinking.onUserTurnEnded();
    vi.advanceTimersByTime(THINKING_TIMEOUT_MS);
    expect(thinking.isThinking.value).toBe(false);
  });

  it("stays on while a tool runs, then times out after it responds", () => {
    thinking.onToolRequest();
    vi.advanceTimersByTime(THINKING_TIMEOUT_MS * 2);
    expect(thinking.isThinking.value).toBe(true);

    thinking.onToolResponse();
    vi.advanceTimersByTime(THINKING_TIMEOUT_MS);
    expect(thinking.isThinking.value).toBe(false);
  });

  it("comes back after the agent speaks while a tool is still running", () => {
    thinking.onModeChange("speaking");
    thinking.onToolRequest();
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    expect(thinking.isThinking.value).toBe(false);

    thinking.onModeChange("listening");
    vi.advanceTimersByTime(SHOW_DELAY_MS);
    expect(thinking.isThinking.value).toBe(true);
  });
});
