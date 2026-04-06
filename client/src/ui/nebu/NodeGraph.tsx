import { XiGlyph } from "@/ui/stix/XiGlyph";

type NodeState = "base" | "active" | "signal";

export function NodeGraph({ intake, transform, express }: { intake: NodeState; transform: NodeState; express: NodeState }) {
  const nodes: Array<{ label: string; state: NodeState }> = [
    { label: "Intake", state: intake },
    { label: "Transform", state: transform },
    { label: "Express", state: express },
  ];

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="text-sm font-medium">Central Node Flow</div>
      <div className="flex items-center justify-between gap-3">
        {nodes.map((node, index) => (
          <div key={node.label} className="flex-1 text-center">
            <XiGlyph state={node.state} label={node.label} />
            {index < nodes.length - 1 ? <div className="mt-2 text-xs text-muted-foreground">→</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
