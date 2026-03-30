import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { config, signExecutorNonce } from "./config";
import {
  claimCommandSchema,
  commandExecutionSchema,
  commandStatusSchema,
  createCommandSchema,
  heartbeatSchema,
  loginSchema,
  type CommandRecord,
  type OperatorRole,
} from "./contracts";
import { nebulosaState } from "./state";

const terminalStatuses = new Set(["succeeded", "failed", "expired", "cancelled"]);

const statusTransitions: Record<string, string[]> = {
  pending: ["claimed", "expired", "cancelled"],
  claimed: ["running", "cancelled", "expired"],
  running: ["succeeded", "failed", "cancelled", "expired"],
  succeeded: [],
  failed: [],
  expired: [],
  cancelled: [],
};

/**
 * Determines if a transition from one command status to another is permitted.
 *
 * @param from - The current status name.
 * @param to - The target status name.
 * @returns `true` if the transition from `from` to `to` is allowed, `false` otherwise.
 */
function canTransition(from: string, to: string): boolean {
  return statusTransitions[from]?.includes(to) ?? false;
}

/**
 * Determine whether an operator role is allowed to perform a specified command action.
 *
 * @param role - The operator role to evaluate
 * @param action - The command action to check permission for
 * @returns `true` if the role is permitted to perform the action, `false` otherwise.
 */
function operatorHasPermission(role: OperatorRole, action: "command:write" | "command:cancel" | "command:view"): boolean {
  if (role === "admin") return true;
  if (role === "operator") return action !== "command:cancel";
  return action === "command:view";
}

/**
 * Authenticate an operator and create a short-lived session token stored in state.
 *
 * Validates provided credentials, and if successful and allowed, generates and stores a session token tied to the operator.
 *
 * @param username - Operator username credential validated by the login schema
 * @param password - Operator password credential validated by the login schema
 * @returns The created session record `{ token, operator }` containing the session token and operator object, or `null` if authentication fails or the operator is not allowed
 */
export function createSession(username: string, password: string) {
  const parsed = loginSchema.parse({ username, password });
  const operator = nebulosaState.operators.get(parsed.username);

  if (!operator || !nebulosaState.verifyPassword(operator, parsed.password)) {
    nebulosaState.addAudit({
      actor: parsed.username,
      event: "auth.login_failed",
      resourceType: "session",
      resourceId: "n/a",
      metadata: { reason: "invalid_credentials" },
    });
    return null;
  }

  if (!config.allowedOperators.includes(operator.username)) {
    nebulosaState.addAudit({
      actor: operator.username,
      event: "auth.login_denied",
      resourceType: "session",
      resourceId: "n/a",
      metadata: { reason: "allowlist_block" },
    });
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  nebulosaState.sessions.set(token, {
    token,
    operatorId: operator.id,
    expiresAt: Date.now() + config.sessionTtlMs,
  });

  nebulosaState.addAudit({
    actor: operator.username,
    event: "auth.login_success",
    resourceType: "session",
    resourceId: token.slice(0, 8),
    metadata: { role: operator.role },
  });

  return { token, operator };
}

/**
 * Extracts and validates an operator session token from the HTTP request and resolves the corresponding operator.
 *
 * Checks the `Authorization: Bearer <token>` header and an `nb_session` cookie, verifies the session exists and is not expired, extends the session TTL, and returns the session token together with the resolved operator.
 *
 * @returns `{ token, operator }` when a valid, unexpired session is found; `null` otherwise.
 */
function sessionFromRequest(req: Request) {
  const auth = req.headers.authorization;
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookieToken = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("nb_session="))
    ?.split("=")[1];

  const token = bearer ?? cookieToken;
  if (!token) return null;

  const session = nebulosaState.sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    nebulosaState.sessions.delete(token);
    return null;
  }

  session.expiresAt = Date.now() + config.sessionTtlMs;
  const operator = [...nebulosaState.operators.values()].find((item) => item.id === session.operatorId);
  if (!operator) return null;
  return { token, operator };
}

/**
 * Creates an Express middleware that enforces operator session authentication and the given permission.
 *
 * The middleware rejects requests with a 401 response when no valid session is present, responds with 403
 * and records an audit event when the authenticated operator lacks the requested permission, and on success
 * attaches the authenticated `operator` to the request before calling `next()`.
 *
 * @param permission - The required permission to allow the request (`"command:write"`, `"command:cancel"`, or `"command:view"`)
 * @returns An Express middleware function (req, res, next) that enforces authentication and authorization
 */
export function requireAuth(permission: "command:write" | "command:cancel" | "command:view") {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = sessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ code: "unauthorized", message: "Session expired or invalid." });
    }

    if (!operatorHasPermission(session.operator.role, permission)) {
      nebulosaState.addAudit({
        actor: session.operator.username,
        event: "auth.permission_denied",
        resourceType: "permission",
        resourceId: permission,
        metadata: { role: session.operator.role },
      });
      return res.status(403).json({ code: "forbidden", message: "Insufficient permissions." });
    }

    (req as any).operator = session.operator;
    next();
  };
}

