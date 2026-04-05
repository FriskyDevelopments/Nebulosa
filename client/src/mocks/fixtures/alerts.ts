import { Alert } from "../types";

export const alertsFixture: Alert[] = [
  {
    id: "alert-1",
    severity: "critical",
    message: "High latency detected in executor node alpha",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "alert-2",
    severity: "warning",
    message: "Failed authentication attempt from unknown IP",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  }
];
