import { useMemo, useState, useEffect } from "react";
import { analytics } from "@/lib/analytics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

type SessionSummary = {
  environment: "dev" | "staging" | "prod";
  operator: { id: string; username: string; role: string };
  activeExecutors: number;
  pendingCommands: number;
  alerts: number;
};

type Command = {
  id: string;
  type: string;
  status: string;
  requestedBy: string;
  createdAt: string;
  expiresAt: string;
};

type Alert = { id: string; severity: string; message: string; createdAt: string };

const COMMAND_TYPES = [
  "session.mute_participant",
  "session.remove_participant",
  "session.pin_participant",
  "session.send_warning",
];

export default function NebulosaDashboard() {

  useEffect(() => {
    analytics.track('landing_engagement', { page: 'nebulosa_dashboard' });
  }, []);

  const queryClient = useQueryClient();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("ChangeMe_Admin123!");
  const [sessionId, setSessionId] = useState("session-main");
  const [participantId, setParticipantId] = useState("participant-42");
  const [commandType, setCommandType] = useState(COMMAND_TYPES[0]);

  const sessionQuery = useQuery<SessionSummary>({
    queryKey: ["session-summary"],
    queryFn: async () => (await apiRequest("GET", "/api/v1/session/summary")).json(),
    retry: false,
    refetchInterval: 10_000,
  });

  const commandsQuery = useQuery<Command[]>({
    queryKey: ["commands"],
    queryFn: async () => (await apiRequest("GET", "/api/v1/commands")).json(),
    enabled: sessionQuery.isSuccess,
    refetchInterval: 5_000,
  });

  const alertsQuery = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => (await apiRequest("GET", "/api/v1/alerts")).json(),
    enabled: sessionQuery.isSuccess,
    refetchInterval: 10_000,
  });

  const loginMutation = useMutation({
    mutationFn: () => {
      analytics.track('action_submit', { actionName: 'operator_login_attempt', context: { hasUsername: !!username } });
      return apiRequest("POST", "/api/v1/auth/login", { username, password });
    },
    onSuccess: () => {
      analytics.track('flow_completion', { flowName: 'operator_login' });
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      analytics.track('flow_failure', { flowName: 'operator_login', errorType: error.name });
    }
  });

  const createCommandMutation = useMutation({
    mutationFn: () => {
      analytics.track('action_submit', { actionName: 'queue_command', context: { type: commandType } });
      return apiRequest("POST", "/api/v1/commands", {
        type: commandType,
        payload: {
          sessionId,
          participantId,
          reason: "Operator requested action",
        },
        ttlSeconds: 180,
      });
    },
    onSuccess: () => {
      analytics.track('flow_completion', { flowName: 'queue_command' });
      queryClient.invalidateQueries({ queryKey: ["commands"] });
    },
    onError: (error: Error) => {
      analytics.track('flow_failure', { flowName: 'queue_command', errorType: error.name });
    }
  });

  const orderedCommands = useMemo(
    () => [...(commandsQuery.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [commandsQuery.data],
  );

  const unauthorized = sessionQuery.isError;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Nebulosa Control Center</h1>
          {sessionQuery.data && (
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {sessionQuery.data.environment !== "prod" ? `${sessionQuery.data.environment} environment` : "production"}
            </span>
          )}
        </header>

        {unauthorized && (
          <Card>
            <CardHeader>
              <CardTitle>Operator Login</CardTitle>
              <CardDescription>Authenticate to issue commands and view audit feeds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
              <Button onClick={() => loginMutation.mutate()} disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </CardContent>
          </Card>
        )}

        {sessionQuery.data && (
          <>
            <div className="grid md:grid-cols-4 gap-3">
              <MetricCard label="Role" value={sessionQuery.data.operator.role} />
              <MetricCard label="Executors" value={String(sessionQuery.data.activeExecutors)} />
              <MetricCard label="Pending Commands" value={String(sessionQuery.data.pendingCommands)} />
              <MetricCard label="Open Alerts" value={String(sessionQuery.data.alerts)} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dispatch Command</CardTitle>
                <CardDescription>Server validates command type and payload before enqueueing.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-4 gap-3">
                <select className="h-10 rounded-md border bg-background px-3" value={commandType} onChange={(e) => setCommandType(e.target.value)}>
                  {COMMAND_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="session id" />
                <Input value={participantId} onChange={(e) => setParticipantId(e.target.value)} placeholder="participant id" />
                <Button onClick={() => createCommandMutation.mutate()} disabled={createCommandMutation.isPending}>
                  {createCommandMutation.isPending ? "Queueing..." : "Queue Command"}
                </Button>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Command Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-auto">
                  {orderedCommands.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commands yet.</p>
                  ) : (
                    orderedCommands.map((command) => (
                      <div key={command.id} className="border rounded-md p-2 text-sm">
                        <div className="font-medium">{command.type}</div>
                        <div className="text-xs text-muted-foreground">{command.status} · {command.id.slice(0, 8)}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-auto">
                  {(alertsQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active alerts.</p>
                  ) : (
                    (alertsQuery.data ?? []).map((alert) => (
                      <div key={alert.id} className="border rounded-md p-2 text-sm">
                        <div className="font-medium">{alert.severity.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">{alert.message}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}