/**
 * Create and persist a new command record requested by an operator.
 *
 * @param requestedBy - Identifier of the operator who requested the command
 * @param input - Command creation payload (must conform to the command creation schema; includes `type`, `payload`, and `ttlSeconds`)
 * @returns The created CommandRecord with status `"pending"` and `expiresAt` computed from the provided `ttlSeconds`
 */
export function createCommand(requestedBy: string, input: unknown): CommandRecord {
  const payload = createCommandSchema.parse(input);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + payload.ttlSeconds * 1000);

  const cmd: CommandRecord = {
    id: crypto.randomUUID(),
    type: payload.type,
    payload: payload.payload,
    requestedBy,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "pending",
    executorId: null,
    result: null,
    error: null,
    auditMetadata: {
      ttlSeconds: String(payload.ttlSeconds),
      source: "operator-ui",
    },
  };

  nebulosaState.commands.set(cmd.id, cmd);
  nebulosaState.addAudit({
    actor: requestedBy,
    event: "command.created",
    resourceType: "command",
    resourceId: cmd.id,
    metadata: { type: cmd.type },
  });

  return cmd;
}

/**
 * Claims an eligible pending command for an executor.
 *
 * Validates the provided payload and either claims the specified pending command (if `commandId` is given)
 * or the earliest-created pending command that is not expired. The claimed command is marked with status
 * `"claimed"`, assigned the provided `executorId`, and annotated with a `claimedAt` timestamp; an audit
 * event is recorded.
 *
 * @param input - Payload validated by `claimCommandSchema`; must include `executorId` and may include `commandId` to claim a specific command
 * @returns The updated command record after claiming, or `null` if no eligible command was found
 */
export function claimCommand(input: unknown) {
  const payload = claimCommandSchema.parse(input);
  const now = Date.now();

  const pending = [...nebulosaState.commands.values()]
    .filter((cmd) => cmd.status === "pending" && new Date(cmd.expiresAt).getTime() > now)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const target = payload.commandId
    ? pending.find((cmd) => cmd.id === payload.commandId)
    : pending.find((cmd) => true);

  if (!target) return null;

  target.status = "claimed";
  target.executorId = payload.executorId;
  target.auditMetadata.claimedAt = new Date().toISOString();

  nebulosaState.addAudit({
    actor: payload.executorId,
    event: "command.claimed",
    resourceType: "command",
    resourceId: target.id,
    metadata: { executorId: payload.executorId },
  });

  return target;
}

/**
 * Update a command's execution status, result, and executor assignment, then record an audit event and any necessary alerts.
 *
 * @param input - Payload validated by `commandExecutionSchema`; must include `commandId`, `executorId`, and `status`, and may include `result` and `error`
 * @returns The updated `CommandRecord` after applying the execution update, or `null` if the command cannot be found
 * @throws Error "Command owned by different executor" if the command is already assigned to a different executor
 * @throws Error "Invalid transition <from> -> <to>" if the requested status transition is not allowed
 */
export function updateCommandExecution(input: unknown) {
  const payload = commandExecutionSchema.parse(input);
  const command = nebulosaState.commands.get(payload.commandId);
  if (!command) return null;

  if (command.executorId && command.executorId !== payload.executorId) {
    throw new Error("Command owned by different executor");
  }

  if (!canTransition(command.status, payload.status)) {
    throw new Error(`Invalid transition ${command.status} -> ${payload.status}`);
  }

  command.status = payload.status;
  command.executorId = payload.executorId;
  if (payload.result) command.result = payload.result;
  if (payload.error) command.error = payload.error;

  nebulosaState.addAudit({
    actor: payload.executorId,
    event: `command.${payload.status}`,
    resourceType: "command",
    resourceId: command.id,
    metadata: { status: command.status },
  });

  if (payload.status === "failed") {
    const failedCount = [...nebulosaState.commands.values()].filter((cmd) => cmd.status === "failed").length;
    if (failedCount >= config.failedCommandThreshold) {
      nebulosaState.addAlert({
        severity: "critical",
        code: "FAILED_COMMAND_THRESHOLD",
        message: `${failedCount} commands failed. Investigate executor health.`,
      });
    }
  }

  return command;
}

/**
 * Register a heartbeat from an executor, update its stored status and last heartbeat timestamp, and emit an audit event.
 *
 * Validates the `input` payload, verifies the provided `signature` against the expected signature for the executor nonce, and on success updates `nebulosaState.executors` with the executor's `id`, `status`, `capabilities`, and `lastHeartbeatAt`. Also records an `executor.heartbeat` audit event.
 *
 * @param input - Heartbeat payload containing `executorId`, `nonce`, `status`, and `capabilities`
 * @param signature - Signature used to verify the payload authenticity
 * @throws Error - If `signature` is missing or does not match the expected signature (`"Invalid executor signature"`)
 */
