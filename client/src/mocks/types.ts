export type SessionSummary = {
  environment: "dev" | "staging" | "prod";
  operator: { id: string; username: string; role: string };
  activeExecutors: number;
  pendingCommands: number;
  alerts: number;
};

export type Command = {
  id: string;
  type: "provision" | "deploy" | "scale" | "inspect" | "restore";
  status: "pending" | "claimed" | "executing" | "complete" | "failed" | "cancelled";
  requestedBy: string;
  createdAt: string;
  expiresAt: string;
};

export type Alert = {
  id: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  createdAt: string;
};

export interface EmojiPack {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string;
  visibility: string;
  status: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
