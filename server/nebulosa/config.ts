import crypto from "crypto";

export type Environment = "dev" | "staging" | "prod";

/**
 * Normalize an environment string to a valid Environment value.
 *
 * @param value - The input environment identifier; may be `undefined`.
 * @returns `'prod'`, `'staging'`, or `'dev'` — the matching environment, or `'dev'` when the input is missing or unrecognized.
 */
function readEnvironment(value: string | undefined): Environment {
  if (value === "prod" || value === "staging" || value === "dev") return value;
  return "dev";
}

const defaultSessionSecret = "local-development-session-secret-change-me";

export const config = {
  environment: readEnvironment(process.env.NEBULOSA_ENV),
  sessionTtlMs: 1000 * 60 * 20,
  allowedOperators: (process.env.NEBULOSA_OPERATOR_ALLOWLIST ?? "admin,operator")
    .split(",")
    .map((username) => username.trim())
    .filter(Boolean),
  sessionSecret: process.env.NEBULOSA_SESSION_SECRET ?? defaultSessionSecret,
  executorSharedSecret: process.env.NEBULOSA_EXECUTOR_SECRET ?? "local-executor-secret",
  failedCommandThreshold: Number(process.env.NEBULOSA_FAILED_COMMAND_THRESHOLD ?? 5),
};

if (config.environment === "prod" && config.sessionSecret === defaultSessionSecret) {
  throw new Error("NEBULOSA_SESSION_SECRET must be provided in production");
}

/**
 * Generate a hex-encoded HMAC signature for an executor nonce.
 *
 * @param executorId - Identifier of the executor to include in the signature
 * @param nonce - Nonce value to sign
 * @returns The hex-encoded HMAC-SHA256 signature of `${executorId}:${nonce}` using the configured executor shared secret
 */
export function signExecutorNonce(executorId: string, nonce: string): string {
  const hmac = crypto.createHmac("sha256", config.executorSharedSecret);
  hmac.update(`${executorId}:${nonce}`);
  return hmac.digest("hex");
}
