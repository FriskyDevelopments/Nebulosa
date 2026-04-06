import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SessionStats = {
  operatorRole: string;
  activeExecutors: number;
  pendingCommands: number;
  alerts: number;
};

export function SessionGrid({ stats }: { stats: SessionStats }) {
  const items = [
    ["Role", stats.operatorRole],
    ["Executors", String(stats.activeExecutors)],
    ["Pending", String(stats.pendingCommands)],
    ["Alerts", String(stats.alerts)],
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{value}</CardContent>
        </Card>
      ))}
    </div>
  );
}
