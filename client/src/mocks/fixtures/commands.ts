import { Command } from "../types";

export const commandsFixture: Command[] = [
  {
    id: "cmd-12345678",
    type: "deploy",
    status: "complete",
    requestedBy: "admin",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 55).toISOString(),
  },
  {
    id: "cmd-87654321",
    type: "provision",
    status: "pending",
    requestedBy: "admin",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  }
];