export function registerHeartbeat(input: unknown, signature: string | undefined) {
  const payload = heartbeatSchema.parse(input);
  const expectedSig = signExecutorNonce(payload.executorId, payload.nonce);
  if (!signature || signature !== expectedSig) {
    throw new Error("Invalid executor signature");
  }

  nebulosaState.executors.set(payload.executorId, {
    id: payload.executorId,
    status: payload.status,
    capabilities: payload.capabilities,
    lastHeartbeatAt: Date.now(),
  });

  nebulosaState.addAudit({
    actor: payload.executorId,
    event: "executor.heartbeat",
    resourceType: "executor",
    resourceId: payload.executorId,
    metadata: { status: payload.status },
  });
}

/**
 * Marks non-terminal commands past their expiry time as `expired`.
 *
 * Iterates stored commands and, for each command whose `expiresAt` is earlier than the current time and that is allowed to transition to `expired`, sets `status` to `"expired"` and records an audit event with the command's previous status.
 */
export function expireStaleCommands() {
  const now = Date.now();
  nebulosaState.commands.forEach((command) => {
    if (!terminalStatuses.has(command.status) && new Date(command.expiresAt).getTime() < now) {
      const from = command.status;
      if (canTransition(command.status, "expired")) {
        command.status = "expired";
        nebulosaState.addAudit({
          actor: "system",
          event: "command.expired",
          resourceType: "command",
          resourceId: command.id,
          metadata: { from },
        });
      }
    }
  });
}

/**
 * Produce a runtime health snapshot of the service including executor, queue, and alert metrics.
 *
 * May add warning alerts if no executors have heartbeated within 60 seconds or if there are pending
 * commands older than 2 minutes.
 *
 * @returns An object containing:
 *  - `environment`: the current environment from configuration
 *  - `api`: a string health status for the API
 *  - `executor`: an object with `active` and `stale` executor counts
 *  - `queue`: an object with `pending`, `running`, and `failed` command counts
 *  - `alerts`: the number of unresolved alerts (`resolvedAt === null`)
 */
export function healthSnapshot() {
  expireStaleCommands();
  const now = Date.now();
  const activeExecutors = [...nebulosaState.executors.values()].filter((item) => now - item.lastHeartbeatAt < 60_000);
  const staleExecutors = [...nebulosaState.executors.values()].filter((item) => now - item.lastHeartbeatAt >= 60_000);

  if (activeExecutors.length === 0) {
    nebulosaState.addAlert({
      severity: "warning",
      code: "EXECUTOR_DISCONNECTED",
      message: "No healthy executor heartbeat in the last 60 seconds.",
    });
  }

  const pendingLong = [...nebulosaState.commands.values()].filter(
    (cmd) => cmd.status === "pending" && now - new Date(cmd.createdAt).getTime() > 120_000,
  );

  if (pendingLong.length > 0) {
    nebulosaState.addAlert({
      severity: "warning",
      code: "STALE_QUEUE_ITEMS",
      message: `${pendingLong.length} pending command(s) are older than 2 minutes.`,
    });
  }

  return {
    environment: config.environment,
    api: "healthy",
    executor: {
      active: activeExecutors.length,
      stale: staleExecutors.length,
    },
    queue: {
      pending: nebulosaState.commandCounts("pending"),
      running: nebulosaState.commandCounts("running"),
      failed: nebulosaState.commandCounts("failed"),
    },
    alerts: nebulosaState.alerts.filter((alert) => alert.resolvedAt === null).length,
  };
}

/**
 * List stored command records, optionally filtered to a specific status.
 *
 * @param status - Optional status string; when provided it is validated and used to filter returned commands
 * @returns All command records if `status` is omitted; otherwise the command records whose `status` equals the parsed value
 */
export function listCommands(status?: string) {
  if (!status) return [...nebulosaState.commands.values()];
  const parsed = commandStatusSchema.parse(status);
  return [...nebulosaState.commands.values()].filter((cmd) => cmd.status === parsed);
}

/**
 * Cancel a command and record an audit event.
 *
 * @param commandId - The ID of the command to cancel
 * @param actor - Identifier of the operator performing the cancellation
 * @returns The updated command record if found and cancelled, `null` if no command with the given ID exists
 * @throws Error if the command's current status does not allow transitioning to `cancelled`
 */
export function cancelCommand(commandId: string, actor: string) {
  const command = nebulosaState.commands.get(commandId);
  if (!command) return null;
  if (!canTransition(command.status, "cancelled")) {
    throw new Error(`Cannot cancel command from status ${command.status}`);
  }
  command.status = "cancelled";
  command.error = "Cancelled by operator";
  nebulosaState.addAudit({
    actor,
    event: "command.cancelled",
    resourceType: "command",
    resourceId: command.id,
    metadata: {},
  });
  return command;
}
