import { sessionFixture } from "./fixtures/session";
import { commandsFixture } from "./fixtures/commands";
import { alertsFixture } from "./fixtures/alerts";
import { emojiPacksFixture } from "./fixtures/emojiPacks";

const SCENARIOS = ["happy", "empty", "error", "partial"] as const;
export type MockScenario = (typeof SCENARIOS)[number];

/**
 * Determine the active mock scenario for generating responses.
 *
 * @returns The active `MockScenario` (`'happy' | 'empty' | 'error' | 'partial'`); defaults to `'happy'` when no scenario is configured or it cannot be read.
 */
function getScenario(): MockScenario {
  // Try to read from localStorage if available, otherwise default to "happy"
  try {
    const scenario = localStorage.getItem("VITE_MOCK_SCENARIO");
    if (scenario && (SCENARIOS as readonly string[]).includes(scenario)) {
      return scenario as MockScenario;
    }
  } catch (e) {
    // Ignore error in environments where localStorage is not available
  }
  return "happy";
}

export const getMockResponse = (method: string, url: string): { status: number, data: any } | null => {
  const urlPath = url.split('?')[0];
  const routeKey = `${method.toUpperCase()}:${urlPath}`;
  const scenario = getScenario();

  if (scenario === "error") {
    // Simulate server error
    return { status: 500, data: { message: "Internal Server Error Simulation" } };
  }

  const handlers: Record<string, () => any> = {
    "GET:/api/v1/session/summary": () => {
      if (scenario === "empty") return null; // Or 404
      if (scenario === "partial") return { ...sessionFixture, alerts: 0, pendingCommands: 0 };
      return sessionFixture;
    },
    "GET:/api/v1/commands": () => {
      if (scenario === "empty" || scenario === "partial") return [];
      return commandsFixture;
    },
    "GET:/api/v1/alerts": () => {
      if (scenario === "empty" || scenario === "partial") return [];
      return alertsFixture;
    },
    "GET:/api/emoji/packs": () => {
      if (scenario === "empty") return [];
      if (scenario === "partial") return emojiPacksFixture.slice(0, 1); // Return only first item, or empty array if none
      return emojiPacksFixture;
    },
    "POST:/api/v1/auth/login": () => ({ message: "Mock login successful" }),
    "POST:/api/v1/commands": () => ({ message: "Mock command queued" }),
  };

  if (handlers[routeKey]) {
    const data = handlers[routeKey]();
    if (data === null) {
        return { status: 404, data: { message: "Not found" }};
    }
    return { status: 200, data };
  }

  return null;
};
