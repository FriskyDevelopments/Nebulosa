import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { apiRequest } from "@/lib/queryClient";
import { parseNebuCommand } from "@/core/commands/parser";
import { expressReaction, transformToStix } from "@/core/system/pipeline";
import { zoomCaptureToIntake, zoomCommandToApiPayload, zoomEventToIntake } from "@/platforms/zoom/adapter";
import { toTelegramMessage } from "@/platforms/telegram/adapter";
import { toDiscordMessage } from "@/platforms/discord/adapter";
import { NebuShell } from "@/ui/nebu/NebuShell";
import { CommandBar } from "@/ui/nebu/CommandBar";
import { SessionGrid } from "@/ui/nebu/SessionGrid";
import { NodeGraph } from "@/ui/nebu/NodeGraph";
import { StateFeed } from "@/ui/nebu/StateFeed";
import { ReactionPanel } from "@/ui/stix/ReactionPanel";
import { XiGlyph } from "@/ui/stix/XiGlyph";

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
};

type Alert = { id: string; severity: string; message: string };

type FlowState = "base" | "active" | "signal";

export default function NebulosaDashboard() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("ChangeMe_Admin123!");
  const [sessionId] = useState("session-main");
  const [commandInput, setCommandInput] = useState("/zoom admit all");
  const [flowState, setFlowState] = useState<{ intake: FlowState; transform: FlowState; express: FlowState }>({
    intake: "base",
    transform: "base",
    express: "base",
  });
  const [reactionLog, setReactionLog] = useState<Array<ReturnType<typeof transformToStix>>>([]);
  const [expressLog, setExpressLog] = useState<string[]>([]);

  const sessionQuery = useQuery<SessionSummary>({
    queryKey: ["session-summary"],
    queryFn: async () => (await apiRequest("GET", "/api/v1/session/summary")).json(),
    retry: false,
    refetchInterval: 10_000,
  });

  const telegramStatusQuery = useQuery<{ active: boolean }>({
    queryKey: ["telegram-status"],
    queryFn: async () => (await apiRequest("GET", "/api/v1/telegram/status")).json(),
    refetchInterval: 30_000,
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
    mutationFn: () => apiRequest("POST", "/api/v1/auth/login", { username, password }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const createCommandMutation = useMutation({
    mutationFn: (body: unknown) => apiRequest("POST", "/api/v1/commands", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commands"] }),
  });

  const handleParsedCommand = async (rawCommand: string) => {
    const parsed = parseNebuCommand(rawCommand, sessionId);
    if (!parsed) {
      setExpressLog((prev) => ["Unsupported command. Use /zoom admit all, /zoom mute all, /zoom lock room, or /capture moment.", ...prev].slice(0, 6));
      return;
    }

    setFlowState({ intake: "active", transform: "base", express: "base" });
    const intake = parsed.canonicalType === "capture.moment" ? zoomCaptureToIntake(sessionId) : zoomEventToIntake(sessionId, parsed.raw);

    setFlowState({ intake: "signal", transform: "active", express: "base" });
    const reaction = transformToStix(intake);
    setReactionLog((prev) => [reaction, ...prev].slice(0, 20));

    setFlowState({ intake: "signal", transform: "signal", express: "active" });
    const packet = expressReaction(reaction);
    const telegram = toTelegramMessage(packet);
    const discord = toDiscordMessage(packet);
    setExpressLog((prev) => [telegram, discord, ...prev].slice(0, 8));

    await createCommandMutation.mutateAsync(zoomCommandToApiPayload(parsed));
    setFlowState({ intake: "signal", transform: "signal", express: "signal" });
  };

  const sortedCommands = useMemo(
    () => [...(commandsQuery.data ?? [])].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [commandsQuery.data],
  );

  if (sessionQuery.isLoading) {
    return <Feedback type="empty" title="Booting NEBU control surface" description="Connecting operator session and loading current room state." />;
  }

  if (sessionQuery.isError) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-16">
          <CardHeader className="space-y-2">
            <CardTitle>Operator sign-in</CardTitle>
            <CardDescription>Authenticate to unlock command dispatch and live session telemetry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <Button className="w-full" onClick={() => loginMutation.mutate()} disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-card/50 p-4">
          <div className="flex items-center gap-3">
            <XiGlyph state="active" label="NEBU" size={28} />
            <div>
              <h1 className="text-2xl font-bold">NEBU session command center</h1>
              <p className="text-sm text-muted-foreground">Command-first controls for intake, transform, and delivery.</p>
            </div>
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {sessionQuery.data?.environment ?? "-"} · {sessionQuery.data?.operator.username ?? "guest"} · Telegram: {telegramStatusQuery.data?.active ? "Connected" : "Offline"}
          </div>
        </header>

        <NebuShell
          left={
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Input layer</CardTitle>
                <CardDescription>Use direct commands first; use quick actions as shortcuts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CommandBar
                  value={commandInput}
                  onChange={setCommandInput}
                  onSubmit={() => handleParsedCommand(commandInput)}
                  onQuickCommand={(command) => {
                    setCommandInput(command);
                    void handleParsedCommand(command);
                  }}
                  isExecuting={createCommandMutation.isPending}
                  helperText="Supported: /zoom admit all · /zoom mute all · /zoom lock room · /capture moment"
                />
                <StateFeed
                  title="Express feed"
                  items={expressLog}
                  emptyText="No outbound messages yet."
                  renderItem={(item, index) => (
                    <p key={`${item}-${index}`} className="rounded-md border p-2 text-xs text-muted-foreground">
                      {item}
                    </p>
                  )}
                />
              </CardContent>
            </Card>
          }
          center={
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session runtime</CardTitle>
                  <CardDescription>Live operator status and Xi state progression.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SessionGrid
                    stats={{
                      operatorRole: sessionQuery.data?.operator.role ?? "-",
                      activeExecutors: sessionQuery.data?.activeExecutors ?? 0,
                      pendingCommands: sessionQuery.data?.pendingCommands ?? 0,
                      alerts: alertsQuery.data?.length ?? 0,
                    }}
                  />
                  <NodeGraph intake={flowState.intake} transform={flowState.transform} express={flowState.express} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Queue and alerts</CardTitle>
                  <CardDescription>Operational updates from active commands and system notifications.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <StateFeed
                    title="Recent commands"
                    items={sortedCommands.slice(0, 12)}
                    emptyText="No commands submitted yet."
                    loading={commandsQuery.isLoading}
                    renderItem={(command) => (
                      <div key={command.id} className="rounded-md border p-2 text-sm">
                        <div className="font-medium">{command.type}</div>
                        <div className="text-xs text-muted-foreground">{command.status}</div>
                      </div>
                    )}
                  />
                  <StateFeed
                    title="Alerts"
                    items={alertsQuery.data ?? []}
                    emptyText="No active alerts."
                    loading={alertsQuery.isLoading}
                    renderItem={(alert) => (
                      <div key={alert.id} className="rounded-md border p-2 text-sm">
                        <div className="font-medium">{alert.severity.toUpperCase()}</div>
                        <div className="text-xs text-muted-foreground">{alert.message}</div>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          }
          right={<ReactionPanel reactions={reactionLog} />}
        />
      </div>
    </div>
  );
}
