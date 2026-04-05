import { SessionSummary } from "../types";

export const sessionFixture: SessionSummary = {
  environment: "dev",
  operator: { id: "op-1", username: "admin", role: "Superadmin" },
  activeExecutors: 3,
  pendingCommands: 0,
  alerts: 2,
};
